import { useState, useEffect } from 'react';
import { AppLayout } from '~/components/AppLayout';
import { authFetch, statusBadge } from '~/lib/api';

// ─── Types ───────────────────────────────────────────────────────────
interface EvalResult {
  status: 'approved' | 'flagged' | 'rejected';
  score: number;
  breakdown: { leverage: number; liquidity: number; counterparty: number };
}

interface Transaction {
  id: string; asset_value: number; leverage: number;
  energy_score: number; status: string; created_at: number;
}

interface AttributionRecord {
  id: string; session_type: string; ai_percentage: number;
  human_percentage: number; final_value: number;
}

// ─── Routing table data ──────────────────────────────────────────────
const ROUTING_TABLE = [
  { task: 'Legal Drafting',     risk: 'Critical', model: 'Claude Sonnet',    cost: 3.00,  reason: 'Highest accuracy for privilege-sensitive work' },
  { task: 'Legal Research',     risk: 'High',     model: 'Claude Haiku',     cost: 0.25,  reason: 'Speed + cost efficiency for research' },
  { task: 'Financial Analysis', risk: 'Critical', model: 'Claude Sonnet',    cost: 3.00,  reason: 'Regulatory accuracy required' },
  { task: 'General Research',   risk: 'Low',      model: 'Workers AI Auto',  cost: 0.05,  reason: 'Cost-optimised for low-risk queries' },
  { task: 'Contract Review',    risk: 'High',     model: 'Claude Sonnet',    cost: 3.00,  reason: 'Clause analysis requires precision' },
  { task: 'Data Analysis',      risk: 'Medium',   model: 'GPT-4o Mini',      cost: 0.15,  reason: 'Good cost/quality ratio' },
];

const RISK_COLORS: Record<string, string> = {
  Critical: 'bg-red-50 text-red-700 border-red-200',
  High:     'bg-orange-50 text-orange-700 border-orange-200',
  Medium:   'bg-amber-50 text-amber-700 border-amber-200',
  Low:      'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const SCARCITY = [
  { type: 'Legal Strategy',    level: 'HIGH',   color: '🔴', premium: '2.5x' },
  { type: 'Contract Drafting', level: 'MEDIUM', color: '🟡', premium: '1.5x' },
  { type: 'Research',          level: 'LOW',    color: '🟢', premium: '1.0x' },
];

const DEMO_SESSIONS = [
  { id: 'sess_001', session_type: 'Legal Research',     model_used: 'Claude Haiku',    created_at: Date.now() / 1000 - 120 },
  { id: 'sess_002', session_type: 'Contract Review',    model_used: 'Claude Sonnet',   created_at: Date.now() / 1000 - 300 },
  { id: 'sess_003', session_type: 'Financial Analysis', model_used: 'Claude Sonnet',   created_at: Date.now() / 1000 - 480 },
  { id: 'sess_004', session_type: 'General Research',   model_used: 'Workers AI Auto', created_at: Date.now() / 1000 - 700 },
  { id: 'sess_005', session_type: 'Data Analysis',      model_used: 'GPT-4o Mini',     created_at: Date.now() / 1000 - 900 },
];

// ─── Tab 1: Manifold Arbitrage ────────────────────────────────────────
function ManifoldTab() {
  const [assetValue, setAssetValue] = useState(100000);
  const [leverage, setLeverage] = useState(2.0);
  const [liquidity, setLiquidity] = useState(0.7);
  const [counterparty, setCounterparty] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/finance/transactions')
      .then(d => setTransactions(d.transactions || []))
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  }, []);

  const evaluate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await authFetch('/api/finance/evaluate', {
        method: 'POST',
        body: JSON.stringify({ asset_value: assetValue, leverage, liquidity_index: liquidity, counterparty_tier: counterparty }),
      });
      setResult(data);
    } catch {
      // Simulate locally
      const lev = ((leverage - 1) / 9) * 40;
      const liq = (1 - liquidity) * 30;
      const cp = ((counterparty - 1) / 4) * 30;
      const score = Math.round(lev + liq + cp);
      const status = score < 35 ? 'approved' : score < 65 ? 'flagged' : 'rejected';
      setResult({ status, score, breakdown: { leverage: Math.round(lev), liquidity: Math.round(liq), counterparty: Math.round(cp) } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">High-Dimensional Manifold Arbitrage Engine</h2>
        <p className="text-sm text-slate-500 mt-0.5">Financial transaction risk governance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Transaction Parameters</h3>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Asset Value ($)</label>
            <input
              type="number"
              value={assetValue}
              onChange={e => setAssetValue(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-slate-500">Leverage Ratio</label>
              <span className="text-xs font-bold text-slate-700">{leverage.toFixed(1)}x</span>
            </div>
            <input type="range" min={1} max={10} step={0.5} value={leverage}
              onChange={e => setLeverage(Number(e.target.value))}
              className="w-full accent-blue-600" />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>1.0x</span><span>10.0x</span></div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-slate-500">Liquidity Index</label>
              <span className="text-xs font-bold text-slate-700">{liquidity.toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={liquidity}
              onChange={e => setLiquidity(Number(e.target.value))}
              className="w-full accent-blue-600" />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>0.00</span><span>1.00</span></div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Counterparty Tier</label>
            <select value={counterparty} onChange={e => setCounterparty(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value={1}>1 — Prime</option>
              <option value={2}>2 — Investment Grade</option>
              <option value={3}>3 — Speculative</option>
              <option value={4}>4 — High Risk</option>
              <option value={5}>5 — Distressed</option>
            </select>
          </div>

          <button onClick={evaluate} disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
            {loading ? 'Evaluating…' : 'Evaluate Transaction →'}
          </button>

          {result && (
            <div className={`rounded-xl p-4 border ${
              result.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
              result.status === 'flagged' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm font-bold mb-1 ${
                result.status === 'approved' ? 'text-emerald-800' :
                result.status === 'flagged' ? 'text-amber-800' : 'text-red-800'
              }`}>
                {result.status === 'approved' ? '✓ Transaction Approved' :
                 result.status === 'flagged' ? '⚠ Transaction Flagged' : '✗ Execution Revoked'}
                {' '}— Energy score {result.score}/100
              </p>
              <p className={`text-xs mb-3 ${
                result.status === 'approved' ? 'text-emerald-700' :
                result.status === 'flagged' ? 'text-amber-700' : 'text-red-700'
              }`}>
                {result.status === 'approved' ? 'Within safe boundaries' :
                 result.status === 'flagged' ? 'Review required' : 'Risk vector exceeds safe-operating boundary'}
              </p>
              <div className="space-y-1.5">
                {[
                  ['Leverage component', result.breakdown.leverage],
                  ['Liquidity component', result.breakdown.liquidity],
                  ['Counterparty component', result.breakdown.counterparty],
                ].map(([label, pts]) => (
                  <div key={label as string} className="flex justify-between text-xs text-slate-600">
                    <span>{label as string}</span>
                    <span className="font-mono font-semibold">{pts as number} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Recent Transactions</h3>
          {txLoading ? (
            <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No transactions yet. Evaluate one above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['ID', 'Asset Value', 'Leverage', 'Energy', 'Status', 'Time'].map(h => (
                      <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 px-2 font-mono text-xs text-slate-500">{tx.id.slice(0, 8)}</td>
                      <td className="py-2 px-2 text-slate-700">${tx.asset_value?.toLocaleString()}</td>
                      <td className="py-2 px-2 text-slate-600">{tx.leverage}x</td>
                      <td className="py-2 px-2 font-mono font-semibold text-slate-700">{tx.energy_score}</td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(tx.status)}`}>{tx.status}</span>
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-400">{new Date(tx.created_at * 1000).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Model Router ──────────────────────────────────────────────
function ModelRouterTab() {
  const [sessions, setSessions] = useState(500);
  const [sessions2, _] = useState(DEMO_SESSIONS);

  // Savings calc: compare actual routing vs all-Sonnet @ $3.00 / 1k tokens
  const avgTokensPerSession = 2; // 2k tokens average
  const weights = [0.2, 0.15, 0.2, 0.15, 0.15, 0.15]; // task mix ~equal
  const avgCost = ROUTING_TABLE.reduce((acc, r, i) => acc + r.cost * weights[i], 0);
  const sonnetCost = 3.00;
  const savings = Math.round((sonnetCost - avgCost) * avgTokensPerSession * sessions);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Cost-Optimising Intelligent Model Router</h2>
        <p className="text-sm text-slate-500 mt-0.5">Automatically route tasks to the right model based on risk tier</p>
      </div>

      {/* Routing Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Routing Configuration</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Task Type', 'Risk Tier', 'Assigned Model', '~Cost / 1k tokens', 'Reasoning'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROUTING_TABLE.map((r, i) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800">{r.task}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${RISK_COLORS[r.risk]}`}>{r.risk}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-700">{r.model}</td>
                  <td className="py-3 px-4 font-mono text-slate-700 font-semibold">${r.cost.toFixed(2)}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Savings Calculator */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">📉 Savings Calculator</h3>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-slate-500">Sessions per month</label>
              <span className="text-xs font-bold text-slate-700">{sessions.toLocaleString()}</span>
            </div>
            <input type="range" min={10} max={10000} step={10} value={sessions}
              onChange={e => setSessions(Number(e.target.value))}
              className="w-full accent-blue-600" />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>10</span><span>10,000</span></div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-xs text-blue-600 mb-1">Estimated monthly savings vs. all-Sonnet</p>
            <p className="text-3xl font-bold text-blue-700">${savings.toLocaleString()}</p>
            <p className="text-xs text-blue-500 mt-1">Based on intelligent routing vs. ${sonnetCost}/1k uniform pricing</p>
          </div>
        </div>

        {/* Routing Log */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Real-Time Routing Log</h3>
          <div className="space-y-2">
            {sessions2.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-700">{s.session_type}</p>
                  <p className="text-[10px] text-slate-400">{s.id}</p>
                </div>
                <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">{s.model_used}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Delta-Governor Scarcity Ledger ────────────────────────────
function ScarcityTab() {
  const [records, setRecords] = useState<AttributionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/attribution')
      .then(d => setRecords((d.records || d).slice(0, 20)))
      .catch(() => {
        // Demo data
        setRecords(Array.from({ length: 12 }, (_, i) => ({
          id: `attr_${i}`,
          session_type: ['Legal Research', 'Contract Review', 'Financial Analysis', 'General Research'][i % 4],
          ai_percentage: 40 + Math.random() * 40,
          human_percentage: 20 + Math.random() * 40,
          final_value: 500 + Math.random() * 4500,
        })));
      })
      .finally(() => setLoading(false));
  }, []);

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const avgAI = avg(records.map(r => r.ai_percentage));
  const avgHuman = avg(records.map(r => r.human_percentage));
  const avgValue = avg(records.map(r => r.final_value));
  const totalValue = records.reduce((a, r) => a + r.final_value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Delta-Governor Scarcity Ledger</h2>
        <p className="text-sm text-slate-500 mt-0.5">Attribution of value between AI and human contribution</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg AI Contribution', value: `${avgAI.toFixed(1)}%`, color: 'text-blue-700' },
          { label: 'Avg Human Contribution', value: `${avgHuman.toFixed(1)}%`, color: 'text-coral-700 text-orange-700' },
          { label: 'Avg Session Value', value: `$${avgValue.toFixed(0)}`, color: 'text-slate-700' },
          { label: 'Total Value Attributed', value: `$${totalValue.toFixed(0)}`, color: 'text-emerald-700' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Attribution Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Attribution Chart — Last {records.length} Sessions</h3>
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="space-y-2.5">
            {records.map(r => {
              const total = r.ai_percentage + r.human_percentage;
              const aiW = (r.ai_percentage / total) * 100;
              const humW = (r.human_percentage / total) * 100;
              return (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500 w-36 flex-shrink-0 truncate">{r.session_type}</span>
                  <div className="flex-1 flex rounded-full overflow-hidden h-4">
                    <div style={{ width: `${aiW}%` }} className="bg-blue-500 transition-all" title={`AI: ${r.ai_percentage.toFixed(0)}%`} />
                    <div style={{ width: `${humW}%` }} className="bg-orange-400 transition-all" title={`Human: ${r.human_percentage.toFixed(0)}%`} />
                    <div className="flex-1 bg-slate-100" />
                  </div>
                  <span className="text-[11px] font-mono text-emerald-700 w-16 text-right flex-shrink-0">${r.final_value.toFixed(0)}</span>
                </div>
              );
            })}
            <div className="flex gap-4 mt-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />AI contribution</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" />Human contribution</span>
            </div>
          </div>
        )}
      </div>

      {/* Scarcity Index */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Scarcity Index — Human Premium Signals</h3>
        <div className="space-y-3">
          {SCARCITY.map(s => (
            <div key={s.type} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-lg">{s.color}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.type}</p>
                  <p className="text-xs text-slate-500">{s.level} SCARCITY</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-700">Human premium</p>
                <p className={`text-lg font-black ${s.level === 'HIGH' ? 'text-red-600' : s.level === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'}`}>{s.premium}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function FinancePage() {
  const [tab, setTab] = useState(0);
  const tabs = ['Manifold Arbitrage', 'Model Router', 'Scarcity Ledger'];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance Hub</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manifold Arbitrage · Model Router · Delta-Governor Scarcity Ledger</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === i ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 0 && <ManifoldTab />}
        {tab === 1 && <ModelRouterTab />}
        {tab === 2 && <ScarcityTab />}
      </div>
    </AppLayout>
  );
}
