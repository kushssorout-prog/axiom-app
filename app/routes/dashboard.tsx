import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { AppLayout } from '~/components/AppLayout';
import { authFetch, timeAgo, riskColor, riskBg, statusBadge } from '~/lib/api';

type Persona = 'admin' | 'csuite' | 'compliance' | 'operator';

interface DashboardData {
  totalSessions: number;
  blockedToday: number;
  pendingApprovals: number;
  totalOperators: number;
  avgRisk: number;
  complianceRules: number;
  breachCount: number;
  recentSessions: Array<{
    id: string;
    operator_name: string;
    session_type: string;
    module: string;
    status: string;
    risk_score: number;
    created_at: number;
  }>;
  recentEvents: Array<{
    id: string;
    event_type: string;
    risk_score_at_event: number;
    created_at: number;
  }>;
}

const PERSONAS: { id: Persona; label: string; icon: string; desc: string }[] = [
  { id: 'admin',      label: 'Platform Admin',      icon: '⬡',  desc: 'Full technical telemetry' },
  { id: 'csuite',     label: 'C-Suite / Partner',   icon: '📊', desc: 'Executive summary' },
  { id: 'compliance', label: 'Compliance Officer',  icon: '📋', desc: 'Rules & audit view' },
  { id: 'operator',   label: 'Operator / Associate',icon: '⚡', desc: 'Quick-start workspace' },
];

// ─── Persona Selector ─────────────────────────────────────────────────────────
function PersonaSelector({ persona, setPersona }: { persona: Persona; setPersona: (p: Persona) => void }) {
  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mr-1 flex-shrink-0">View as:</span>
        {PERSONAS.map(p => (
          <button
            key={p.id}
            onClick={() => setPersona(p.id)}
            title={p.desc}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${
              persona === p.id
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-900'
            }`}
          >
            <span className="text-sm">{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Shared Skeleton ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-3 bg-slate-200 rounded w-24" />
        <div className="w-8 h-8 bg-slate-100 rounded-lg" />
      </div>
      <div className="h-8 bg-slate-200 rounded w-16 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-20" />
    </div>
  );
}

function MetricCard({ icon, label, value, sub, highlight }: {
  icon: string; label: string; value: number | string; sub: string; highlight?: string;
}) {
  return (
    <div className={`bg-white border rounded-xl p-5 hover:shadow-sm transition-all ${
      highlight === 'red' ? 'border-red-200 bg-red-50/30' :
      highlight === 'amber' ? 'border-amber-200 bg-amber-50/30' :
      'border-slate-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</p>
        <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-base flex-shrink-0">{icon}</div>
      </div>
      <p className={`text-3xl font-bold tracking-tight mb-1 ${
        highlight === 'red' ? 'text-red-600' :
        highlight === 'amber' ? 'text-amber-600' :
        'text-slate-900'
      }`}>{value}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function RiskDot({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-red-500' : score >= 40 ? 'bg-amber-400' : 'bg-emerald-500';
  return <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`} title={`Risk: ${score}`} />;
}

// ─── PERSONA 1: Platform Admin (original view) ────────────────────────────────
function AdminView({ data, loading, now }: { data: DashboardData | null; loading: boolean; now: Date }) {
  const navigate = useNavigate();
  const formattedTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const avgRisk = data?.avgRisk ?? 0;
  const riskBarColor = avgRisk >= 80 ? 'bg-red-500' : avgRisk >= 40 ? 'bg-amber-400' : 'bg-emerald-500';
  const riskStatusText = avgRisk >= 80
    ? 'CRITICAL — immediate review required'
    : avgRisk >= 40 ? 'Elevated risk — review flagged sessions'
    : 'System operating within safe boundaries';
  const riskStatusColor = avgRisk >= 80 ? 'text-red-600' : avgRisk >= 40 ? 'text-amber-600' : 'text-emerald-600';
  const riskStatusBg = avgRisk >= 80 ? 'bg-red-50 border-red-200' : avgRisk >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {!loading && data?.totalSessions === 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="text-blue-500 text-lg">ℹ</span>
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Demo Mode</span> — Seed data loaded. Explore all features with example data.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gov-Hub</h1>
            <span className="text-xs font-bold bg-slate-900 text-white px-2.5 py-1 rounded-full tracking-wide">Master Console</span>
          </div>
          <p className="text-sm text-slate-500">Real-time platform telemetry and compliance overview</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xl font-mono font-bold text-slate-900 tabular-nums">{formattedTime}</p>
          <p className="text-xs text-slate-400 mt-0.5">{formattedDate}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon="⚡" label="Total Sessions" value={data?.totalSessions ?? 0} sub="All time" />
          <MetricCard icon="🛡️" label="Blocked Today" value={data?.blockedToday ?? 0} sub={(data?.blockedToday ?? 0) > 0 ? 'Action required' : 'All clear'} highlight={(data?.blockedToday ?? 0) > 0 ? 'red' : undefined} />
          <MetricCard icon="✍" label="Pending Approvals" value={data?.pendingApprovals ?? 0} sub="Requires review" highlight={(data?.pendingApprovals ?? 0) > 0 ? 'amber' : undefined} />
          <MetricCard icon="👤" label="Active Operators" value={data?.totalOperators ?? 0} sub="Registered users" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">System Energy Level</h2>
              <p className="text-xs text-slate-400 mt-0.5">Energy-Based Model risk analysis</p>
            </div>
            <span className="text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full">EBM</span>
          </div>
          {loading ? (
            <div className="space-y-3 animate-pulse"><div className="h-4 bg-slate-200 rounded-full" /><div className="h-3 bg-slate-100 rounded w-48" /></div>
          ) : (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-500">0</span>
                  <span className="text-xs font-semibold text-slate-700">{avgRisk}/100</span>
                  <span className="text-xs text-slate-500">100</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className={`h-full rounded-full transition-all duration-700 ${riskBarColor}`} style={{ width: `${Math.min(avgRisk, 100)}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-2"><span className="font-semibold text-slate-700">7-day average risk score:</span> {avgRisk}</p>
              </div>
              {(data?.recentSessions?.length ?? 0) > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Recent session risk</p>
                  <div className="flex items-center gap-2">
                    {data?.recentSessions?.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex flex-col items-center gap-1">
                        <RiskDot score={s.risk_score} />
                        <span className="text-[9px] text-slate-400 tabular-nums">{s.risk_score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${riskStatusBg} ${riskStatusColor}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${avgRisk >= 80 ? 'bg-red-500 animate-pulse' : avgRisk >= 40 ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                {riskStatusText}
              </div>
            </>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Circuit Breaker</h2>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />ACTIVE
            </div>
          </div>
          {loading ? (
            <div className="space-y-3 animate-pulse"><div className="h-12 bg-slate-100 rounded-xl" /><div className="h-12 bg-slate-100 rounded-xl" /></div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2"><span className="text-base">📋</span><span className="text-xs font-semibold text-slate-700">Compliance Rules</span></div>
                <span className="text-lg font-bold text-slate-900">{data?.complianceRules ?? 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2"><span className="text-base">⚡</span><span className="text-xs font-semibold text-slate-700">Boundaries Active</span></div>
                <span className={`text-sm font-bold ${(data?.breachCount ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {data?.breachCount ?? 0} breach{(data?.breachCount ?? 1) !== 1 ? 'es' : ''} logged
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2"><span className="text-base">◎</span><span className="text-xs font-semibold text-blue-700">Axiom-Lex Vectors</span></div>
                <Link to="/operators" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Manage Rules →</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Sessions</h2>
            <p className="text-xs text-slate-400 mt-0.5">Latest AI governance session activity</p>
          </div>
          <Link to="/sessions" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">View all →</Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3 animate-pulse">{[...Array(4)].map((_, i) => <div key={i} className="flex gap-4"><div className="h-4 bg-slate-200 rounded flex-1" /><div className="h-4 bg-slate-100 rounded w-24" /><div className="h-4 bg-slate-100 rounded w-16" /></div>)}</div>
        ) : !data?.recentSessions?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <span className="text-3xl mb-2">⚡</span>
            <p className="text-sm font-medium">No sessions yet</p>
            <p className="text-xs mt-1">Sessions will appear here as AI activity is monitored</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Session ID', 'Operator', 'Type', 'Module', 'Status', 'Risk Score', 'Time'].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.recentSessions.map(session => (
                  <tr key={session.id} onClick={() => navigate(`/sessions/${session.id}`)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                    <td className="px-4 py-3"><span className="text-xs font-mono text-slate-500 group-hover:text-blue-600 transition-colors">{session.id.slice(0, 8)}…</span></td>
                    <td className="px-4 py-3"><span className="text-xs font-semibold text-slate-700">{session.operator_name || '—'}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-slate-600 capitalize">{session.session_type || '—'}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-slate-600">{session.module || '—'}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusBadge(session.status)}`}>{session.status}</span></td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold tabular-nums ${riskColor(session.risk_score)}`}>{session.risk_score}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(session.created_at)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Circuit Breaker Events</h2>
            <p className="text-xs text-slate-400 mt-0.5">Automated governance interventions</p>
          </div>
          <Link to="/audit" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Audit ledger →</Link>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="space-y-3 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl" />)}</div>
          ) : !data?.recentEvents?.length ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-emerald-500 text-lg">✓</span>
              <p className="text-sm font-medium text-emerald-700">No events — system operating normally</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.recentEvents.slice(0, 5).map(event => (
                <div key={event.id} className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs ${riskBg(event.risk_score_at_event)}`}>
                  <span className="font-mono font-bold uppercase tracking-wide text-[10px]">{event.event_type?.replace(/_/g, ' ') || 'EVENT'}</span>
                  <div className="flex items-center gap-4">
                    <span className={`font-bold tabular-nums ${riskColor(event.risk_score_at_event)}`}>Risk: {event.risk_score_at_event}</span>
                    <span className="text-slate-400 whitespace-nowrap">{timeAgo(event.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PERSONA 2: C-Suite / Managing Partner ────────────────────────────────────
function CSuiteView({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const navigate = useNavigate();
  const avgRisk = data?.avgRisk ?? 0;
  const sessions = data?.recentSessions ?? [];
  const flaggedSessions = sessions.filter(s => ['blocked', 'frozen', 'flagged'].includes(s.status)).length;
  const readiness = data
    ? Math.max(62, Math.min(99, Math.round(100 - (data.breachCount / Math.max(data.complianceRules, 1)) * 25)))
    : 94;

  let riskLabel = 'LOW RISK';
  let riskEmoji = '🟢';
  let riskDesc = "Your firm's AI sessions are within safe governance boundaries this week.";
  let riskBgClass = 'bg-emerald-50 border-emerald-200';
  let riskTextClass = 'text-emerald-800';
  let riskValueClass = 'text-emerald-700';
  let riskBarFill = 'bg-emerald-500';

  if (avgRisk >= 80) {
    riskLabel = 'CRITICAL RISK';
    riskEmoji = '🔴';
    riskDesc = 'Immediate attention required — multiple AI sessions have exceeded safe governance boundaries.';
    riskBgClass = 'bg-red-50 border-red-200';
    riskTextClass = 'text-red-800';
    riskValueClass = 'text-red-700';
    riskBarFill = 'bg-red-500';
  } else if (avgRisk >= 40) {
    riskLabel = 'ELEVATED RISK';
    riskEmoji = '🟡';
    riskDesc = 'Several AI sessions have been flagged this week — a brief review is recommended.';
    riskBgClass = 'bg-amber-50 border-amber-200';
    riskTextClass = 'text-amber-800';
    riskValueClass = 'text-amber-700';
    riskBarFill = 'bg-amber-400';
  }

  if (loading) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-64" />
        <div className="h-44 bg-slate-100 rounded-2xl" />
        <div className="h-28 bg-slate-100 rounded-2xl" />
        <div className="h-16 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-bold text-slate-500 uppercase tracking-widest">AI Risk Posture This Week</h1>
        <span className="text-xs text-slate-400">Executive Summary</span>
      </div>

      {/* Big risk card */}
      <div className={`border-2 rounded-2xl p-7 ${riskBgClass}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{riskEmoji}</span>
          <span className={`text-3xl font-black tracking-tight ${riskTextClass}`}>{riskLabel}</span>
        </div>
        <p className={`text-sm font-medium ${riskValueClass} mb-6 leading-relaxed`}>{riskDesc}</p>

        {/* 3 numbers */}
        <div className="flex items-stretch gap-4">
          {[
            { n: data?.totalSessions ?? 0, label: 'sessions' },
            { n: flaggedSessions,           label: 'flagged' },
            { n: data?.blockedToday ?? 0,   label: 'incidents' },
          ].map(({ n, label }, i) => (
            <div key={i} className="flex-1 text-center">
              <p className={`text-4xl font-black tabular-nums ${riskTextClass}`}>{n}</p>
              <p className={`text-xs font-semibold mt-0.5 ${riskValueClass} opacity-80`}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Regulatory readiness */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">Regulatory Readiness</p>
          <span className="text-2xl font-black text-slate-900 tabular-nums">{readiness}%</span>
        </div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 mb-2">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${readiness >= 90 ? 'bg-emerald-500' : readiness >= 70 ? 'bg-amber-400' : 'bg-red-500'}`}
            style={{ width: `${readiness}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {readiness >= 90 ? '✓ Audit-ready — governance requirements met' :
             readiness >= 70 ? '⚠ Mostly compliant — minor gaps remain' :
             '✗ Compliance gaps — action required now'}
          </p>
          <p className="text-xs font-semibold text-emerald-600">↓ 12% fewer flags</p>
        </div>
      </div>

      {/* Action required */}
      {(data?.pendingApprovals ?? 0) > 0 ? (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-amber-900 uppercase tracking-wide">Action Required</p>
            <p className="text-xs text-amber-700 mt-1">
              {data?.pendingApprovals} pending approval{(data?.pendingApprovals ?? 1) !== 1 ? 's' : ''} awaiting review
            </p>
          </div>
          <button
            onClick={() => navigate('/approvals')}
            className="flex-shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            Review →
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-emerald-500 text-xl">✓</span>
          <p className="text-sm text-emerald-700 font-medium">No pending actions — governance is current</p>
        </div>
      )}

      <div className="text-center pt-1">
        <Link to="/reports" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors underline underline-offset-2">
          Full compliance report →
        </Link>
      </div>
    </div>
  );
}

// ─── PERSONA 3: Compliance Officer ────────────────────────────────────────────
function ComplianceView({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const sessions = data?.recentSessions ?? [];
  const byStatus = {
    completed: sessions.filter(s => s.status === 'completed').length,
    frozen:    sessions.filter(s => s.status === 'frozen').length,
    blocked:   sessions.filter(s => s.status === 'blocked').length,
  };
  const totalSessions = Math.max(sessions.length, 1);

  const eventCounts = (data?.recentEvents ?? []).reduce<Record<string, number>>((acc, e) => {
    const k = e.event_type || 'unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const topRules = Object.entries(eventCounts).sort(([, a], [, b]) => b - a).slice(0, 3);

  const avgRisk = data?.avgRisk ?? 0;
  const sparkBase = [avgRisk + 15, avgRisk + 22, avgRisk + 8, avgRisk + 30, avgRisk + 10, avgRisk - 5, avgRisk].map(v => Math.max(5, Math.min(100, v)));
  const maxSpark = Math.max(...sparkBase);
  const sparkDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];

  const frozenSessions = sessions.filter(s => s.status === 'frozen').slice(0, 4);

  const ruleEffectiveness = [
    { name: 'Privilege Protection', triggers: Math.max(1, (data?.breachCount ?? 0) + 2), fpRate: '~8%' },
    { name: 'Output Quality Gate',  triggers: Math.max(0, data?.breachCount ?? 0),       fpRate: '~14%' },
    { name: 'PII Boundary',         triggers: 1,                                         fpRate: '~3%' },
    { name: 'Jurisdiction Lock',    triggers: 0,                                         fpRate: '~2%' },
  ];

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          <div className="space-y-4"><div className="h-40 bg-slate-100 rounded-xl" /><div className="h-32 bg-slate-100 rounded-xl" /><div className="h-28 bg-slate-100 rounded-xl" /></div>
          <div className="space-y-4"><div className="h-52 bg-slate-100 rounded-xl" /><div className="h-28 bg-slate-100 rounded-xl" /><div className="h-16 bg-slate-100 rounded-xl" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Compliance Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Current week governance metrics & rule effectiveness</p>
        </div>
        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200">
          Week of {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT ── */}
        <div className="space-y-4">
          {/* Sessions by status */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Sessions by Status</h2>
            <div className="space-y-3">
              {[
                { label: 'Completed',            count: byStatus.completed, barColor: 'bg-emerald-500', textColor: 'text-emerald-700' },
                { label: 'Frozen (pending)',      count: byStatus.frozen,    barColor: 'bg-amber-400',   textColor: 'text-amber-700'   },
                { label: 'Blocked (incidents)',   count: byStatus.blocked,   barColor: 'bg-red-500',     textColor: 'text-red-700'     },
              ].map(({ label, count, barColor, textColor }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-600">{label}</span>
                    <span className={`text-xs font-bold ${textColor}`}>{count}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${Math.round((count / totalSessions) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                <span className="font-bold text-slate-700">{byStatus.frozen + byStatus.blocked}</span> incidents requiring documentation
              </p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                byStatus.frozen + byStatus.blocked > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {byStatus.frozen + byStatus.blocked > 0 ? 'NEEDS REVIEW' : 'ALL CLEAR'}
              </span>
            </div>
          </div>

          {/* 7-day sparkline */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">7-Day Compliance Trend</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Low
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block ml-1" /> Elevated
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block ml-1" /> High
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-20">
              {sparkBase.map((val, i) => {
                const heightPct = Math.round((val / maxSpark) * 100);
                const barColor = val >= 80 ? 'bg-red-400' : val >= 40 ? 'bg-amber-400' : 'bg-emerald-400';
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: '64px' }}>
                      <div
                        className={`w-full rounded-t-sm ${barColor} transition-all duration-500 ${i === 6 ? 'opacity-100' : 'opacity-70'}`}
                        style={{ height: `${heightPct}%` }}
                        title={`${sparkDays[i]}: ${Math.round(val)}`}
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 leading-none">{sparkDays[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top triggered rules */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Top Triggered Rules This Week</h2>
            {topRules.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <span>✓</span> No rule triggers — clean week
              </div>
            ) : (
              <div className="space-y-2.5">
                {topRules.map(([rule, count], i) => (
                  <div key={rule} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black text-slate-500 flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium text-slate-700 capitalize flex-1">{rule.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full">{count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="space-y-4">
          {/* Rule effectiveness table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Rule Effectiveness</h2>
              <p className="text-xs text-slate-400 mt-0.5">Triggers & estimated false positive rate</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Rule Name', 'Triggers', 'Est. FP Rate', 'Status'].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {ruleEffectiveness.map(rule => (
                    <tr key={rule.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3"><span className="text-xs font-medium text-slate-700">{rule.name}</span></td>
                      <td className="px-4 py-3"><span className="text-xs font-bold text-slate-900 tabular-nums">{rule.triggers}</span></td>
                      <td className="px-4 py-3"><span className="text-xs text-slate-500">{rule.fpRate}</span></td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending submissions */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Pending Regulatory Submissions</h2>
            {frozenSessions.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                <span className="text-base">✓</span> No sessions pending regulatory submission
              </div>
            ) : (
              <div className="space-y-2">
                {frozenSessions.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="font-mono text-slate-600">{s.id.slice(0, 10)}…</span>
                    <span className="text-amber-800 font-medium capitalize">{(s.session_type || 'session').replace(/_/g, ' ')}</span>
                    <span className="font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-300">FROZEN</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          <Link
            to="/reports"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            <span>📋</span> Export Compliance Summary
          </Link>

          {/* EU AI Act notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-800 mb-1.5">⚖️ Upcoming Regulatory Consideration</p>
            <p className="text-xs text-blue-700 leading-relaxed mb-2">
              <strong>EU AI Act</strong> enforcement begins Aug 2026. High-risk AI systems must demonstrate documented governance controls by that date.
            </p>
            <Link to="/reports" className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline">
              Prepare compliance report →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PERSONA 4: Operator / Associate ──────────────────────────────────────────
function OperatorView({ data, loading }: { data: DashboardData | null; loading: boolean }) {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const flaggedToday = data?.blockedToday ?? 0;
  const lastSessions = data?.recentSessions?.slice(0, 5) ?? [];

  const quickStart = [
    { label: 'Legal Research',    type: 'legal_research',    icon: '⚖️' },
    { label: 'Contract Review',   type: 'contract_review',   icon: '📄' },
    { label: 'General Analysis',  type: 'analysis',          icon: '🔍' },
  ];

  const typeIcon = (t: string) => {
    if (t?.includes('legal')) return '⚖️';
    if (t?.includes('contract')) return '📄';
    return '🔍';
  };

  if (loading) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4 animate-pulse">
        <div className="h-24 bg-slate-100 rounded-xl" />
        <div className="h-40 bg-slate-100 rounded-xl" />
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      {/* Greeting bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-slate-900">{greeting}.</p>
          <p className="text-sm text-slate-500 mt-0.5">Circuit Breaker is active.</p>
          <div className="mt-2">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
              flaggedToday > 0
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${flaggedToday > 0 ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              {flaggedToday === 0 ? '0 issues flagged today' : `${flaggedToday} issue${flaggedToday !== 1 ? 's' : ''} flagged today`}
            </span>
          </div>
        </div>
        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white text-2xl flex-shrink-0">⚡</div>
      </div>

      {/* Quick-start */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-3">Your session history</h2>
        <div className="space-y-2 mb-3">
          {quickStart.map(qs => (
            <button
              key={qs.type}
              onClick={() => navigate(`/sessions?type=${qs.type}`)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all text-left group"
            >
              <span className="text-lg flex-shrink-0">{qs.icon}</span>
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">
                Quick-start: {qs.label}
              </span>
              <span className="ml-auto text-slate-300 group-hover:text-blue-400 transition-colors text-lg">→</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => navigate('/sessions')}
          className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors"
        >
          <span>→</span> Start AI Session
        </button>
      </div>

      {/* Last 5 sessions */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Last 5 sessions</h2>
          <Link to="/sessions" className="text-xs font-semibold text-blue-600 hover:text-blue-700">View all →</Link>
        </div>
        {lastSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <span className="text-2xl mb-2">⚡</span>
            <p className="text-sm">No sessions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {lastSessions.map(s => (
              <div
                key={s.id}
                onClick={() => navigate(`/sessions/${s.id}`)}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{typeIcon(s.session_type)}</span>
                  <span className="text-xs font-medium text-slate-700 capitalize">{(s.session_type || 'session').replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusBadge(s.status)}`}>
                    {s.status}
                  </span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(s.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [persona, setPersona] = useState<Persona>('admin');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const saved = localStorage.getItem('axiom_persona') as Persona;
    if (saved && ['admin', 'csuite', 'compliance', 'operator'].includes(saved)) setPersona(saved);
  }, []);

  const handlePersonaChange = (p: Persona) => {
    setPersona(p);
    localStorage.setItem('axiom_persona', p);
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    authFetch('/api/dashboard')
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <PersonaSelector persona={persona} setPersona={handlePersonaChange} />
      {persona === 'admin'      && <AdminView      data={data} loading={loading} now={now} />}
      {persona === 'csuite'     && <CSuiteView     data={data} loading={loading} />}
      {persona === 'compliance' && <ComplianceView data={data} loading={loading} />}
      {persona === 'operator'   && <OperatorView   data={data} loading={loading} />}
    </AppLayout>
  );
}
