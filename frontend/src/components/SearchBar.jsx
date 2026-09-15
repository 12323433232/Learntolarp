import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Lock, Hourglass } from "lucide-react";
import { searchLive, slugify } from "@/lib/api";

const KIND_META = {
  compiled: { label: "compiled", color: "text-[color:var(--emerald)]" },
  approved: { label: "in library", color: "text-[color:var(--indigo)]" },
  queued: { label: "requested", color: "text-[color:var(--ink-mute)]" },
};

const useDebounced = (value, ms = 180) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

const SearchBar = ({ size = "lg", autoFocusHotkey = false, testIdPrefix = "hero" }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const debounced = useDebounced(q, 200);

  useEffect(() => {
    if (!autoFocusHotkey) return;
    const handler = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [autoFocusHotkey]);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    searchLive(debounced.trim())
      .then((d) => {
        if (!cancelled) {
          setResults(d.items || []);
          setActive(0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    const onClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (name) => {
    const v = (name || q).trim();
    if (!v) return;
    setOpen(false);
    navigate(`/entity/${slugify(v)}?q=${encodeURIComponent(v)}`);
  };

  const onKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && results[active]) go(results[active].name);
      else go();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const isHero = size === "lg";

  return (
    <div ref={wrapRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className={`flex items-stretch bg-[color:var(--card)] border-2 border-[color:var(--ink)] ${isHero ? "shadow-[var(--shadow-hard)]" : ""}`}
        data-testid={`${testIdPrefix}-search-form`}
      >
        {isHero && (
          <div className="hidden sm:flex items-center px-4 border-r border-[color:var(--line)] font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            QUERY //
          </div>
        )}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={isHero ? "type anything larpable and hit enter…" : "quick lookup…"}
          data-testid={`${testIdPrefix}-search-input`}
          className={`flex-1 bg-transparent focus:outline-none placeholder:text-[color:var(--ink-mute)] ${
            isHero ? "px-4 py-4 md:py-5 text-lg md:text-xl font-medium" : "px-3 py-1.5 text-sm font-mono"
          }`}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          data-testid={`${testIdPrefix}-search-submit`}
          className={`bg-[color:var(--stamp)] hover:bg-[color:var(--stamp-hover)] text-white font-display font-black uppercase tracking-wide flex items-center gap-2 transition-colors ${
            isHero ? "px-5 md:px-8 text-lg" : "px-3 text-sm"
          }`}
        >
          <Search size={isHero ? 18 : 14} strokeWidth={3} />
          {isHero && <span className="hidden sm:inline">Compile</span>}
        </button>
      </form>

      {open && results.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-2 bg-[color:var(--card)] border-2 border-[color:var(--ink)] shadow-[var(--shadow-soft)] z-30 max-h-80 overflow-auto"
          data-testid="search-suggestions"
        >
          {results.map((r, i) => (
            <button
              key={`${r.kind}-${r.slug}`}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r.name)}
              data-testid="search-suggestion-item"
              className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 border-b border-[color:var(--line-soft)] last:border-0 ${
                i === active ? "bg-[color:var(--paper-muted)]" : ""
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                {r.kind === "queued" ? (
                  <Hourglass size={14} className="text-[color:var(--ink-mute)] shrink-0" />
                ) : r.kind === "approved" ? (
                  <Lock size={14} className="text-[color:var(--indigo)] shrink-0" />
                ) : (
                  <ArrowRight size={14} className="text-[color:var(--emerald)] shrink-0" />
                )}
                <span className="font-display font-bold uppercase text-lg truncate">
                  {r.name}
                </span>
                {r.entity_type && (
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--ink-mute)] truncate">
                    {r.entity_type}
                  </span>
                )}
              </span>
              <span
                className={`font-mono text-[9px] uppercase tracking-widest shrink-0 ${KIND_META[r.kind]?.color || ""}`}
              >
                {r.kind === "queued" ? `${r.votes || 1} want this` : KIND_META[r.kind]?.label}
                {r.kind === "compiled" && r.tier ? ` · ${r.tier}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
