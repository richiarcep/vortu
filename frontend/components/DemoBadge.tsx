// Fixed "DEMO · DEV" badge — shown only when NEXT_PUBLIC_DEMO_MODE is set at BUILD
// time (the Hetzner demo env). Non-interactive and corner-pinned so it never shifts
// the layout or intercepts clicks. No-op (renders nothing) in normal builds.
export default function DemoBadge() {
  const on = process.env.NEXT_PUBLIC_DEMO_MODE;
  if (!on || on === "0" || on === "false") return null;
  return (
    <div
      aria-label="Entorno de demostración (dev)"
      style={{
        position: "fixed",
        bottom: 10,
        right: 10,
        zIndex: 2147483647,
        padding: "4px 11px",
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        color: "#fff",
        background: "linear-gradient(90deg,#3D2BFF,#7A3DFF)",
        boxShadow: "0 4px 14px rgba(61,43,255,.35)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      Demo · Dev
    </div>
  );
}
