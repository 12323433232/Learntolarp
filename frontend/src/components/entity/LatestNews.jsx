import { ExternalLink, Radio } from "lucide-react";

const LatestNews = ({ items = [], quietNote }) => {
  return (
    <section data-testid="latest-news-section">
      <header className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            [ file 05 · signals ]
          </div>
          <h2 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tight">
            Latest
          </h2>
        </div>
      </header>

      {items.length === 0 ? (
        <div
          className="bg-[color:var(--paper-tint)] border border-dashed border-[color:var(--line)] p-6 text-center"
          data-testid="news-empty-state"
        >
          <Radio className="mx-auto text-[color:var(--ink-mute)]" size={20} />
          <p className="mt-2 font-display font-bold text-lg uppercase text-[color:var(--ink)]">
            Nothing on the wire
          </p>
          <p className="mt-1 text-sm text-[color:var(--ink-mid)]">
            {quietNote || "Quiet week. Fandom is between drops."}
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {items.map((n, i) => (
            <li
              key={i}
              className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 bg-[color:var(--card)] border border-[color:var(--line)] px-4 py-3"
              data-testid="news-item"
            >
              <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--stamp)]">
                {n.date}
              </span>
              <span className="text-[color:var(--ink)] leading-snug">
                {n.headline}
              </span>
              {n.link && (
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--indigo)] hover:underline font-mono text-[10px] uppercase tracking-widest inline-flex items-center gap-1"
                >
                  read <ExternalLink size={10} />
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

export default LatestNews;
