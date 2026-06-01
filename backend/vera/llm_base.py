"""
Cliente base para todos los LLMs.
Define la interfaz unificada que cada provider implementa.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
import time


@dataclass
class LLMResponse:
    """Respuesta unificada de cualquier LLM."""
    text: str
    provider: str
    model: str
    tokens_input: int = 0
    tokens_output: int = 0
    latency_ms: int = 0
    cost_estimated: float = 0.0
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return self.error is None and len(self.text) > 0


@dataclass
class LLMRequest:
    """Petición unificada a cualquier LLM.

    `images` enables multimodal (VLM) requests. Each item is:
      {"kind": "image"|"document", "media_type": "image/png"|"application/pdf", "data": <base64 str>}
    Empty by default → existing text-only callers are unaffected. Providers that
    don't support vision (e.g. perplexity) ignore it.
    """
    system_prompt: str
    user_message: str
    max_tokens: int = 1024
    temperature: float = 0.7
    history: List[Dict[str, str]] = field(default_factory=list)
    images: List[Dict[str, Any]] = field(default_factory=list)


class BaseLLMClient(ABC):
    """Cliente abstracto. Cada provider hereda y implementa generate()."""

    provider_name: str = "base"

    def __init__(self, api_key: str, model: str,
                 cost_in: float = 0.0, cost_out: float = 0.0,
                 timeout: int = 30):
        self.api_key = api_key
        self.model = model
        self.cost_in = cost_in
        self.cost_out = cost_out
        self.timeout = timeout

    @abstractmethod
    def _do_request(self, req: LLMRequest) -> Dict[str, Any]:
        """Hace la llamada real al API. Devuelve dict con text, tokens_in, tokens_out."""
        pass

    def generate(self, req: LLMRequest) -> LLMResponse:
        """Llama al LLM con manejo de errores y medición."""
        start = time.time()
        try:
            result = self._do_request(req)
            elapsed = int((time.time() - start) * 1000)
            tokens_in = result.get('tokens_input', 0)
            tokens_out = result.get('tokens_output', 0)
            cost = (tokens_in / 1000 * self.cost_in) + (tokens_out / 1000 * self.cost_out)
            return LLMResponse(
                text=result.get('text', ''),
                provider=self.provider_name,
                model=self.model,
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                latency_ms=elapsed,
                cost_estimated=cost,
                metadata=result.get('metadata', {}),
            )
        except Exception as e:
            elapsed = int((time.time() - start) * 1000)
            return LLMResponse(
                text='',
                provider=self.provider_name,
                model=self.model,
                latency_ms=elapsed,
                error=str(e),
            )

    def __repr__(self):
        return f"{self.provider_name}({self.model})"
