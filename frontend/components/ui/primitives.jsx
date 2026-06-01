'use client'
import { useState } from 'react'
import { T } from './tokens'

export function Card({ children, style = {}, padding = 20 }) {
  return (
    <div style={{
      background: T.card,
      borderRadius: 16,
      border: `.5px solid ${T.hairline}`,
      boxShadow: '0 1px 2px rgba(0,0,0,.03)',
      padding,
      ...style,
    }}>
      {children}
    </div>
  )
}

export function Btn({ children, onClick, disabled, color = T.blue, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '7px 16px',
      borderRadius: 999,
      border: 'none',
      fontSize: 13,
      fontWeight: 500,
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'inherit',
      background: disabled ? T.sidebar : color,
      color: disabled ? T.text4 : '#fff',
      opacity: disabled ? .6 : 1,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      ...style,
    }}>
      {children}
    </button>
  )
}

export function BtnSec({ children, onClick, style = {} }) {
  return (
    <button onClick={onClick} style={{
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
      ...style,
    }}>
      {children}
    </button>
  )
}

export function PillTabs({ items, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {items.map(item => {
        const isActive = active === item.key
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: `.5px solid ${isActive ? T.blue : T.hairline}`,
              background: isActive ? 'rgba(0,113,227,.08)' : T.card,
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
  return (
    <div style={{ display: 'flex', height: 56 }}>
      {sections.map(s => {
        const isActive = active === s.key
        return (
          <button
            key={s.key}
            onClick={() => onChange(s.key)}
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

export function Input(props) {
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

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: T.text3, marginBottom: 5, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function Toast({ msg }) {
  if (!msg) return null
  const ok = msg.type === 'success'
  return (
    <div style={{
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

export function Sparkline({ data = [], up = true, height = 28 }) {
  if (!data.length) return null
  const w = 200, h = height, p = 2
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const pts = data.map((v, i) => [
    p + (i / (data.length - 1)) * (w - p * 2),
    h - p - ((v - min) / range) * (h - p * 2),
  ])
  const path = pts.map((pt, i) => (i === 0 ? 'M' : 'L') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1)).join(' ')
  const area = path + ` L${w - p},${h} L${p},${h} Z`
  const c = up ? T.green : T.red
  const id = `spark-${Math.random().toString(36).slice(2, 8)}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height, width: '100%', marginTop: 4 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity=".22" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function KpiCard({ label, value, sub, color = T.text, spark, up = true, loading }) {
  return (
    <Card padding="18px 20px">
      <div style={{ fontSize: 12, color: T.text3, fontWeight: 500, marginBottom: 10 }}>{label}</div>
      <div style={{
        fontSize: 28,
        fontWeight: 600,
        letterSpacing: -0.8,
        color: loading ? T.hairline : color,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}>
        {loading ? '\u00A0\u00A0\u00A0' : value}
      </div>
      {sub && !loading && <div style={{ fontSize: 12, color: T.text4, marginTop: 6 }}>{sub}</div>}
      {spark && <Sparkline data={spark} up={up} />}
    </Card>
  )
}

export function Badge({ children, variant = 'neutral' }) {
  const variants = {
    success: { bg: T.greenSoft, color: T.green },
    warning: { bg: T.amberSoft, color: T.amber },
    danger: { bg: T.redSoft, color: T.red },
    info: { bg: 'rgba(0,113,227,.08)', color: T.blue },
    neutral: { bg: T.sidebar, color: T.text2 },
  }
  const v = variants[variant]
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 500,
      padding: '3px 10px',
      borderRadius: 999,
      background: v.bg,
      color: v.color,
    }}>
      {children}
    </span>
  )
}

export function ProgressBar({ value, max, color = T.blue, height = 6 }) {
  const pct = max > 0 ? Math.min(value / max * 100, 100) : 0
  return (
    <div style={{ height, background: T.sidebar, borderRadius: 999, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: color,
        borderRadius: 999,
        transition: 'width .6s ease',
      }} />
    </div>
  )
}
