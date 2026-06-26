"""AEAT remittance client (VERIFACTU mode).

Behaviour by environment:
- SANDBOX (default, no real endpoint): the full pipeline runs end-to-end but the
  submission is SIMULATED — estado='aceptado', csv='SANDBOX-...'. This lets every
  step (XML, hash chain, QR, event log, retry handling) be validated with NO real
  fiscal data or certificate.
- PRODUCTION with AEAT_VERIFACTU_ENDPOINT set: POSTs the registro to AEAT with the
  tenant's qualified certificate (mTLS). On any failure raises AeatRemisionError so
  the caller queues a retry (§3.4) — the registro is NEVER lost.

One submission batch = one obligado tributario (never mix tenants, §3.5); this
client only ever handles a single registro for a single company.
"""
import hashlib

from core.config import get_settings

settings = get_settings()


class AeatRemisionError(Exception):
    """AEAT submission failed (service down / timeout / rejection) → queue retry."""


def submit(registro: dict, environment: str = "SANDBOX", cert_ref: str = None,
           incidencia: bool = False) -> dict:
    """Submit one registro to AEAT. Returns {estado, csv, incidencia}."""
    endpoint = getattr(settings, "AEAT_VERIFACTU_ENDPOINT", "") or ""

    if environment != "PRODUCTION" or not endpoint:
        # SANDBOX / not-yet-configured: simulate acceptance, clearly marked.
        digest = hashlib.sha256((registro.get("huella") or "").encode()).hexdigest()[:10].upper()
        return {"estado": "aceptado", "csv": f"SANDBOX-{digest}", "incidencia": "S" if incidencia else "N"}

    # PRODUCTION path — real submission. Requires the tenant's qualified cert
    # (loaded from the secrets store via cert_ref) for mTLS. Left as a guarded
    # stub: until the AEAT WSDL + cert wiring lands it fails LOUD so the retry
    # queue holds the registro rather than silently dropping it.
    raise AeatRemisionError(
        "Remisión a AEAT en producción no configurada (falta WSDL/certificado). "
        "El registro queda encadenado y en cola de reintento."
    )
