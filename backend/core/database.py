import time
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import get_settings

settings = get_settings()

_is_sqlite = "sqlite" in settings.DATABASE_URL

# Hard per-statement execution timeout. SQLite's busy_timeout only governs LOCK
# waits, not a long-running scan, and there is otherwise no ceiling on a runaway
# read (the worst case is the super-admin text-to-SQL agent, which can compose a
# cross-tenant Cartesian/unindexed query). This bounds CPU/connection time so a
# single query can't wedge a worker.
STATEMENT_TIMEOUT_S = float(getattr(settings, "DB_STATEMENT_TIMEOUT_S", 30) or 30)

# connect_args only needed for SQLite. `timeout` da margen para esperar a que se
# libere el lock de escritura (SQLite serializa escrituras) en vez de fallar al
# instante bajo concurrencia.
connect_args = {"check_same_thread": False, "timeout": 30} if _is_sqlite else {}

# pool_pre_ping validates a pooled connection before use, avoiding "stale
# connection" errors after the DB drops idle connections.
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)


def _attach_pg_statement_timeout(eng):
    """Hard per-session statement_timeout on a Postgres engine — the server cancels
    any query exceeding it, freeing the connection. Applied to EVERY engine we open
    (primary + the BYPASSRLS worker/network engines), so the cross-tenant roles keep
    a CPU ceiling too (e.g. the super-admin text-to-SQL agent)."""
    @event.listens_for(eng, "connect")
    def _set_statement_timeout(dbapi_conn, _record):
        cur = dbapi_conn.cursor()
        cur.execute("SET statement_timeout = %s" % int(STATEMENT_TIMEOUT_S * 1000))
        cur.close()


if _is_sqlite:
    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):
        """Mejora concurrencia y consistencia en SQLite: WAL permite lectores
        concurrentes con un escritor; busy_timeout reduce los 'database is locked';
        foreign_keys activa la integridad referencial (off por defecto en SQLite)."""
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA busy_timeout=5000")
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    @event.listens_for(engine, "before_cursor_execute")
    def _sqlite_statement_timeout(conn, cursor, statement, parameters, context, executemany):
        """Abort any statement that runs past STATEMENT_TIMEOUT_S. The progress
        handler fires every N VM ops; returning non-zero raises OperationalError
        ('interrupted'). A fresh closure per statement captures its own deadline,
        so we don't have to track state on the raw connection."""
        dbapi_conn = conn.connection.dbapi_connection
        deadline = time.monotonic() + STATEMENT_TIMEOUT_S

        def _abort_if_over_deadline():
            return 1 if time.monotonic() > deadline else 0

        dbapi_conn.set_progress_handler(_abort_if_over_deadline, 10000)
else:
    _attach_pg_statement_timeout(engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Gives every route a database session, rolls back on error, closes when done."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        # Ensure a failed request never leaves a half-applied transaction behind.
        db.rollback()
        raise
    finally:
        db.close()


# Row-Level Security toggle. RLS is a Postgres feature; on SQLite (dev) it is a
# pure pass-through, so the tenant-scoped session (core.security.get_tenant_db)
# behaves exactly like get_db there. Flip RLS_ENABLED=false to disable the GUC
# wiring in an emergency without dropping the DB policies.
RLS_ENABLED = (engine.dialect.name == "postgresql") and bool(getattr(settings, "RLS_ENABLED", True))


# Background jobs (scheduler, snapshot/memory workers) run OUTSIDE a request and
# legitimately span tenants (enumerate companies, then write per-company data).
# Under FORCE RLS the non-BYPASSRLS app role can't do that, so they use a separate
# write-capable BYPASSRLS connection (WORKER_DB_URL) when configured; on dev/SQLite
# (no WORKER_DB_URL) this is just the normal SessionLocal — behaviour unchanged.
_WORKER_ENGINE = None
_WorkerSession = None


def worker_session():
    """A DB session for background jobs. Uses WORKER_DB_URL (BYPASSRLS, write) when
    set, else the normal SessionLocal."""
    global _WORKER_ENGINE, _WorkerSession
    url = getattr(settings, "WORKER_DB_URL", "") or ""
    if not url:
        return SessionLocal()
    if _WorkerSession is None:
        _WORKER_ENGINE = create_engine(url, pool_pre_ping=True)
        if _WORKER_ENGINE.dialect.name == "postgresql":
            _attach_pg_statement_timeout(_WORKER_ENGINE)
        _WorkerSession = sessionmaker(autocommit=False, autoflush=False, bind=_WORKER_ENGINE)
    return _WorkerSession()


def create_tables():
    """Creates all tables in the database. Called once at startup."""
    Base.metadata.create_all(bind=engine)


# Tablas del agente "Vera Network Agent" (super-admin cross-empresa). Se usan
# vía raw SQL y NO tienen modelo ORM, así que create_all() no las cubre — hay
# que asegurarlas explícitamente al arranque. Esquema canónico compartido por
# todos los escritores/lectores (vera/network_engine, api/vera_network,
# api/admin, api/vera_pipeline_admin, modules/billing/stripe_service).
def _network_tables_ddl():
    """CREATE TABLE statements for the Vera Network tables, portable across
    SQLite and Postgres (the only difference is the autoincrement PK and the
    timestamp default)."""
    if engine.dialect.name == "postgresql":
        pk, ts = "id SERIAL PRIMARY KEY", "TIMESTAMP DEFAULT now()"
    else:  # sqlite
        pk, ts = "id INTEGER PRIMARY KEY AUTOINCREMENT", "TIMESTAMP DEFAULT (datetime('now'))"
    return (
        f"""
        CREATE TABLE IF NOT EXISTS vera_network_conversations (
            {pk},
            user_id INTEGER NOT NULL,
            title TEXT,
            context_company_id INTEGER,
            messages_json TEXT,
            model_used TEXT,
            total_tokens INTEGER DEFAULT 0,
            total_cost_usd REAL DEFAULT 0,
            created_at {ts},
            updated_at {ts}
        )
        """,
        f"""
        CREATE TABLE IF NOT EXISTS vera_network_audit (
            {pk},
            user_id INTEGER,
            user_email TEXT,
            endpoint TEXT,
            action TEXT,
            question TEXT,
            response_preview TEXT,
            sql_executed TEXT,
            model_used TEXT,
            tokens_input INTEGER,
            tokens_output INTEGER,
            cost_usd REAL,
            latency_ms INTEGER,
            created_at {ts}
        )
        """,
    )


def ensure_runtime_schema():
    """Asegura el esquema que `create_all()` (solo modelos ORM) no cubre:
    - tablas raw-SQL del Vera Network Agent,
    - columnas usadas solo en SQL crudo que nunca estuvieron en un modelo.
    Idempotente y portable (SQLite + Postgres). Usa el inspector de SQLAlchemy
    en vez de `PRAGMA table_info` (que solo existe en SQLite)."""
    from sqlalchemy import text, inspect as sa_inspect

    def existing_columns(conn, table):
        """Column names of `table`, or None if the table doesn't exist."""
        insp = sa_inspect(conn)
        if not insp.has_table(table):
            return None
        return {c["name"] for c in insp.get_columns(table)}

    with engine.begin() as conn:
        for stmt in _network_tables_ddl():
            conn.execute(text(stmt))

        # ── Raw fiscal / finance tables (company_id-scoped, no ORM model) ────────
        # Moved onto the boot path from setup_db.create_raw_tables() so they exist
        # under create_all+ensure_runtime_schema, are owned by the schema owner, and
        # are present BEFORE the RLS migration ALTERs them. On a fresh (boot-managed)
        # Postgres DB they were otherwise never created → fiscal/finance endpoints
        # 500 'relation does not exist'. Portable DDL (SERIAL vs AUTOINCREMENT,
        # TIMESTAMP not the SQLite-only DATETIME).
        _raw_pk = "id SERIAL PRIMARY KEY" if engine.dialect.name == "postgresql" else "id INTEGER PRIMARY KEY AUTOINCREMENT"
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS config_fiscal (
                {_raw_pk},
                company_id INTEGER NOT NULL UNIQUE,
                pais TEXT DEFAULT 'SV',
                nombre_comercial TEXT, nombre_legal TEXT, nit TEXT, nrc TEXT,
                giro TEXT, actividad_economica TEXT,
                tipo_contribuyente TEXT DEFAULT 'mediano',
                departamento TEXT, municipio TEXT, direccion TEXT, telefono TEXT,
                email_fiscal TEXT,
                ambiente TEXT DEFAULT 'pruebas', serie_dte TEXT DEFAULT 'A',
                siguiente_numero INTEGER DEFAULT 1, iva_porcentaje REAL DEFAULT 0.13,
                tiene_certificado INTEGER DEFAULT 0, certificado_path TEXT,
                certificado_password TEXT,
                api_key TEXT, api_secret TEXT, token_actual TEXT, token_expiry TEXT,
                wizard_completado INTEGER DEFAULT 0, wizard_paso INTEGER DEFAULT 1,
                activo INTEGER DEFAULT 0,
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            )
        """))
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS dte_contingencia (
                {_raw_pk},
                company_id INTEGER NOT NULL, tipo TEXT DEFAULT 'falla_api',
                inicio TEXT NOT NULL, fin TEXT, motivo TEXT,
                dte_ids TEXT DEFAULT '[]', resuelto INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """))
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS dte_emitidos (
                {_raw_pk},
                company_id INTEGER NOT NULL, tipo_dte TEXT NOT NULL,
                codigo_tipo TEXT NOT NULL, numero_control TEXT NOT NULL,
                codigo_generacion TEXT NOT NULL, sello_recepcion TEXT,
                emisor_nit TEXT, emisor_nrc TEXT, emisor_nombre TEXT,
                receptor_tipo TEXT DEFAULT 'consumidor_final', receptor_nombre TEXT,
                receptor_nit TEXT, receptor_nrc TEXT, receptor_email TEXT,
                receptor_direccion TEXT,
                subtotal REAL DEFAULT 0, descuento REAL DEFAULT 0, iva REAL DEFAULT 0,
                total REAL DEFAULT 0,
                estado TEXT DEFAULT 'borrador', ambiente TEXT DEFAULT 'pruebas',
                fecha_emision TEXT NOT NULL, fecha_envio TEXT, fecha_aceptacion TEXT,
                json_dte TEXT, json_respuesta TEXT, pdf_path TEXT,
                sale_id INTEGER, invalidado INTEGER DEFAULT 0, motivo_invalidacion TEXT,
                created_at TEXT NOT NULL
            )
        """))
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS dte_recibidos (
                {_raw_pk},
                company_id INTEGER NOT NULL, tipo_dte TEXT, numero_control TEXT,
                codigo_generacion TEXT,
                proveedor_nit TEXT, proveedor_nrc TEXT, proveedor_nombre TEXT,
                subtotal REAL DEFAULT 0, iva REAL DEFAULT 0, total REAL DEFAULT 0,
                concepto TEXT,
                estado TEXT DEFAULT 'recibido', fecha_emision TEXT,
                fecha_recepcion TEXT NOT NULL, registrado_contabilidad INTEGER DEFAULT 0,
                json_dte TEXT, documento_id INTEGER, created_at TEXT NOT NULL
            )
        """))
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS financial_snapshots (
                {_raw_pk},
                company_id INTEGER NOT NULL, period_label TEXT NOT NULL,
                fecha_inicio TEXT NOT NULL, fecha_fin TEXT NOT NULL,
                data_json TEXT NOT NULL, generated_at TEXT NOT NULL
            )
        """))
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS proyecciones_snapshots (
                {_raw_pk},
                company_id INTEGER NOT NULL, context_ids TEXT DEFAULT '[]',
                data_json TEXT NOT NULL, generated_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
        """))
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS registro_diario (
                {_raw_pk},
                fecha DATE NOT NULL, tipo VARCHAR NOT NULL,
                categoria VARCHAR NOT NULL, descripcion VARCHAR NOT NULL,
                monto NUMERIC(15, 2) NOT NULL, referencia VARCHAR,
                cuenta_contable VARCHAR, notas TEXT, company_id INTEGER NOT NULL,
                creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Security audit log — tamper-evident (hash-chained) record of logins,
        # 2FA, privileged admin changes, exports and AI tool calls. Written via
        # core.audit.audit_event. Append-only by convention; on Postgres add a
        # BEFORE UPDATE/DELETE trigger to enforce it at the DB layer.
        _audit_pk = "id SERIAL PRIMARY KEY" if engine.dialect.name == "postgresql" else "id INTEGER PRIMARY KEY AUTOINCREMENT"
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS security_audit_log (
                {_audit_pk},
                ts TEXT NOT NULL,
                event TEXT NOT NULL,
                actor_user_id INTEGER,
                actor_email TEXT,
                target TEXT,
                company_id INTEGER,
                ip TEXT,
                user_agent TEXT,
                detail TEXT,
                prev_hash TEXT,
                row_hash TEXT
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_event ON security_audit_log (event)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_actor ON security_audit_log (actor_email)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_ts ON security_audit_log (ts)"))

        # Rotating, revocable refresh tokens (core/refresh.py). Stored as a sha256
        # hash; family_id groups a rotation chain for reuse-detection; token_version
        # ties a token to the user's revocation counter. Portable SQLite/Postgres.
        _rt_pk = "id SERIAL PRIMARY KEY" if engine.dialect.name == "postgresql" else "id INTEGER PRIMARY KEY AUTOINCREMENT"
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                {_rt_pk},
                jti TEXT UNIQUE NOT NULL,
                family_id TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL,
                token_version INTEGER NOT NULL DEFAULT 0,
                issued_at TEXT,
                expires_at TEXT,
                revoked INTEGER NOT NULL DEFAULT 0,
                revoked_at TEXT,
                revoked_reason TEXT,
                replaced_by_jti TEXT,
                ip TEXT,
                user_agent TEXT
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_refresh_user ON refresh_tokens (user_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_refresh_family ON refresh_tokens (family_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_refresh_hash ON refresh_tokens (token_hash)"))

        # Estado temporal del flujo documentos analyze→confirm. Antes vivía en un
        # dict global en memoria (se rompía con >1 worker: /confirm caía en otro
        # proceso → "documento caducado"). Persistido aquí (portable SQLite/PG).
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pending_documents (
                temp_id TEXT PRIMARY KEY,
                user_id INTEGER,
                company_id INTEGER,
                payload TEXT,
                expires_at REAL
            )
        """))

        # POS sales awaiting a Stripe Connect card/Apple Pay payment. The cart is
        # held here (NOT recorded as a sale) until the payment webhook confirms,
        # then the real sale is created and this row deleted. Keeps the sales table
        # free of unpaid/abandoned carts.
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS pending_pos_sales (
                temp_id TEXT PRIMARY KEY,
                company_id INTEGER NOT NULL,
                payload TEXT NOT NULL,
                sale_id INTEGER,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT,
                expires_at REAL
            )
        """))

        # Evidence-extraction pipeline tables (fingerprints, runs, feedback, review
        # queue). Antes solo las creaba migrate_extraction_tables.py a mano, así que
        # en una BD nueva el bucle de aprendizaje/extracción fallaba en silencio.
        _ext_pk = "id SERIAL PRIMARY KEY" if engine.dialect.name == "postgresql" else "id INTEGER PRIMARY KEY"
        for _stmt in (
            f"""CREATE TABLE IF NOT EXISTS doc_fingerprints ({_ext_pk}, company_id INTEGER NOT NULL,
                fingerprint TEXT NOT NULL, provider_cif TEXT, doc_template_slug TEXT,
                times_seen INTEGER DEFAULT 1, last_seen_at TEXT, layout_signature_json TEXT)""",
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_fingerprint_company ON doc_fingerprints (company_id, fingerprint)",
            f"""CREATE TABLE IF NOT EXISTS extraction_runs ({_ext_pk}, company_id INTEGER NOT NULL,
                temp_id TEXT, fingerprint TEXT, doc_template_slug TEXT, phase_reached TEXT,
                total_cost REAL DEFAULT 0, total_tokens INTEGER DEFAULT 0, models_used_json TEXT,
                overall_confidence REAL DEFAULT 0, validation_passed INTEGER DEFAULT 0,
                field_results_json TEXT, needs_review INTEGER DEFAULT 0, created_at TEXT)""",
            "CREATE INDEX IF NOT EXISTS ix_extraction_runs_temp ON extraction_runs (temp_id)",
            "CREATE INDEX IF NOT EXISTS ix_extraction_runs_company ON extraction_runs (company_id)",
            f"""CREATE TABLE IF NOT EXISTS extraction_feedback ({_ext_pk}, company_id INTEGER NOT NULL,
                document_id INTEGER, run_id INTEGER, field_key TEXT, ai_value TEXT,
                corrected_value TEXT, was_correct INTEGER, prompt_id INTEGER, provider TEXT, created_at TEXT)""",
            "CREATE INDEX IF NOT EXISTS ix_extraction_feedback_company ON extraction_feedback (company_id)",
            f"""CREATE TABLE IF NOT EXISTS extraction_review_queue ({_ext_pk}, company_id INTEGER NOT NULL,
                document_id INTEGER, run_id INTEGER, doc_template_slug TEXT, status TEXT DEFAULT 'pending',
                reason TEXT, low_conf_fields_json TEXT, created_at TEXT, resolved_by INTEGER, resolved_at TEXT)""",
            "CREATE INDEX IF NOT EXISTS ix_review_queue_company_status ON extraction_review_queue (company_id, status)",
        ):
            conn.execute(text(_stmt))

        # companies.plan: leída/escrita solo por SQL crudo (api/admin, billing,
        # stripe_service); nunca declarada en el modelo Company. Sin ella,
        # /api/admin/companies y /billing/overview dan 500 "no such column: plan".
        # users.token_version — server-side JWT revocation (bumped on logout/pwd-change).
        user_cols = existing_columns(conn, "users")
        if user_cols is not None and "token_version" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0"))

        company_cols = existing_columns(conn, "companies")
        if company_cols is not None and "plan" not in company_cols:
            conn.execute(text("ALTER TABLE companies ADD COLUMN plan TEXT DEFAULT 'base'"))
        # Vera Plus: persist the Stripe subscription id so the cancellation webhook
        # can map a deleted subscription back to the company and deactivate it.
        if company_cols is not None and "vera_plus_subscription_id" not in company_cols:
            conn.execute(text("ALTER TABLE companies ADD COLUMN vera_plus_subscription_id TEXT"))
        # Stripe Connect: the company's OWN connected account (to collect card/Apple
        # Pay payments from their customers — funds go to the company, not Vela).
        if company_cols is not None and "stripe_connect_id" not in company_cols:
            conn.execute(text("ALTER TABLE companies ADD COLUMN stripe_connect_id TEXT"))
        if company_cols is not None and "connect_charges_enabled" not in company_cols:
            conn.execute(text("ALTER TABLE companies ADD COLUMN connect_charges_enabled INTEGER DEFAULT 0"))
        if company_cols is not None and "connect_details_submitted" not in company_cols:
            conn.execute(text("ALTER TABLE companies ADD COLUMN connect_details_submitted INTEGER DEFAULT 0"))

        # Ventas: columnas de devoluciones e idempotencia (create_all() no altera
        # tablas existentes; en una BD nueva ya las crea el modelo y esto es no-op).
        sale_cols = existing_columns(conn, "sales")
        if sale_cols is not None:
            if "status" not in sale_cols:
                conn.execute(text("ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'completed'"))
            if "refunded_amount" not in sale_cols:
                conn.execute(text("ALTER TABLE sales ADD COLUMN refunded_amount REAL DEFAULT 0"))
            if "idempotency_key" not in sale_cols:
                conn.execute(text("ALTER TABLE sales ADD COLUMN idempotency_key TEXT"))
            if "stripe_payment_intent" not in sale_cols:
                conn.execute(text("ALTER TABLE sales ADD COLUMN stripe_payment_intent TEXT"))
        item_cols = existing_columns(conn, "sale_items")
        if item_cols is not None and "refunded_quantity" not in item_cols:
            conn.execute(text("ALTER TABLE sale_items ADD COLUMN refunded_quantity INTEGER DEFAULT 0"))
        # Unicidad real de la clave de idempotencia por empresa (índice parcial:
        # solo aplica cuando la clave no es NULL). SQLite y Postgres soportan WHERE.
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_company_idem "
            "ON sales(company_id, idempotency_key) WHERE idempotency_key IS NOT NULL"
        ))
        # Idempotencia de devolución acotada a la venta (company_id, sale_id, key).
        conn.execute(text("DROP INDEX IF EXISTS uq_refunds_company_idem"))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_company_sale_idem "
            "ON sale_refunds(company_id, sale_id, idempotency_key) WHERE idempotency_key IS NOT NULL"
        ))
        # Numeración de notas de crédito única por empresa.
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_refunds_company_cn "
            "ON sale_refunds(company_id, credit_note_number) WHERE credit_note_number IS NOT NULL"
        ))

        # Contabilidad: índices para libro mayor / balance / IVA.
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_je_company_account_date "
            "ON journal_entries(company_id, account_id, date)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_je_company_date "
            "ON journal_entries(company_id, date)"
        ))

        # Costes: la categoría mapea a una cuenta de gasto del PGC (dirige el asiento).
        catcols = existing_columns(conn, "cost_categories")
        if catcols is not None and "pgc_account_code" not in catcols:
            conn.execute(text("ALTER TABLE cost_categories ADD COLUMN pgc_account_code TEXT"))

        # Costes: FK provider_id en cost_entries + unicidad por nombre normalizado.
        cost_cols = existing_columns(conn, "cost_entries")
        if cost_cols is not None and "provider_id" not in cost_cols:
            conn.execute(text("ALTER TABLE cost_entries ADD COLUMN provider_id INTEGER REFERENCES cost_providers(id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_cost_entries_provider ON cost_entries(company_id, provider_id)"))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_cost_providers_company_norm "
            "ON cost_providers(company_id, normalized_name)"
        ))

        # RR.HH.: email único POR EMPRESA (no global). En una BD nueva ya lo crea
        # el modelo (UniqueConstraint en __table_args__); aquí se asegura en BDs
        # existentes. El antiguo unique global sobre employees.email (si existe)
        # no se elimina aquí (requeriría rebuild en SQLite); en Postgres nuevo no existe.
        emp_cols = existing_columns(conn, "employees")
        if emp_cols is not None:
            conn.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_company_email "
                "ON employees(company_id, email)"
            ))

        # Marketing: ahora se escopa por company_id (antes user_id, rompía multi-tenant).
        # create_all() añade la columna en BD nueva; aquí se parchea la existente y se
        # rellena company_id desde la empresa del usuario creador.
        for _mt in ("marketing_company_analyses", "marketing_campaigns", "marketing_platform_credentials"):
            mcols = existing_columns(conn, _mt)
            if mcols is not None and "company_id" not in mcols:
                conn.execute(text(f"ALTER TABLE {_mt} ADD COLUMN company_id INTEGER"))
                conn.execute(text(
                    f"UPDATE {_mt} SET company_id = "
                    f"(SELECT u.company_id FROM users u WHERE u.id = {_mt}.user_id) "
                    f"WHERE company_id IS NULL"
                ))
            conn.execute(text(f"CREATE INDEX IF NOT EXISTS ix_{_mt}_company ON {_mt}(company_id)"))

        # ── Veri*Factu (España, RD 1007/2023) ───────────────────────────────
        # Registro de facturación de alta/anulación + registro de eventos, ambos
        # encadenados por huella (huella = hash(canonical + huella_anterior)) e
        # INMUTABLES (correcciones = nuevo registro enlazado, nunca UPDATE/DELETE).
        # Append-only se refuerza con un trigger en Postgres (bloque aparte abajo);
        # en SQLite la garantía es app-level (sin ruta de UPDATE/DELETE) + verify_chain.
        _vf_pk = "id SERIAL PRIMARY KEY" if engine.dialect.name == "postgresql" else "id INTEGER PRIMARY KEY AUTOINCREMENT"
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS verifactu_registro (
                {_vf_pk},
                company_id INTEGER NOT NULL,
                tipo TEXT NOT NULL DEFAULT 'alta',
                serie TEXT,
                numero INTEGER NOT NULL,
                fecha_expedicion TEXT NOT NULL,
                nif_emisor TEXT,
                tipo_factura TEXT DEFAULT 'F1',
                cuota_total REAL DEFAULT 0,
                importe_total REAL DEFAULT 0,
                cliente_nombre TEXT,
                cliente_nif TEXT,
                lineas_json TEXT,
                huella TEXT NOT NULL,
                huella_anterior TEXT,
                prev_registro_id INTEGER,
                registro_anulado_id INTEGER,
                estado TEXT NOT NULL DEFAULT 'registrado',
                ambiente TEXT DEFAULT 'pruebas',
                qr_url TEXT,
                xml TEXT,
                firma TEXT,
                sale_id INTEGER,
                idempotency_key TEXT,
                ts_generacion TEXT NOT NULL,
                created_at TEXT
            )
        """))
        # Uniqueness applies to ALTA records only — an anulación/rectificativa
        # deliberately references the same serie+número as the invoice it corrects.
        conn.execute(text("DROP INDEX IF EXISTS uq_verifactu_company_serie_num"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_verifactu_company_serie_num ON verifactu_registro(company_id, serie, numero) WHERE tipo = 'alta'"))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS uq_verifactu_company_idem ON verifactu_registro(company_id, idempotency_key) WHERE idempotency_key IS NOT NULL"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_verifactu_company_id ON verifactu_registro(company_id, id)"))
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS verifactu_eventos (
                {_vf_pk},
                company_id INTEGER NOT NULL,
                evento TEXT NOT NULL,
                registro_id INTEGER,
                detalle TEXT,
                huella TEXT NOT NULL,
                huella_anterior TEXT,
                ts TEXT NOT NULL
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_verifactu_eventos_company ON verifactu_eventos(company_id, id)"))

        # Veri*Factu per-tenant operating mode (VERIFACTU = remit to AEAT in real
        # time; NO_VERIFACTU = keep signed records locally). Chosen at onboarding;
        # legally binding (permanence rule, §3.2). cert_ref points to the .p12 in a
        # secrets store — never the cert itself. One row per company (tenant).
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS verifactu_config (
                company_id INTEGER PRIMARY KEY,
                verifactu_mode TEXT NOT NULL DEFAULT 'VERIFACTU',
                mode_set_at TEXT,
                mode_set_by INTEGER,
                verifactu_opted_in_at TEXT,
                environment TEXT NOT NULL DEFAULT 'SANDBOX',
                cert_ref TEXT,
                cert_valid_until TEXT,
                created_at TEXT
            )
        """))
        # Append-only audit of every mode change (who/when/from-where).
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS verifactu_mode_audit (
                {_vf_pk},
                company_id INTEGER NOT NULL,
                old_mode TEXT,
                new_mode TEXT NOT NULL,
                user_id INTEGER,
                ip TEXT,
                ts TEXT NOT NULL
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_verifactu_mode_audit_company ON verifactu_mode_audit(company_id, id)"))
        # Retry queue for failed AEAT remisión (VERIFACTU mode). No fixed deadline —
        # retried until accepted, marking Incidencia='S' on resend (§3.4).
        conn.execute(text(f"""
            CREATE TABLE IF NOT EXISTS verifactu_retry_queue (
                {_vf_pk},
                company_id INTEGER NOT NULL,
                registro_id INTEGER NOT NULL,
                intentos INTEGER NOT NULL DEFAULT 0,
                last_error TEXT,
                next_retry_at TEXT,
                estado TEXT NOT NULL DEFAULT 'pendiente',
                created_at TEXT
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_verifactu_retry_pending ON verifactu_retry_queue(estado, next_retry_at)"))
        # Registro: mode used at emission + AEAT response (CSV) + incidencia flag.
        _vfr_cols = existing_columns(conn, "verifactu_registro")
        if _vfr_cols is not None:
            if "modo" not in _vfr_cols:
                conn.execute(text("ALTER TABLE verifactu_registro ADD COLUMN modo TEXT DEFAULT 'VERIFACTU'"))
            if "aeat_csv" not in _vfr_cols:
                conn.execute(text("ALTER TABLE verifactu_registro ADD COLUMN aeat_csv TEXT"))
            if "incidencia" not in _vfr_cols:
                conn.execute(text("ALTER TABLE verifactu_registro ADD COLUMN incidencia TEXT DEFAULT 'N'"))

    # ── Veri*Factu append-only enforcement (Postgres only) ──────────────────
    # DB-level immutability for the fiscal registro/eventos: a BEFORE UPDATE/DELETE
    # trigger that RAISEs. Runs in its OWN transaction with try/except so a trigger
    # problem can NEVER wedge startup (the rest of the schema is already committed).
    # Idempotent: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS + CREATE.
    # (On SQLite immutability is app-level — there is no UPDATE/DELETE code path —
    #  plus the huella chain detects tampering, so no trigger is needed there.)
    if engine.dialect.name == "postgresql":
        try:
            with engine.begin() as conn:
                conn.execute(text("""
                    CREATE OR REPLACE FUNCTION verifactu_append_only() RETURNS trigger AS $$
                    BEGIN
                        RAISE EXCEPTION 'verifactu records are append-only (immutable)';
                    END;
                    $$ LANGUAGE plpgsql;
                """))
                for _t in ("verifactu_registro", "verifactu_eventos"):
                    conn.execute(text(f"DROP TRIGGER IF EXISTS trg_{_t}_append_only ON {_t}"))
                    conn.execute(text(
                        f"CREATE TRIGGER trg_{_t}_append_only BEFORE UPDATE OR DELETE ON {_t} "
                        f"FOR EACH ROW EXECUTE FUNCTION verifactu_append_only()"
                    ))
        except Exception as _e:
            import logging as _logging
            _logging.getLogger("vela").warning("Veri*Factu append-only trigger setup skipped: %s", _e)