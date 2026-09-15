const BriefingBanner = ({ lines = [] }) => {
  if (!lines.length) return null;
  return (
    <section
      className="relative bg-[color:var(--stamp-bg)] border-l-[6px] border-[color:var(--stamp)] pl-6 pr-6 py-5"
      data-testid="briefing-tldr-card"
    >
      <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--stamp)] mb-2">
        5-second briefing // TL;DR
      </div>
      <ul className="space-y-1.5" data-testid="briefing-text">
        {lines.map((l, i) => (
          <li key={i} className="flex gap-3 text-[color:var(--ink)] leading-snug">
            <span className="font-mono text-xs text-[color:var(--stamp)] shrink-0 pt-1">
              0{i + 1}
            </span>
            <span className="font-medium">{l}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default BriefingBanner;
