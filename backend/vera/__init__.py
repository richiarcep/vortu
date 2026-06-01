"""
Vera — Orquestador IA central de Vortu.

Reglas:
1. Único cerebro IA del sistema. Ningún módulo llama Claude directo.
2. Decide APIs externas automáticamente (híbrido: reglas + IA si hay duda).
3. Guarda cada conversación y análisis en Chroma (memoria total).
"""

from vera.engine import vera_chat, vera_analyze
from vera.router import router

__all__ = ["vera_chat", "vera_analyze", "router"]
