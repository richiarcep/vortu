import json
import anthropic
import base64
from pathlib import Path
from datetime import date
from sqlalchemy.orm import Session
from core.config import get_settings
from modules.accounting.revenue_register import (
    registrar_ingreso,
    registrar_gasto,
    CATEGORIAS_INGRESO,
    CATEGORIAS_GASTO
)

settings = get_settings()


def read_register_pdf(
    file_path: str,
    db: Session,
    company_id: int,
    auto_register: bool = True
) -> dict:
    """
    Uses Claude to read an uploaded daily register PDF.
    Extracts all transactions and optionally registers them
    automatically in the accounting system.

    Works with:
    - Official Nexum templates
    - Any bank statement PDF
    - Any handwritten or typed register
    - Scanned receipts and invoices
    """

    # Step 1 — Read the PDF file as base64
    file_content = Path(file_path).read_bytes()
    file_base64 = base64.standard_b64encode(file_content).decode("utf-8")

    # Step 2 — Build the category lists for Claude
    categorias_ingreso = [k for k in CATEGORIAS_INGRESO.keys()]
    categorias_gasto = [k for k in CATEGORIAS_GASTO.keys()]

    # Step 3 — Send to Claude with vision
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": file_base64
                    }
                },
                {
                    "type": "text",
                    "text": f"""Eres un contador profesional experto en lectura de 
registros contables. Analiza este documento PDF y extrae TODAS las 
transacciones financieras que encuentres.

Para cada transacción identifica:
- fecha (formato YYYY-MM-DD, si no hay año usa el año actual)
- tipo: "ingreso" o "gasto"
- categoria: usa EXACTAMENTE una de estas categorías según corresponda

CATEGORÍAS DE INGRESO válidas: {categorias_ingreso}
CATEGORÍAS DE GASTO válidas: {categorias_gasto}

- descripcion: descripción clara de la transacción
- monto: número decimal positivo (sin símbolo de moneda)
- referencia: número de factura o referencia si existe, null si no

Si el documento es una plantilla Nexum, lee el QR y extrae el 
document_id del encabezado.

Devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta:
{{
    "documento_nexum": true o false,
    "document_id": "NXM-..." o null,
    "company_id_qr": número o null,
    "periodo_detectado": "YYYY-MM" o null,
    "total_transacciones": número,
    "transacciones": [
        {{
            "fecha": "YYYY-MM-DD",
            "tipo": "ingreso" o "gasto",
            "categoria": "categoria_exacta",
            "descripcion": "descripción",
            "monto": número,
            "referencia": "ref" o null,
            "confianza": "alta" o "media" o "baja"
        }}
    ],
    "advertencias": ["advertencia si algo no está claro"],
    "resumen": {{
        "total_ingresos": número,
        "total_gastos": número,
        "resultado_neto": número
    }}
}}

No incluyas explicaciones, solo el JSON."""
                }
            ]
        }]
    )

    # Step 4 — Parse Claude's response
    raw_response = message.content[0].text
    try:
        extracted_data = json.loads(raw_response)
    except json.JSONDecodeError:
        # Try to find JSON in the response
        import re
        json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if json_match:
            extracted_data = json.loads(json_match.group())
        else:
            return {
                "error": "No se pudo extraer datos del documento",
                "raw_response": raw_response
            }

    # Step 5 — Auto-register transactions if requested
    registered = []
    errors = []

    if auto_register and "transacciones" in extracted_data:
        for tx in extracted_data["transacciones"]:
            try:
                # Only register high and medium confidence transactions
                if tx.get("confianza") == "baja":
                    errors.append({
                        "transaccion": tx,
                        "error": "Confianza baja — requiere revisión manual"
                    })
                    continue

                tx_date = date.fromisoformat(tx["fecha"])

                if tx["tipo"] == "ingreso":
                    result = registrar_ingreso(
                        db=db,
                        company_id=company_id,
                        fecha=tx_date,
                        categoria=tx["categoria"],
                        descripcion=tx["descripcion"],
                        monto=tx["monto"],
                        referencia=tx.get("referencia"),
                        notas=f"Importado automáticamente desde PDF"
                    )
                else:
                    result = registrar_gasto(
                        db=db,
                        company_id=company_id,
                        fecha=tx_date,
                        categoria=tx["categoria"],
                        descripcion=tx["descripcion"],
                        monto=tx["monto"],
                        referencia=tx.get("referencia"),
                        notas=f"Importado automáticamente desde PDF"
                    )

                registered.append({
                    "descripcion": tx["descripcion"],
                    "monto": tx["monto"],
                    "tipo": tx["tipo"],
                    "asiento": result.get("asiento_contable")
                })

            except Exception as e:
                errors.append({
                    "transaccion": tx,
                    "error": str(e)
                })

    return {
        "estado": "completado",
        "documento_nexum": extracted_data.get("documento_nexum", False),
        "document_id": extracted_data.get("document_id"),
        "total_detectadas": extracted_data.get("total_transacciones", 0),
        "total_registradas": len(registered),
        "total_errores": len(errors),
        "transacciones_registradas": registered,
        "transacciones_con_error": errors,
        "advertencias": extracted_data.get("advertencias", []),
        "resumen": extracted_data.get("resumen", {}),
        "todas_las_transacciones": extracted_data.get("transacciones", [])
    }


def validate_nexum_document(document_id: str, company_id: int) -> dict:
    """
    Validates that a scanned Nexum document belongs to
    the correct company and has not been tampered with.
    """
    import hashlib

    try:
        # Parse document ID: NXM-COMPANYID-PERIOD-CHECKSUM
        parts = document_id.split("-")
        if len(parts) != 4 or parts[0] != "NXM":
            return {"valido": False, "razon": "Formato de ID inválido"}

        doc_company_id = int(parts[1])
        period = parts[2]
        checksum = parts[3]

        # Verify company match
        if doc_company_id != company_id:
            return {
                "valido": False,
                "razon": "Este documento pertenece a otra empresa"
            }

        # Verify checksum
        base = f"{doc_company_id}-{period}"
        expected_checksum = hashlib.md5(
            base.encode()
        ).hexdigest()[:6].upper()

        if checksum != expected_checksum:
            return {
                "valido": False,
                "razon": "El documento ha sido modificado o está corrupto"
            }

        return {
            "valido": True,
            "company_id": doc_company_id,
            "periodo": period,
            "document_id": document_id
        }

    except Exception as e:
        return {"valido": False, "razon": str(e)}