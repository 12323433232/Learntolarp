import { Loader2 } from "lucide-react";

const PHASES = [
  { label: "Requesting archive access", ms: 400 },
  { label: "Cross-referencing sources", ms: 900 },
  { label: "Verifying quotes", ms: 700 },
  { label: "Grading larpability", ms: 500 },
  { label: "Redacting the boring parts", ms: 400 },
];

const GeneratingModal = ({ query, phase }) => {
  return (
    <div
      className="min-h-[70vh] flex items-center justify-center px-4"
      data-testid="generating-casefile-modal"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-xl bg-[color:var(--card)] border-2 border-[color:var(--ink)] shadow-[var(--shadow-hard)] p-6">
        <div className="marching h-1 -mx-6 -mt-6 mb-6" />
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-[color:var(--stamp)]" size={20} />
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            {phase === "loading" ? "// checking archive" : "// compiling new case file"}
          </div>
        </div>
        <h2 className="mt-3 font-display font-black text-3xl md:text-4xl uppercase leading-tight break-words">
          {query}
        </h2>
        <div className="mt-6 space-y-2 font-mono text-xs">
          {PHASES.map((p, i) => (
            <div
              key={p.label}
              className="flex items-center gap-3 text-[color:var(--ink-mid)]"
              style={{
                opacity: 0,
                animation: `fadeInStep 0.4s ${i * 0.35}s forwards`,
              }}
            >
              <span className="pulse-dot" />
              <span className="uppercase tracking-wider">{p.label}…</span>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-dashed border-[color:var(--line)] font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
          this can take 10-20 seconds on a fresh compile
        </div>
      </div>
      <style>{`
        @keyframes fadeInStep {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default GeneratingModal;
