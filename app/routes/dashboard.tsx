import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { AppLayout } from '~/components/AppLayout';
import { authFetch, timeAgo, riskColor, riskBg, statusBadge } from '~/lib/api';

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

function MetricCard({
  icon, label, value, sub, highlight
}: {
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
        <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-base flex-shrink-0">
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold tracking-tight mb-1 ${
        highlight === 'red' ? 'text-red-600' :
        highlight === 'amber' ? 'text-amber-600' :
        'text-slate-900'
      }`}>
        {value}
      </p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function RiskDot({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-red-500' : score >= 40 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className={`w-3 h-3 rounded-full ${color} flex-shrink-0`} title={`Risk: ${score}`} />
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    authFetch('/api/dashboard')
      .then(d => setData(d))
      .catch(() => {
        // Session might be invalid
      })
      .finally(() => setLoading(false));
  }, []);

  const formattedTime = now.toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const formattedDate = now.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });

  const avgRisk = data?.avgRisk ?? 0;
  const riskBarColor = avgRisk >= 80 ? 'bg-red-500' : avgRisk >= 40 ? 'bg-amber-400' : 'bg-emerald-500';
  const riskStatusText = avgRisk >= 80
    ? 'CRITICAL — immediate review required'
    : avgRisk >= 40
    ? 'Elevated risk — review flagged sessions'
    : 'System operating within safe boundaries';
  const riskStatusColor = avgRisk >= 80 ? 'text-red-600' : avgRisk >= 40 ? 'text-amber-600' : 'text-emerald-600';
  const riskStatusBg = avgRisk >= 80 ? 'bg-red-50 border-red-200' : avgRisk >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Demo banner */}
        {!loading && data?.totalSessions === 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <span className="text-blue-500 text-lg">ℹ</span>
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Demo Mode</span> — Seed data loaded. Explore all features with example data.
            </p>
          </div>
        )}

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gov-Hub</h1>
              <span className="text-xs font-bold bg-slate-900 text-white px-2.5 py-1 rounded-full tracking-wide">
                Master Console
              </span>
            </div>
            <p className="text-sm text-slate-500">Real-time platform telemetry and compliance overview</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-mono font-bold text-slate-900 tabular-nums">{formattedTime}</p>
            <p className="text-xs text-slate-400 mt-0.5">{formattedDate}</p>
          </div>
        </div>

        {/* Metric cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon="⚡"
              label="Total Sessions"
              value={data?.totalSessions ?? 0}
              sub="All time"
            />
            <MetricCard
              icon="🛡️"
              label="Blocked Today"
              value={data?.blockedToday ?? 0}
              sub={(data?.blockedToday ?? 0) > 0 ? 'Action required' : 'All clear'}
              highlight={(data?.blockedToday ?? 0) > 0 ? 'red' : undefined}
            />
            <MetricCard
              icon="✍"
              label="Pending Approvals"
              value={data?.pendingApprovals ?? 0}
              sub="Requires review"
              highlight={(data?.pendingApprovals ?? 0) > 0 ? 'amber' : undefined}
            />
            <MetricCard
              icon="👤"
              label="Active Operators"
              value={data?.totalOperators ?? 0}
              sub="Registered users"
            />
          </div>
        )}

        {/* Middle row: EBM Risk + Circuit Breaker */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* EBM Risk Curve */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">System Energy Level</h2>
                <p className="text-xs text-slate-400 mt-0.5">Energy-Based Model risk analysis</p>
              </div>
              <span className="text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full">EBM</span>
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-slate-200 rounded-full" />
                <div className="h-3 bg-slate-100 rounded w-48" />
              </div>
            ) : (
              <>
                {/* Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500">0</span>
                    <span className="text-xs font-semibold text-slate-700">{avgRisk}/100</span>
                    <span className="text-xs text-slate-500">100</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${riskBarColor}`}
                      style={{ width: `${Math.min(avgRisk, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    <span className="font-semibold text-slate-700">7-day average risk score:</span> {avgRisk}
                  </p>
                </div>

                {/* Mini dots for recent sessions */}
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

                {/* Status */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${riskStatusBg} ${riskStatusColor}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    avgRisk >= 80 ? 'bg-red-500 animate-pulse' :
                    avgRisk >= 40 ? 'bg-amber-400' : 'bg-emerald-500'
                  }`} />
                  {riskStatusText}
                </div>
              </>
            )}
          </div>

          {/* Circuit Breaker */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Circuit Breaker</h2>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ACTIVE
              </div>
            </div>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <span className="text-xs font-semibold text-slate-700">Compliance Rules</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">{data?.complianceRules ?? 0}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <span className="text-xs font-semibold text-slate-700">Boundaries Active</span>
                  </div>
                  <span className={`text-sm font-bold ${(data?.breachCount ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {data?.breachCount ?? 0} breach{(data?.breachCount ?? 1) !== 1 ? 'es' : ''} logged
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-base">◎</span>
                    <span className="text-xs font-semibold text-blue-700">Axiom-Lex Vectors</span>
                  </div>
                  <Link to="/operators" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    Manage Rules →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Sessions Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Sessions</h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest AI governance session activity</p>
            </div>
            <Link
              to="/sessions"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 bg-slate-200 rounded flex-1" />
                  <div className="h-4 bg-slate-100 rounded w-24" />
                  <div className="h-4 bg-slate-100 rounded w-16" />
                </div>
              ))}
            </div>
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
                    <tr
                      key={session.id}
                      onClick={() => navigate(`/sessions/${session.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-slate-500 group-hover:text-blue-600 transition-colors">
                          {session.id.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-slate-700">{session.operator_name || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600 capitalize">{session.session_type || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600">{session.module || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusBadge(session.status)}`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold tabular-nums ${riskColor(session.risk_score)}`}>
                          {session.risk_score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(session.created_at)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Circuit Breaker Events */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Circuit Breaker Events</h2>
              <p className="text-xs text-slate-400 mt-0.5">Automated governance interventions</p>
            </div>
            <Link
              to="/audit"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Audit ledger →
            </Link>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded-xl" />
                ))}
              </div>
            ) : !data?.recentEvents?.length ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-emerald-500 text-lg">✓</span>
                <p className="text-sm font-medium text-emerald-700">No events — system operating normally</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentEvents.slice(0, 5).map(event => (
                  <div
                    key={event.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-xs ${riskBg(event.risk_score_at_event)}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold uppercase tracking-wide text-[10px]">
                        {event.event_type?.replace(/_/g, ' ') || 'EVENT'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-bold tabular-nums ${riskColor(event.risk_score_at_event)}`}>
                        Risk: {event.risk_score_at_event}
                      </span>
                      <span className="text-slate-400 whitespace-nowrap">{timeAgo(event.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
