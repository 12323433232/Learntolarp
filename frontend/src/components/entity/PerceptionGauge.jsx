const PerceptionGauge = ({ perception = {} }) => {
  const fans = Math.max(0, Math.min(100, perception.fans_pct ?? 70));
  const critics = Math.max(0, Math.min(100, perception.critics_pct ?? 55));
  const fansSay = perception.fans_say || [];
  const criticsSay = perception.critics_say || [];

  return (
    <section data-testid="perception-section" className="bg-white border border-[color:var(--line)] p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] mb-3">
        public perception
      </div>

      <div className="space-y-3" data-testid="perception-gauge">
        <div>
          <div className="flex justify-between font-mono text-xs uppercase tracking-widest mb-1">
            <span className="text-[color:var(--emerald)]">Cult following</span>
            <span className="text-[color:var(--ink)]">{fans}%</span>
          </div>
          <div className="h-3 bg-[color:var(--paper-muted)] relative overflow-hidden">
            <div
              className="h-full bg-[color:var(--emerald)]"
              style={{ width: `${fans}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between font-mono text-xs uppercase tracking-widest mb-1">
            <span className="text-[color:var(--stamp)]">Gatekeepers</span>
            <span className="text-[color:var(--ink)]">{critics}%</span>
          </div>
          <div className="h-3 bg-[color:var(--paper-muted)] relative overflow-hidden">
            <div
              className="h-full bg-[color:var(--stamp)]"
              style={{ width: `${critics}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {fansSay.length > 0 && (
          <div data-testid="fans-say-card">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--emerald)] mb-1">
              fans say
            </div>
            <ul className="space-y-1 text-sm text-[color:var(--ink)]">
              {fansSay.slice(0, 3).map((f, i) => (
                <li key={i} className="flex gap-2 leading-snug">
                  <span className="text-[color:var(--emerald)] shrink-0">+</span>
                  <span>{f.point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {criticsSay.length > 0 && (
          <div data-testid="critics-say-card">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--stamp)] mb-1">
              critics say
            </div>
            <ul className="space-y-1 text-sm text-[color:var(--ink)]">
              {criticsSay.slice(0, 3).map((f, i) => (
                <li key={i} className="flex gap-2 leading-snug">
                  <span className="text-[color:var(--stamp)] shrink-0">−</span>
                  <span>{f.point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-4 font-mono text-[9px] uppercase tracking-widest text-[color:var(--ink-mute)]">
        reported sentiment — not the site's opinion
      </div>
    </section>
  );
};

export default PerceptionGauge;
