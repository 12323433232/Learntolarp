import { useEffect, useMemo, useState } from "react";
import { X, Bot, Shuffle, Check, Skull, Flame } from "lucide-react";
import { api } from "@/lib/api";

const ARCHETYPE_ORDER = ["casual_fan", "superfan", "new_fan", "ragebaiter", "fake_fan", "veteran"];
const ARCHETYPE_LABELS = {
  casual_fan: "Casual Fan",
  superfan: "Superfan",
  new_fan: "Brand-New Fan",
  ragebaiter: "Ragebaiter",
  fake_fan: "Fake Fan",
  veteran: "Longtime Veteran",
};

const STREAK_KEY = "ltl-sniff-streak";
const getStreak = () => {
  try {
    return parseInt(window.localStorage.getItem(STREAK_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
};
const setStreak = (n) => {
  try {
    window.localStorage.setItem(STREAK_KEY, String(n));
  } catch {}
};

const pickTarget = (keys) => keys[Math.floor(Math.random() * keys.length)];

const SniffBotGame = ({ slug, name, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [target, setTarget] = useState(null);
  const [revealedIdx, setRevealedIdx] = useState(0);
  const [guess, setGuess] = useState(null);
  const [streak, setStreakState] = useState(getStreak());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/entities/${slug}/sniff`)
      .then((r) => {
        if (cancelled) return;
        const keys = ARCHETYPE_ORDER.filter((k) => r.data.archetypes?.[k]);
        setData(r.data);
        setTarget(pickTarget(keys));
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.response?.data?.detail || "Sniff bot unavailable");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const restart = () => {
    if (!data) return;
    const keys = ARCHETYPE_ORDER.filter((k) => data.archetypes?.[k]);
    setTarget(pickTarget(keys));
    setRevealedIdx(0);
    setGuess(null);
  };

  const submitGuess = (k) => {
    if (guess) return;
    setGuess(k);
    const won = k === target;
    const next = won ? streak + 1 : 0;
    setStreak(next);
    setStreakState(next);
  };

  const questions = data?.questions || [];
  const answers = target && data ? data.archetypes[target]?.answers || [] : [];
  const shownAnswers = answers.slice(0, revealedIdx + 1);

  const archetypeKeys = useMemo(
    () => (data ? ARCHETYPE_ORDER.filter((k) => data.archetypes?.[k]) : []),
    [data]
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      data-testid="sniff-bot-modal"
    >
      <div
        className="max-w-2xl w-full my-4 bg-[color:var(--card)] border-2 border-[color:var(--ink)] shadow-[var(--shadow-hard)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-[color:var(--ink)] text-[color:var(--paper)]">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <Bot size={12} /> sniff the bot · {name}
          </div>
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest"
              data-testid="sniff-streak"
            >
              <Flame size={11} className="text-[color:var(--stamp)]" /> streak {streak}
            </span>
            <button onClick={onClose} aria-label="Close" data-testid="sniff-close-btn">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 md:p-6">
          {loading && (
            <div className="py-10 text-center">
              <div className="marching h-1 mb-6" />
              <div className="font-mono text-xs uppercase tracking-widest text-[color:var(--ink-mute)]">
                waking up a bot pretending to be a fan…
              </div>
            </div>
          )}

          {err && !loading && (
            <div className="py-10 text-center">
              <Skull className="mx-auto text-[color:var(--stamp)]" size={28} />
              <div className="mt-3 font-display font-bold text-xl uppercase">
                Bot's not talking
              </div>
              <p className="mt-1 text-sm text-[color:var(--ink-mid)]">{err}</p>
            </div>
          )}

          {!loading && !err && data && target && (
            <>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
                  [ transcript · unknown subject ]
                </div>
                <h3 className="font-display font-black text-2xl uppercase mt-1 leading-tight text-[color:var(--ink)]">
                  A bot is pretending to be a fan. Which one?
                </h3>
              </div>

              {/* transcript */}
              <div className="mt-4 space-y-3">
                {shownAnswers.map((a, i) => (
                  <div key={i} className="border-l-4 border-[color:var(--ink)] pl-4" data-testid="sniff-exchange">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--stamp)]">
                      you asked
                    </div>
                    <div className="text-sm text-[color:var(--ink)] leading-snug">
                      {questions[i]}
                    </div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
                      bot said
                    </div>
                    <div className="text-[color:var(--ink)] leading-snug italic">
                      "{a}"
                    </div>
                  </div>
                ))}
              </div>

              {revealedIdx < answers.length - 1 && !guess && (
                <button
                  onClick={() => setRevealedIdx((i) => i + 1)}
                  data-testid="sniff-next-question-btn"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 border-2 border-[color:var(--ink)] bg-[color:var(--card)] font-display font-bold uppercase text-sm hover:bg-[color:var(--paper-muted)]"
                >
                  Ask another question ({revealedIdx + 1}/{answers.length})
                </button>
              )}

              {/* guesses */}
              <div className="mt-6 border-t border-dashed border-[color:var(--line)] pt-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] mb-2">
                  who's talking?
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {archetypeKeys.map((k) => {
                    const isPicked = guess === k;
                    const isTarget = k === target;
                    const showState = !!guess;
                    let cls =
                      "px-3 py-2 border-2 font-display font-bold uppercase text-sm text-left transition-colors";
                    if (!showState) {
                      cls +=
                        " border-[color:var(--ink)] bg-[color:var(--card)] hover:bg-[color:var(--paper-muted)]";
                    } else if (isTarget) {
                      cls +=
                        " border-[color:var(--emerald)] bg-[color:var(--emerald-bg)] text-[color:var(--emerald)]";
                    } else if (isPicked) {
                      cls +=
                        " border-[color:var(--stamp)] bg-[color:var(--stamp-bg)] text-[color:var(--stamp)]";
                    } else {
                      cls += " border-[color:var(--line)] bg-[color:var(--card)] opacity-50";
                    }
                    return (
                      <button
                        key={k}
                        onClick={() => submitGuess(k)}
                        disabled={showState}
                        data-testid={`sniff-guess-${k}`}
                        className={cls}
                      >
                        {ARCHETYPE_LABELS[k]}
                        {showState && isTarget && <Check className="inline ml-1" size={13} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {guess && (
                <div className="mt-5 border-t border-dashed border-[color:var(--line)] pt-4" data-testid="sniff-result">
                  {guess === target ? (
                    <div className="font-display font-black text-2xl uppercase text-[color:var(--emerald)]">
                      Nailed it — it was the {ARCHETYPE_LABELS[target]}.
                    </div>
                  ) : (
                    <div className="font-display font-black text-2xl uppercase text-[color:var(--stamp)]">
                      Wrong. It was the {ARCHETYPE_LABELS[target]}, not the {ARCHETYPE_LABELS[guess]}.
                    </div>
                  )}
                  <button
                    onClick={restart}
                    data-testid="sniff-restart-btn"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--ink)] text-[color:var(--paper)] font-display font-bold uppercase text-sm hover:bg-[color:var(--stamp)] transition-colors"
                  >
                    <Shuffle size={13} /> Try another bot
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SniffBotGame;
