"""Veri*Factu huella (hash chain) + integrity verification.

huella = SHA-256(canonical_fields + huella_anterior), uppercase hex — mirrors the
core/audit.py prev_hash/row_hash mechanism but PER COMPANY and over the AEAT
canonical string. verify_chain walks a company's records and reports the first
break AND any gap in the per-company número sequence (a deleted tail still hashes
clean, so contiguity must be checked separately).
"""
import hashlib
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import canonical as C


def huella(canonical_str: str) -> str:
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest().upper()


def last_registro(db: Session, company_id: int):
    """The most recent registro for a company (for huella_anterior + numero)."""
    return db.execute(text("""
        SELECT id, numero, huella FROM verifactu_registro
        WHERE company_id = :cid ORDER BY id DESC LIMIT 1
    """), {"cid": company_id}).mappings().first()


def verify_chain(db: Session, company_id: int) -> dict:
    """Recompute the huella chain for a company and check número contiguity."""
    rows = db.execute(text("""
        SELECT id, tipo, serie, numero, fecha_expedicion, nif_emisor, tipo_factura,
               cuota_total, importe_total, huella, huella_anterior, ts_generacion
        FROM verifactu_registro WHERE company_id = :cid ORDER BY id ASC
    """), {"cid": company_id}).mappings().all()

    prev_huella = ""
    prev_numero = None
    for r in rows:
        if r["huella_anterior"] != prev_huella:
            return {"ok": False, "broken_at_id": r["id"], "reason": "huella_anterior mismatch"}
        if r["tipo"] == "anulacion":
            expected = huella(C.canonical_anulacion(
                nif_emisor=r["nif_emisor"], serie=r["serie"], numero=r["numero"],
                huella_anterior=prev_huella, ts_generacion=r["ts_generacion"]))
        else:
            expected = huella(C.canonical_alta(
                nif_emisor=r["nif_emisor"], serie=r["serie"], numero=r["numero"],
                fecha_expedicion=r["fecha_expedicion"], tipo_factura=r["tipo_factura"],
                cuota_total=r["cuota_total"], importe_total=r["importe_total"],
                huella_anterior=prev_huella, ts_generacion=r["ts_generacion"]))
        if r["huella"] != expected:
            return {"ok": False, "broken_at_id": r["id"], "reason": "huella mismatch (record altered)"}
        # Contiguity of the alta número sequence (anulación reuses the target número).
        if r["tipo"] != "anulacion":
            if prev_numero is not None and r["numero"] != prev_numero + 1:
                return {"ok": False, "broken_at_id": r["id"],
                        "reason": f"número gap ({prev_numero} → {r['numero']}) — possible deletion"}
            prev_numero = r["numero"]
        prev_huella = r["huella"]
    return {"ok": True, "records_verified": len(rows)}
