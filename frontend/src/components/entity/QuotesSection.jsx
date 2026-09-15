import { Quote as QuoteIcon } from "lucide-react";

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("") || "??";

const REASON_STYLES = {
  infamous: "bg-[color:var(--stamp)] text-white",
  defining: "bg-[color:var(--ink)] text-white",
  funny: "bg-[color:var(--amber)] text-white",
  default: "bg-[color:var(--paper-muted)] text-[color:var(--ink)]",
};
const reasonStyle = (r = "") => {
  const k = r.toLowerCase();
  if (k.includes("infam")) return REASON_STYLES.infamous;
  if (k.includes("defin")) return REASON_STYLES.defining;
  if (k.includes("fun") || k.includes("dumb")) return REASON_STYLES.funny;
  return REASON_STYLES.default;
};

const QuotesSection = ({ quotes = [], name }) => {
  if (!quotes.length) return null;
  return (
    <section data-testid="quotes-section">
      <header className="mb-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
          [ file 04 · transcript ]
        </div>
        <h2 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tight">
          Infiltration briefing
        </h2>
        <p className="text-sm text-[color:var(--ink-mid)]">
          Real things {name} said. Drop one at the right moment and you're in.
        </p>
      </header>

      <div className="space-y-3">
        {quotes.map((q, i) => (
          <article
            key={i}
            className="grid grid-cols-[auto_1fr] gap-4 bg-white border-l-4 border-[color:var(--ink)] pl-4 pr-5 py-4"
            data-testid="quote-item"
          >
            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="w-10 h-10 border-2 border-[color:var(--ink)] flex items-center justify-center font-mono font-bold text-xs bg-[color:var(--paper-tint)]">
                {initials(q.speaker || name)}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--ink-mute)]">
                #{String(i + 1).padStart(2, "0")}
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                <div
                  className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink)]"
                  data-testid="quote-speaker"
                >
                  {q.speaker}
                  {q.context && (
                    <span className="text-[color:var(--ink-mute)] ml-2 normal-case tracking-normal font-normal">
                      {q.context}
                    </span>
                  )}
                </div>
                {q.reason && (
                  <span
                    className={`font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 ${reasonStyle(q.reason)}`}
                    data-testid="quote-reason-badge"
                  >
                    {q.reason}
                  </span>
                )}
              </div>
              <blockquote className="text-[color:var(--ink)] leading-snug italic relative pl-4">
                <QuoteIcon
                  size={12}
                  className="absolute left-0 top-1 text-[color:var(--stamp)] not-italic"
                />
                {q.quote}
              </blockquote>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default QuotesSection;
