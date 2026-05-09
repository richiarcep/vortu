from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, Date, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base


class BusinessSnapshot(Base):
    """
    Snapshot diario de KPIs por empresa.
    Diseñado para ML — cada fila es un ejemplo de entrenamiento.
    """
    __tablename__ = "business_snapshots"

    id                      = Column(Integer, primary_key=True, index=True)
    company_id              = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    snapshot_date           = Column(Date, nullable=False, index=True)
    periodo                 = Column(String(20), default="monthly")  # daily | weekly | monthly

    # ── PERFIL DEL NEGOCIO (features categóricas) ──────────────────────────
    sector                  = Column(String(100))
    empresa_size            = Column(String(20))    # micro | pequeña | mediana | grande
    meses_en_vortu          = Column(Integer, default=0)
    num_empleados           = Column(Integer, default=0)
    num_empleados_rango     = Column(String(20))    # 1-5 | 6-20 | 21-50 | 50+

    # ── FINANZAS (features numéricas) ──────────────────────────────────────
    ingresos_mes            = Column(Float, default=0)
    gastos_mes              = Column(Float, default=0)
    resultado_neto          = Column(Float, default=0)
    margen_neto_pct         = Column(Float, default=0)      # (resultado/ingresos)*100
    ratio_gastos_ingresos   = Column(Float, default=0)      # gastos/ingresos
    saldo_caja              = Column(Float, default=0)
    ingresos_mes_anterior   = Column(Float, default=0)
    crecimiento_ingresos_pct = Column(Float, default=0)     # vs mes anterior

    # ── VENTAS (features numéricas) ────────────────────────────────────────
    num_ventas_mes          = Column(Integer, default=0)
    ticket_medio            = Column(Float, default=0)
    num_productos_activos   = Column(Integer, default=0)
    productos_bajo_stock    = Column(Integer, default=0)
    pct_productos_bajo_stock = Column(Float, default=0)
    metodo_pago_dominante   = Column(String(50))            # efectivo | tarjeta | bizum
    pct_pago_efectivo       = Column(Float, default=0)
    pct_pago_tarjeta        = Column(Float, default=0)
    ingresos_por_empleado   = Column(Float, default=0)      # ingresos/empleados

    # ── CLIENTES (features numéricas) ──────────────────────────────────────
    total_contactos         = Column(Integer, default=0)
    contactos_nuevos_mes    = Column(Integer, default=0)
    sentiment_score_avg     = Column(Float, default=5.0)    # 1-10
    clientes_riesgo         = Column(Integer, default=0)
    pct_clientes_riesgo     = Column(Float, default=0)
    mensajes_pendientes     = Column(Integer, default=0)
    tasa_respuesta_pct      = Column(Float, default=0)
    clientes_vip            = Column(Integer, default=0)

    # ── PROYECTOS (features numéricas) ─────────────────────────────────────
    proyectos_activos       = Column(Integer, default=0)
    health_score_avg        = Column(Float, default=10.0)   # 1-10
    proyectos_en_riesgo     = Column(Integer, default=0)
    pct_proyectos_riesgo    = Column(Float, default=0)
    tareas_completadas_pct  = Column(Float, default=0)
    presupuesto_total       = Column(Float, default=0)
    gasto_proyectos         = Column(Float, default=0)
    pct_presupuesto_usado   = Column(Float, default=0)

    # ── RRHH (features numéricas) ──────────────────────────────────────────
    empleados_activos       = Column(Integer, default=0)
    nomina_total_mes        = Column(Float, default=0)
    coste_nomina_pct_ingresos = Column(Float, default=0)    # nomina/ingresos*100
    feedback_score_avg      = Column(Float, default=0)      # -1 a 1
    empleados_con_feedback  = Column(Integer, default=0)

    # ── MARKETING (features numéricas) ─────────────────────────────────────
    campanas_activas        = Column(Integer, default=0)
    gasto_marketing_mes     = Column(Float, default=0)
    roi_marketing           = Column(Float, default=0)

    # ── LABELS (targets para ML) ───────────────────────────────────────────
    # Estos se calculan después con datos futuros
    label_crecimiento_siguiente_mes = Column(Float)         # % crecimiento real siguiente mes
    label_riesgo_negocio    = Column(String(20))            # bajo | medio | alto | critico
    label_tendencia         = Column(String(20))            # creciendo | estable | bajando
    label_salud_financiera  = Column(String(20))            # saludable | ajustado | problemas | crisis
    label_churn_riesgo      = Column(Boolean)               # ¿canceló Vortu en los 3 meses siguientes?
    label_upgrade_plan      = Column(Boolean)               # ¿subió de plan en los 2 meses siguientes?

    # ── AI SCORE (calculado por Claude) ────────────────────────────────────
    ai_health_score         = Column(Float)                 # 1-10 score global del negocio
    ai_risk_factors         = Column(JSON)                  # lista de factores de riesgo detectados
    ai_opportunities        = Column(JSON)                  # oportunidades detectadas
    ai_narrative            = Column(Text)                  # resumen ejecutivo del mes

    # ── METADATA ───────────────────────────────────────────────────────────
    generated_at            = Column(DateTime, default=datetime.utcnow)
    generated_by            = Column(String(20), default="auto")  # auto | manual


class MemoryEntry(Base):
    """
    Cada entrada de memoria es un registro individual con trazabilidad.
    Auto = detectado por IA. Manual = escrito por el admin/usuario.
    """
    __tablename__ = "memory_entries"

    id           = Column(Integer, primary_key=True, index=True)
    company_id   = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    tipo         = Column(String(20), nullable=False)   # auto | manual
    fuente       = Column(String(100))                  # snapshot | admin | user | pattern_detection
    autor        = Column(String(200))                  # email del admin o "claude-auto"
    contenido    = Column(Text, nullable=False)          # el hecho aprendido o nota manual
    categoria    = Column(String(50))                   # ventas | clientes | finanzas | proyectos | general
    confianza    = Column(Float, default=1.0)           # 0-1, qué tan seguro está Claude
    created_at   = Column(DateTime, default=datetime.utcnow)
    snapshot_id  = Column(Integer, ForeignKey("business_snapshots.id"), nullable=True)


class BusinessAIMemory(Base):
    """
    Memoria de IA por empresa.
    Se actualiza automáticamente cuando la IA aprende algo nuevo.
    El usuario puede editar la parte manual.
    """
    __tablename__ = "business_ai_memory"

    id                      = Column(Integer, primary_key=True, index=True)
    company_id              = Column(Integer, ForeignKey("companies.id"), nullable=False, unique=True)

    # ── AUTO-ACTUALIZADO por IA ─────────────────────────────────────────────
    learned_facts           = Column(Text)
    # Ejemplo:
    # "- El negocio vende más los viernes y sábados.
    #  - El ticket medio sube en diciembre un 23%.
    #  - Los clientes con riesgo alto suelen tener >3 mensajes sin respuesta.
    #  - El producto X representa el 40% de los ingresos."

    patterns_detected       = Column(JSON, default=list)
    # [{pattern, confidence, first_detected, times_confirmed}]

    anomalies_detected      = Column(JSON, default=list)
    # [{date, description, severity}]

    last_auto_update        = Column(DateTime)
    auto_update_count       = Column(Integer, default=0)

    # ── MANUAL por el usuario ───────────────────────────────────────────────
    manual_training         = Column(Text)
    # El usuario escribe aquí lo que quiere que la IA sepa:
    # "Somos una panadería artesanal familiar.
    #  No hacemos descuentos en productos frescos.
    #  Nuestros clientes valoran la calidad sobre el precio."

    business_personality    = Column(Text)
    # Tono, valores, diferenciadores, público objetivo

    business_goals          = Column(Text)
    # "Queremos abrir una segunda tienda en 2027.
    #  Objetivo: llegar a €20k/mes de facturación."

    last_manual_update      = Column(DateTime)
    manual_update_count     = Column(Integer, default=0)

    # ── CONTEXTO COMPLETO (lo que usa la IA en cada consulta) ──────────────
    full_context            = Column(Text)
    # Auto-generado = learned_facts + manual_training + patterns + goals
    # Se regenera cada vez que se actualiza cualquier parte

    context_version         = Column(Integer, default=0)
    last_context_rebuild    = Column(DateTime)

    created_at              = Column(DateTime, default=datetime.utcnow)
    updated_at              = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
