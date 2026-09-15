import { Link, useNavigate } from "react-router-dom";
import { Radio, Search } from "lucide-react";
import { useState } from "react";
import { slugify } from "@/lib/api";

const SiteFrame = ({ children }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    navigate(`/entity/${slugify(v)}?q=${encodeURIComponent(v)}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="border-b border-[color:var(--line)] bg-[color:var(--paper-tint)]/80 backdrop-blur sticky top-0 z-40"
        data-testid="site-header"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4 justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 group"
            data-testid="site-logo"
          >
            <span className="w-7 h-7 border-2 border-[color:var(--ink)] flex items-center justify-center bg-[color:var(--stamp)] text-white">
              <Radio size={14} strokeWidth={2.5} />
            </span>
            <span className="font-display font-black text-xl tracking-tight leading-none">
              LEARN<span className="text-[color:var(--stamp)]">TO</span>LARP
              <span className="font-mono text-[9px] align-top text-[color:var(--ink-mute)] ml-1">
                .com
              </span>
            </span>
          </Link>

          <form
            onSubmit={submit}
            className="hidden md:flex items-center gap-2 flex-1 max-w-md"
            data-testid="header-search-form"
          >
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--ink-mute)]"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="quick lookup…"
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-[color:var(--line)] text-sm font-mono focus:border-[color:var(--ink)] focus:outline-none"
                data-testid="header-search-input"
              />
            </div>
          </form>

          <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            <span className="pulse-dot" />
            <span>live compile</span>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer
        className="border-t border-[color:var(--line)] mt-16 py-8"
        data-testid="site-footer"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between gap-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
          <div>learntolarp // an unofficial field guide to being convincing</div>
          <div>compiled by ai · verified by vibes · not affiliated with anyone</div>
        </div>
      </footer>
    </div>
  );
};

export default SiteFrame;
