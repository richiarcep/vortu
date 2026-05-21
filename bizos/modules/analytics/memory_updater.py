"""
Sistema de memoria IA por empresa.
- Auto: Claude analiza patrones de múltiples snapshots
- Manual: Admin/usuario añade contexto
- Trazabilidad: cada entrada es un registro individual
- TXT: generado desde BD, descargable
"""
import anthropic
import json
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc
from models.analytics import BusinessAIMemory, BusinessSnapshot, MemoryEntry
from services.vector.memory_sync import sync_entry_to_vector, sync_manual_context, migrate_existing_memory
from core.config import get_settings

settings = get_settings()
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def get_or_create_memory(db: Session, company_id: int) -> BusinessAIMemory:
    memory = db.query(BusinessAIMemory).filter(
        BusinessAIMemory.company_id == company_id
    ).first()
    if not memory:
        memory = BusinessAIMemory(company_id=company_id)
        db.add(memory)
        db.commit()
        db.refresh(memory)
    return memory


def auto_update_memory(db: Session, company_id: int):
    """
    Claude analiza los últimos 6 snapshots juntos y detecta patrones reales.
    No solo describe datos — interpreta, concluye y recomienda.
    """
    memory = get_or_create_memory(db, company_id)

    # Get last 6 snapshots for pattern detection
    snapshots = db.query(BusinessSnapshot).filter(
        BusinessSnapshot.company_id == company_id
    ).order_by(desc(BusinessSnapshot.snapshot_date)).limit(6).all()

    if not snapshots:
        return memory

    # Build historical data for Claude
    historical = []
    for s in reversed(snapshots):
        historical.append({
            "mes": s.snapshot_date.strftime("%Y-%m"),
            "ingresos": s.ingresos_mes,
            "gastos": s.gastos_mes,
            "resultado_neto": s.resultado_neto,
            "margen_pct": s.margen_neto_pct,
            "crecimiento_pct": s.crecimiento_ingresos_pct,
            "num_ventas": s.num_ventas_mes,
            "ticket_medio": s.ticket_medio,
            "clientes_totales": s.total_contactos,
            "clientes_nuevos": s.contactos_nuevos_mes,
            "clientes_riesgo": s.clientes_riesgo,
            "sentiment": s.sentiment_score_avg,
            "proyectos_activos": s.proyectos_activos,
            "proyectos_riesgo": s.proyectos_en_riesgo,
            "health_score": s.health_score_avg,
            "empleados": s.empleados_activos,
            "nomina": s.nomina_total_mes,
            "tendencia": s.label_tendencia,
            "salud_financiera": s.label_salud_financiera,
            "riesgo_negocio": s.label_riesgo_negocio,
        })

    existing_entries = db.query(MemoryEntry).filter(
        MemoryEntry.company_id == company_id,
        MemoryEntry.tipo == "auto"
    ).order_by(desc(MemoryEntry.created_at)).limit(20).all()

    existing_facts = "\n".join([f"- [{e.categoria}] {e.contenido}" for e in existing_entries]) or "Sin hechos previos."
    manual_context = memory.manual_training or "Sin contexto manual."

    prompt = f"""Eres el analista de IA de Nexum. Tu trabajo es aprender sobre este negocio analizando sus datos históricos.

NO describes datos — DETECTAS PATRONES, CONCLUYES y RECOMIENDAS acciones concretas.

DATOS HISTÓRICOS ({len(historical)} meses):
{json.dumps(historical, ensure_ascii=False, indent=2)}

CONTEXTO MANUAL DEL NEGOCIO:
{manual_context}

HECHOS YA CONOCIDOS (no repetir):
{existing_facts}

Analiza los datos y extrae entre 4 y 8 aprendizajes NUEVOS. Para cada aprendizaje:
- Detecta patrones reales (estacionalidad, tendencias, correlaciones)
- Concluye qué significa para el negocio
- Sugiere una acción concreta si aplica

Devuelve SOLO un JSON válido:
{{
  "aprendizajes": [
    {{
      "contenido": "descripción del patrón o hecho aprendido con números específicos",
      "categoria": "ventas|clientes|finanzas|proyectos|rrhh|general",
      "confianza": 0.0-1.0,
      "accion_sugerida": "qué debería hacer el negocio con esto"
    }}
  ]
}}"""

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text.strip()
    clean = text.replace("```json", "").replace("```", "").strip()
    data = json.loads(clean)

    latest_snapshot = snapshots[0]

    # Save each learning as individual entry with traceability
    new_entries = []
    for ap in data.get("aprendizajes", []):
        entry = MemoryEntry(
            company_id=company_id,
            tipo="auto",
            fuente="pattern_detection",
            autor="claude-auto",
            contenido=ap.get("contenido", ""),
            categoria=ap.get("categoria", "general"),
            confianza=ap.get("confianza", 0.8),
            snapshot_id=latest_snapshot.id,
        )
        db.add(entry)
        db.flush()  # get entry.id
        sync_entry_to_vector(entry)  # sync to ChromaDB
        new_entries.append(entry)

    memory.last_auto_update = datetime.utcnow()
    memory.auto_update_count = (memory.auto_update_count or 0) + 1

    db.commit()
    _rebuild_context(db, memory)
    db.commit()

    return memory


def manual_update(db: Session, company_id: int, manual_text: str = None,
                  personality: str = None, goals: str = None, autor: str = "admin"):
    """Admin actualiza el contexto manual del negocio."""
    memory = get_or_create_memory(db, company_id)

    if manual_text is not None:
        memory.manual_training = manual_text
        # Save as manual entry for traceability
        entry = MemoryEntry(
            company_id=company_id,
            tipo="manual",
            fuente="admin",
            autor=autor,
            contenido=manual_text,
            categoria="general",
            confianza=1.0,
        )
        db.add(entry)

    if personality is not None:
        memory.business_personality = personality
    if goals is not None:
        memory.business_goals = goals

    memory.last_manual_update = datetime.utcnow()
    memory.manual_update_count = (memory.manual_update_count or 0) + 1

    db.commit()
    _rebuild_context(db, memory)
    sync_manual_context(memory.company_id, memory)  # sync to ChromaDB
    db.commit()
    return memory


def _rebuild_context(db: Session, memory: BusinessAIMemory):
    """Regenera el full_context y el TXT descargable."""
    company_id = memory.company_id

    auto_entries = db.query(MemoryEntry).filter(
        MemoryEntry.company_id == company_id,
        MemoryEntry.tipo == "auto"
    ).order_by(MemoryEntry.created_at).all()

    manual_entries = db.query(MemoryEntry).filter(
        MemoryEntry.company_id == company_id,
        MemoryEntry.tipo == "manual"
    ).order_by(MemoryEntry.created_at).all()

    parts = []
    txt_parts = []
    txt_parts.append(f"MEMORIA IA — Empresa #{company_id}")
    txt_parts.append(f"Generado: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC")
    txt_parts.append("=" * 60)

    if memory.business_personality:
        parts.append(f"## PERSONALIDAD Y VALORES\n{memory.business_personality}")
        txt_parts.append(f"\n## PERSONALIDAD Y VALORES\n{memory.business_personality}")

    if memory.business_goals:
        parts.append(f"## OBJETIVOS\n{memory.business_goals}")
        txt_parts.append(f"\n## OBJETIVOS\n{memory.business_goals}")

    if manual_entries:
        manual_block = "## CONTEXTO MANUAL\n"
        txt_block = "\n## CONTEXTO MANUAL (con trazabilidad)\n"
        for e in manual_entries:
            manual_block += f"- {e.contenido}\n"
            txt_block += f"[{e.created_at.strftime('%Y-%m-%d %H:%M')}] [{e.autor}]\n  {e.contenido}\n\n"
        parts.append(manual_block)
        txt_parts.append(txt_block)

    if auto_entries:
        auto_block = "## HECHOS APRENDIDOS POR IA\n"
        txt_block = "\n## HECHOS APRENDIDOS POR IA (con trazabilidad)\n"

        by_date = {}
        for e in auto_entries:
            date_key = e.created_at.strftime("%Y-%m-%d")
            if date_key not in by_date:
                by_date[date_key] = []
            by_date[date_key].append(e)

        for date_key, entries in by_date.items():
            txt_block += f"\n--- {date_key} ---\n"
            for e in entries:
                auto_block += f"- [{e.categoria}] {e.contenido}\n"
                txt_block += f"[{e.created_at.strftime('%H:%M')}] [{e.categoria}] (confianza: {e.confianza:.0%})\n  {e.contenido}\n\n"

        parts.append(auto_block)
        txt_parts.append(txt_block)

    memory.full_context = "\n\n".join(parts)
    memory.learned_facts = "\n".join([f"- [{e.categoria}] {e.contenido}" for e in auto_entries[-20:]])
    memory.context_version = (memory.context_version or 0) + 1
    memory.last_context_rebuild = datetime.utcnow()

    # Store TXT content in patterns_detected for download
    import json as _json
    memory.patterns_detected = txt_parts


def generate_memory_txt(db: Session, company_id: int) -> str:
    """Genera el TXT completo de la memoria para descargar."""
    memory = db.query(BusinessAIMemory).filter(
        BusinessAIMemory.company_id == company_id
    ).first()

    if not memory:
        return f"MEMORIA IA — Empresa #{company_id}\nSin datos todavía."

    auto_entries = db.query(MemoryEntry).filter(
        MemoryEntry.company_id == company_id,
        MemoryEntry.tipo == "auto"
    ).order_by(MemoryEntry.created_at).all()

    manual_entries = db.query(MemoryEntry).filter(
        MemoryEntry.company_id == company_id,
        MemoryEntry.tipo == "manual"
    ).order_by(MemoryEntry.created_at).all()

    lines = []
    lines.append(f"MEMORIA IA — Empresa #{company_id}")
    lines.append(f"Generado: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC")
    lines.append(f"Versión: {memory.context_version or 1}")
    lines.append("=" * 60)

    if memory.business_personality:
        lines.append(f"\n## PERSONALIDAD Y VALORES\n{memory.business_personality}")

    if memory.business_goals:
        lines.append(f"\n## OBJETIVOS\n{memory.business_goals}")

    if manual_entries:
        lines.append("\n## ENTRENAMIENTO MANUAL (con trazabilidad)")
        for e in manual_entries:
            lines.append(f"[{e.created_at.strftime('%Y-%m-%d %H:%M')}] [{e.autor}]")
            lines.append(f"  {e.contenido}")
            lines.append("")

    if auto_entries:
        lines.append("\n## APRENDIZAJES AUTOMÁTICOS (con trazabilidad)")
        current_date = None
        for e in auto_entries:
            date_str = e.created_at.strftime("%Y-%m-%d")
            if date_str != current_date:
                lines.append(f"\n--- {date_str} ---")
                current_date = date_str
            lines.append(f"[{e.created_at.strftime('%H:%M')}] [{e.categoria.upper()}] confianza: {e.confianza:.0%}")
            lines.append(f"  {e.contenido}")
            lines.append("")

    lines.append("\n" + "=" * 60)
    lines.append(f"Total aprendizajes auto: {len(auto_entries)}")
    lines.append(f"Total entradas manuales: {len(manual_entries)}")
    lines.append(f"Actualizaciones auto: {memory.auto_update_count or 0}")

    return "\n".join(lines)


def get_context_for_ai(db: Session, company_id: int) -> str:
    memory = db.query(BusinessAIMemory).filter(
        BusinessAIMemory.company_id == company_id
    ).first()
    if not memory or not memory.full_context:
        return "Sin contexto previo del negocio."
    return memory.full_context
