import { AlertTriangle, MessageCircle, Ban } from "lucide-react";

const CultureSection = ({ culture = {} }) => {
  const {
    nicknames = [],
    insider_terms = [],
    must_say = "",
    never_say = "",
    running_debates = [],
    dangerous_territory = "",
  } = culture;

  return (
    <section data-testid="culture-section" className="relative">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            [ file 03 · unauthorized ]
          </div>
          <h2 className="font-display font-black text-3xl md:text-5xl uppercase tracking-tight leading-none">
            Know this — <span className="text-[color:var(--stamp)]">culture</span>
          </h2>
          <p className="mt-2 text-sm text-[color:var(--ink-mid)] max-w-lg">
            What Wikipedia will never tell you. How fans actually talk about it.
          </p>
        </div>
      </header>

      {/* Nicknames strip */}
      {nicknames.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            they're called //
          </span>
          {nicknames.map((n) => (
            <span
              key={n}
              className="px-2 py-1 bg-[color:var(--ink)] text-white font-display font-bold uppercase text-sm tracking-wide"
            >
              {n}
            </span>
          ))}
        </div>
      )}

      {/* Two-column: must/never */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[color:var(--emerald-bg)] border border-emerald-200 p-5 relative overflow-hidden" data-testid="culture-must-say">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--emerald)] flex items-center gap-1">
            <MessageCircle size={11} /> must say
          </div>
          <p className="mt-2 font-display font-bold text-xl uppercase leading-tight text-[color:var(--ink)]">
            "{must_say}"
          </p>
        </div>
        <div className="bg-[color:var(--stamp-bg)] border border-red-200 p-5 relative overflow-hidden" data-testid="culture-never-say">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--stamp)] flex items-center gap-1">
            <Ban size={11} /> never say
          </div>
          <p className="mt-2 font-display font-bold text-xl uppercase leading-tight text-[color:var(--ink)]">
            "{never_say}"
          </p>
        </div>
      </div>

      {/* Insider terms - loose note style */}
      {insider_terms.length > 0 && (
        <div className="mt-6 bg-[color:var(--paper-tint)] border border-dashed border-[color:var(--ink)] p-5" data-testid="culture-lore-card">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] mb-3">
            insider glossary
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {insider_terms.map((t, i) => (
              <div key={i} className="flex gap-3">
                <dt className="font-display font-black uppercase text-[color:var(--stamp)] shrink-0" data-testid="culture-slang-tag">
                  {t.term}
                </dt>
                <dd className="text-sm text-[color:var(--ink-mid)] leading-snug">
                  {t.meaning}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Debates */}
      {running_debates.length > 0 && (
        <div className="mt-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] mb-2">
            ongoing debates in the group chat
          </div>
          <ul className="space-y-1.5">
            {running_debates.map((d, i) => (
              <li key={i} className="flex gap-3 text-[color:var(--ink)] leading-snug">
                <span className="font-mono text-xs text-[color:var(--ink-mute)] shrink-0">
                  vs.
                </span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dangerous territory */}
      {dangerous_territory && (
        <div className="mt-6 relative border-2 border-[color:var(--stamp)] bg-[color:var(--card)]" data-testid="culture-danger">
          <div className="absolute -top-2.5 left-4 bg-[color:var(--stamp)] text-white font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 flex items-center gap-1">
            <AlertTriangle size={11} strokeWidth={2.5} /> dangerous territory
          </div>
          <div className="p-5 pt-6">
            <p className="text-[color:var(--ink)] leading-relaxed">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--stamp)] mr-2">
                no safe answer //
              </span>
              {dangerous_territory}
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default CultureSection;
