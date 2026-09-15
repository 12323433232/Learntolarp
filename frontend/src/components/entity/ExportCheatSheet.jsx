import { useRef } from "react";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { X, Download, Copy, Radio } from "lucide-react";

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
    ...(d.quotes || []).slice(0, 3).map((q) => `  — "${q.quote}" (${q.speaker})`),
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

  const downloadPng = async () => {
    if (!sheetRef.current) return;
    try {
      const canvas = await html2canvas(sheetRef.current, {
        backgroundColor: "#F7F4EE",
        scale: 2,
        useCORS: true,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `learntolarp-${data.slug}.png`;
      a.click();
      toast.success("Cheat sheet saved");
    } catch (e) {
      toast.error("PNG export failed");
    }
  };

  const copyText = async () => {
    await navigator.clipboard?.writeText(buildText(data));
    toast.success("Copied — paste it anywhere");
  };

  const c = data.culture || {};
  const s = data.starters || {};

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      data-testid="cheat-sheet-modal"
    >
      <div
        className="bg-[color:var(--paper)] max-w-lg w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-[color:var(--ink)] text-white">
          <div className="font-mono text-[10px] uppercase tracking-widest">
            cheat sheet // pocket edition
          </div>
          <button onClick={onClose} aria-label="Close" data-testid="cheat-close-btn">
            <X size={16} />
          </button>
        </div>

        {/* Printable sheet */}
        <div
          ref={sheetRef}
          className="p-6 bg-[color:var(--paper)]"
          style={{ width: "100%" }}
          data-testid="cheat-sheet-content"
        >
          <div className="flex items-start justify-between gap-4 pb-3 border-b-2 border-[color:var(--ink)]">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-[color:var(--stamp)]">
                learntolarp.com // pocket file
              </div>
              <div className="font-display font-black text-3xl uppercase leading-tight mt-1">
                {data.name}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] mt-1">
                {data.entity_type} · case #{data.slug.slice(0, 6).toUpperCase()}
              </div>
            </div>
            <div className="stamp text-[color:var(--stamp)] border-[color:var(--stamp)] px-3 py-1">
              <div className="font-display font-black text-4xl leading-none">
                {data.larpability?.tier || "B"}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--ink-mute)]">
              tl;dr
            </div>
            <ol className="mt-1 space-y-1">
              {(data.briefing_5sec || []).map((l, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="font-mono text-[color:var(--stamp)] shrink-0">
                    0{i + 1}
                  </span>
                  <span>{l}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="border border-emerald-300 bg-[color:var(--emerald-bg)] p-2">
              <div className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--emerald)]">
                must say
              </div>
              <div className="text-xs font-medium mt-0.5">"{c.must_say}"</div>
            </div>
            <div className="border border-red-300 bg-[color:var(--stamp-bg)] p-2">
              <div className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--stamp)]">
                never say
              </div>
              <div className="text-xs font-medium mt-0.5">"{c.never_say}"</div>
            </div>
          </div>

          {(data.quotes || []).slice(0, 2).length > 0 && (
            <div className="mt-4">
              <div className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--ink-mute)]">
                drop this
              </div>
              {(data.quotes || []).slice(0, 2).map((q, i) => (
                <div key={i} className="text-xs mt-1 border-l-2 border-[color:var(--ink)] pl-2">
                  <span className="italic">"{q.quote}"</span>
                  <span className="font-mono text-[color:var(--ink-mute)]"> — {q.speaker}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-1 text-xs">
            {s.safe?.[0] && (
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--emerald)] mr-2">
                  safe
                </span>
                "{s.safe[0]}"
              </div>
            )}
            {s.risky?.[0] && (
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--stamp)] mr-2">
                  risky
                </span>
                "{s.risky[0]}"
              </div>
            )}
          </div>

          <div className="mt-4 pt-2 border-t border-dashed border-[color:var(--line)] flex items-center justify-between font-mono text-[9px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            <span className="flex items-center gap-1">
              <Radio size={10} /> learntolarp.com
            </span>
            <span>/entity/{data.slug}</span>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-[color:var(--line)] bg-white">
          <button
            onClick={downloadPng}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2 bg-[color:var(--stamp)] hover:bg-[color:var(--stamp-hover)] text-white font-display font-bold uppercase tracking-wide"
            data-testid="download-png-btn"
          >
            <Download size={14} /> Download PNG
          </button>
          <button
            onClick={copyText}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2 border-2 border-[color:var(--ink)] bg-white hover:bg-[color:var(--paper-muted)] font-display font-bold uppercase tracking-wide"
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
