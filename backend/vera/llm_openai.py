"""Cliente para OpenAI GPT."""
import os
import requests
from .llm_base import BaseLLMClient, LLMRequest


class OpenAIClient(BaseLLMClient):
    provider_name = "openai"

    def __init__(self, api_key=None, model="gpt-4o",
                 base_url="https://api.openai.com/v1", **kw):
        api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY no está configurada")
        super().__init__(api_key=api_key, model=model, **kw)
        self.base_url = base_url

    def _do_request(self, req: LLMRequest):
        messages = [{"role": "system", "content": req.system_prompt}]
        messages.extend(req.history)
        # Multimodal: OpenAI accepts images (not PDFs) as data-URI image_url parts.
        img_parts = [
            {"type": "image_url",
             "image_url": {"url": f"data:{img.get('media_type','image/png')};base64,{img['data']}"}}
            for img in req.images if img.get("kind") != "document"
        ]
        if img_parts:
            messages.append({"role": "user", "content": [{"type": "text", "text": req.user_message}, *img_parts]})
        else:
            messages.append({"role": "user", "content": req.user_message})

        r = requests.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": self.model,
                "messages": messages,
                "max_tokens": req.max_tokens,
                "temperature": req.temperature,
            },
            timeout=self.timeout,
        )
        r.raise_for_status()
        data = r.json()
        text = data['choices'][0]['message']['content']
        usage = data.get('usage', {})
        return {
            'text': text,
            'tokens_input': usage.get('prompt_tokens', 0),
            'tokens_output': usage.get('completion_tokens', 0),
            'metadata': {'finish_reason': data['choices'][0].get('finish_reason')},
        }
