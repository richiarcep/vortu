"""
Factory de clientes LLM + estrategias de combinación.
Lee la configuración de vera_models_config y aplica vera_routing_rules.
"""
import os
import json
import time
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy.orm import Session
from sqlalchemy import text

from .llm_base import BaseLLMClient, LLMRequest, LLMResponse
from .quota_manager import select_model_for_request, record_usage, get_company_plan


# ──────────────────────────────────────────────────────────────
# FACTORY — construye clientes desde la BD
# ──────────────────────────────────────────────────────────────
class LLMFactory:
    """Crea clientes LLM leyendo la configuración de vera_models_config."""

    def __init__(self, db: Session):
        self.db = db
        self._cache = {}  # provider -> cliente instanciado

    def get(self, provider: str) -> Optional[BaseLLMClient]:
        """Devuelve el cliente del provider o None si no está disponible."""
        if provider in self._cache:
            return self._cache[provider]

        row = self.db.execute(text("""
            SELECT model_id, api_key_env, base_url, is_active,
                   cost_per_1k_input, cost_per_1k_output, timeout_seconds
            FROM vera_models_config WHERE provider = :p
        """), {"p": provider}).fetchone()

        if not row or not row[3]:  # no existe o inactivo
            return None

        model_id, api_key_env, base_url, _, cost_in, cost_out, timeout = row
        api_key = os.getenv(api_key_env)
        if not api_key:
            return None  # No hay API key configurada

        try:
            client = self._build(provider, model_id, api_key, base_url,
                                 cost_in, cost_out, timeout)
            self._cache[provider] = client
            return client
        except Exception as e:
            print(f"[LLMFactory] error creando {provider}: {e}")
            return None

    def _build(self, provider, model, api_key, base_url, cost_in, cost_out, timeout):
        if provider in ("claude", "claude-haiku", "claude-opus"):
            from .llm_claude import ClaudeClient
            return ClaudeClient(api_key=api_key, model=model,
                                provider_name=provider,
                                cost_in=cost_in, cost_out=cost_out, timeout=timeout)
        elif provider in ("openai", "deepseek"):
            # DeepSeek exposes an OpenAI-compatible API → reuse the OpenAI client.
            # Its base_url (e.g. https://api.deepseek.com/v1) comes from vera_models_config.
            from .llm_openai import OpenAIClient
            c = OpenAIClient(api_key=api_key, model=model, base_url=base_url,
                             cost_in=cost_in, cost_out=cost_out, timeout=timeout)
            c.provider_name = provider
            return c
        elif provider == "gemini":
            from .llm_gemini import GeminiClient
            return GeminiClient(api_key=api_key, model=model, base_url=base_url,
                                cost_in=cost_in, cost_out=cost_out, timeout=timeout)
        elif provider == "perplexity":
            from .llm_perplexity import PerplexityClient
            return PerplexityClient(api_key=api_key, model=model, base_url=base_url,
                                    cost_in=cost_in, cost_out=cost_out, timeout=timeout)
        raise ValueError(f"Provider desconocido: {provider}")

    def available(self) -> List[str]:
        """Lista de providers que están activos Y tienen API key válida."""
        rows = self.db.execute(text("""
            SELECT provider, api_key_env FROM vera_models_config WHERE is_active = 1
        """)).fetchall()
        return [r[0] for r in rows if os.getenv(r[1])]


# ──────────────────────────────────────────────────────────────
# STRATEGIES — cómo combinar múltiples LLMs
# ──────────────────────────────────────────────────────────────
class Strategy:
    """Base. Cada estrategia recibe la lista de clientes y devuelve respuesta consolidada."""

    name = "base"

    def execute(self, clients: List[BaseLLMClient], req: LLMRequest) -> Dict:
        raise NotImplementedError


class CascadeStrategy(Strategy):
    """Prueba clientes en orden. Si uno falla, prueba el siguiente."""

    name = "cascade"

    def execute(self, clients, req):
        attempts = []
        for c in clients:
            resp = c.generate(req)
            attempts.append(resp)
            if resp.ok:
                return {
                    'text': resp.text,
                    'winning_model': resp.provider,
                    'attempts': [self._summary(a) for a in attempts],
                    'strategy': self.name,
                    'tokens_input': resp.tokens_input,
                    'tokens_output': resp.tokens_output,
                    'cost': sum(a.cost_estimated for a in attempts),
                    'latency_ms': sum(a.latency_ms for a in attempts),
                }
        # Todos fallaron
        return {
            'text': '',
            'winning_model': None,
            'attempts': [self._summary(a) for a in attempts],
            'strategy': self.name,
            'error': 'Todos los modelos fallaron',
        }

    def _summary(self, r):
        return {
            'provider': r.provider, 'ok': r.ok, 'error': r.error,
            'latency_ms': r.latency_ms, 'tokens_in': r.tokens_input,
            'tokens_out': r.tokens_output,
        }


class ParallelStrategy(Strategy):
    """Llama a todos los clientes en paralelo. Combina según consensus_mode."""

    name = "parallel"

    def __init__(self, consensus_mode="first"):
        # first | longest | shortest | consensus
        self.consensus_mode = consensus_mode

    def execute(self, clients, req):
        results = []
        with ThreadPoolExecutor(max_workers=len(clients)) as ex:
            futures = {ex.submit(c.generate, req): c for c in clients}
            for f in as_completed(futures):
                results.append(f.result())

        ok_results = [r for r in results if r.ok]
        if not ok_results:
            return {
                'text': '',
                'winning_model': None,
                'attempts': [self._summary(a) for a in results],
                'strategy': self.name,
                'error': 'Todos los modelos fallaron',
            }

        winner = self._pick(ok_results)
        return {
            'text': winner.text,
            'winning_model': winner.provider,
            'consensus_mode': self.consensus_mode,
            'all_responses': [
                {'provider': r.provider, 'text': r.text, 'latency_ms': r.latency_ms}
                for r in ok_results
            ],
            'attempts': [self._summary(a) for a in results],
            'strategy': self.name,
            'tokens_input': sum(r.tokens_input for r in results),
            'tokens_output': sum(r.tokens_output for r in results),
            'cost': sum(r.cost_estimated for r in results),
            'latency_ms': max(r.latency_ms for r in results),
        }

    def _pick(self, results):
        if self.consensus_mode == "longest":
            return max(results, key=lambda r: len(r.text))
        elif self.consensus_mode == "shortest":
            return min(results, key=lambda r: len(r.text))
        elif self.consensus_mode == "consensus":
            # Devuelve el primero pero anota similitud
            return results[0]
        return results[0]  # first

    def _summary(self, r):
        return {
            'provider': r.provider, 'ok': r.ok, 'error': r.error,
            'latency_ms': r.latency_ms, 'tokens_in': r.tokens_input,
            'tokens_out': r.tokens_output,
        }


class SpecialistStrategy(Strategy):
    """Asigna el primer cliente disponible (el más especializado en este tipo de pregunta)."""

    name = "specialist"

    def execute(self, clients, req):
        if not clients:
            return {'text': '', 'error': 'Sin modelos disponibles', 'strategy': self.name}
        resp = clients[0].generate(req)
        return {
            'text': resp.text,
            'winning_model': resp.provider,
            'strategy': self.name,
            'attempts': [{
                'provider': resp.provider, 'ok': resp.ok, 'error': resp.error,
                'latency_ms': resp.latency_ms, 'tokens_in': resp.tokens_input,
                'tokens_out': resp.tokens_output,
            }],
            'tokens_input': resp.tokens_input,
            'tokens_output': resp.tokens_output,
            'cost': resp.cost_estimated,
            'latency_ms': resp.latency_ms,
        }


# ──────────────────────────────────────────────────────────────
# ROUTER — decide qué regla aplicar a una pregunta
# ──────────────────────────────────────────────────────────────
class VeraRouter:
    """
    Toma una pregunta + módulo, busca la regla que aplica,
    instancia la estrategia y devuelve la respuesta consolidada.
    """

    def __init__(self, db: Session):
        self.db = db
        self.factory = LLMFactory(db)

    def route(self, question: str, module: Optional[str] = None,
              system_prompt: str = "", history: list = None,
              company_id: Optional[int] = None) -> Dict:
        rule = self._match_rule(question, module)
        if not rule:
            return {'error': 'No hay regla configurada', 'text': ''}

        models = json.loads(rule['models'])

        # ─────────────────────────────────────────────────────────────
        # QUOTA MANAGER: aplicar plan + degradación si plan base agotó
        # ─────────────────────────────────────────────────────────────
        quota_info = None
        if company_id:
            quota_info = select_model_for_request(self.db, company_id, requested_model=models[0] if models else None)
            if quota_info["degraded"]:
                # Plan base agotó cuota → forzar SOLO el fallback (Haiku)
                models = [quota_info["provider"]]
            elif quota_info["reason"] == "premium_blocked_base_plan":
                # Plan base intentando usar premium → forzar primary
                models = [quota_info["provider"]]

        clients = []
        for m in models:
            c = self.factory.get(m)
            if c:
                clients.append(c)

        if not clients:
            return {
                'error': f'Ningún modelo disponible de: {models}. Verifica API keys.',
                'text': '',
                'rule_used': rule['name'],
                'models_required': models,
            }

        strategy = self._build_strategy(rule['strategy'], rule.get('consensus_mode', 'first'))
        req = LLMRequest(
            system_prompt=system_prompt,
            user_message=question,
            history=history or [],
        )
        result = strategy.execute(clients, req)
        result['rule_id'] = rule['id']
        result['rule_name'] = rule['name']
        result['models_required'] = models
        result['models_available'] = [c.provider_name for c in clients]

        # ─────────────────────────────────────────────────────────────
        # Registrar uso de tokens + estado de cuota actualizado
        # ─────────────────────────────────────────────────────────────
        if company_id and result.get('winning_model'):
            usage_info = record_usage(
                db=self.db,
                company_id=company_id,
                provider=result['winning_model'],
                tokens_input=result.get('tokens_input', 0) or 0,
                tokens_output=result.get('tokens_output', 0) or 0,
            )
            result['quota'] = {
                'degraded': bool(quota_info and quota_info.get('degraded')),
                'tier': quota_info['tier'] if quota_info else 'standard',
                'notif_level': usage_info.get('notif_level'),
                'reason': quota_info['reason'] if quota_info else None,
            }

        return result

    def _match_rule(self, question: str, module: Optional[str]) -> Optional[Dict]:
        """Busca la primera regla que case con la pregunta + módulo. Ordena por priority."""
        rules = self.db.execute(text("""
            SELECT id, name, module, trigger_keywords, trigger_question_type,
                   strategy, models, consensus_mode, priority
            FROM vera_routing_rules
            WHERE is_active = 1
            ORDER BY priority ASC
        """)).fetchall()

        q_lower = question.lower()
        for r in rules:
            r_id, name, r_module, keywords, q_type, strategy, models, consensus, priority = r

            # Si la regla tiene módulo y no coincide, skip
            if r_module and module and r_module != module:
                continue

            # Si tiene keywords, al menos uno debe estar en la pregunta
            if keywords:
                kw_list = [k.strip().lower() for k in keywords.split(',')]
                if not any(k in q_lower for k in kw_list):
                    continue

            return {
                'id': r_id, 'name': name, 'module': r_module,
                'strategy': strategy, 'models': models,
                'consensus_mode': consensus or 'first',
                'priority': priority,
            }

        # Si no coincide ninguna, devuelve la regla default (priority más alta)
        default = self.db.execute(text("""
            SELECT id, name, module, trigger_keywords, trigger_question_type,
                   strategy, models, consensus_mode, priority
            FROM vera_routing_rules
            WHERE is_active = 1 AND module IS NULL AND trigger_keywords IS NULL
            ORDER BY priority DESC LIMIT 1
        """)).fetchone()

        if default:
            return {
                'id': default[0], 'name': default[1], 'module': default[2],
                'strategy': default[5], 'models': default[6],
                'consensus_mode': default[7] or 'first',
                'priority': default[8],
            }
        return None

    def _build_strategy(self, name: str, consensus_mode: str) -> Strategy:
        if name == "parallel":
            return ParallelStrategy(consensus_mode=consensus_mode)
        elif name == "specialist":
            return SpecialistStrategy()
        return CascadeStrategy()  # default
