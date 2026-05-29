import { Logo, LogoBadge, LogoMark } from "@/components/logo";

export default function BrandPreview() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* DARK */}
      <section style={{ padding: 48, display: "flex", flexDirection: "column", gap: 40 }}>
        <h2 style={{ color: "var(--fg-subtle)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>
          On dark
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: 56, flexWrap: "wrap" }}>
          <Logo size="xl" showTagline />
          <Logo size="md" />
          <Logo size="sm" />
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 40, flexWrap: "wrap" }}>
          <LogoBadge size="xl" />
          <LogoBadge size="lg" />
          <LogoBadge size="md" />
          <LogoBadge size="sm" />
          <LogoBadge size="xs" />
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 40, flexWrap: "wrap" }}>
          <LogoBadge size="xl" tile glow={false} />
          <LogoBadge size="lg" tile glow={false} />
          <LogoBadge size="md" tile glow={false} />
          <Logo size="lg" tile />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 40, color: "var(--fg)" }}>
          <LogoMark size={52} />
          <LogoMark size={32} />
          <LogoMark size={16} />
          <span style={{ color: "var(--fg-subtle)", fontSize: 12 }}>monochrome (currentColor)</span>
        </div>
      </section>

      {/* LIGHT */}
      <section style={{ padding: 48, background: "#fafafa", display: "flex", flexDirection: "column", gap: 40 }}>
        <h2 style={{ color: "#6b6770", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>
          On light
        </h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 40, flexWrap: "wrap" }}>
          <LogoBadge size="xl" glow={false} />
          <LogoBadge size="md" glow={false} />
          <LogoBadge size="xl" tile glow={false} />
          <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#0a0809" }}>
            <LogoMark size={40} />
            <LogoMark size={20} />
          </span>
        </div>
      </section>

      {/* Favicon scale check */}
      <section style={{ padding: 48, background: "#181418", display: "flex", alignItems: "center", gap: 24 }}>
        <span style={{ color: "var(--fg-subtle)", fontSize: 12 }}>favicon scale:</span>
        <LogoBadge size="md" tile glow={false} />
        <div style={{ width: 16, height: 16 }}><LogoBadge size="xs" tile glow={false} className="!w-4 !h-4" /></div>
      </section>
    </div>
  );
}
