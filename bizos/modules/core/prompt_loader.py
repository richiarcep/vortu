"""
Carga prompts desde la base de datos.
Todos los módulos usan esta función en lugar de strings hardcodeados.
Incluye cache en memoria para no hacer una query por cada llamada a Claude.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.prompt import SystemPrompt

# Cache simple: {key: (content, loaded_at)}
_cache: dict = {}
_CACHE_TTL = timedelta(minutes=5)


def get_prompt(key: str, db: Session = None) -> str:
    """
    Devuelve el contenido del prompt para la key dada.
    Primero mira la cache, luego la BD.
    Si no existe en BD, lanza ValueError con mensaje claro.
    """
    # Check cache
    if key in _cache:
        content, loaded_at = _cache[key]
        if datetime.utcnow() - loaded_at < _CACHE_TTL:
            return content

    # Read from DB
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        prompt = db.query(SystemPrompt).filter(
            SystemPrompt.key == key,
            SystemPrompt.is_active == True
        ).first()

        if not prompt:
            raise ValueError(
                f"Prompt '{key}' no encontrado en BD. "
                f"Ejecuta: python seed_prompts.py"
            )

        _cache[key] = (prompt.content, datetime.utcnow())
        return prompt.content
    finally:
        if close_db:
            db.close()


def invalidate_cache(key: str = None):
    """Limpia la cache. Llamar después de editar un prompt."""
    global _cache
    if key:
        _cache.pop(key, None)
    else:
        _cache.clear()
