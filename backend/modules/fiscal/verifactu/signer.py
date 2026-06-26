"""XAdES signature over the registro — pluggable so dev/pruebas works without a
qualified certificate.

- NullSigner (default): no qualified cert available → returns None and the record
  is stored with estado='sin_firma' but STILL hashed + chained (the huella chain
  is the integrity guarantee regardless of signature).
- RealSigner (deferred stub): XAdES-BES enveloped signature using the company's
  uploaded .p12 (config_fiscal.certificado_path, password Fernet-decrypted via
  core/crypto). Implemented behind this interface so it lights up later by adding
  signxml/lxml without touching callers. Kept out of the default path so the build
  has no heavy XAdES dependency (and no Python-3.14 lxml wheel risk) until needed.
"""
from typing import Optional


class Signer:
    def sign(self, registro_xml: str) -> Optional[str]:
        raise NotImplementedError


class NullSigner(Signer):
    """No-op signer for environments without a qualified certificate."""
    def sign(self, registro_xml: str) -> Optional[str]:
        return None


def get_signer(config_fiscal: dict) -> Signer:
    """Return a RealSigner when a usable certificate is configured, else NullSigner.

    RealSigner is intentionally not wired yet (needs signxml/lxml + a qualified
    cert); when a cert path is present this still returns NullSigner so behaviour
    is correct and explicit (estado='sin_firma') rather than silently broken.
    """
    return NullSigner()
