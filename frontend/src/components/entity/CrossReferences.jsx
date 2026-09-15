import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Lock } from "lucide-react";
import { api } from "@/lib/api";

const CrossReferences = ({ refs = [], onQueue }) => {
  const [existing, setExisting] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    if (!refs.length) return;
    api
      .get("/entities?sort=recent&limit=200")
      .then((r) => {
        if (cancelled) return;
        const set = new Set((r.data.items || []).map((i) => i.slug));
        setExisting(set);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refs]);

  if (!refs.length) return null;

  return (
    <section data-testid="cross-ref-grid">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
        [ related files ]
      </div>
      <h2 className="font-display font-black text-2xl uppercase tracking-tight mb-3">
        Cross-references
      </h2>
      <ul className="space-y-2">
        {refs.map((r) => {
          const compiled = existing.has(r.slug);
          if (compiled) {
            return (
              <li key={r.slug}>
                <Link
                  to={`/entity/${r.slug}`}
                  className="group flex items-center justify-between gap-2 bg-[color:var(--card)] border border-[color:var(--line)] px-3 py-2 hover:border-[color:var(--ink)] transition-colors"
                  data-testid="cross-ref-active-card"
                >
                  <span className="font-display font-bold uppercase truncate">
                    {r.name}
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-[color:var(--ink-mute)] group-hover:text-[color:var(--stamp)]"
                  />
                </Link>
              </li>
            );
          }
          return (
            <li key={r.slug}>
              <button
                onClick={() => onQueue?.(r)}
                className="w-full flex items-center justify-between gap-2 bg-[color:var(--ink)] hover:bg-[color:var(--ink-soft)] px-3 py-2 transition-colors group"
                data-testid="cross-ref-redacted-card"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Lock size={12} className="text-white/60 shrink-0" />
                  <span className="redacted h-3 flex-1 min-w-[80px] max-w-[140px]" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/70 truncate">
                    {r.name}
                  </span>
                </span>
                <span
                  className="font-mono text-[9px] uppercase tracking-widest text-white/70 group-hover:text-[color:var(--stamp)]"
                  data-testid="queue-generation-btn"
                >
                  request
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default CrossReferences;
