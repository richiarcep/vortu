'use client'
import { useId, useState, useRef, useEffect } from 'react'
import { useT, I } from './tokens'

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#3D2BFF', '#3D2BFF', '#059669', '#dc2626', '#d97706', '#0EA5E9', '#6366F1']
export function avatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
export function initials(name = '') {
  return (name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// ── Surfaces ────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, padding = 20 }) {
  const T = useT()
  return (
    <div style={{
      background: T.card,
      borderRadius: 18,
      border: `.5px solid ${T.hairline}`,
      boxShadow: 'var(--shadow-card)',
      padding,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Buttons ───────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, disabled, color, style = {}, type = 'button', ...rest }) {
  const T = useT()
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-disabled={disabled || undefined} {...rest} style={{
      padding: '7px 16px',
      borderRadius: 999,
      border: 'none',
      fontSize: 13,
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit',
      background: disabled ? T.sidebar : (color || T.blue),
      color: disabled ? T.text4 : '#fff',
      opacity: disabled ? .6 : 1,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      transition: 'filter .15s ease, opacity .15s ease',
      ...style,
    }}>
      {children}
    </button>
  )
}

export function BtnSec({ children, onClick, style = {}, type = 'button', ...rest }) {
  const T = useT()
  return (
    <button type={type} onClick={onClick} {...rest} style={{
      padding: '7px 16px',
      borderRadius: 999,
      border: `.5px solid ${T.hairline}`,
      background: T.card,
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      fontFamily: 'inherit',
      color: T.text,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      transition: 'background .15s ease, border-color .15s ease',
      ...style,
    }}>
      {children}
    </button>
  )
}

// Botón de solo-icono — exige aria-label para accesibilidad.
export function IconBtn({ children, onClick, label, style = {}, type = 'button', ...rest }) {
  const T = useT()
  return (
    <button type={type} onClick={onClick} aria-label={label} title={label} {...rest} style={{
      width: 34, height: 34, borderRadius: 8,
      border: `.5px solid ${T.hairline}`, background: T.card, color: T.text2,
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'grid', placeItems: 'center',
      transition: 'background .15s ease',
      ...style,
    }}>
      {children}
    </button>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
export function PillTabs({ items, active, onChange }) {
  const T = useT()
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {items.map(item => {
        const isActive = active === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            aria-pressed={isActive}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: `.5px solid ${isActive ? T.blue : T.hairline}`,
              background: isActive ? 'rgba(61,43,255,.08)' : T.card,
              color: isActive ? T.blue : T.text2,
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all .15s',
              boxShadow: isActive ? `0 0 0 1px ${T.blue}` : 'none',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export function HeaderTabs({ sections, active, onChange }) {
  const T = useT()
  return (
    <div style={{ display: 'flex', height: 56 }}>
      {sections.map(s => {
        const isActive = active === s.key
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            aria-current={isActive ? 'true' : undefined}
            style={{
              padding: '0 16px',
              height: 56,
              background: 'none',
              border: 'none',
              borderBottom: isActive ? `2px solid ${T.text}` : '2px solid transparent',
              color: isActive ? T.text : T.text3,
              fontWeight: isActive ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              transition: 'all .15s',
            }}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

// Tab tipo "segmented" (con badge opcional) — coincide con el patrón de las páginas.
export function Tab({ active, onClick, label, badge }) {
  const T = useT()
  return (
    <button type="button" onClick={onClick} aria-pressed={active} style={{
      padding: '7px 14px', borderRadius: 8,
      background: active ? T.card : 'transparent',
      color: active ? T.text : T.text3, border: 'none',
      boxShadow: active ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
      fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {label}
      {badge != null && badge > 0 && (
        <span style={{
          fontSize: 10, padding: '1px 5px', borderRadius: 999,
          background: active ? 'rgba(61,43,255,.12)' : 'rgba(0,0,0,.08)',
          color: active ? T.blue : T.text3,
          fontVariantNumeric: 'tabular-nums', minWidth: 16, textAlign: 'center',
        }}>{badge}</span>
      )}
    </button>
  )
}

// ── Display ─────────────────────────────────────────────────────────────────────
export function Pill({ label, color, bg, dot }) {
  const T = useT()
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 500,
      color: color || T.text2, background: bg || T.sidebar, whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: dot }} />}
      {label}
    </span>
  )
}

export function Avatar({ name, size = 32 }) {
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, borderRadius: 999,
      background: avatarColor(name),
      display: 'grid', placeItems: 'center',
      color: '#fff', fontSize: size * 0.4, fontWeight: 600,
      flexShrink: 0,
    }}>{initials(name)}</div>
  )
}

export function Badge({ children, variant = 'neutral' }) {
  const T = useT()
  const variants = {
    success: { bg: T.greenSoft, color: T.green },
    warning: { bg: T.amberSoft, color: T.amber },
    danger: { bg: T.redSoft, color: T.red },
    info: { bg: 'rgba(61,43,255,.08)', color: T.blue },
    neutral: { bg: T.sidebar, color: T.text2 },
  }
  const v = variants[variant]
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 999,
      background: v.bg, color: v.color,
    }}>
      {children}
    </span>
  )
}

export function HealthRing({ score = 0, size = 36 }) {
  const T = useT()
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(10, score)) / 10
  const col = score >= 7 ? T.green : score >= 4 ? T.amber : T.red
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
      aria-label={`Salud ${score} de 10`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.hairline} strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="3"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fontSize={size * 0.3} fontWeight="600" fill={T.text} fontFamily="inherit">{score}</text>
    </svg>
  )
}

// ── Inputs / forms ────────────────────────────────────────────────────────────
export function Input(props) {
  const T = useT()
  return (
    <input {...props} style={{
      width: '100%',
      padding: '8px 11px',
      borderRadius: 8,
      border: `.5px solid ${T.hairline}`,
      background: T.sidebar,
      fontSize: 13,
      color: T.text,
      fontFamily: 'inherit',
      outline: 'none',
      ...props.style,
    }} />
  )
}

export function Field({ label, children, htmlFor }) {
  const T = useT()
  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 11, color: T.text3, marginBottom: 5, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// Shared "data failed to load" banner with optional retry. Render at the top of a
// page's content when a main fetch fails, instead of leaving a silent blank.
export function ErrorBanner({ show, message = 'No se pudieron cargar los datos.', onRetry }) {
  if (!show) return null
  return (
    <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', marginBottom: 16, borderRadius: 10, background: 'rgba(220,38,38,.06)', border: '.5px solid rgba(220,38,38,.25)' }}>
      <span style={{ fontSize: 13, color: '#dc2626' }}>{message}</span>
      {onRetry && <button onClick={onRetry} style={{ padding: '6px 14px', borderRadius: 8, border: '.5px solid rgba(220,38,38,.3)', background: 'transparent', color: '#dc2626', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Reintentar</button>}
    </div>
  )
}

export function Toast({ msg }) {
  const T = useT()
  if (!msg) return null
  const ok = msg.type === 'success'
  return (
    <div role="status" aria-live="polite" style={{
      padding: '10px 14px',
      background: ok ? T.greenSoft : T.redSoft,
      border: `.5px solid ${ok ? T.green : T.red}`,
      borderRadius: 10,
      color: ok ? T.green : T.red,
      fontSize: 13,
      marginBottom: 14,
    }}>
      {msg.text}
    </div>
  )
}

// ── Data viz ────────────────────────────────────────────────────────────────────
export function Sparkline({ data = [], up = true, height = 28 }) {
  const T = useT()
  const id = useId().replace(/:/g, '')
  if (!data.length) return null
  const w = 200, h = height, p = 2
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const pts = data.map((v, i) => [
    p + (i / (data.length - 1)) * (w - p * 2),
    h - p - ((v - min) / range) * (h - p * 2),
  ])
  const path = pts.map((pt, i) => (i === 0 ? 'M' : 'L') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1)).join(' ')
  const area = path + ` L${w - p},${h} L${p},${h} Z`
  const col = up ? T.green : T.red
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height, width: '100%', marginTop: 4 }} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity=".22" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function KpiCard({ label, value, sub, color, spark, up = true, loading }) {
  const T = useT()
  return (
    <Card padding="18px 20px">
      <div style={{ fontSize: 12, color: T.text3, fontWeight: 500, marginBottom: 10 }}>{label}</div>
      {loading ? (
        <Skeleton w={90} h={28} />
      ) : (
        <div style={{
          fontSize: 28, fontWeight: 600, letterSpacing: -0.8,
          color: color || T.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>
          {value}
        </div>
      )}
      {sub && !loading && <div style={{ fontSize: 12, color: T.text4, marginTop: 6 }}>{sub}</div>}
      {spark && !loading && <Sparkline data={spark} up={up} />}
    </Card>
  )
}

export function ProgressBar({ value, max, color, height = 6 }) {
  const T = useT()
  const pct = max > 0 ? Math.min(value / max * 100, 100) : 0
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}
      style={{ height, background: T.sidebar, borderRadius: 999, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: color || T.blue,
        borderRadius: 999,
        transition: 'width .6s ease',
      }} />
    </div>
  )
}

// ── Estados: carga y vacío ───────────────────────────────────────────────────────
export function Skeleton({ w = '100%', h = 14, radius = 8, style = {} }) {
  const T = useT()
  return (
    <span style={{
      display: 'inline-block', width: w, height: h, borderRadius: radius,
      background: T.sidebar, animation: 'pulse 1.4s ease-in-out infinite',
      ...style,
    }} aria-hidden="true" />
  )
}

export function EmptyState({ icon, title, hint, action }) {
  const T = useT()
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {icon && <div style={{ color: T.text4, display: 'grid', placeItems: 'center' }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{title}</div>
      {hint && <div style={{ fontSize: 12.5, color: T.text4, maxWidth: 340, lineHeight: 1.5 }}>{hint}</div>}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  )
}

// ── Cabecera unificada ────────────────────────────────────────────────────────
// Botones comunes a TODAS las páginas, SIEMPRE en el mismo sitio y orden:
//   [acciones de la página] · [Vera] · [⚙ Configuración] · [Perfil]
// El selector de periodo/secciones de cada página queda a la izquierda (aparte).

// Botón Vera — pill azul idéntica en todas las páginas
export function VeraPill({ onClick, label = 'Vera' }) {
  const T = useT()
  return (
    <button onClick={onClick} aria-label="Abrir Vera" className="press" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', height: 32, borderRadius: 999,
      background: 'rgba(61,43,255,.06)',
      border: '.5px solid rgba(61,43,255,.18)',
      color: T.blue, fontSize: 12.5, fontWeight: 500,
      cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
    }}>
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
        <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" fill={T.blue} />
      </svg>
      {label}
    </button>
  )
}

// Botón de perfil con menú (Configuración / Cerrar sesión) — idéntico en todas
export function ProfileBtn({ user, router }) {
  const T = useT()
  const [open, setOpen] = useState(false)
  const [u, setU] = useState(user || null)
  const ref = useRef()
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  // Si la página no pasa `user`, lo derivamos del JWT para que el perfil
  // (nombre/iniciales) sea idéntico en todas las páginas.
  useEffect(() => {
    if (user) { setU(user); return }
    try {
      const t = localStorage.getItem('vela_token')
      if (t) { const p = JSON.parse(atob(t.split('.')[1])); setU({ email: p.sub || '', name: p.name || p.sub || 'Usuario' }) }
    } catch {}
  }, [user])
  const ini = u?.name
    ? u.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'US'
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '3px 4px 3px 3px', borderRadius: 999, cursor: 'pointer',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          background: 'linear-gradient(135deg,#3D2BFF,#A5B1FF)',
          color: '#fff', display: 'grid', placeItems: 'center',
          fontWeight: 600, fontSize: 11,
        }}>{ini}</div>
        <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>
          {u?.name?.split(' ')[0] || 'Usuario'}
        </span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0, width: 180,
          background: T.card, borderRadius: 12,
          border: `.5px solid ${T.hairline}`,
          boxShadow: '0 8px 32px rgba(0,0,0,.12)', zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 0' }}>
            <button onClick={() => { router.push('/settings'); setOpen(false) }} style={{
              width: '100%', padding: '9px 14px', background: 'none',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, color: T.text, textAlign: 'left',
            }}>Configuración</button>
          </div>
          <div style={{ padding: '6px 8px 10px', borderTop: `.5px solid ${T.hairline}` }}>
            <button onClick={() => { localStorage.removeItem('vela_token'); router.push('/login') }} style={{
              width: '100%', padding: '8px', background: T.redSoft,
              border: 'none', borderRadius: 8, color: T.red,
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>Cerrar sesión</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── PageHeader unificado (shell estructural) ────────────────────────────────────
// Cabecera única para TODOS los módulos, en hasta 2 filas:
//   Fila 1: [Título + contexto] ———— [secundarias] · [1 CTA primario ≥44px] · [Vera] · [Perfil]
//   Fila 2 (opcional): pestañas a ancho completo  +  filtros (periodo/segmented) a la derecha
// Sin engranaje (Configuración vive en el menú de Perfil). Preserva la identidad visual.
function PageTab({ tab, active, onClick }) {
  const T = useT()
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} style={{
      position: 'relative', height: 46, padding: '0 4px', marginRight: 18,
      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 13.5, fontWeight: active ? 600 : 450,
      color: active ? T.text : T.text3, whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: 7,
    }}>
      {tab.label}
      {tab.badge != null && tab.badge > 0 && (
        <span style={{
          fontSize: 10.5, padding: '1px 6px', borderRadius: 999,
          background: active ? 'rgba(61,43,255,.12)' : T.sidebar,
          color: active ? T.blue : T.text3, fontVariantNumeric: 'tabular-nums',
        }}>{tab.badge}</span>
      )}
      <span aria-hidden="true" style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, borderRadius: 2,
        background: active ? T.blue : 'transparent',
      }} />
    </button>
  )
}

export function PageHeader({ title, subtitle, primary, secondary, onVera, user, router, tabs, activeTab, onTab, filters }) {
  const T = useT()
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 'var(--z-sticky, 30)',
      background: T.headerBg || (T.bg + 'e6'),
      backdropFilter: 'saturate(180%) blur(12px)', WebkitBackdropFilter: 'saturate(180%) blur(12px)',
      borderBottom: `.5px solid ${T.hairline}`, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 28px', minHeight: 60, flexWrap: 'wrap', rowGap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="display" style={{ fontSize: 20, fontWeight: 600, color: T.text, letterSpacing: -0.4, lineHeight: 1.1, margin: 0, textWrap: 'balance' }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 12, color: T.text4, marginTop: 3 }}>{subtitle}</div>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {secondary}
          {primary && (
            <Btn onClick={primary.onClick} disabled={primary.disabled}
              style={{ height: 44, padding: '0 18px', fontSize: 13.5, fontWeight: 600 }}>
              {primary.icon}{primary.label}
            </Btn>
          )}
          {onVera && <VeraPill onClick={onVera} />}
          {router && <ProfileBtn user={user} router={router} />}
        </div>
      </div>
      {(tabs?.length || filters) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px', borderTop: `.5px solid ${T.soft}`, minHeight: 48, overflowX: 'auto' }}>
          {tabs?.length ? (
            <nav aria-label="Secciones" style={{ display: 'flex', alignItems: 'center' }}>
              {tabs.map(t => <PageTab key={t.key} tab={t} active={activeTab === t.key} onClick={() => onTab?.(t.key)} />)}
            </nav>
          ) : null}
          {filters && <div style={{ marginLeft: tabs?.length ? 'auto' : 0, display: 'flex', alignItems: 'center' }}>{filters}</div>}
        </div>
      )}
    </header>
  )
}

// Segmented filter (periodo/modos) — targets ≥44px (Fitts). Para FILTRAR, no navegar.
export function SegmentedFilter({ items, active, onChange, label }) {
  const T = useT()
  return (
    <div role="group" aria-label={label} style={{ display: 'inline-flex', gap: 2, background: T.sidebar, padding: 4, borderRadius: 12 }}>
      {items.map(item => {
        const on = active === item.key
        return (
          <button key={item.key} type="button" onClick={() => onChange(item.key)} aria-pressed={on} style={{
            height: 36, padding: '0 14px', borderRadius: 9, border: 'none',
            background: on ? T.card : 'transparent', color: on ? T.text : T.text3,
            fontWeight: on ? 600 : 450, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap', transition: 'color .15s',
            boxShadow: on ? '0 .5px 1px rgba(0,0,0,.04),0 1px 3px rgba(0,0,0,.05)' : 'none',
          }}>{item.label}</button>
        )
      })}
    </div>
  )
}

// Cluster derecho unificado. `children` = acciones propias de la página (p.ej.
// "+ Registrar gasto", "Actualizar"), que van ANTES de Vera. onVera abre Vera.
export function HeaderActions({ onVera, user, router, children }) {
  return (
    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
      {children}
      {onVera && <VeraPill onClick={onVera} />}
      <button onClick={() => router.push('/settings')} aria-label="Configuración" title="Configuración" className="press" style={{
        width: 32, height: 32, borderRadius: 8, border: 'none',
        background: 'transparent', display: 'grid', placeItems: 'center',
        cursor: 'pointer', color: 'var(--app-ink)', opacity: .55,
      }}>{I.gear}</button>
      <ProfileBtn user={user} router={router} />
    </div>
  )
}
