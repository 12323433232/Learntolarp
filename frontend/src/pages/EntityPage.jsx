import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Hourglass, Search as SearchIcon } from "lucide-react";
import {
  fetchEntity,
  generateEntity,
  queueEntity,
} from "@/lib/api";
import GeneratingModal from "@/components/GeneratingModal";
import LarpabilityHero from "@/components/entity/LarpabilityHero";
import BriefingBanner from "@/components/entity/BriefingBanner";
import FactSection from "@/components/entity/FactSection";
import CultureSection from "@/components/entity/CultureSection";
import QuotesSection from "@/components/entity/QuotesSection";
import PerceptionGauge from "@/components/entity/PerceptionGauge";
import LatestNews from "@/components/entity/LatestNews";
import ConversationStarters from "@/components/entity/ConversationStarters";
import CrossReferences from "@/components/entity/CrossReferences";
import ExportCheatSheet from "@/components/entity/ExportCheatSheet";

const EntityPage = () => {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const querySeed = params.get("q") || slug;

  const [state, setState] = useState({ status: "loading", data: null, queued: null, error: null });
  const [showExport, setShowExport] = useState(false);
  const triggeredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, queued: null, error: null });
    triggeredRef.current = false;

    fetchEntity(slug)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data, queued: null, error: null });
      })
      .catch(async (err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) {
          if (triggeredRef.current) return;
          triggeredRef.current = true;
          setState({ status: "generating", data: null, queued: null, error: null });
          try {
            const res = await generateEntity(querySeed);
            if (cancelled) return;
            if (res?.status === "queued") {
              setState({ status: "queued", data: null, queued: res, error: null });
              return;
            }
            if (res.slug !== slug) {
              navigate(`/entity/${res.slug}`, { replace: true });
              return;
            }
            setState({ status: "ready", data: res, queued: null, error: null });
          } catch (e) {
            if (!cancelled)
              setState({
                status: "error",
                data: null,
                queued: null,
                error: e?.response?.data?.detail || "Compile failed. Try again in a sec.",
              });
          }
        } else {
          setState({
            status: "error",
            data: null,
            queued: null,
            error: err?.message || "Something went wrong.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, querySeed, navigate]);

  const handleQueueRef = async (ref) => {
    try {
      await queueEntity(ref.name, ref.slug);
      toast.success(`Queued: ${ref.name}`);
    } catch {
      toast.error("Couldn't queue that one.");
    }
  };

  if (state.status === "loading" || state.status === "generating") {
    return <GeneratingModal query={querySeed} phase={state.status} />;
  }

  if (state.status === "queued") {
    return <QueuedState info={state.queued} navigate={navigate} />;
  }

  if (state.status === "error") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center" data-testid="entity-error">
        <div className="font-mono text-xs uppercase tracking-widest text-[color:var(--stamp)]">
          [ COMPILE FAILURE ]
        </div>
        <h1 className="font-display font-black text-4xl uppercase mt-3 text-[color:var(--ink)]">
          Case file blocked
        </h1>
        <p className="mt-3 text-[color:var(--ink-mid)]">{state.error}</p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 px-5 py-2 border-2 border-[color:var(--ink)] bg-[color:var(--card)] font-display font-bold uppercase hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)] transition-colors"
          data-testid="error-back-btn"
        >
          Back to search
        </button>
      </div>
    );
  }

  const d = state.data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)] mb-4">
        <Link to="/" className="hover:text-[color:var(--ink)]">
          index
        </Link>
        <span className="mx-2 opacity-40">/</span>
        <span>case-file/{d.slug}</span>
      </nav>

      <LarpabilityHero data={d} onExport={() => setShowExport(true)} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
        <div className="lg:col-span-8 space-y-10">
          <BriefingBanner lines={d.briefing_5sec} />
          <FactSection items={d.fact} />
          <CultureSection culture={d.culture} />
          <QuotesSection quotes={d.quotes} name={d.name} />
          <LatestNews items={d.latest} quietNote={d.latest_quiet_note} />
        </div>
        <aside className="lg:col-span-4 space-y-10">
          <PerceptionGauge perception={d.perception} />
          <ConversationStarters starters={d.starters} />
          <CrossReferences refs={d.cross_refs} onQueue={handleQueueRef} />
        </aside>
      </div>

      <section className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[color:var(--line)] pt-8">
        <div className="border-l-4 border-[color:var(--stamp)] pl-5" data-testid="mission-note">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            [ mission note ]
          </div>
          <p className="mt-2 leading-relaxed text-[color:var(--ink)]">
            {d.mission_note ||
              "This is a shortcut, not a substitute. If a fandom sticks, actually go be part of it."}
          </p>
        </div>
        <div data-testid="sources-block">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            [ compiled from ]
          </div>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            {(d.sources || []).slice(0, 8).map((s) => (
              <li key={s} className="truncate">
                <a
                  href={s}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--indigo)] hover:underline"
                >
                  {s}
                </a>
              </li>
            ))}
            {(!d.sources || d.sources.length === 0) && (
              <li className="text-[color:var(--ink-mute)]">
                no external sources cited
              </li>
            )}
          </ul>
          <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            case compiled {new Date(d.created_at).toLocaleDateString()} · first
            larped by {d.first_larped_by}
          </div>
        </div>
      </section>

      {showExport && (
        <ExportCheatSheet data={d} onClose={() => setShowExport(false)} />
      )}
    </div>
  );
};

const QueuedState = ({ info, navigate }) => (
  <div
    className="max-w-2xl mx-auto px-4 py-16"
    data-testid="entity-queued-state"
  >
    <div className="bg-[color:var(--card)] border-2 border-[color:var(--ink)] shadow-[var(--shadow-hard)] p-8">
      <div className="marching h-1 -mx-8 -mt-8 mb-6" />
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
        <Hourglass size={12} className="text-[color:var(--stamp)]" /> [ intelligence check ]
      </div>
      <h1 className="font-display font-black text-4xl md:text-5xl uppercase mt-2 leading-tight text-[color:var(--ink)]">
        {info?.name}
      </h1>
      <p className="mt-4 text-[color:var(--ink-mid)] leading-relaxed">
        We're checking whether there's enough intelligence to build this file.
        Added to the request queue so an analyst can approve it.
      </p>

      <div className="mt-6 flex items-center gap-4 py-4 border-y border-dashed border-[color:var(--line)]">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            people who want this
          </div>
          <div className="font-display font-black text-4xl text-[color:var(--stamp)]">
            {info?.votes || 1}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            status
          </div>
          <div className="font-display font-bold uppercase text-[color:var(--ink)]">
            queued
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => navigate("/")}
          data-testid="queued-back-btn"
          className="inline-flex items-center gap-2 px-5 py-2 border-2 border-[color:var(--ink)] bg-[color:var(--card)] font-display font-bold uppercase hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)] transition-colors"
        >
          <SearchIcon size={14} /> Search something else
        </button>
      </div>

      <p className="mt-6 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
        we don't burn API on random queries. approved list keeps costs sane.
      </p>
    </div>
  </div>
);

export default EntityPage;
