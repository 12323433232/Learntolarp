import { useEffect, useState, useCallback } from "react";
import { Lock, LogOut, RefreshCw, CheckSquare, Square, Trash2, Zap, Radio, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  adminPing,
  adminStats,
  adminQueue,
  adminApproveBulk,
  adminQueueReject,
  adminEntities,
  adminPrune,
  adminFreshnessScan,
  adminFreshnessRefresh,
} from "@/lib/api";

const TOKEN_KEY = "ltl-admin-token";

const AdminPage = () => {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY) || "");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    adminPing(token)
      .then(() => setAuthed(true))
      .catch(() => {
        setAuthed(false);
        window.localStorage.removeItem(TOKEN_KEY);
        setToken("");
      })
      .finally(() => setChecking(false));
  }, [token]);

  const login = (t) => {
    window.localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    setChecking(true);
  };
  const logout = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setAuthed(false);
  };

  if (checking) {
    return (
      <div className="max-w-md mx-auto py-24 text-center font-mono text-xs uppercase tracking-widest text-[color:var(--ink-mute)]">
        checking clearance…
      </div>
    );
  }

  if (!authed) return <TokenGate onSubmit={login} />;

  return <Dashboard token={token} onLogout={logout} />;
};

const TokenGate = ({ onSubmit }) => {
  const [t, setT] = useState("");
  return (
    <div className="max-w-md mx-auto px-4 py-24" data-testid="admin-token-gate">
      <div className="border-2 border-[color:var(--ink)] bg-[color:var(--card)] p-6 shadow-[var(--shadow-hard)]">
        <div className="marching h-1 -mx-6 -mt-6 mb-4" />
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
          <Lock size={12} className="text-[color:var(--stamp)]" /> [ restricted access ]
        </div>
        <h1 className="mt-2 font-display font-black text-3xl uppercase text-[color:var(--ink)]">
          Analyst console
        </h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (t.trim()) onSubmit(t.trim());
          }}
          className="mt-5"
        >
          <label className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            admin token
          </label>
          <input
            autoFocus
            type="password"
            value={t}
            onChange={(e) => setT(e.target.value)}
            data-testid="admin-token-input"
            className="w-full mt-1 px-3 py-2.5 bg-[color:var(--paper-tint)] border-2 border-[color:var(--ink)] font-mono text-sm focus:outline-none focus:bg-[color:var(--card)]"
          />
          <button
            type="submit"
            data-testid="admin-token-submit"
            className="mt-4 w-full py-2.5 bg-[color:var(--stamp)] hover:bg-[color:var(--stamp-hover)] text-white font-display font-bold uppercase tracking-wide"
          >
            Enter console
          </button>
        </form>
      </div>
    </div>
  );
};

const Dashboard = ({ token, onLogout }) => {
  const [tab, setTab] = useState("queue");
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(() => {
    adminStats(token).then(setStats).catch(() => {});
  }, [token]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const tabs = [
    { key: "queue", label: "Queue", count: stats?.total_queued },
    { key: "freshness", label: "Freshness", count: stats?.stale_active_count },
    { key: "zero", label: "Zero-traffic", count: stats?.zero_traffic_count },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="admin-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[color:var(--ink)] pb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
            [ analyst console · content health ]
          </div>
          <h1 className="font-display font-black text-4xl uppercase text-[color:var(--ink)] leading-none mt-1">
            Command Center
          </h1>
        </div>
        <button
          onClick={onLogout}
          data-testid="admin-logout-btn"
          className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-[color:var(--ink)] font-display font-bold uppercase text-sm hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)]"
        >
          <LogOut size={12} /> Log out
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6" data-testid="admin-stats">
        <StatCard label="entities" value={stats?.total_entities} icon={<Radio size={12} />} />
        <StatCard label="hits (7d)" value={stats?.recent_hits_7d} icon={<Zap size={12} />} accent />
        <StatCard label="new compiles (7d)" value={stats?.recent_compiles_7d} icon={<Sparkles size={12} />} />
        <StatCard label="approved keys" value={stats?.total_approved_keys} icon={<CheckSquare size={12} />} />
      </div>

      {/* tabs */}
      <div className="mt-8 border-b border-[color:var(--line)]">
        <div className="flex gap-1" data-testid="admin-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={`admin-tab-${t.key}`}
              className={`px-4 py-2 font-display font-bold uppercase text-sm border-b-2 -mb-px ${
                tab === t.key
                  ? "border-[color:var(--stamp)] text-[color:var(--ink)]"
                  : "border-transparent text-[color:var(--ink-mute)] hover:text-[color:var(--ink)]"
              }`}
            >
              {t.label}
              {t.count != null && (
                <span className="ml-2 font-mono text-[10px] text-[color:var(--ink-mute)]">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {tab === "queue" && <QueueTab token={token} onChange={loadStats} />}
        {tab === "freshness" && <FreshnessTab token={token} onChange={loadStats} />}
        {tab === "zero" && <ZeroTrafficTab token={token} onChange={loadStats} />}
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, accent }) => (
  <div
    className={`border-2 p-3 ${
      accent
        ? "border-[color:var(--stamp)] bg-[color:var(--stamp-bg)]"
        : "border-[color:var(--line)] bg-[color:var(--card)]"
    }`}
  >
    <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
      {icon} {label}
    </div>
    <div className="font-display font-black text-3xl text-[color:var(--ink)] leading-none mt-1">
      {value ?? "—"}
    </div>
  </div>
);

// ============ QUEUE TAB ============
const QueueTab = ({ token, onChange }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [autoGen, setAutoGen] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminQueue(token)
      .then((d) => setItems(d.items || []))
      .catch(() => toast.error("Queue load failed"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.key)));
  };

  const approve = async () => {
    if (!selected.size) return;
    setWorking(true);
    try {
      const chosen = items.filter((i) => selected.has(i.key));
      const names = chosen.map((c) => c.name);
      const r = await adminApproveBulk(token, names, autoGen);
      toast.success(
        `Approved ${r.approved.length}${autoGen ? ` · compiled ${r.generated.length}` : ""}`
      );
      setSelected(new Set());
      load();
      onChange?.();
    } catch {
      toast.error("Bulk approve failed");
    } finally {
      setWorking(false);
    }
  };

  const reject = async () => {
    if (!selected.size) return;
    setWorking(true);
    try {
      const keys = Array.from(selected);
      const r = await adminQueueReject(token, keys);
      toast.success(`Rejected ${r.deleted}`);
      setSelected(new Set());
      load();
      onChange?.();
    } catch {
      toast.error("Reject failed");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div data-testid="queue-tab">
      <div className="flex flex-wrap items-center gap-2 justify-between mb-3">
        <div className="font-mono text-xs uppercase tracking-widest text-[color:var(--ink-mute)]">
          {items.length} requested · {selected.size} selected
        </div>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest cursor-pointer">
            <input
              type="checkbox"
              checked={autoGen}
              onChange={(e) => setAutoGen(e.target.checked)}
              data-testid="auto-gen-toggle"
            />
            also compile now
          </label>
          <button
            onClick={reject}
            disabled={!selected.size || working}
            data-testid="reject-selected-btn"
            className="px-3 py-1.5 border-2 border-[color:var(--ink)] font-display font-bold uppercase text-xs hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)] disabled:opacity-40"
          >
            Reject selected
          </button>
          <button
            onClick={approve}
            disabled={!selected.size || working}
            data-testid="approve-selected-btn"
            className="px-3 py-1.5 bg-[color:var(--stamp)] hover:bg-[color:var(--stamp-hover)] text-white font-display font-bold uppercase text-xs disabled:opacity-40"
          >
            Approve selected
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center font-mono text-xs uppercase text-[color:var(--ink-mute)]">
          loading…
        </div>
      ) : items.length === 0 ? (
        <EmptyState msg="Queue is empty" />
      ) : (
        <div className="border border-[color:var(--ink)] bg-[color:var(--card)]" data-testid="queue-items">
          <button
            onClick={toggleAll}
            className="w-full flex items-center gap-2 px-4 py-2 border-b border-[color:var(--line)] font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mid)] hover:bg-[color:var(--paper-muted)] text-left"
          >
            {selected.size === items.length && items.length > 0 ? (
              <CheckSquare size={12} />
            ) : (
              <Square size={12} />
            )}
            {selected.size === items.length && items.length > 0 ? "unselect all" : "select all"}
          </button>
          {items.map((q) => {
            const isSel = selected.has(q.key);
            return (
              <div
                key={q.key}
                className={`flex items-center gap-3 px-4 py-2.5 border-b last:border-0 border-[color:var(--line)] ${
                  isSel ? "bg-[color:var(--stamp-bg)]" : ""
                }`}
                data-testid="queue-item-row"
              >
                <button onClick={() => toggle(q.key)} data-testid="queue-item-toggle">
                  {isSel ? (
                    <CheckSquare size={14} className="text-[color:var(--stamp)]" />
                  ) : (
                    <Square size={14} className="text-[color:var(--ink-mute)]" />
                  )}
                </button>
                <span className="font-display font-bold uppercase flex-1 truncate">
                  {q.name}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
                  {q.votes || 1} votes · {q.slug}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============ FRESHNESS TAB ============
const FreshnessTab = ({ token, onChange }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    adminFreshnessScan(token, 7)
      .then((d) => setItems(d.items || []))
      .catch(() => toast.error("Freshness scan failed"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async (slug) => {
    setRefreshing(slug);
    try {
      const r = await adminFreshnessRefresh(token, slug);
      if (r.added?.length) toast.success(`+${r.added.length} new item(s) for ${slug}`);
      else toast.success(`${slug}: nothing major to add`);
      load();
      onChange?.();
    } catch {
      toast.error("Refresh failed");
    } finally {
      setRefreshing(null);
    }
  };

  return (
    <div data-testid="freshness-tab">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-xs uppercase tracking-widest text-[color:var(--ink-mute)]">
          {items.length} active entities · latest section older than 7 days
        </div>
        <button
          onClick={load}
          disabled={loading}
          data-testid="freshness-rescan-btn"
          className="px-3 py-1.5 border-2 border-[color:var(--ink)] font-display font-bold uppercase text-xs hover:bg-[color:var(--ink)] hover:text-[color:var(--paper)] disabled:opacity-40 inline-flex items-center gap-1"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Rescan
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center font-mono text-xs uppercase text-[color:var(--ink-mute)]">
          scanning…
        </div>
      ) : items.length === 0 ? (
        <EmptyState msg="All fresh. Nothing stale in the archive." />
      ) : (
        <div className="border border-[color:var(--ink)] bg-[color:var(--card)]" data-testid="freshness-items">
          {items.map((e) => (
            <div
              key={e.slug}
              className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 border-[color:var(--line)]"
            >
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold uppercase truncate">{e.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
                  {e.velocity} hits · last checked{" "}
                  {new Date(e.last_check).toLocaleDateString()} · {e.latest_count} latest items
                </div>
              </div>
              <button
                onClick={() => refresh(e.slug)}
                disabled={refreshing === e.slug}
                data-testid="freshness-refresh-btn"
                className="px-3 py-1.5 bg-[color:var(--stamp)] hover:bg-[color:var(--stamp-hover)] text-white font-display font-bold uppercase text-xs disabled:opacity-40 inline-flex items-center gap-1"
              >
                <RefreshCw size={11} className={refreshing === e.slug ? "animate-spin" : ""} />
                {refreshing === e.slug ? "Checking…" : "Refresh"}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
        cheap tier reads existing sources · only appends genuinely new items · honest empty state if nothing changed
      </p>
    </div>
  );
};

// ============ ZERO TRAFFIC TAB ============
const ZeroTrafficTab = ({ token, onChange }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [working, setWorking] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminEntities(token, "zero_traffic")
      .then((d) => setItems(d.items || []))
      .catch(() => toast.error("Load failed"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (slug) => {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelected(next);
  };

  const prune = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Prune ${selected.size} entities? This wipes case file, quiz, sniff data.`)) return;
    setWorking(true);
    try {
      const r = await adminPrune(token, Array.from(selected));
      toast.success(`Pruned ${r.deleted}`);
      setSelected(new Set());
      load();
      onChange?.();
    } catch {
      toast.error("Prune failed");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div data-testid="zero-tab">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-xs uppercase tracking-widest text-[color:var(--ink-mute)]">
          {items.length} entities · older than 7 days · zero hits this week
        </div>
        <button
          onClick={prune}
          disabled={!selected.size || working}
          data-testid="prune-selected-btn"
          className="px-3 py-1.5 border-2 border-[color:var(--stamp)] text-[color:var(--stamp)] font-display font-bold uppercase text-xs hover:bg-[color:var(--stamp)] hover:text-white disabled:opacity-40 inline-flex items-center gap-1"
        >
          <Trash2 size={12} /> Prune selected ({selected.size})
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center font-mono text-xs uppercase text-[color:var(--ink-mute)]">
          loading…
        </div>
      ) : items.length === 0 ? (
        <EmptyState msg="Nothing to prune. Archive is lean." />
      ) : (
        <div className="border border-[color:var(--ink)] bg-[color:var(--card)]" data-testid="zero-items">
          {items.map((e) => {
            const isSel = selected.has(e.slug);
            return (
              <div
                key={e.slug}
                className={`flex items-center gap-3 px-4 py-2.5 border-b last:border-0 border-[color:var(--line)] ${
                  isSel ? "bg-[color:var(--stamp-bg)]" : ""
                }`}
              >
                <button onClick={() => toggle(e.slug)} data-testid="zero-item-toggle">
                  {isSel ? (
                    <CheckSquare size={14} className="text-[color:var(--stamp)]" />
                  ) : (
                    <Square size={14} className="text-[color:var(--ink-mute)]" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold uppercase truncate">
                    {e.name}
                    <span className="font-mono text-[10px] text-[color:var(--ink-mute)] tracking-widest ml-2">
                      {e.tier}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--ink-mute)]">
                    {e.entity_type} · {e.infiltration_count} lifetime · compiled{" "}
                    {new Date(e.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ msg }) => (
  <div className="border border-dashed border-[color:var(--line)] py-14 text-center">
    <Sparkles className="mx-auto text-[color:var(--ink-mute)]" size={20} />
    <div className="font-display font-bold text-xl uppercase mt-2">{msg}</div>
  </div>
);

export default AdminPage;
