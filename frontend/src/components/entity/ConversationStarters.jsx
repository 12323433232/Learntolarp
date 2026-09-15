import { Copy, Shield, Zap, Skull } from "lucide-react";
import { toast } from "sonner";

const TIERS = [
  {
    key: "safe",
    label: "SAFE",
    Icon: Shield,
    color: "text-[color:var(--emerald)]",
    border: "border-emerald-200",
    bg: "bg-[color:var(--emerald-bg)]",
    testid: "starter-card-safe",
    hint: "anyone can drop this",
  },
  {
    key: "medium",
    label: "MEDIUM",
    Icon: Zap,
    color: "text-[color:var(--amber)]",
    border: "border-amber-200",
    bg: "bg-[color:var(--amber-bg)]",
    testid: "starter-card-medium",
    hint: "semi-fan territory",
  },
  {
    key: "risky",
    label: "RISKY",
    Icon: Skull,
    color: "text-[color:var(--stamp)]",
    border: "border-red-200",
    bg: "bg-[color:var(--stamp-bg)]",
    testid: "starter-card-risky",
    hint: "you better mean it",
  },
];

const ConversationStarters = ({ starters = {} }) => {
  const copy = (text) => {
    navigator.clipboard?.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <section data-testid="starters-section">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
        [ field kit ]
      </div>
      <h2 className="font-display font-black text-2xl uppercase tracking-tight mb-3">
        Say-this-out-loud
      </h2>

      <div className="space-y-3">
        {TIERS.map(({ key, label, Icon, color, border, bg, testid, hint }) => {
          const lines = starters[key] || [];
          if (!lines.length) return null;
          return (
            <div
              key={key}
              className={`border ${border} ${bg}`}
              data-testid={testid}
            >
              <div className={`px-3 py-2 flex items-center justify-between border-b ${border}`}>
                <div className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest ${color}`}>
                  <Icon size={12} strokeWidth={2.5} />
                  {label}
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-[color:var(--ink-mute)]">
                  {hint}
                </span>
              </div>
              <ul className="divide-y divide-dashed divide-[color:var(--line)]">
                {lines.map((l, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-3 px-3 py-3"
                  >
                    <span className="text-sm text-[color:var(--ink)] leading-snug flex-1">
                      "{l}"
                    </span>
                    <button
                      onClick={() => copy(l)}
                      className="shrink-0 p-1.5 hover:bg-white transition-colors"
                      aria-label="Copy"
                      data-testid="copy-starter-btn"
                    >
                      <Copy size={12} className="text-[color:var(--ink-mute)]" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ConversationStarters;
