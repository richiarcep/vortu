"""Regression suite for the security hardening (argon2, token revocation, rotating
refresh tokens, audit hash-chain, pagination caps, GDPR, Veri*Factu).

Runs on an ISOLATED temp SQLite DB (never touches nexum.db). Uses stdlib
unittest + FastAPI TestClient, so no extra dependency is required:

    cd backend && python -m unittest tests.test_security        # stdlib
    cd backend && python -m pytest tests/test_security.py        # if pytest present
"""
import os
import tempfile
import unittest

# Point the app at an isolated DB + a strong test secret BEFORE importing anything
# from the app (the engine + settings are built at import time).
_TMP_DB = os.path.join(tempfile.mkdtemp(), "test_vela.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-definitely-32+chars-long")
os.environ.setdefault("DEBUG", "true")

import main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from core.database import create_tables, ensure_runtime_schema, SessionLocal  # noqa: E402

create_tables()
ensure_runtime_schema()
# config_fiscal + the other raw fiscal tables are seeded by setup_db, not the
# startup path — create them so the Veri*Factu test has its precondition. setup_db
# puede no estar presente (p.ej. excluido de la imagen desplegada); los tests que no
# dependen de las tablas fiscales raw siguen corriendo.
try:
    import setup_db  # noqa: E402
    setup_db.create_raw_tables()
except Exception:
    pass
client = TestClient(main.app, raise_server_exceptions=False)

_counter = {"n": 0}


def _register(country="ES"):
    """Register a fresh company/user and return (email, password).

    Self-service signups now start email_verified=False (the login gate blocks
    sign-in until the emailed link is clicked). These security tests aren't testing
    the verification flow itself, so mark the new account verified here — equivalent
    to the user having followed the link — so login() proceeds as before."""
    _counter["n"] += 1
    email = f"user{_counter['n']}@example.com"
    pw = "Sup3rSecret!pw"
    r = client.post("/api/auth/register", json={
        "full_name": "Test User", "email": email, "password": pw,
        "company_name": f"Co{_counter['n']}", "country": country,
    })
    assert r.status_code in (200, 201), r.text
    _db = SessionLocal()
    try:
        _db.execute(text("UPDATE users SET email_verified = TRUE WHERE email = :e"), {"e": email})
        _db.commit()
    finally:
        _db.close()
    return email, pw


def _login(email, pw):
    return client.post("/api/auth/login", data={"username": email, "password": pw})


class TestHashing(unittest.TestCase):
    def test_argon2_and_legacy_bcrypt(self):
        from core.security import hash_password, verify_password, needs_rehash
        import bcrypt
        h = hash_password("s3cret!")
        self.assertTrue(h.startswith("$argon2"))
        self.assertTrue(verify_password("s3cret!", h))
        self.assertFalse(verify_password("wrong", h))
        self.assertFalse(needs_rehash(h))
        legacy = bcrypt.hashpw(b"s3cret!", bcrypt.gensalt(12)).decode()
        self.assertTrue(verify_password("s3cret!", legacy))
        self.assertTrue(needs_rehash(legacy))  # bcrypt → flagged for upgrade

    def test_garbage_never_raises(self):
        from core.security import verify_password
        self.assertFalse(verify_password("x", ""))
        self.assertFalse(verify_password("x", "garbage"))


class TestLoginRevocation(unittest.TestCase):
    def test_login_and_token_version_revocation(self):
        email, pw = _register()
        r = _login(email, pw)
        self.assertEqual(r.status_code, 200)
        token = r.json()["access_token"]
        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me.status_code, 200)
        # logout bumps token_version → the old access token is revoked
        client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
        me2 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me2.status_code, 401)

    def test_bad_password_and_account_throttle_audited(self):
        email, pw = _register()
        r = _login(email, "wrong-password")
        self.assertEqual(r.status_code, 401)
        db = SessionLocal()
        n = db.execute(text("SELECT count(*) FROM security_audit_log WHERE event='login_failure'")).scalar()
        db.close()
        self.assertGreaterEqual(n, 1)


class TestRefreshRotation(unittest.TestCase):
    def test_rotation_and_theft_detection(self):
        from core import refresh as R
        from models.user import User
        email, pw = _register()
        _login(email, pw)
        db = SessionLocal()
        u = db.query(User).filter(User.email == email).first()
        tv0 = u.token_version
        A = R.issue(db, u)
        # rotate A→B→C
        rB = client.post("/api/auth/refresh", cookies={"vela_refresh": A})
        self.assertEqual(rB.status_code, 200)
        B = rB.cookies.get("vela_refresh")
        rC = client.post("/api/auth/refresh", cookies={"vela_refresh": B})
        self.assertEqual(rC.status_code, 200)
        C = rC.cookies.get("vela_refresh")
        # replay A (revoked, replacement also rotated) → theft → 401, family nuked, tv bumped
        rReuse = client.post("/api/auth/refresh", cookies={"vela_refresh": A})
        self.assertEqual(rReuse.status_code, 401)
        db.expire_all()
        tv1 = db.query(User).filter(User.email == email).first().token_version
        self.assertGreater(tv1, tv0)
        # live token C is dead after the family nuke
        self.assertEqual(client.post("/api/auth/refresh", cookies={"vela_refresh": C}).status_code, 401)
        db.close()

    def test_2fa_temp_token_assertion(self):
        from core.security import create_access_token
        from models.user import User
        email, pw = _register()
        db = SessionLocal(); u = db.query(User).filter(User.email == email).first(); db.close()
        # a full-session token (carries tv/plan_id) must be rejected at the 2FA exchange
        full = create_access_token(data={"sub": str(u.id), "is_admin": u.is_admin, "plan_id": "pro", "tv": u.token_version or 0})
        r = client.post("/api/auth/2fa/verify-login", json={"code": "000000"},
                        headers={"Authorization": f"Bearer {full}"})
        self.assertEqual(r.status_code, 401)


class TestAuditChain(unittest.TestCase):
    def test_chain_and_tamper(self):
        from core.audit import audit_event, verify_chain
        db = SessionLocal()
        audit_event(db, "test_a", actor_email="a@x", ip="1.1.1.1")
        audit_event(db, "test_b", actor_email="b@x", ip="1.1.1.1")
        self.assertTrue(verify_chain(db)["ok"])
        db.execute(text("UPDATE security_audit_log SET detail='tampered' WHERE event='test_a'"))
        db.commit()
        self.assertFalse(verify_chain(db)["ok"])
        db.close()


class TestPaginationCaps(unittest.TestCase):
    def test_over_cap_rejected(self):
        email, pw = _register()
        token = _login(email, pw).json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}
        self.assertEqual(client.get("/api/ventas/historial?limit=50", headers=h).status_code, 200)
        self.assertEqual(client.get("/api/ventas/historial?limit=99999", headers=h).status_code, 422)


class TestGDPR(unittest.TestCase):
    def test_export_contains_pii(self):
        email, pw = _register()
        token = _login(email, pw).json()["access_token"]
        r = client.get("/api/me/export", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["user"]["email"], email)
        self.assertIn("company", r.json())


class TestVerifactu(unittest.TestCase):
    def test_chain_idempotency_anular_tamper(self):
        from modules.fiscal.verifactu import emitir, anular, verify_chain
        from models.user import User
        email, pw = _register(country="ES")
        db = SessionLocal()
        u = db.query(User).filter(User.email == email).first()
        cid = u.company_id
        # seed an ES fiscal config for the company
        db.execute(text(
            "INSERT INTO config_fiscal (company_id, pais, nit, serie_dte, siguiente_numero, ambiente, created_at, updated_at) "
            "VALUES (:c,'ES','B12345678','A',1,'pruebas',:ts,:ts)"), {"c": cid, "ts": "2026-06-26"})
        db.commit()
        r1 = emitir(db, cid, {"importe_total": 121.0, "cuota_total": 21.0}, idempotency_key="k1")
        r2 = emitir(db, cid, {"importe_total": 242.0, "cuota_total": 42.0}, idempotency_key="k2")
        self.assertEqual(r2["huella_anterior"], r1["huella"])  # chained
        self.assertEqual(r2["numero"], r1["numero"] + 1)        # sequential
        self.assertEqual(emitir(db, cid, {}, idempotency_key="k1")["id"], r1["id"])  # idempotent
        self.assertTrue(verify_chain(db, cid)["ok"])
        an = anular(db, cid, r1["id"])
        self.assertEqual(an["registro_anulado_id"], r1["id"])   # linked, not deleted
        self.assertTrue(verify_chain(db, cid)["ok"])
        db.execute(text("UPDATE verifactu_registro SET importe_total=9999 WHERE id=:i"), {"i": r2["id"]})
        db.commit()
        self.assertFalse(verify_chain(db, cid)["ok"])           # tamper detected
        db.close()


class TestVerifactuMode(unittest.TestCase):
    def _seed_es(self, cid):
        db = SessionLocal()
        db.execute(text(
            "INSERT INTO config_fiscal (company_id, pais, nit, serie_dte, siguiente_numero, ambiente, created_at, updated_at) "
            "VALUES (:c,'ES','B12345678','A',1,'pruebas',:ts,:ts)"), {"c": cid, "ts": "2026-06-26"})
        db.commit()
        return db

    def test_default_mode_and_permanence_guard(self):
        from modules.fiscal.verifactu import emitir
        from modules.fiscal.verifactu.config import get_config, set_mode, can_switch_to_no_verifactu
        from modules.fiscal.verifactu.service import VerifactuError
        from models.user import User
        email, pw = _register(country="ES")
        db = SessionLocal()
        cid = db.query(User).filter(User.email == email).first().company_id
        db.execute(text(
            "INSERT INTO config_fiscal (company_id, pais, nit, serie_dte, siguiente_numero, ambiente, created_at, updated_at) "
            "VALUES (:c,'ES','B1','A',1,'pruebas',:ts,:ts)"), {"c": cid, "ts": "2026-06-26"})
        db.commit()
        self.assertEqual(get_config(db, cid)["verifactu_mode"], "VERIFACTU")  # default
        # VERIFACTU emit → remitted in sandbox + tacit opt-in recorded
        r = emitir(db, cid, {"importe_total": 121.0, "cuota_total": 21.0}, idempotency_key="a")
        self.assertEqual(r["modo"], "VERIFACTU")
        self.assertEqual(r["estado"], "aceptado")  # sandbox simulated acceptance
        cfg = get_config(db, cid)
        self.assertIsNotNone(cfg["verifactu_opted_in_at"])
        # permanence: cannot leave VERIFACTU the same year
        self.assertFalse(can_switch_to_no_verifactu(cfg))
        with self.assertRaises(VerifactuError):
            set_mode(db, cid, "NO_VERIFACTU", user_id=1, ip="1.1.1.1")
        db.close()

    def test_no_verifactu_signs_and_audits(self):
        from modules.fiscal.verifactu import emitir
        from modules.fiscal.verifactu.config import set_mode
        from models.user import User
        email, pw = _register(country="ES")
        db = SessionLocal()
        cid = db.query(User).filter(User.email == email).first().company_id
        db.execute(text(
            "INSERT INTO config_fiscal (company_id, pais, nit, serie_dte, siguiente_numero, ambiente, created_at, updated_at) "
            "VALUES (:c,'ES','B2','A',1,'pruebas',:ts,:ts)"), {"c": cid, "ts": "2026-06-26"})
        db.commit()
        # never opted in → switching to NO_VERIFACTU is allowed
        set_mode(db, cid, "NO_VERIFACTU", user_id=1, ip="1.1.1.1")
        n = db.execute(text("SELECT count(*) FROM verifactu_mode_audit WHERE company_id=:c"), {"c": cid}).scalar()
        self.assertGreaterEqual(n, 1)  # mode change audited
        r = emitir(db, cid, {"importe_total": 50.0}, idempotency_key="b")
        self.assertEqual(r["modo"], "NO_VERIFACTU")
        self.assertIn(r["estado"], ("sin_firma", "firmado"))  # signed path, not remitted
        db.close()


class TestTenantIsolation(unittest.TestCase):
    """The single most important property: two companies cannot see each other's
    data. Exercises real create + list + get-by-id across modules."""

    def test_two_companies_are_isolated(self):
        ea, pa = _register(); ta = _login(ea, pa).json()["access_token"]; ha = {"Authorization": f"Bearer {ta}"}
        eb, pb = _register(); tb = _login(eb, pb).json()["access_token"]; hb = {"Authorization": f"Bearer {tb}"}

        # Each company creates a project + a contact.
        pa_id = client.post("/api/proyectos/", headers=ha, json={"name": "Proyecto A"}).json()["id"]
        pb_id = client.post("/api/proyectos/", headers=hb, json={"name": "Proyecto B"}).json()["id"]
        ca_id = client.post("/api/clientes/contactos", headers=ha, json={"name": "Contacto A"}).json()["id"]
        cb_id = client.post("/api/clientes/contactos", headers=hb, json={"name": "Contacto B"}).json()["id"]

        # A's project list contains A's, never B's.
        la = client.get("/api/proyectos/", headers=ha).json()
        projects_a = la.get("projects", la) if isinstance(la, dict) else la
        ids_a = {p["id"] for p in projects_a}
        self.assertIn(pa_id, ids_a)
        self.assertNotIn(pb_id, ids_a, "Company A can see Company B's project!")

        # A cannot fetch B's records by id (and vice-versa).
        self.assertEqual(client.get(f"/api/proyectos/{pb_id}", headers=ha).status_code, 404)
        self.assertEqual(client.get(f"/api/proyectos/{pa_id}", headers=hb).status_code, 404)
        self.assertIn(client.get(f"/api/clientes/contactos/{cb_id}", headers=ha).status_code, (403, 404))
        self.assertIn(client.get(f"/api/clientes/contactos/{ca_id}", headers=hb).status_code, (403, 404))

        # GDPR export returns ONLY the caller's own identity.
        exp_a = client.get("/api/me/export", headers=ha).json()
        self.assertEqual(exp_a["user"]["email"], ea)
        self.assertNotEqual(exp_a["user"]["email"], eb)


class TestBackofficeAnd2FA(unittest.TestCase):
    """B1 — Vera Network gateado por get_admin_user (step-up 2FA del back-office) +
    helper de 'recordar 2FA por dispositivo'."""

    def _superadmin_with_2fa(self):
        import pyotp
        email, pw = _register()
        secret = pyotp.random_base32()
        db = SessionLocal()
        try:
            db.execute(text(
                "UPDATE users SET is_superadmin=TRUE, totp_secret=:s, totp_enabled=TRUE, "
                "last_backoffice_2fa=NULL WHERE email=:e"), {"s": secret, "e": email})
            db.commit()
            uid = db.execute(text("SELECT id FROM users WHERE email=:e"), {"e": email}).scalar()
        finally:
            db.close()
        return uid, secret

    def test_vera_network_requires_backoffice_2fa(self):
        """El agente Vera Network (text-to-SQL cross-tenant sobre BYPASSRLS) DEBE exigir
        el step-up 2FA del back-office, igual que /api/admin/*."""
        from core.security import create_access_token
        uid, _ = self._superadmin_with_2fa()
        h = {"Authorization": f"Bearer {create_access_token({'sub': str(uid), 'is_admin': True, 'plan_id': 'business', 'tv': 0})}"}
        r = client.get("/api/admin/vera-network/audit", headers=h)
        self.assertEqual(r.status_code, 403, r.text)
        self.assertIn("backoffice_2fa_required", r.text)

    def test_stepup_clears_the_gate(self):
        import pyotp
        from core.security import create_access_token
        uid, secret = self._superadmin_with_2fa()
        h = {"Authorization": f"Bearer {create_access_token({'sub': str(uid), 'is_admin': True, 'plan_id': 'business', 'tv': 0})}"}
        self.assertTrue(client.get("/api/admin/2fa-status", headers=h).json()["required"])
        r = client.post("/api/admin/2fa-stepup", json={"code": pyotp.TOTP(secret).now()}, headers=h)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertFalse(client.get("/api/admin/2fa-status", headers=h).json()["required"])

    def test_device_remember_token_roundtrip(self):
        """El token de 'recordar 2FA por dispositivo' valida solo para su usuario,
        rechaza basura, y NO es usable como access token (secreto derivado)."""
        from core.security import make_2fa_remember_token, verify_2fa_remember_token, decode_token
        t = make_2fa_remember_token(123)
        self.assertTrue(verify_2fa_remember_token(t, 123))
        self.assertFalse(verify_2fa_remember_token(t, 124))       # otro usuario
        self.assertFalse(verify_2fa_remember_token("", 123))      # vacío
        self.assertFalse(verify_2fa_remember_token("garbage.x.y", 123))
        with self.assertRaises(Exception):                        # no es un access token válido
            decode_token(t)


class TestVatPerCountry(unittest.TestCase):
    """B3 — la cuenta de IVA repercutido se resuelve country-agnostic (ES 477, MX 213,
    SV 2103) y el asiento de ingreso desglosa el IVA y cuadra. Antes MX/SV daban None
    (cuenta por nombre PGC-ES) → ingresos inflados 13-16% e IVA por pagar vacío."""
    EXP = {"ES": ("477", 21.0), "MX": ("213", 16.0), "SV": ("2103", 13.0)}

    def _check(self, country):
        from datetime import date
        from modules.accounting.revenue_register import registrar_ingreso, _vat_account_code
        prefix, rate = self.EXP[country]
        email, _ = _register(country=country)
        db = SessionLocal()
        try:
            cid = db.execute(text("SELECT company_id FROM users WHERE email=:e"), {"e": email}).scalar()
            code = _vat_account_code(db, cid, "repercutido")
            self.assertIsNotNone(code, f"{country}: no resolvió cuenta IVA repercutido")
            self.assertTrue(str(code).startswith(prefix), f"{country}: {code} no empieza por {prefix}")
            res = registrar_ingreso(db, cid, date(2026, 1, 15), "Ventas", "test", 113.0, iva_rate=rate)
            tid = str(res["asiento_contable"])
            rows = db.execute(text(
                "SELECT a.code, je.debit, je.credit FROM journal_entries je "
                "JOIN accounts a ON a.id = je.account_id WHERE je.transaction_id = :t"
            ), {"t": tid}).fetchall()
            self.assertEqual(len(rows), 3, f"{country}: esperaba 3 líneas (caja+ingreso+IVA), hay {len(rows)}")
            self.assertTrue(any(str(r[0]) == str(code) for r in rows), f"{country}: falta la línea de IVA {code}")
            d = sum(float(r[1] or 0) for r in rows); c = sum(float(r[2] or 0) for r in rows)
            self.assertAlmostEqual(d, c, places=2, msg=f"{country}: asiento descuadrado {d} vs {c}")
        finally:
            db.close()

    def test_iva_es(self): self._check("ES")
    def test_iva_mx(self): self._check("MX")
    def test_iva_sv(self): self._check("SV")


if __name__ == "__main__":
    unittest.main(verbosity=2)
