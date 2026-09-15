import { useEffect, useState } from "react";
import { X, Target, ChevronRight, Copy, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const VERDICT_STYLES = {
  convincing: {
    border: "border-[color:var(--emerald)]",
    text: "text-[color:var(--emerald)]",
    bg: "bg-[color:var(--emerald-bg)]",
    icon: "🎯",
  },
  suspicious: {
    border: "border-[color:var(--amber)]",
    text: "text-[color:var(--amber)]",
    bg: "bg-[color:var(--amber-bg)]",
    icon: "👀",
  },
  caught: {
    border: "border-[color:var(--stamp)]",
    text: "text-[color:var(--stamp)]",
    bg: "bg-[color:var(--stamp-bg)]",
    icon: "🚨",
  },
};

const LarpQuizModal = ({ slug, name, onClose }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/entities/${slug}/quiz`)
      .then((r) => {
        if (cancelled) return;
        setQuestions(r.data.questions || []);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.response?.data?.detail || "Quiz unavailable");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const pick = (i) => {
    const next = [...answers];
    next[idx] = i;
    setAnswers(next);
  };

  const advance = async () => {
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      return;
    }
    // grade
    setGrading(true);
    try {
      const filled = questions.map((_, i) => (answers[i] == null ? -1 : answers[i]));
      const r = await api.post(`/entities/${slug}/quiz/grade`, { answers: filled });
      setResult(r.data);
    } catch (e) {
      toast.error("Grading failed");
    } finally {
      setGrading(false);
    }
  };

  const restart = () => {
    setIdx(0);
    setAnswers([]);
    setResult(null);
  };

  const copyResult = () => {
    if (!result) return;
    const text =
      `LEARNTOLARP // ${name.toUpperCase()}\n` +
      `LARP Test Result: ${result.verdict.label}\n` +
      `${result.score}/${result.total}\n` +
      `${result.verdict.note}\n` +
      `learntolarp.com/entity/${slug}`;
    navigator.clipboard?.writeText(text);
    toast.success("Copied — paste it wherever");
  };

  const cur = questions[idx];
  const picked = answers[idx];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      data-testid="larp-quiz-modal"
    >
      <div
        className="max-w-2xl w-full my-4 bg-[color:var(--card)] border-2 border-[color:var(--ink)] shadow-[var(--shadow-hard)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 bg-[color:var(--ink)] text-[color:var(--paper)]">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
            <Target size={12} /> larp test · {name}
          </div>
          <button onClick={onClose} aria-label="Close" data-testid="quiz-close-btn">
            <X size={16} />
          </button>
        </div>

        {loading && (
          <div className="p-10 text-center">
            <div className="marching h-1 mb-6" />
            <div className="font-mono text-xs uppercase tracking-widest text-[color:var(--ink-mute)]">
              writing scenarios you'd actually get asked…
            </div>
          </div>
        )}

        {err && !loading && (
          <div className="p-10 text-center">
            <div className="font-display font-bold text-xl uppercase text-[color:var(--stamp)]">
              Test unavailable
            </div>
            <p className="mt-1 text-sm text-[color:var(--ink-mid)]">{err}</p>
          </div>
        )}

        {!loading && !err && !result && cur && (
          <div className="p-5 md:p-6">
            <div className="flex justify-between items-baseline font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] mb-2">
              <span>question {idx + 1} / {questions.length}</span>
              <span>{answers.filter((a) => a != null).length} answered</span>
            </div>

            <div className="h-1 bg-[color:var(--paper-muted)] mb-5">
              <div
                className="h-full bg-[color:var(--stamp)] transition-all"
                style={{ width: `${((idx + 1) / questions.length) * 100}%` }}
              />
            </div>

            <div
              className="font-display font-bold text-xl md:text-2xl uppercase leading-tight text-[color:var(--ink)]"
              data-testid="quiz-scenario"
            >
              {cur.scenario}
            </div>

            <div className="mt-5 space-y-2" data-testid="quiz-options">
              {cur.options.map((o, i) => (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  data-testid={`quiz-option-${i}`}
                  className={`w-full text-left px-4 py-3 border-2 transition-colors ${
                    picked === i
                      ? "border-[color:var(--stamp)] bg-[color:var(--stamp-bg)] text-[color:var(--ink)]"
                      : "border-[color:var(--line)] bg-[color:var(--card)] hover:border-[color:var(--ink)]"
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] mr-3">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm text-[color:var(--ink)] leading-snug">{o}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={advance}
                disabled={picked == null || grading}
                data-testid="quiz-next-btn"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--ink)] text-[color:var(--paper)] font-display font-bold uppercase tracking-wide disabled:opacity-40 hover:bg-[color:var(--stamp)] transition-colors"
              >
                {idx === questions.length - 1 ? (grading ? "Grading…" : "See verdict") : "Next"}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="p-5 md:p-6" data-testid="quiz-result">
            <div className={`border-2 ${VERDICT_STYLES[result.verdict.tier].border} ${VERDICT_STYLES[result.verdict.tier].bg} p-6`}>
              <div className="text-4xl">{VERDICT_STYLES[result.verdict.tier].icon}</div>
              <div
                className={`mt-2 font-display font-black text-4xl md:text-5xl uppercase leading-none ${VERDICT_STYLES[result.verdict.tier].text}`}
                data-testid="quiz-verdict-label"
              >
                {result.verdict.label}
              </div>
              <div className="mt-3 font-mono text-xs uppercase tracking-widest text-[color:var(--ink-mute)]">
                {result.score} of {result.total} · {result.verdict.note}
              </div>
            </div>

            <details className="mt-4 group" data-testid="quiz-review">
              <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-[color:var(--ink-mid)]">
                review your answers ↓
              </summary>
              <div className="mt-3 space-y-3">
                {result.per_question.map((r, i) => (
                  <div key={i} className="border-l-4 pl-3 py-1 border-[color:var(--line)]">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest">
                      <span className={r.got_right ? "text-[color:var(--emerald)]" : "text-[color:var(--stamp)]"}>
                        Q{i + 1}
                      </span>
                      <span className="text-[color:var(--ink-mute)]">
                        {r.got_right ? "correct" : "wrong"}
                      </span>
                    </div>
                    <div className="text-sm text-[color:var(--ink)] leading-snug">
                      {questions[i]?.scenario}
                    </div>
                    <div className="text-xs text-[color:var(--ink-mid)] mt-1">
                      correct: <span className="font-medium">{questions[i]?.options[r.correct_index]}</span>
                    </div>
                    <div className="text-xs italic text-[color:var(--ink-mute)] mt-0.5">
                      {r.why}
                    </div>
                  </div>
                ))}
              </div>
            </details>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={copyResult}
                data-testid="quiz-copy-result-btn"
                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[color:var(--ink)] bg-[color:var(--card)] font-display font-bold uppercase text-sm hover:bg-[color:var(--paper-muted)]"
              >
                <Copy size={13} /> Copy verdict
              </button>
              <button
                onClick={restart}
                data-testid="quiz-restart-btn"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--ink)] text-[color:var(--paper)] font-display font-bold uppercase text-sm hover:bg-[color:var(--stamp)] transition-colors"
              >
                <RotateCw size={13} /> Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LarpQuizModal;
