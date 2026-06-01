"""Cliente para Anthropic Claude (Sonnet, Haiku, Opus)."""
import os
from anthropic import Anthropic
from .llm_base import BaseLLMClient, LLMRequest


class ClaudeClient(BaseLLMClient):
    provider_name = "claude"

    def __init__(self, api_key=None, model="claude-sonnet-4-6", provider_name=None, **kw):
        api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY no está configurada")
        super().__init__(api_key=api_key, model=model, **kw)
        self.client = Anthropic(api_key=api_key)
        # Permitir override del provider_name (para distinguir claude-haiku de claude)
        if provider_name:
            self.provider_name = provider_name

    def _do_request(self, req: LLMRequest):
        messages = list(req.history)
        if req.images:
            # Multimodal: image/document blocks first, then the text prompt.
            # PDFs use the native 'document' block (no rasterizing); pages/photos use 'image'.
            content = []
            for img in req.images:
                block_type = "document" if img.get("kind") == "document" else "image"
                content.append({
                    "type": block_type,
                    "source": {
                        "type": "base64",
                        "media_type": img.get("media_type", "image/png"),
                        "data": img["data"],
                    },
                })
            content.append({"type": "text", "text": req.user_message})
            messages.append({"role": "user", "content": content})
        else:
            messages.append({"role": "user", "content": req.user_message})
        response = self.client.messages.create(
            model=self.model,
            max_tokens=req.max_tokens,
            system=req.system_prompt,
            messages=messages,
            temperature=req.temperature,
        )
        text = "".join(b.text for b in response.content if hasattr(b, "text"))
        return {
            "text": text,
            "tokens_input": response.usage.input_tokens,
            "tokens_output": response.usage.output_tokens,
            "metadata": {"stop_reason": response.stop_reason},
        }
