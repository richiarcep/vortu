"""Adaptador de compatibilidad: un "cliente" con la MISMA interfaz que anthropic.Anthropic
(`client.messages.create(...).content[0].text`) pero que por dentro enruta por Vera
(vera.ask → vera_models_config + cuota). Permite migrar los módulos cambiando UNA línea:

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
  →
    client = vera_client(db, company_id, module="finanzas")

El resto del código del módulo (messages.create, .content[0].text, .usage) sigue igual.
El `model=` que pase el módulo se ignora: Vera elige el modelo según la config del admin.
Soporta texto y visión (bloques image/document de Anthropic).
"""
from vera.ask import ask


class _Block:
    def __init__(self, text):
        self.text = text
        self.type = "text"


class _Usage:
    input_tokens = 0
    output_tokens = 0


class _Message:
    def __init__(self, text):
        self.content = [_Block(text)]
        self.usage = _Usage()
        self.stop_reason = "end_turn"


def _extract(messages, system):
    """Saca (system, user_text, images[]) de los `messages` estilo Anthropic."""
    sys_txt = system if isinstance(system, str) else ""
    user_parts, images = [], []
    for m in (messages or []):
        if m.get("role") != "user":
            continue
        content = m.get("content")
        if isinstance(content, str):
            user_parts.append(content)
        elif isinstance(content, list):
            for block in content:
                btype = block.get("type")
                if btype == "text":
                    user_parts.append(block.get("text", ""))
                elif btype in ("image", "document"):
                    src = block.get("source", {})
                    if src.get("type") == "base64":
                        images.append({"kind": btype, "media_type": src.get("media_type", "image/png"),
                                       "data": src.get("data", "")})
    return sys_txt, "\n".join(user_parts), images


class _Messages:
    def __init__(self, db, company_id, module, quality):
        self._db, self._cid, self._module, self._quality = db, company_id, module, quality

    def create(self, model=None, max_tokens=1024, messages=None, system=None,
               temperature=0.4, **kw):
        sys_txt, user_txt, images = _extract(messages, system)
        text = ask(self._db, self._cid, module=self._module, system=sys_txt, user=user_txt,
                   max_tokens=max_tokens, quality=self._quality, images=images,
                   temperature=temperature, fallback="")
        return _Message(text)


class VeraClient:
    """Mímica de anthropic.Anthropic; enruta por Vera."""
    def __init__(self, db, company_id, module="general", quality="balanced"):
        self.messages = _Messages(db, company_id, module, quality)


def vera_client(db, company_id, module="general", quality="balanced") -> VeraClient:
    return VeraClient(db, company_id, module, quality)
