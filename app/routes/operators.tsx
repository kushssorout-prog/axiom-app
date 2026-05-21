import { useState, useEffect } from 'react';
import { AppLayout } from '~/components/AppLayout';
import { authFetch, timeAgo } from '~/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface Operator {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  approval_score: number;
  is_active: number;
  public_key: string | null;
  created_at: number;
}

interface ComplianceRule {
  id: string;
  name: string;
  category: string;
  rule_type: string;
  keywords: string;
  severity: string;
  sector: string;
  score_impact: number;
  is_active: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function roleBadge(role: string): string {
  if (role === 'admin') return 'bg-slate-900 text-white border-slate-900';
  if (role === 'operator') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-400';
  return 'bg-red-500';
}

function scoreTextColor(score: number): string {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function severityBadge(severity: string): string {
  if (severity === 'critical') return 'bg-red-50 text-red-700 border-red-200';
  if (severity === 'high') return 'bg-orange-50 text-orange-700 border-orange-200';
  if (severity === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-[13px] font-semibold ${
      type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      <span>{type === 'success' ? '✓' : '✗'}</span>
      {message}
      <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100 font-normal">✕</button>
    </div>
  );
}

// ── Add Operator Modal ─────────────────────────────────────────────────────

function AddOperatorModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'operator', department: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('Name, email and password are required'); return; }
    setSaving(true);
    setError('');
    try {
      await authFetch('/api/operators', { method: 'POST', body: JSON.stringify(form) });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create operator');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-slate-900">Add Operator</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors text-lg">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Smith"
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jane@company.com"
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Initial Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Legal, Finance…"
                className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-[13px] font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-[13px] font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors">
              {saving ? 'Creating…' : 'Create Operator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Operator Row ───────────────────────────────────────────────────────────

function OperatorRow({
  op,
  onUpdate,
}: {
  op: Operator;
  onUpdate: (id: string, data: any) => Promise<void>;
}) {
  const [editingRole, setEditingRole] = useState(false);
  const [pendingRole, setPendingRole] = useState(op.role);
  const [saving, setSaving] = useState(false);

  async function saveRole() {
    if (pendingRole === op.role) { setEditingRole(false); return; }
    setSaving(true);
    await onUpdate(op.id, { role: pendingRole });
    setSaving(false);
    setEditingRole(false);
  }

  async function toggleActive() {
    setSaving(true);
    await onUpdate(op.id, { is_active: op.is_active === 1 ? 0 : 1 });
    setSaving(false);
  }

  const belowThreshold = op.approval_score < 75;

  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors group">
      {/* Name */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[12px] flex-shrink-0">
            {op.name[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-semibold text-slate-800">{op.name}</p>
              {belowThreshold && (
                <div className="relative group/tip">
                  <span className="w-2 h-2 rounded-full bg-blue-500 block cursor-help" />
                  <div className="absolute left-4 top-0 w-48 bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 hidden group-hover/tip:block z-10 shadow-xl">
                    Score below threshold — consider suspension
                  </div>
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400">{timeAgo(op.created_at)}</p>
          </div>
        </div>
      </td>
      {/* Email */}
      <td className="px-4 py-3.5">
        <span className="text-[12px] text-slate-600">{op.email}</span>
      </td>
      {/* Role */}
      <td className="px-4 py-3.5">
        {editingRole ? (
          <div className="flex items-center gap-1.5">
            <select
              value={pendingRole}
              onChange={(e) => setPendingRole(e.target.value)}
              className="text-[12px] border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="operator">operator</option>
              <option value="admin">admin</option>
              <option value="viewer">viewer</option>
            </select>
            <button onClick={saveRole} disabled={saving} className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold">
              {saving ? '…' : 'Save'}
            </button>
            <button onClick={() => { setEditingRole(false); setPendingRole(op.role); }} className="text-[11px] text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border capitalize ${roleBadge(op.role)}`}>
              {op.role}
            </span>
            <button
              onClick={() => setEditingRole(true)}
              className="text-[10px] text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Edit
            </button>
          </div>
        )}
      </td>
      {/* Department */}
      <td className="px-4 py-3.5">
        <span className="text-[12px] text-slate-500">{op.department || <span className="italic text-slate-300">—</span>}</span>
      </td>
      {/* Approval Score */}
      <td className="px-4 py-3.5 min-w-[140px]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${scoreColor(op.approval_score)}`}
              style={{ width: `${op.approval_score}%` }}
            />
          </div>
          <span className={`text-[12px] font-bold w-7 text-right flex-shrink-0 ${scoreTextColor(op.approval_score)}`}>
            {op.approval_score}
          </span>
        </div>
      </td>
      {/* Key Registered */}
      <td className="px-4 py-3.5">
        {op.public_key ? (
          <span className="text-emerald-600 font-bold text-[14px]" title="Ed25519 key registered">✓</span>
        ) : (
          <div className="relative group/key">
            <span className="text-red-500 font-bold text-[14px] cursor-help">✗</span>
            <div className="absolute left-6 top-0 w-48 bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-1.5 hidden group-hover/key:block z-10 shadow-xl">
              No Ed25519 key registered
            </div>
          </div>
        )}
      </td>
      {/* Status */}
      <td className="px-4 py-3.5">
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            op.is_active === 1
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          {op.is_active === 1 ? 'Active' : 'Suspended'}
        </span>
      </td>
      {/* Actions */}
      <td className="px-4 py-3.5">
        <button
          onClick={toggleActive}
          disabled={saving}
          className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
            op.is_active === 1
              ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
              : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          {saving ? '…' : op.is_active === 1 ? 'Suspend' : 'Activate'}
        </button>
      </td>
    </tr>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Operators() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [ops, rls] = await Promise.all([
        authFetch('/api/operators'),
        authFetch('/api/compliance-rules'),
      ]);
      setOperators(Array.isArray(ops) ? ops : []);
      setRules(Array.isArray(rls) ? rls : []);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleUpdate(id: string, data: any) {
    try {
      await authFetch(`/api/operators/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      await loadAll();
      setToast({ message: 'Operator updated', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Update failed', type: 'error' });
    }
  }

  async function toggleRule(id: string, current: number) {
    try {
      await authFetch(`/api/compliance-rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: current === 1 ? 0 : 1 }),
      });
      await loadAll();
      setToast({ message: 'Rule updated', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Update failed', type: 'error' });
    }
  }

  // Stats
  const totalOps = operators.length;
  const admins = operators.filter((o) => o.role === 'admin').length;
  const suspended = operators.filter((o) => o.is_active === 0).length;
  const avgScore = totalOps > 0
    ? Math.round(operators.reduce((a, o) => a + o.approval_score, 0) / totalOps)
    : 0;

  return (
    <AppLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showAdd && (
        <AddOperatorModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { loadAll(); setToast({ message: 'Operator created', type: 'success' }); }}
        />
      )}

      <div className="p-6 max-w-[1400px] mx-auto">

        {/* ── Page Header ── */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">👤</span>
              <h1 className="text-[22px] font-bold text-slate-900">Zero-Trust Access Controller</h1>
            </div>
            <p className="text-[13px] text-slate-500 ml-10">
              Manage operator identities, roles, and cryptographic keys
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <span>+</span> Add Operator
          </button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Operators', value: totalOps, icon: '👥', sub: 'registered' },
            { label: 'Admins', value: admins, icon: '🔑', sub: `${totalOps > 0 ? Math.round(admins / totalOps * 100) : 0}% of team` },
            { label: 'Suspended', value: suspended, icon: '⛔', sub: 'inactive accounts' },
            {
              label: 'Avg Approval Score',
              value: (
                <span className={scoreTextColor(avgScore)}>{avgScore}</span>
              ),
              icon: '📊',
              sub: 'out of 100',
            },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[18px]">{s.icon}</span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{s.label}</span>
              </div>
              <p className="text-[24px] font-bold text-slate-900">{s.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Operators Table ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-slate-900">Operators</h2>
            <span className="text-[12px] text-slate-400">{totalOps} registered</span>
          </div>
          {loading ? (
            <div className="py-16 flex justify-center">
              <span className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
            </div>
          ) : operators.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-slate-400">No operators yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/40">
                    {['Name', 'Email', 'Role', 'Department', 'Approval Score', 'Key Registered', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 py-3 whitespace-nowrap first:px-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {operators.map((op) => (
                    <OperatorRow key={op.id} op={op} onUpdate={handleUpdate} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Operator Performance Scorecard ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-bold text-slate-900">Operator Performance Overview</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Approval scores reflect review quality and compliance adherence</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <span>⚠</span> Operators below 75 may be auto-suspended
            </div>
          </div>
          <div className="px-5 py-5">
            {operators.length === 0 ? (
              <p className="text-[13px] text-slate-400 text-center py-4">No operator data</p>
            ) : (
              <div className="flex flex-col gap-3">
                {[...operators]
                  .sort((a, b) => b.approval_score - a.approval_score)
                  .map((op) => (
                    <div key={op.id} className="flex items-center gap-3">
                      <div className="w-28 flex-shrink-0">
                        <p className="text-[12px] font-semibold text-slate-700 truncate">{op.name}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{op.role}</p>
                      </div>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden relative">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${scoreColor(op.approval_score)}`}
                          style={{ width: `${op.approval_score}%` }}
                        />
                        {op.approval_score < 75 && (
                          <div
                            className="absolute top-0 h-full border-l-2 border-dashed border-amber-400"
                            style={{ left: '75%' }}
                            title="Auto-suspension threshold"
                          />
                        )}
                      </div>
                      <span className={`text-[13px] font-bold w-8 text-right flex-shrink-0 ${scoreTextColor(op.approval_score)}`}>
                        {op.approval_score}
                      </span>
                      {op.approval_score < 75 && (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex-shrink-0">
                          ⚠ Below
                        </span>
                      )}
                    </div>
                  ))}
                {/* Threshold legend */}
                <div className="flex items-center gap-3 pt-1 mt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500" /> ≥80 Healthy
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="w-3 h-3 rounded-sm bg-amber-400" /> 50–79 Monitor
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="w-3 h-3 rounded-sm bg-red-500" /> &lt;50 At Risk
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Compliance Rules ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-bold text-slate-900">Active Compliance Rules</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Rules enforced by the Circuit Breaker on every session</p>
            </div>
            <span className="text-[12px] text-slate-400">
              {rules.filter((r) => r.is_active).length}/{rules.length} active
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/40">
                  {['Rule Name', 'Category', 'Severity', 'Sector', 'Score Impact', 'Status'].map((h) => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest px-5 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-[13px] font-medium text-slate-800">{rule.name}</p>
                      <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                        {rule.keywords?.split(',').slice(0, 3).join(' · ')}…
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] font-medium text-slate-600 capitalize">{rule.category}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wide ${severityBadge(rule.severity)}`}>
                        {rule.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] text-slate-500 capitalize">{rule.sector}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] font-bold text-slate-700">+{rule.score_impact}</span>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleRule(rule.id, rule.is_active)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          rule.is_active === 1 ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`inline-block w-3.5 h-3.5 transform rounded-full bg-white shadow transition-transform ${
                            rule.is_active === 1 ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`}
                          style={{ transform: rule.is_active === 1 ? 'translateX(18px)' : 'translateX(2px)' }}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
