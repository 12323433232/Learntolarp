import { useRef } from "react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { X, Download, Copy, Radio, Flame } from "lucide-react";

const TIER_ACCENT = {
  S: "#d63d2e", A: "#4338ca", B: "#047857", C: "#b45309",
};

const buildText = (d) => {
  const c = d.culture || {};
  const s = d.starters || {};
  return [
    `LEARNTOLARP // ${d.name.toUpperCase()}`,
    `Tier ${d.larpability?.tier || "B"} · ${d.larpability?.difficulty || "moderate"}`,
    ``,
    `TL;DR`,
    ...(d.briefing_5sec || []).map((l, i) => `  ${i + 1}. ${l}`),
    ``,
    `MUST SAY: "${c.must_say || ""}"`,
    `NEVER SAY: "${c.never_say || ""}"`,
    c.dangerous_territory ? `NO SAFE ANSWER: ${c.dangerous_territory}` : "",
    ``,
    `QUOTES TO DROP:`,
    ...(d.quotes || []).slice(0, 2).map((q) => `  — "${q.quote}" (${q.speaker})`),
    ``,
    s.safe?.length ? `SAFE: "${s.safe[0]}"` : "",
    s.risky?.length ? `RISKY: "${s.risky[0]}"` : "",
    ``,
    `learntolarp.com/entity/${d.slug}`,
  ]
    .filter(Boolean)
    .join("\n");
};

const ExportCheatSheet = ({ data, onClose }) => {
  const sheetRef = useRef(null);
  const accent = TIER_ACCENT[data.larpability?.tier] || TIER_ACCENT.B;
  const tier = data.larpability?.tier || "B";
  const c = data.culture || {};
  const s = data.starters || {};
  const q1 = (data.quotes || [])[0];

  const downloadPng = async () => {
    if (!sheetRef.current) return;
    try {
      const canvas = await html2canvas(sheetRef.current, {
        backgroundColor: "#f5f1e8",
        scale: 2,
        useCORS: true,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `learntolarp-${data.slug}.png`;
      a.click();
      toast.success("Cheat sheet saved");
    } catch {
      toast.error("PNG export failed");
    }
  };

  const copyText = async () => {
    await navigator.clipboard?.writeText(buildText(data));
    toast.success("Copied — paste it anywhere");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      data-testid="cheat-sheet-modal"
    >
      <div
        className="max-w-md w-full my-4 bg-[color:var(--card)] border-2 border-[color:var(--ink)] shadow-[var(--shadow-hard)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-[color:var(--ink)] text-[color:var(--paper)]">
          <div className="font-mono text-[10px] uppercase tracking-widest">
            cheat sheet // pocket edition
          </div>
          <button onClick={onClose} aria-label="Close" data-testid="cheat-close-btn">
            <X size={16} />
          </button>
        </div>

        {/* Portrait share card (9:16 aspect) */}
        <div className="p-3 bg-[color:var(--paper-muted)]">
          <div
            ref={sheetRef}
            style={{ width: "360px", height: "640px", background: "#f5f1e8", color: "#1a1a2e", fontFamily: "Work Sans, sans-serif", margin: "0 auto", position: "relative", padding: "24px", boxSizing: "border-box", overflow: "hidden" }}
            data-testid="cheat-sheet-content"
          >
            {/* Grain */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(26,26,46,0.05) 1px, transparent 1px)", backgroundSize: "4px 4px", pointerEvents: "none" }} />

            {/* Header stripe */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "JetBrains Mono, monospace", fontSize: "9px", letterSpacing: "0.2em", color: "#7a7a90", textTransform: "uppercase", borderBottom: "1px solid #dcd4c1", paddingBottom: "8px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Radio size={10} /> learntolarp.com
              </span>
              <span>case #{data.slug.slice(0, 6).toUpperCase()}</span>
            </div>

            {/* Title + tier */}
            <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "start" }}>
              <div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", letterSpacing: "0.25em", color: "#7a7a90", textTransform: "uppercase" }}>
                  subject
                </div>
                <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 900, fontSize: "34px", lineHeight: 0.95, textTransform: "uppercase", marginTop: "2px", color: "#1a1a2e" }}>
                  {data.name}
                </div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", letterSpacing: "0.15em", color: "#7a7a90", textTransform: "uppercase", marginTop: "6px" }}>
                  {data.entity_type} · {data.larpability?.difficulty || "moderate"}
                </div>
              </div>
              <div style={{ border: `3px solid ${accent}`, boxShadow: `inset 0 0 0 2px ${accent}`, color: accent, transform: "rotate(-4deg)", padding: "6px 12px", textAlign: "center", minWidth: "58px" }}>
                <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 900, fontSize: "42px", lineHeight: 1 }}>
                  {tier}
                </div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "7px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                  tier
                </div>
              </div>
            </div>

            {/* TL;DR */}
            <div style={{ marginTop: "18px", background: "#fef3f1", borderLeft: "4px solid #d63d2e", padding: "10px 12px" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", letterSpacing: "0.25em", color: "#d63d2e", textTransform: "uppercase", marginBottom: "4px" }}>
                tl;dr
              </div>
              {(data.briefing_5sec || []).slice(0, 3).map((l, i) => (
                <div key={i} style={{ display: "flex", gap: "6px", fontSize: "11px", lineHeight: 1.35, marginTop: i === 0 ? 0 : "3px" }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#d63d2e", fontSize: "9px", flexShrink: 0 }}>0{i + 1}</span>
                  <span>{l}</span>
                </div>
              ))}
            </div>

            {/* Must / Never */}
            <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div style={{ border: "1px solid #a7f3d0", background: "#ecfdf5", padding: "8px" }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "7px", letterSpacing: "0.2em", color: "#047857", textTransform: "uppercase" }}>
                  must say
                </div>
                <div style={{ fontSize: "10px", marginTop: "2px", lineHeight: 1.3, fontWeight: 500 }}>"{c.must_say}"</div>
              </div>
              <div style={{ border: "1px solid #fca5a5", background: "#fef3f1", padding: "8px" }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "7px", letterSpacing: "0.2em", color: "#d63d2e", textTransform: "uppercase" }}>
                  never say
                </div>
                <div style={{ fontSize: "10px", marginTop: "2px", lineHeight: 1.3, fontWeight: 500 }}>"{c.never_say}"</div>
              </div>
            </div>

            {/* Killer quote */}
            {q1 && (
              <div style={{ marginTop: "14px", borderLeft: "3px solid #1a1a2e", paddingLeft: "10px" }}>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#7a7a90", textTransform: "uppercase", marginBottom: "3px" }}>
                  drop this
                </div>
                <div style={{ fontSize: "11px", fontStyle: "italic", lineHeight: 1.35 }}>"{q1.quote}"</div>
                <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", letterSpacing: "0.15em", color: "#7a7a90", textTransform: "uppercase", marginTop: "3px" }}>
                  — {q1.speaker}
                </div>
              </div>
            )}

            {/* Starters */}
            <div style={{ marginTop: "14px", fontSize: "10px", lineHeight: 1.4 }}>
              {s.safe?.[0] && (
                <div style={{ marginBottom: "4px" }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#047857", textTransform: "uppercase", marginRight: "6px" }}>safe</span>
                  "{s.safe[0]}"
                </div>
              )}
              {s.risky?.[0] && (
                <div>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#d63d2e", textTransform: "uppercase", marginRight: "6px" }}>risky</span>
                  "{s.risky[0]}"
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ position: "absolute", left: "24px", right: "24px", bottom: "20px", borderTop: "1px dashed #dcd4c1", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono, monospace", fontSize: "8px", letterSpacing: "0.2em", color: "#7a7a90", textTransform: "uppercase" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Flame size={9} color="#d63d2e" /> compiled by {data.first_larped_by}
              </span>
              <span>/{data.slug}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-[color:var(--line)] bg-[color:var(--card)]">
          <button
            onClick={downloadPng}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-[color:var(--stamp)] hover:bg-[color:var(--stamp-hover)] text-white font-display font-bold uppercase tracking-wide"
            data-testid="download-png-btn"
          >
            <Download size={14} /> Download PNG
          </button>
          <button
            onClick={copyText}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 border-2 border-[color:var(--ink)] bg-[color:var(--card)] text-[color:var(--ink)] hover:bg-[color:var(--paper-muted)] font-display font-bold uppercase tracking-wide"
            data-testid="copy-cheat-text-btn"
          >
            <Copy size={14} /> Copy text
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportCheatSheet;
