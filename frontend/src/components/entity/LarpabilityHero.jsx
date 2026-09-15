import { Download, Flame } from "lucide-react";

const TIER_STYLES = {
  S: { bg: "bg-[color:var(--stamp-bg)]", text: "text-[color:var(--stamp)]", border: "border-[color:var(--stamp)]", label: "S-TIER" },
  A: { bg: "bg-[color:var(--indigo-bg)]", text: "text-[color:var(--indigo)]", border: "border-[color:var(--indigo)]", label: "A-TIER" },
  B: { bg: "bg-[color:var(--emerald-bg)]", text: "text-[color:var(--emerald)]", border: "border-[color:var(--emerald)]", label: "B-TIER" },
  C: { bg: "bg-[color:var(--amber-bg)]", text: "text-[color:var(--amber)]", border: "border-[color:var(--amber)]", label: "C-TIER" },
};

const DIFF_COPY = {
  easy: "Anyone can pull this off",
  moderate: "Some homework required",
  hard: "You'll be tested",
  nightmare: "Do not attempt at parties",
};

const LarpabilityHero = ({ data, onExport }) => {
  const tier = data.larpability?.tier || "B";
  const style = TIER_STYLES[tier] || TIER_STYLES.B;
  const diff = data.larpability?.difficulty || "moderate";

  return (
    <section
      className="relative bg-white border-2 border-[color:var(--ink)] p-6 md:p-10 paper-grain"
      data-testid="entity-hero"
    >
      {/* Top metadata strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] pb-4 border-b border-dashed border-[color:var(--line)]">
        <span>Case #{data.slug.slice(0, 8).toUpperCase()}</span>
        <span>Type // <span className="text-[color:var(--ink)]">{data.entity_type}</span></span>
        <span>Infiltrations // <span className="text-[color:var(--ink)]" data-testid="infiltration-count-stat">{data.infiltration_count}</span></span>
        <span>First larped by // <span className="text-[color:var(--ink)]">{data.first_larped_by}</span></span>
        {data.trending && (
          <span className="flex items-center gap-1 text-[color:var(--stamp)]" data-testid="trending-badge">
            <Flame size={12} strokeWidth={2.5} /> trending
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-start">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] mb-2">
            [ SUBJECT ]
          </div>
          <h1
            className="font-display font-black text-5xl sm:text-6xl md:text-7xl uppercase leading-[0.9] tracking-tight"
            data-testid="entity-title"
          >
            {data.name}
          </h1>
          <div className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-[color:var(--line)] bg-[color:var(--paper-tint)]" data-testid="entity-type-badge">
            <span className="w-1.5 h-1.5 bg-[color:var(--stamp)]" />
            {data.entity_type}
          </div>
          <p className="mt-5 text-lg md:text-xl text-[color:var(--ink-mid)] max-w-2xl leading-relaxed">
            {data.one_line_context}
          </p>

          <button
            onClick={onExport}
            data-testid="export-cheat-sheet-btn"
            className="mt-6 inline-flex items-center gap-2 px-5 py-3 bg-[color:var(--ink)] text-white font-display font-bold uppercase tracking-wide hover:bg-[color:var(--stamp)] transition-colors"
          >
            <Download size={16} strokeWidth={2.5} />
            Export cheat sheet
          </button>
        </div>

        {/* Score stamp */}
        <div className="flex flex-col items-center md:items-end" data-testid="larpability-score-badge">
          <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-[color:var(--ink-mute)] mb-2">
            larpability grade
          </div>
          <div className={`stamp ${style.text} ${style.border} px-6 py-4 flex flex-col items-center min-w-[140px]`}>
            <div className="font-display font-black text-7xl md:text-8xl leading-none">
              {tier}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest mt-1">
              {style.label}
            </div>
          </div>
          <div className="mt-4 max-w-[220px] text-right">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
              difficulty
            </div>
            <div className="font-display font-bold text-lg uppercase text-[color:var(--ink)]">
              {diff}
            </div>
            <div className="text-xs text-[color:var(--ink-mid)] mt-1">
              {DIFF_COPY[diff] || ""}
            </div>
          </div>
        </div>
      </div>

      {data.larpability?.reasoning && (
        <div className="mt-8 pt-4 border-t border-dashed border-[color:var(--line)] font-mono text-xs text-[color:var(--ink-mid)]">
          <span className="text-[color:var(--ink-mute)] uppercase tracking-widest mr-2">verdict //</span>
          {data.larpability.reasoning}
        </div>
      )}
    </section>
  );
};

export default LarpabilityHero;
