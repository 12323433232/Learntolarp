import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TrendingUp, ArrowUpRight, Sparkles, Hourglass } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { listEntities, fetchQueue, slugify } from "@/lib/api";

const CATEGORIES = [
  { key: "all", label: "ALL" },
  { key: "artist", label: "ARTISTS" },
  { key: "band", label: "BANDS" },
  { key: "franchise", label: "FRANCHISES" },
  { key: "show", label: "SHOWS" },
  { key: "aesthetic", label: "AESTHETICS" },
  { key: "game", label: "GAMES" },
  { key: "sport", label: "SPORTS" },
];

const TIER_STYLES = {
  S: "bg-[color:var(--stamp-bg)] text-[color:var(--stamp)] border-[color:var(--stamp)]",
  A: "bg-[color:var(--indigo-bg)] text-[color:var(--indigo)] border-[color:var(--indigo-line)]",
  B: "bg-[color:var(--emerald-bg)] text-[color:var(--emerald)] border-emerald-300",
  C: "bg-[color:var(--amber-bg)] text-[color:var(--amber)] border-amber-300",
};

const SUGGESTIONS = [
  "Radiohead", "Taylor Swift", "Genshin Impact", "Chappell Roan",
  "Arcane", "Formula 1", "Cottagecore", "Y2K",
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [cat, setCat] = useState("all");
  const [trending, setTrending] = useState([]);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    listEntities("trending", 12).then((d) => setTrending(d.items || [])).catch(() => {});
    fetchQueue().then((d) => setQueue(d.items || [])).catch(() => {});
  }, []);

  const visible = cat === "all" ? trending : trending.filter((t) => t.entity_type === cat);

  return (
    <div>
      {/* HERO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-20 pb-12">
        <div className="max-w-3xl">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--ink-mute)] mb-4">
            [ FILE 001 ] // reference index for people who need to catch up fast
          </div>
          <h1 className="font-display font-black text-5xl sm:text-7xl md:text-8xl uppercase leading-[0.85] tracking-tight text-[color:var(--ink)]">
            Know the vibe.
            <br />
            <span className="text-[color:var(--stamp)]">Skip the deep dive.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-[color:var(--ink-mid)] max-w-2xl leading-relaxed">
            Search any band, artist, franchise, aesthetic, era — anything a
            fandom forms around. We compile a case file good enough that no one
            clocks you're new.
          </p>
        </div>

        <div className="mt-10 max-w-3xl">
          <SearchBar size="lg" autoFocusHotkey testIdPrefix="hero" />
          <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            <kbd className="px-1.5 py-0.5 border border-[color:var(--line)] bg-[color:var(--card)]">/</kbd>
            <span>to focus</span>
            <span className="mx-2 opacity-40">|</span>
            <span>press enter to compile</span>
          </div>
        </div>

        {/* SUGGESTIONS */}
        <div className="mt-6 flex flex-wrap gap-2 max-w-3xl" data-testid="suggestions-row">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] self-center mr-2">
            try:
          </span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => navigate(`/entity/${slugify(s)}?q=${encodeURIComponent(s)}`)}
              className="px-3 py-1 font-mono text-xs bg-[color:var(--card)] border border-[color:var(--line)] hover:border-[color:var(--ink)] hover:bg-[color:var(--paper-muted)] transition-colors"
              data-testid="suggestion-chip"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* TRENDING */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6 border-b border-[color:var(--ink)] pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
              // recently infiltrated
            </div>
            <h2 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tight flex items-center gap-3">
              <TrendingUp className="text-[color:var(--stamp)]" size={28} strokeWidth={2.5} />
              What everyone's catching up on
            </h2>
          </div>
          <div className="flex flex-wrap gap-1" data-testid="category-filters">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                data-testid={`category-filter-${c.key}`}
                className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest border transition-colors ${
                  cat === c.key
                    ? "bg-[color:var(--ink)] text-[color:var(--paper)] border-[color:var(--ink)]"
                    : "bg-[color:var(--card)] text-[color:var(--ink-mid)] border-[color:var(--line)] hover:border-[color:var(--ink)]"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div
            className="border border-dashed border-[color:var(--line)] p-10 text-center bg-[color:var(--card)]"
            data-testid="empty-trending"
          >
            <Sparkles className="mx-auto text-[color:var(--ink-mute)]" size={28} />
            <div className="font-display font-bold text-2xl uppercase mt-3">
              {cat === "all" ? "Archive is empty" : "Nothing here yet"}
            </div>
            <p className="font-mono text-xs text-[color:var(--ink-mute)] mt-2 uppercase tracking-wider">
              {cat === "all"
                ? "Be the first to compile something. Try the search above."
                : "No compiled entities in this category yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="trending-grid">
            {visible.map((e, idx) => (
              <Link
                key={e.slug}
                to={`/entity/${e.slug}`}
                className="group relative bg-[color:var(--card)] border border-[color:var(--line)] hover:border-[color:var(--ink)] p-5 transition-colors"
                data-testid="trending-entity-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
                      Case #{String(idx + 1).padStart(3, "0")} · {e.entity_type}
                    </div>
                    <div className="font-display font-black text-2xl uppercase leading-tight mt-1 truncate text-[color:var(--ink)]">
                      {e.name}
                    </div>
                  </div>
                  <div
                    className={`shrink-0 w-11 h-11 flex items-center justify-center border-2 font-display font-black text-xl ${
                      TIER_STYLES[e.larpability?.tier] || TIER_STYLES.B
                    }`}
                  >
                    {e.larpability?.tier || "B"}
                  </div>
                </div>
                <p className="mt-3 text-sm text-[color:var(--ink-mid)] clamp-2 leading-snug">
                  {e.one_line_context}
                </p>
                <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
                  <span>
                    {e.velocity > 0
                      ? `${e.velocity} hits this week`
                      : `${e.infiltration_count} infiltrations`}
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-[color:var(--ink-mute)] group-hover:text-[color:var(--stamp)] transition-colors"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* QUEUE */}
      {queue.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="border-t border-dashed border-[color:var(--line)] pt-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] mb-2 flex items-center gap-2">
              <Hourglass size={12} /> // requested — waiting on the analyst
            </div>
            <div className="flex flex-wrap gap-2" data-testid="queue-list">
              {queue.slice(0, 12).map((r) => (
                <button
                  key={r.key || r.slug}
                  onClick={() => navigate(`/entity/${r.slug || slugify(r.name)}?q=${encodeURIComponent(r.name)}`)}
                  className="px-3 py-1.5 bg-[color:var(--ink)] text-[color:var(--paper)]/80 font-mono text-xs hover:text-[color:var(--paper)] transition-colors flex items-center gap-2"
                  data-testid="queue-item"
                >
                  <span className="redacted inline-block h-3 w-12 align-middle" />
                  <span>{r.name}</span>
                  <span className="opacity-60">·</span>
                  <span>{r.votes || 1}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ETHOS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="border-l-4 border-[color:var(--stamp)] pl-5 max-w-2xl">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            [ MISSION NOTE ]
          </div>
          <p className="mt-2 text-[color:var(--ink)] leading-relaxed">
            This is a shortcut, not a substitute. If a fandom sticks, actually
            go be part of it. Nobody likes a tourist who never comes back.
          </p>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
