"""vera.ask — punto de entrada ÚNICO para llamadas de IA de los módulos de negocio.

En vez de instanciar anthropic.Anthropic() con un modelo hardcodeado (Opus) en cada
módulo, todo pasa por aquí: se elige el modelo desde la config del admin
(vera_models_config vía LLMFactory), se respeta el plan/cuota (record_usage) y se
degrada con elegancia si algo falla.

Política de modelo (configurable: depende de qué providers estén activos en admin):
  quality="cheap"     → el más barato (Haiku/DeepSeek) — tareas triviales
  quality="balanced"  → Sonnet por defecto (calidad/coste)         [DEFECTO]
  quality="quality"   → Opus si está configurado, si no Sonnet
Si se pasan `images`, solo se eligen modelos con visión (nunca DeepSeek/Perplexity).
"""
import logging
from vera.llm_base import LLMRequest
from vera.llm_router import LLMFactory
from vera.quota_manager import record_usage

logger = logging.getLogger("vera.ask")

VISION_CAPABLE = {"claude", "claude-haiku", "claude-opus", "gemini", "openai"}

# Orden de preferencia por calidad. 'claude' = Sonnet en vera_models_config.
QUALITY_PREF = {
    "cheap":    ["claude-haiku", "deepseek", "gemini", "openai", "claude"],
    "balanced": ["claude", "gemini", "openai", "claude-haiku"],
    "quality":  ["claude-opus", "claude", "openai", "gemini"],
}


def _pick_client(db, quality: str, need_vision: bool):
    factory = LLMFactory(db)
    for prov in QUALITY_PREF.get(quality, QUALITY_PREF["balanced"]):
        if need_vision and prov not in VISION_CAPABLE:
            continue
        client = factory.get(prov)
        if client:
            return client
    # último recurso
    return factory.get("claude") or factory.get("claude-haiku")


def ask(db, company_id, *, module: str = "general", system: str = "",
        user: str = "", max_tokens: int = 512, quality: str = "balanced",
        images: list = None, temperature: float = 0.4, fallback: str = "") -> str:
    """Devuelve el texto del modelo (o `fallback` si no hay cliente/falla).

    `db` puede ser None: se abre una sesión propia para leer la config y registrar
    cuota (permite migrar funciones que no tienen `db` a mano). `company_id` puede ser
    None: se omite el registro de cuota.
    """
    images = images or []
    own_session = False
    if db is None:
        from core.database import SessionLocal
        db = SessionLocal()
        own_session = True
    try:
        client = _pick_client(db, quality, bool(images))
        if client is None:
            logger.warning("vera.ask [%s]: sin cliente LLM disponible", module)
            return fallback

        req = LLMRequest(system_prompt=system, user_message=user, max_tokens=max_tokens,
                         temperature=temperature, images=images)
        resp = client.generate(req)

        if company_id is not None:
            try:
                record_usage(db, company_id, resp.provider, resp.tokens_input, resp.tokens_output)
            except Exception as e:
                logger.debug("record_usage skipped: %s", e)

        if resp.error or not resp.text:
            logger.warning("vera.ask [%s] error con %s: %s", module, getattr(resp, "provider", "?"), resp.error)
            return fallback
        return resp.text
    except Exception as e:
        # ask() debe devolver texto o `fallback`, nunca propagar: un fallo de IA
        # (cliente, red, config) no debe tumbar el endpoint que la invoca.
        logger.warning("vera.ask [%s] excepción: %s", module, e)
        return fallback
    finally:
        if own_session:
            db.close()


def ask_full(db, company_id: int, **kwargs):
    """Igual que ask() pero devuelve el LLMResponse completo (texto, tokens, coste, provider)."""
    images = kwargs.get("images") or []
    client = _pick_client(db, kwargs.get("quality", "balanced"), bool(images))
    if client is None:
        return None
    req = LLMRequest(system_prompt=kwargs.get("system", ""), user_message=kwargs.get("user", ""),
                     max_tokens=kwargs.get("max_tokens", 512), temperature=kwargs.get("temperature", 0.4),
                     images=images)
    resp = client.generate(req)
    try:
        record_usage(db, company_id, resp.provider, resp.tokens_input, resp.tokens_output)
    except Exception:
        pass
    return resp
