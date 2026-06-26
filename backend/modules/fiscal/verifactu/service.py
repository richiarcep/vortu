"""Veri*Factu orchestrator: emitir (alta) + anular.

emitir() runs in ONE transaction so the número allocation, huella_anterior read,
registro INSERT, event log, and counter bump are atomic (no other emit can
interleave and break the strictly-sequential chain). Idempotency mirrors
api/sales.py: a pre-check on (company_id, idempotency_key) plus an IntegrityError
catch on the unique partial index. Signing is via the pluggable signer (NullSigner
in dev → estado='sin_firma' but still hashed+chained).
"""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import canonical as C
from .hashing import huella, last_registro
from .qr import cotejo_url
from .signer import get_signer
from .eventos import log_evento
from .xml_export import export_xml


class VerifactuError(Exception):
    """Raised on a precondition failure (e.g. fiscal config missing)."""


def _config_fiscal(db: Session, company_id: int) -> dict:
    try:
        row = db.execute(text("SELECT * FROM config_fiscal WHERE company_id=:cid"),
                         {"cid": company_id}).mappings().first()
    except Exception:
        # Table itself absent (config_fiscal is seeded by setup_db, not the startup path).
        raise VerifactuError("Configuración fiscal no inicializada. Configura los datos fiscales primero.")
    if not row:
        raise VerifactuError("Configuración fiscal no encontrada. Configura los datos fiscales primero.")
    return dict(row)


def _ts_now() -> str:
    # ISO-8601 with offset (FechaHoraHusoGenRegistro must carry a timezone).
    return datetime.now(timezone.utc).isoformat()


def emitir(db: Session, company_id: int, payload: dict,
           idempotency_key: Optional[str] = None) -> dict:
    """Create an alta registro for an ES company. payload carries invoice data:
    fecha_expedicion, tipo_factura, cuota_total, importe_total, cliente_nombre,
    cliente_nif, lineas (list), sale_id (optional)."""
    cfg = _config_fiscal(db, company_id)

    # Idempotency: return the existing record if this key was already used.
    if idempotency_key:
        existing = db.execute(text("""
            SELECT * FROM verifactu_registro WHERE company_id=:cid AND idempotency_key=:k
        """), {"cid": company_id, "k": idempotency_key}).mappings().first()
        if existing:
            return dict(existing)

    serie = cfg.get("serie_dte") or "A"
    nif = cfg.get("nit")
    ambiente = cfg.get("ambiente") or "pruebas"
    numero = int(cfg.get("siguiente_numero") or 1)

    prev = last_registro(db, company_id)
    huella_anterior = (prev["huella"] if prev else "") or ""
    # Keep the alta número strictly sequential vs the last alta.
    if prev and prev["numero"] is not None:
        numero = max(numero, int(prev["numero"]) + 1)

    fecha = payload.get("fecha_expedicion") or datetime.now().date().isoformat()
    tipo_factura = payload.get("tipo_factura") or "F1"
    cuota_total = payload.get("cuota_total") or 0
    importe_total = payload.get("importe_total") or 0
    ts_gen = _ts_now()

    canonical = C.canonical_alta(
        nif_emisor=nif, serie=serie, numero=numero, fecha_expedicion=fecha,
        tipo_factura=tipo_factura, cuota_total=cuota_total, importe_total=importe_total,
        huella_anterior=huella_anterior, ts_generacion=ts_gen)
    h = huella(canonical)

    qr = cotejo_url(nif_emisor=nif, serie=serie, numero=numero,
                    fecha_expedicion=fecha, importe_total=importe_total, ambiente=ambiente)

    registro = {
        "company_id": company_id, "tipo": "alta", "serie": serie, "numero": numero,
        "fecha_expedicion": fecha, "nif_emisor": nif, "tipo_factura": tipo_factura,
        "cuota_total": float(cuota_total or 0), "importe_total": float(importe_total or 0),
        "cliente_nombre": payload.get("cliente_nombre"), "cliente_nif": payload.get("cliente_nif"),
        "lineas_json": _dump(payload.get("lineas")), "huella": h, "huella_anterior": huella_anterior,
        "prev_registro_id": (prev["id"] if prev else None), "estado": "registrado",
        "ambiente": ambiente, "qr_url": qr, "sale_id": payload.get("sale_id"),
        "idempotency_key": idempotency_key, "ts_generacion": ts_gen,
        "created_at": _ts_now(),
    }

    # Signature (NullSigner in dev → estado sin_firma; still hashed+chained).
    signature = get_signer(cfg).sign(export_xml({**registro}))
    if signature is None:
        registro["estado"] = "sin_firma"
    registro["firma"] = signature
    registro["xml"] = export_xml(registro)

    try:
        cur = db.execute(text("""
            INSERT INTO verifactu_registro
                (company_id, tipo, serie, numero, fecha_expedicion, nif_emisor, tipo_factura,
                 cuota_total, importe_total, cliente_nombre, cliente_nif, lineas_json,
                 huella, huella_anterior, prev_registro_id, estado, ambiente, qr_url, xml, firma,
                 sale_id, idempotency_key, ts_generacion, created_at)
            VALUES
                (:company_id, :tipo, :serie, :numero, :fecha_expedicion, :nif_emisor, :tipo_factura,
                 :cuota_total, :importe_total, :cliente_nombre, :cliente_nif, :lineas_json,
                 :huella, :huella_anterior, :prev_registro_id, :estado, :ambiente, :qr_url, :xml, :firma,
                 :sale_id, :idempotency_key, :ts_generacion, :created_at)
        """), registro)
        new_id = cur.lastrowid
        # Bump the company's counter and log the event in the SAME transaction.
        db.execute(text("UPDATE config_fiscal SET siguiente_numero=:n WHERE company_id=:cid"),
                   {"n": numero + 1, "cid": company_id})
        log_evento(db, company_id, "registro_alta", registro_id=new_id,
                   detalle=f"{serie}{numero}", commit=False)
        db.commit()
    except IntegrityError:
        db.rollback()
        # Concurrent emit with the same idempotency key → return the winner.
        if idempotency_key:
            existing = db.execute(text(
                "SELECT * FROM verifactu_registro WHERE company_id=:cid AND idempotency_key=:k"
            ), {"cid": company_id, "k": idempotency_key}).mappings().first()
            if existing:
                return dict(existing)
        raise

    registro["id"] = new_id
    return registro


def anular(db: Session, company_id: int, registro_id: int) -> dict:
    """Create a linked anulación record (immutability: never edit/delete the alta)."""
    target = db.execute(text(
        "SELECT * FROM verifactu_registro WHERE id=:id AND company_id=:cid"
    ), {"id": registro_id, "cid": company_id}).mappings().first()
    if not target:
        raise VerifactuError("Registro no encontrado")
    if target["tipo"] == "anulacion":
        raise VerifactuError("El registro ya es una anulación")

    cfg = _config_fiscal(db, company_id)
    nif = cfg.get("nit")
    ambiente = cfg.get("ambiente") or "pruebas"
    prev = last_registro(db, company_id)
    huella_anterior = (prev["huella"] if prev else "") or ""
    ts_gen = _ts_now()

    canonical = C.canonical_anulacion(
        nif_emisor=nif, serie=target["serie"], numero=target["numero"],
        huella_anterior=huella_anterior, ts_generacion=ts_gen)
    h = huella(canonical)

    registro = {
        "company_id": company_id, "tipo": "anulacion", "serie": target["serie"],
        "numero": target["numero"], "fecha_expedicion": target["fecha_expedicion"],
        "nif_emisor": nif, "tipo_factura": target["tipo_factura"],
        "cuota_total": 0, "importe_total": 0, "cliente_nombre": target["cliente_nombre"],
        "cliente_nif": target["cliente_nif"], "lineas_json": None, "huella": h,
        "huella_anterior": huella_anterior, "prev_registro_id": (prev["id"] if prev else None),
        "registro_anulado_id": registro_id, "estado": "registrado", "ambiente": ambiente,
        "qr_url": target["qr_url"], "sale_id": target["sale_id"], "idempotency_key": None,
        "ts_generacion": ts_gen, "created_at": _ts_now(),
    }
    registro["xml"] = export_xml(registro)

    cur = db.execute(text("""
        INSERT INTO verifactu_registro
            (company_id, tipo, serie, numero, fecha_expedicion, nif_emisor, tipo_factura,
             cuota_total, importe_total, cliente_nombre, cliente_nif, lineas_json,
             huella, huella_anterior, prev_registro_id, registro_anulado_id, estado, ambiente,
             qr_url, xml, sale_id, idempotency_key, ts_generacion, created_at)
        VALUES
            (:company_id, :tipo, :serie, :numero, :fecha_expedicion, :nif_emisor, :tipo_factura,
             :cuota_total, :importe_total, :cliente_nombre, :cliente_nif, :lineas_json,
             :huella, :huella_anterior, :prev_registro_id, :registro_anulado_id, :estado, :ambiente,
             :qr_url, :xml, :sale_id, :idempotency_key, :ts_generacion, :created_at)
    """), registro)
    new_id = cur.lastrowid
    log_evento(db, company_id, "registro_anulacion", registro_id=new_id,
               detalle=f"anula {target['serie']}{target['numero']}", commit=False)
    db.commit()
    registro["id"] = new_id
    return registro


def _dump(obj):
    if obj is None:
        return None
    import json
    return json.dumps(obj, ensure_ascii=False, default=str)
