"""
Llamadas a APIs externas. Devuelven texto plano que se inyecta al prompt.
Todas son síncronas y manejan errores silenciosamente (si fallan, Vera sigue).
"""
import os
import httpx
from typing import Optional


def buscar_perplexity(query: str) -> Optional[str]:
    """
    Perplexity: búsqueda + síntesis en una sola llamada.
    Disponible en Vera base y Plus.
    """
    api_key = os.getenv("PERPLEXITY_API_KEY", "")
    if not api_key:
        return None

    try:
        resp = httpx.post(
            "https://api.perplexity.ai/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "sonar",
                "messages": [{"role": "user", "content": query}],
                "max_tokens": 500,
            },
            timeout=15.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception:
        return None
    return None


def buscar_google(query: str) -> Optional[str]:
    """
    Google Custom Search API. Devuelve los 3 primeros resultados como texto.
    Solo Vera Plus.
    """
    api_key = os.getenv("GOOGLE_SEARCH_API_KEY", "")
    cx = os.getenv("GOOGLE_SEARCH_CX", "")
    if not api_key or not cx:
        return None

    try:
        resp = httpx.get(
            "https://www.googleapis.com/customsearch/v1",
            params={"key": api_key, "cx": cx, "q": query, "num": 3},
            timeout=10.0,
        )
        if resp.status_code == 200:
            items = resp.json().get("items", [])
            lines = []
            for item in items[:3]:
                title = item.get("title", "")
                snippet = item.get("snippet", "")
                link = item.get("link", "")
                lines.append(f"- {title}: {snippet} ({link})")
            return "\n".join(lines) if lines else None
    except Exception:
        return None
    return None


def consultar_openai(query: str) -> Optional[str]:
    """
    GPT-4 como segunda opinión / razonamiento alternativo.
    Solo Vera Plus.
    """
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return None

    try:
        resp = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": query}],
                "max_tokens": 500,
            },
            timeout=15.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except Exception:
        return None
    return None


def ejecutar_apis(apis_activas: list, query: str) -> str:
    """
    Ejecuta todas las APIs activas y devuelve un bloque de texto consolidado
    listo para inyectar al prompt de Claude.
    """
    if not apis_activas:
        return ""

    bloques = []

    if "perplexity" in apis_activas:
        r = buscar_perplexity(query)
        if r:
            bloques.append(f"[PERPLEXITY]\n{r}")

    if "google_search" in apis_activas:
        r = buscar_google(query)
        if r:
            bloques.append(f"[GOOGLE SEARCH]\n{r}")

    if "openai" in apis_activas:
        r = consultar_openai(query)
        if r:
            bloques.append(f"[GPT-4 segunda opinión]\n{r}")

    if not bloques:
        return ""

    return "\n\nDATOS EXTERNOS (APIs):\n" + "\n\n".join(bloques)
