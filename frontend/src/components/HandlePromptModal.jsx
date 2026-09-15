import { useState } from "react";
import { UserCircle } from "lucide-react";

const HandlePromptModal = ({ entityName, onSubmit, onSkip }) => {
  const [handle, setHandle] = useState("");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const h = handle.trim();
    if (!h) {
      onSkip();
      return;
    }
    if (h.length < 2) {
      setErr("too short");
      return;
    }
    if (!/^[\w\- ]+$/.test(h)) {
      setErr("letters, numbers, dash only");
      return;
    }
    onSubmit(h.replace(/\s+/g, "-"));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      data-testid="handle-prompt-modal"
    >
      <div className="max-w-md w-full bg-[color:var(--card)] border-2 border-[color:var(--ink)] shadow-[var(--shadow-hard)]">
        <div className="marching h-1" />
        <div className="p-6">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            <UserCircle size={12} className="text-[color:var(--stamp)]" /> [ first larper credit ]
          </div>
          <h2 className="mt-2 font-display font-black text-3xl uppercase leading-tight text-[color:var(--ink)]">
            You're the first
          </h2>
          <p className="mt-3 text-[color:var(--ink-mid)] leading-relaxed">
            Nobody's compiled a case file on{" "}
            <span className="font-display font-bold text-[color:var(--ink)] uppercase">
              {entityName}
            </span>{" "}
            yet. Want credit as the analyst who did?
          </p>

          <form onSubmit={submit} className="mt-5">
            <label className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
              call sign (optional)
            </label>
            <input
              autoFocus
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value);
                setErr("");
              }}
              maxLength={24}
              placeholder="Agent-K13"
              data-testid="handle-input"
              className="w-full mt-1 px-3 py-2.5 bg-[color:var(--paper-tint)] border-2 border-[color:var(--ink)] font-mono text-sm focus:outline-none focus:bg-[color:var(--card)]"
            />
            {err && (
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[color:var(--stamp)]">
                {err}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="submit"
                data-testid="handle-submit-btn"
                className="flex-1 py-2.5 bg-[color:var(--stamp)] hover:bg-[color:var(--stamp-hover)] text-white font-display font-bold uppercase tracking-wide"
              >
                Compile as {handle.trim() || "Anonymous"}
              </button>
              <button
                type="button"
                onClick={onSkip}
                data-testid="handle-skip-btn"
                className="px-4 py-2.5 border-2 border-[color:var(--ink)] bg-[color:var(--card)] font-display font-bold uppercase text-sm tracking-wide hover:bg-[color:var(--paper-muted)]"
              >
                Skip
              </button>
            </div>
          </form>

          <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            shown on the case file · one shot only · keep it PG
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandlePromptModal;
