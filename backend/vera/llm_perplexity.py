"""Cliente para Perplexity (búsqueda web con LLM)."""
import os
import requests
from .llm_base import BaseLLMClient, LLMRequest


class PerplexityClient(BaseLLMClient):
    provider_name = "perplexity"

    def __init__(self, api_key=None, model="sonar",
                 base_url="https://api.perplexity.ai", **kw):
        api_key = api_key or os.getenv("PERPLEXITY_API_KEY")
        if not api_key:
            raise ValueError("PERPLEXITY_API_KEY no está configurada")
        super().__init__(api_key=api_key, model=model, **kw)
        self.base_url = base_url

    def _do_request(self, req: LLMRequest):
        messages = [{"role": "system", "content": req.system_prompt}]
        messages.extend(req.history)
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
        citations = data.get('citations', [])
        return {
            'text': text,
            'tokens_input': usage.get('prompt_tokens', 0),
            'tokens_output': usage.get('completion_tokens', 0),
            'metadata': {'citations': citations},
        }
