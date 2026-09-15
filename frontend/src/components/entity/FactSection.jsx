import { Check, ExternalLink } from "lucide-react";

const FactSection = ({ items = [] }) => {
  if (!items.length) return null;
  return (
    <section data-testid="fact-section">
      <header className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            [ file 02 ]
          </div>
          <h2 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tight text-[color:var(--ink)]">
            Know this — <span className="text-[color:var(--ink-mid)]">fact</span>
          </h2>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] hidden sm:block">
          verified data / cite-able
        </span>
      </header>

      <div className="bg-[color:var(--card)] border border-[color:var(--ink)]">
        {items.map((f, i) => (
          <div
            key={i}
            className="grid grid-cols-[130px_1fr_auto] items-center gap-3 px-4 py-3 border-b last:border-b-0 border-[color:var(--line)]"
            data-testid="fact-item"
          >
            <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] flex items-center gap-1">
              <Check size={11} className="text-[color:var(--emerald)]" />
              {f.label}
            </div>
            <div className="text-[color:var(--ink)] leading-snug">{f.value}</div>
            <div>
              {f.source ? (
                <a
                  href={f.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--indigo)] hover:underline inline-flex items-center gap-1"
                  data-testid="fact-source-link"
                >
                  cite <ExternalLink size={10} />
                </a>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
                  —
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FactSection;
