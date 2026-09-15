import { Link } from "react-router-dom";
import { Radio, Moon, Sun } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { useTheme } from "@/lib/ThemeContext";

const SiteFrame = ({ children }) => {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="border-b border-[color:var(--line)] bg-[color:var(--paper-tint)]/85 backdrop-blur sticky top-0 z-40"
        data-testid="site-header"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4 justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 group shrink-0"
            data-testid="site-logo"
          >
            <span className="w-7 h-7 border-2 border-[color:var(--ink)] flex items-center justify-center bg-[color:var(--stamp)] text-white">
              <Radio size={14} strokeWidth={2.5} />
            </span>
            <span className="font-display font-black text-xl tracking-tight leading-none text-[color:var(--ink)]">
              LEARN<span className="text-[color:var(--stamp)]">TO</span>LARP
              <span className="font-mono text-[9px] align-top text-[color:var(--ink-mute)] ml-1">
                .com
              </span>
            </span>
          </Link>

          <div className="hidden md:block flex-1 max-w-md">
            <SearchBar size="sm" testIdPrefix="header" />
          </div>

          <button
            onClick={toggle}
            aria-label="Toggle theme"
            data-testid="theme-toggle"
            className="w-9 h-9 flex items-center justify-center border border-[color:var(--line)] bg-[color:var(--card)] hover:border-[color:var(--ink)] transition-colors"
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
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
