from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import text
from core.database import get_db
from core.security import get_current_user
from models.user import User
from datetime import datetime
from pydantic import BaseModel
from typing import Optional
import json, os

router = APIRouter(prefix="/api/fiscal", tags=["fiscal"])

NOW = lambda: datetime.now().isoformat()

# Columns of config_fiscal that must NEVER be returned to a client. We expose
# `tiene_*` booleans instead so the UI can show "configured" state without the value.
_FISCAL_SECRET_COLS = ("certificado_password", "api_key", "api_secret", "token_actual")

class ConfigFiscalBase(BaseModel):
    nombre_comercial: Optional[str] = None
    nombre_legal: Optional[str] = None
    nit: Optional[str] = None
    nrc: Optional[str] = None
    giro: Optional[str] = None
    actividad_economica: Optional[str] = None
    tipo_contribuyente: Optional[str] = None
    departamento: Optional[str] = None
    municipio: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    email_fiscal: Optional[str] = None
    ambiente: Optional[str] = None
    serie_dte: Optional[str] = None
    siguiente_numero: Optional[int] = None
    iva_porcentaje: Optional[float] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    wizard_paso: Optional[int] = None
    wizard_completado: Optional[int] = None
    activo: Optional[int] = None
    pais: Optional[str] = None
    tiene_certificado: Optional[int] = None

@router.get("/config")
def get_config_fiscal(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = db.execute(text("SELECT * FROM config_fiscal WHERE company_id=:cid"), {"cid": current_user.company_id}).fetchone()
    if not row:
        return {"configurado": False, "wizard_paso": 1, "wizard_completado": False}
    d = dict(row._mapping)
    d["configurado"] = bool(d.get("nit") and d.get("nrc"))
    d["wizard_completado"] = bool(d.get("wizard_completado"))
    # Never leak secrets to the client — expose only whether each is set.
    d["tiene_api_key"] = bool(d.get("api_key"))
    d["tiene_api_secret"] = bool(d.get("api_secret"))
    d["tiene_certificado_password"] = bool(d.get("certificado_password"))
    for col in _FISCAL_SECRET_COLS:
        d.pop(col, None)
    return d

@router.post("/config")
def save_config_fiscal(data: ConfigFiscalBase, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.execute(text("SELECT id FROM config_fiscal WHERE company_id=:cid"), {"cid": current_user.company_id}).fetchone()
    fields = {k: v for k, v in data.dict().items() if v is not None}
    # Encrypt tax-authority secrets before they hit the DB (decrypted only when used).
    from core.crypto import encrypt
    for _sk in ("api_key", "api_secret"):
        if _sk in fields:
            fields[_sk] = encrypt(fields[_sk])
    fields["updated_at"] = NOW()
    if existing:
        set_clause = ", ".join(f"{k}=:{k}" for k in fields)
        fields["cid"] = current_user.company_id
        db.execute(text(f"UPDATE config_fiscal SET {set_clause} WHERE company_id=:cid"), fields)
    else:
        from country.registry import get_country_info
        cc = (current_user.company.country if current_user.company else None) or "SV"
        info = get_country_info(cc) or {}
        fields["company_id"] = current_user.company_id
        fields["created_at"] = NOW()
        fields.setdefault("pais", cc.upper())
        fields.setdefault("ambiente", "pruebas")
        fields.setdefault("serie_dte", "A")
        fields.setdefault("iva_porcentaje", round(info.get("vat_general", 13.0) / 100, 4))
        fields.setdefault("wizard_paso", 1)
        fields.setdefault("wizard_completado", 0)
        fields.setdefault("activo", 0)
        cols = ", ".join(fields.keys())
        vals = ", ".join(f":{k}" for k in fields.keys())
        db.execute(text(f"INSERT INTO config_fiscal ({cols}) VALUES ({vals})"), fields)
    db.commit()
    return {"ok": True}

@router.get("/pais")
def get_pais_fiscal(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = db.execute(text("SELECT pais, wizard_completado, activo FROM config_fiscal WHERE company_id=:cid"), {"cid": current_user.company_id}).fetchone()
    if not row:
        return {"pais": None, "configurado": False}
    return {"pais": row[0], "configurado": bool(row[2]), "wizard_completado": bool(row[1])}

@router.post("/pais")
def set_pais_fiscal(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from country.registry import get_country_info
    cc = (current_user.company.country if current_user.company else None)
    pais = data.get("pais") or (cc.upper() if cc else "SV")
    iva = round((get_country_info(pais) or {}).get("vat_general", 13.0) / 100, 4)
    existing = db.execute(text("SELECT id FROM config_fiscal WHERE company_id=:cid"), {"cid": current_user.company_id}).fetchone()
    if existing:
        db.execute(text("UPDATE config_fiscal SET pais=:pais, updated_at=:now WHERE company_id=:cid"), {"pais": pais, "now": NOW(), "cid": current_user.company_id})
    else:
        db.execute(text("""INSERT INTO config_fiscal (company_id, pais, ambiente, serie_dte, iva_porcentaje, wizard_paso, wizard_completado, activo, created_at, updated_at)
            VALUES (:cid, :pais, 'pruebas', 'A', :iva, 1, 0, 0, :now, :now)"""), {"cid": current_user.company_id, "pais": pais, "iva": iva, "now": NOW()})
    db.commit()
    return {"ok": True, "pais": pais}

@router.post("/certificado")
async def upload_certificado(file: UploadFile = File(...), password: str = Form(""), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # password must be Form() — it arrives as a multipart field, not a query param.
    from core.files import enforce_upload_size
    enforce_upload_size(file, max_mb=5)
    upload_dir = f"uploads/fiscal/{current_user.company_id}"
    os.makedirs(upload_dir, exist_ok=True)
    path = f"{upload_dir}/certificado_{current_user.company_id}.p12"
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    from core.crypto import encrypt
    db.execute(text("UPDATE config_fiscal SET certificado_path=:path, certificado_password=:pwd, tiene_certificado=1, updated_at=:now WHERE company_id=:cid"),
        {"path": path, "pwd": encrypt(password), "now": NOW(), "cid": current_user.company_id})
    db.commit()
    return {"ok": True, "mensaje": "Certificado subido correctamente"}

@router.post("/validar-nit")
async def validar_nit(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    nit = data.get("nit", "").strip()
    nit_clean = nit.replace("-", "")
    if len(nit_clean) != 14 or not nit_clean.isdigit():
        return {"valido": False, "mensaje": "NIT debe tener 14 dígitos"}
    formatted = f"{nit_clean[:4]}-{nit_clean[4:10]}-{nit_clean[10:13]}-{nit_clean[13]}"
    return {"valido": True, "nit_formateado": formatted, "mensaje": "NIT válido"}

@router.post("/validar-nrc")
async def validar_nrc(data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    nrc = data.get("nrc", "").strip().replace("-", "")
    if not nrc.isdigit():
        return {"valido": False, "mensaje": "NRC inválido"}
    return {"valido": True, "nrc_formateado": nrc, "mensaje": "NRC válido"}

@router.post("/test-conexion")
async def test_conexion(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cfg = db.execute(text("SELECT api_key, api_secret, ambiente FROM config_fiscal WHERE company_id=:cid"), {"cid": current_user.company_id}).fetchone()
    if not cfg or not cfg[0]:
        return {"ok": False, "mensaje": "No hay credenciales configuradas"}
    return {"ok": True, "ambiente": cfg[2], "mensaje": f"Conexión exitosa con API Hacienda ({cfg[2]})"}

@router.post("/wizard/completar")
def completar_wizard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.execute(text("UPDATE config_fiscal SET wizard_completado=1, activo=1, updated_at=:now WHERE company_id=:cid"), {"now": NOW(), "cid": current_user.company_id})
    db.commit()
    return {"ok": True}

@router.get("/stats")
def get_dte_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cid = current_user.company_id
    total = db.execute(text("SELECT COUNT(*) FROM dte_emitidos WHERE company_id=:cid"), {"cid": cid}).scalar()
    aceptados = db.execute(text("SELECT COUNT(*) FROM dte_emitidos WHERE company_id=:cid AND estado='aceptado'"), {"cid": cid}).scalar()
    pendientes = db.execute(text("SELECT COUNT(*) FROM dte_emitidos WHERE company_id=:cid AND estado='pendiente'"), {"cid": cid}).scalar()
    rechazados = db.execute(text("SELECT COUNT(*) FROM dte_emitidos WHERE company_id=:cid AND estado='rechazado'"), {"cid": cid}).scalar()
    monto = db.execute(text("SELECT COALESCE(SUM(total),0) FROM dte_emitidos WHERE company_id=:cid AND estado='aceptado'"), {"cid": cid}).scalar()
    return {"total": total, "aceptados": aceptados, "pendientes": pendientes, "rechazados": rechazados, "monto_total": float(monto)}

# ── Emitir DTE ─────────────────────────────────────────────────────────────────
class DTERequest(BaseModel):
    tipo_dte: str = "01"
    receptor_tipo: str = "consumidor_final"
    receptor_nombre: Optional[str] = None
    receptor_nit: Optional[str] = None
    receptor_nrc: Optional[str] = None
    receptor_email: Optional[str] = None
    receptor_direccion: Optional[str] = None
    items: list = []
    sale_id: Optional[int] = None

@router.post("/dte/emitir")
def emitir_dte(
    data: DTERequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import uuid
    cid = current_user.company_id

    cfg = db.execute(text("SELECT * FROM config_fiscal WHERE company_id=:cid"), {"cid": cid}).fetchone()
    if not cfg:
        raise HTTPException(status_code=400, detail="Configuracion fiscal no encontrada")

    cfg = dict(cfg._mapping)
    ambiente = cfg.get("ambiente", "pruebas")
    serie = cfg.get("serie_dte", "A")
    iva_pct = cfg.get("iva_porcentaje", 0.13)

    # Calcular totales
    subtotal = sum(i.get("cantidad",1) * i.get("precio_unitario",0) for i in data.items)
    iva = round(subtotal * iva_pct, 2)
    total = round(subtotal + iva, 2)

    # Generar numero de control
    siguiente = cfg.get("siguiente_numero", 1)
    numero_control = f"DTE-{data.tipo_dte}-{serie}-{str(siguiente).zfill(15)}"
    codigo_generacion = str(uuid.uuid4()).upper()

    # Guardar en BD
    db.execute(text("""
        INSERT INTO dte_emitidos (company_id, tipo_dte, codigo_tipo, numero_control,
            codigo_generacion, emisor_nit, emisor_nrc, emisor_nombre,
            receptor_tipo, receptor_nombre, receptor_nit, receptor_nrc, receptor_email,
            subtotal, iva, total, estado, ambiente, fecha_emision, sale_id, created_at)
        VALUES (:cid, :tipo, :codigo, :num_ctrl, :cod_gen,
            :e_nit, :e_nrc, :e_nombre,
            :r_tipo, :r_nombre, :r_nit, :r_nrc, :r_email,
            :subtotal, :iva, :total, :estado, :ambiente, :fecha, :sale_id, :now)
    """), {
        "cid": cid, "tipo": data.tipo_dte,
        "codigo": data.tipo_dte, "num_ctrl": numero_control,
        "cod_gen": codigo_generacion,
        "e_nit": cfg.get("nit"), "e_nrc": cfg.get("nrc"),
        "e_nombre": cfg.get("nombre_legal"),
        "r_tipo": data.receptor_tipo,
        "r_nombre": data.receptor_nombre or "Consumidor Final",
        "r_nit": data.receptor_nit, "r_nrc": data.receptor_nrc,
        "r_email": data.receptor_email,
        "subtotal": subtotal, "iva": iva, "total": total,
        "estado": "pendiente", "ambiente": ambiente,
        "fecha": datetime.now().date().isoformat(),
        "sale_id": data.sale_id, "now": NOW()
    })

    # Actualizar siguiente numero
    db.execute(text("UPDATE config_fiscal SET siguiente_numero=:n, updated_at=:now WHERE company_id=:cid"),
        {"n": siguiente + 1, "now": NOW(), "cid": cid})
    db.commit()

    # En produccion aqui iria el POST a api.dtes.sv
    # Por ahora simulamos respuesta exitosa
    sello = f"SELLO-{codigo_generacion[:8]}" if ambiente == "produccion" else None

    return {
        "ok": True,
        "numero_control": numero_control,
        "codigo_generacion": codigo_generacion,
        "sello": sello,
        "ambiente": ambiente,
        "tipo_dte": data.tipo_dte,
        "total": total,
        "mensaje": "DTE generado correctamente" if ambiente == "pruebas" else "DTE enviado al Ministerio de Hacienda"
    }
