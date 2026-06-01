"""Cliente para Google Gemini."""
import os
import requests
from .llm_base import BaseLLMClient, LLMRequest


class GeminiClient(BaseLLMClient):
    provider_name = "gemini"

    def __init__(self, api_key=None, model="gemini-1.5-pro",
                 base_url="https://generativelanguage.googleapis.com/v1beta", **kw):
        api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY no está configurada")
        super().__init__(api_key=api_key, model=model, **kw)
        self.base_url = base_url

    def _do_request(self, req: LLMRequest):
        # Gemini une system + user en contents
        contents = []
        for h in req.history:
            role = "user" if h["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": h["content"]}]})
        # Multimodal: Gemini accepts images/PDFs as inline_data parts.
        parts = [{"text": f"{req.system_prompt}\n\n{req.user_message}"}]
        for img in req.images:
            parts.append({"inline_data": {"mime_type": img.get("media_type", "image/png"), "data": img["data"]}})
        contents.append({"role": "user", "parts": parts})

        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        r = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json={
                "contents": contents,
                "generationConfig": {
                    "temperature": req.temperature,
                    "maxOutputTokens": req.max_tokens,
                },
            },
            timeout=self.timeout,
        )
        r.raise_for_status()
        data = r.json()
        text = data['candidates'][0]['content']['parts'][0]['text']
        usage = data.get('usageMetadata', {})
        return {
            'text': text,
            'tokens_input': usage.get('promptTokenCount', 0),
            'tokens_output': usage.get('candidatesTokenCount', 0),
            'metadata': {'finish_reason': data['candidates'][0].get('finishReason')},
        }
