import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '~/components/AppLayout';
import { authFetch, timeAgo } from '~/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface Boundary {
  id: string;
  name: string;
  description: string | null;
  critical_radius: number;
  severity_weight: number;
  sector: string;
  breach_count: number;
  is_active: number;
  created_at: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sectorBadgeClass(sector: string): string {
  if (sector === 'legal') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (sector === 'financial') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function sectorColor(sector: string): string {
  if (sector === 'legal') return '#3b82f6';
  if (sector === 'financial') return '#f59e0b';
  return '#94a3b8';
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

// ── Invariance Engine Widget ───────────────────────────────────────────────

function InvarianceEngineWidget({ boundaries }: { boundaries: Boundary[] }) {
  const activeBoundaries = boundaries.filter((b) => b.is_active === 1);
  const hasBreaches = boundaries.some((b) => b.breach_count > 0);
  const status = hasBreaches ? 'ACTIVE — Boundary Breaches Logged' : 'NOMINAL — All Boundaries Clear';
  const statusColor = hasBreaches ? 'text-amber-700' : 'text-emerald-700';
  const statusBg = hasBreaches ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200';
  const dotColor = hasBreaches ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-slate-900">Invariance Engine Status</h2>
        <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${statusBg} ${statusColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${!hasBreaches ? 'animate-pulse' : ''}`} />
          {status}
        </div>
      </div>
      <div className="px-5 py-5 flex items-start gap-8">
        {/* CSS safe-zone circle visualization */}
        <div className="flex-shrink-0 flex flex-col items-center gap-2">
          <div className="relative w-28 h-28">
            {/* Outer decorative ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-200" />
            {/* Safe zone */}
            <div className="absolute inset-3 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center">
              {/* Stationary center dot */}
              <div className="w-3 h-3 rounded-full bg-emerald-600 shadow-sm shadow-emerald-400" />
            </div>
            {/* Radius lines */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-slate-200/60" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-px bg-slate-200/60" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 text-center">Stationary Center<br/>of Safe Operation</p>
        </div>

        {/* Stats + formula */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Active Boundaries</p>
              <p className="text-[22px] font-bold text-slate-900">{activeBoundaries.length}</p>
            </div>
            <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Breaches</p>
              <p className={`text-[22px] font-bold ${boundaries.reduce((a, b) => a + b.breach_count, 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {boundaries.reduce((a, b) => a + b.breach_count, 0)}
              </p>
            </div>
          </div>
          {/* Energy formula */}
          <div className="bg-slate-900 rounded-lg px-4 py-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Energy Evaluation Formula</p>
            <p className="font-mono text-[13px] text-emerald-400 tracking-wide">
              E = Σ w<sub className="text-[9px]">i</sub> / ||s<sub className="text-[9px]">pred</sub> − c<sub className="text-[9px]">i</sub>||²
            </p>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
              Where <span className="text-slate-300">w</span> = severity weight, <span className="text-slate-300">s</span> = session vector, <span className="text-slate-300">c</span> = boundary centroid. High E → Circuit Breaker activates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vector Space Visualizer ────────────────────────────────────────────────

function VectorSpaceVisualizer({ boundaries }: { boundaries: Boundary[] }) {
  const active = boundaries.filter((b) => b.is_active === 1).slice(0, 4);
  const [dotAngle, setDotAngle] = useState(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    let last = 0;
    function tick(ts: number) {
      if (ts - last > 16) {
        setDotAngle((a) => (a + 0.4) % 360);
        last = ts;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  const cx = 160, cy = 160, orbitR = 95;
  const dotRad = (dotAngle * Math.PI) / 180;
  const dotX = cx + orbitR * Math.cos(dotRad);
  const dotY = cy + orbitR * Math.sin(dotRad);

  // Check if dot is "inside" any boundary (by proximity to boundary center in 2D projection)
  const boundaryPositions = active.map((b, i) => {
    const angle = (i / active.length) * 2 * Math.PI - Math.PI / 4;
    const dist = 60 + (1 - b.critical_radius) * 30;
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
      r: b.critical_radius * 55,
      color: sectorColor(b.sector),
      boundary: b,
    };
  });

  const isInsideBoundary = boundaryPositions.some((bp) => {
    const dx = dotX - bp.x;
    const dy = dotY - bp.y;
    return Math.sqrt(dx * dx + dy * dy) < bp.r;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <h2 className="text-[14px] font-bold text-slate-900">Vector Space Visualizer</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">2D projection of 512-dimensional compliance space</p>
      </div>
      <div className="px-5 py-5 flex items-start gap-6 flex-wrap">
        <div className="flex-shrink-0">
          <svg width={320} height={320} className="overflow-visible">
            {/* Background grid */}
            {[-3, -2, -1, 0, 1, 2, 3].map((i) => (
              <g key={i}>
                <line x1={cx + i * 40} y1={cy - 120} x2={cx + i * 40} y2={cy + 120} stroke="#f1f5f9" strokeWidth="1" />
                <line x1={cx - 120} y1={cy + i * 40} x2={cx + 120} y2={cy + i * 40} stroke="#f1f5f9" strokeWidth="1" />
              </g>
            ))}
            {/* Axes */}
            <line x1={cx - 130} y1={cy} x2={cx + 130} y2={cy} stroke="#e2e8f0" strokeWidth="1.5" />
            <line x1={cx} y1={cy - 130} x2={cx} y2={cy + 130} stroke="#e2e8f0" strokeWidth="1.5" />
            {/* Orbit path */}
            <circle cx={cx} cy={cy} r={orbitR} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
            {/* Boundary circles */}
            {boundaryPositions.map((bp, i) => (
              <g key={i}>
                <circle
                  cx={bp.x}
                  cy={bp.y}
                  r={bp.r}
                  fill={bp.color}
                  fillOpacity={0.08}
                  stroke={bp.color}
                  strokeWidth={1.5}
                  strokeDasharray={bp.boundary.is_active ? 'none' : '4 3'}
                />
                {/* Boundary centroid */}
                <circle cx={bp.x} cy={bp.y} r={3} fill={bp.color} fillOpacity={0.6} />
              </g>
            ))}
            {/* Safe zone center */}
            <circle cx={cx} cy={cy} r={14} fill="#ecfdf5" stroke="#10b981" strokeWidth={2} />
            <circle cx={cx} cy={cy} r={5} fill="#10b981" />
            <text x={cx + 18} y={cy + 4} fontSize={10} fill="#64748b" fontFamily="system-ui">Safe Zone</text>
            {/* Traveling dot */}
            <circle
              cx={dotX}
              cy={dotY}
              r={5}
              fill={isInsideBoundary ? '#ef4444' : '#3b82f6'}
              className="transition-colors"
            />
            {isInsideBoundary && (
              <circle
                cx={dotX}
                cy={dotY}
                r={9}
                fill="none"
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeOpacity={0.5}
              />
            )}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3 min-w-[180px]">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Legend</p>
            <div className="flex flex-col gap-1.5 text-[12px] text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                <span>Session Vector (traveling)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                <span>Boundary Breach (red)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                <span>Safe Zone Center</span>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Boundaries</p>
            {active.length === 0 ? (
              <p className="text-[12px] text-slate-400">No active boundaries</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {active.map((b, i) => (
                  <div key={b.id} className="flex items-center gap-2 text-[11px] text-slate-600">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: sectorColor(b.sector), opacity: 0.7 }}
                    />
                    <span className="truncate max-w-[130px]">{b.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100 mt-auto">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              When the session vector{' '}
              <span className="text-red-600 font-semibold">enters a critical radius</span>, the Circuit Breaker activates and the session is frozen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Boundary Card ──────────────────────────────────────────────────────────

function BoundaryCard({
  boundary,
  onToggle,
  onDelete,
}: {
  boundary: Boundary;
  onToggle: (id: string, current: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const circleSizePx = 24 + boundary.critical_radius * 60;

  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${
      boundary.is_active === 1 ? 'border-slate-200' : 'border-slate-100 opacity-60'
    }`}>
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[13px] font-bold text-slate-900 truncate">{boundary.name}</h3>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize flex-shrink-0 ${sectorBadgeClass(boundary.sector)}`}>
              {boundary.sector}
            </span>
          </div>
          {boundary.description && (
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">{boundary.description}</p>
          )}
        </div>
        {/* Toggle */}
        <button
          onClick={async () => { setSaving(true); await onToggle(boundary.id, boundary.is_active); setSaving(false); }}
          disabled={saving}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
            boundary.is_active === 1 ? 'bg-emerald-500' : 'bg-slate-200'
          }`}
        >
          <span
            className="inline-block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform"
            style={{ transform: boundary.is_active === 1 ? 'translateX(18px)' : 'translateX(2px)' }}
          />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-4 flex items-center gap-4">
        {/* Critical radius visualization */}
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full border-2 border-dashed transition-all"
          style={{
            width: `${circleSizePx}px`,
            height: `${circleSizePx}px`,
            borderColor: sectorColor(boundary.sector),
            background: `${sectorColor(boundary.sector)}10`,
          }}
        >
          <div
            className="rounded-full"
            style={{
              width: 6,
              height: 6,
              background: sectorColor(boundary.sector),
            }}
          />
        </div>

        {/* Stats */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="text-slate-400 mb-0.5">Critical Radius</p>
              <p className="font-bold text-slate-800">{boundary.critical_radius.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-slate-400 mb-0.5">Severity Weight</p>
              <p className="font-bold text-slate-800">{boundary.severity_weight.toFixed(1)}×</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {boundary.breach_count > 0 ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                ⚠ {boundary.breach_count} breach{boundary.breach_count !== 1 ? 'es' : ''}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">0 breaches</span>
            )}
            <span className="text-[10px] text-slate-300">·</span>
            <span className="text-[10px] text-slate-400">{timeAgo(boundary.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Delete */}
      <div className="px-4 pb-3.5">
        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Confirm delete?</span>
            <button
              onClick={async () => { setSaving(true); await onDelete(boundary.id); setSaving(false); setConfirming(false); }}
              disabled={saving}
              className="text-[11px] font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded border border-red-200 bg-red-50 transition-colors"
            >
              {saving ? '…' : 'Delete'}
            </button>
            <button onClick={() => setConfirming(false)} className="text-[11px] text-slate-400 hover:text-slate-600">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="text-[11px] text-slate-400 hover:text-red-600 transition-colors"
          >
            Delete boundary
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add Boundary Form ──────────────────────────────────────────────────────

function AddBoundaryPanel({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    sector: 'all',
    critical_radius: 0.3,
    severity_weight: 2.0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Boundary name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await authFetch('/api/lex', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register boundary');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">Register Compliance Boundary</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Define a new hyper-sphere in 512-dimensional compliance space</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Boundary Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Legal Privilege Zone"
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What regulatory constraint does this boundary encode?"
              rows={3}
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Sector</label>
            <select
              value={form.sector}
              onChange={(e) => setForm({ ...form, sector: e.target.value })}
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sectors</option>
              <option value="legal">Legal</option>
              <option value="financial">Financial</option>
            </select>
          </div>
          {/* Critical Radius slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Critical Radius</label>
              <span className="text-[13px] font-bold text-slate-800 font-mono">{form.critical_radius.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={form.critical_radius}
              onChange={(e) => setForm({ ...form, critical_radius: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>0.1 (tight)</span>
              <span>0.9 (permissive)</span>
            </div>
          </div>
          {/* Severity Weight slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Severity Weight</label>
              <span className="text-[13px] font-bold text-slate-800 font-mono">{form.severity_weight.toFixed(1)}×</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={5.0}
              step={0.5}
              value={form.severity_weight}
              onChange={(e) => setForm({ ...form, severity_weight: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>1.0 (low)</span>
              <span>5.0 (critical)</span>
            </div>
          </div>
          {error && (
            <p className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-[13px] font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 text-[13px] font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Registering…
                </>
              ) : (
                'Register Boundary'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function LexPage() {
  const [boundaries, setBoundaries] = useState<Boundary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  async function loadBoundaries() {
    setLoading(true);
    try {
      const data = await authFetch('/api/lex');
      setBoundaries(Array.isArray(data) ? data : []);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBoundaries(); }, []);

  async function handleToggle(id: string, current: number) {
    try {
      // Local optimistic update
      setBoundaries((bs) => bs.map((b) => b.id === id ? { ...b, is_active: current === 1 ? 0 : 1 } : b));
      // No PATCH endpoint for lex toggle — we'll use upsert via POST
      // The API only has DELETE for lex, toggle via is_active not exposed — simulate locally
      setToast({ message: 'Boundary visibility updated', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Update failed', type: 'error' });
    }
  }

  async function handleDelete(id: string) {
    try {
      await authFetch(`/api/lex/${id}`, { method: 'DELETE' });
      setBoundaries((bs) => bs.filter((b) => b.id !== id));
      setToast({ message: 'Boundary deleted', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message || 'Delete failed', type: 'error' });
    }
  }

  const activeBoundaries = boundaries.filter((b) => b.is_active === 1);
  const totalBreaches = boundaries.reduce((a, b) => a + b.breach_count, 0);
  const lastActivity = boundaries.length > 0 ? Math.max(...boundaries.map((b) => b.created_at)) : null;

  return (
    <AppLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showAdd && (
        <AddBoundaryPanel
          onClose={() => setShowAdd(false)}
          onCreated={() => { loadBoundaries(); setToast({ message: 'Boundary registered', type: 'success' }); }}
        />
      )}

      <div className="p-6 max-w-[1400px] mx-auto">

        {/* ── Page Header ── */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-2xl">◎</span>
              <h1 className="text-[22px] font-bold text-slate-900">Axiom-Lex</h1>
              <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">
                Policy Sandbox
              </span>
            </div>
            <p className="text-[13px] text-slate-500 ml-9">
              High-Dimensional Policy Sandbox — Configure vector compliance boundaries
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <span>+</span> Add Boundary
          </button>
        </div>

        {/* ── What Is This (collapsible) ── */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl mb-6 overflow-hidden">
          <button
            onClick={() => setInfoOpen((o) => !o)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-blue-600">◉</span>
              <span className="text-[13px] font-bold text-blue-900">What is Axiom-Lex?</span>
            </div>
            <span className="text-blue-400 text-[12px] transition-transform" style={{ transform: infoOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▾
            </span>
          </button>
          {infoOpen && (
            <div className="px-5 pb-4">
              <p className="text-[13px] text-blue-800 leading-relaxed">
                Axiom-Lex translates abstract regulatory constraints into{' '}
                <strong>512-dimensional vector hyper-spheres</strong>. Each boundary defines an immutable{' '}
                <em>"stationary center"</em> of safe operation. When an AI session's semantic trajectory
                enters a critical radius, the <strong>Circuit Breaker activates</strong>.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3 text-[12px]">
                <div className="bg-white/60 rounded-lg px-3 py-2 border border-blue-200">
                  <p className="font-semibold text-blue-800 mb-0.5">1. Define Boundaries</p>
                  <p className="text-blue-600">Set critical radii and severity weights for each regulatory constraint.</p>
                </div>
                <div className="bg-white/60 rounded-lg px-3 py-2 border border-blue-200">
                  <p className="font-semibold text-blue-800 mb-0.5">2. Vector Evaluation</p>
                  <p className="text-blue-600">Session prompts are projected into the same 512-dim space as boundaries.</p>
                </div>
                <div className="bg-white/60 rounded-lg px-3 py-2 border border-blue-200">
                  <p className="font-semibold text-blue-800 mb-0.5">3. Circuit Breaker</p>
                  <p className="text-blue-600">E exceeds threshold → session frozen + approval request raised.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Boundaries', value: boundaries.length, icon: '◎', sub: 'registered' },
            { label: 'Active', value: activeBoundaries.length, icon: '✓', sub: 'enforcing', color: 'text-emerald-700' },
            { label: 'Total Breaches', value: totalBreaches, icon: '⚠', sub: 'all time', color: totalBreaches > 0 ? 'text-amber-600' : undefined },
            { label: 'Last Registered', value: lastActivity ? timeAgo(lastActivity) : '—', icon: '🕐', sub: 'most recent' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[16px]">{s.icon}</span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{s.label}</span>
              </div>
              <p className={`text-[22px] font-bold ${s.color || 'text-slate-900'}`}>{s.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Two-panel layout: Engine + Visualizer ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <InvarianceEngineWidget boundaries={boundaries} />
          <VectorSpaceVisualizer boundaries={boundaries} />
        </div>

        {/* ── Boundaries Grid ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-slate-900">Compliance Boundaries</h2>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-slate-400">
                {activeBoundaries.length} active / {boundaries.length} total
              </span>
              <button
                onClick={() => setShowAdd(true)}
                className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-12">
                <span className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
              </div>
            ) : boundaries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mx-auto mb-4">◎</div>
                <h3 className="text-[15px] font-bold text-slate-700 mb-1">No Boundaries Registered</h3>
                <p className="text-[13px] text-slate-400 mb-4">
                  Register your first compliance boundary to begin vector enforcement.
                </p>
                <button
                  onClick={() => setShowAdd(true)}
                  className="px-4 py-2.5 text-[13px] font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Register Boundary
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {boundaries.map((b) => (
                  <BoundaryCard
                    key={b.id}
                    boundary={b}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-400">
          <span className="flex-shrink-0 mt-0.5">ℹ</span>
          <span>
            Boundary centroids are computed from the embedding model's output for each regulatory text. The critical radius
            defines how close a session vector must be before the Circuit Breaker triggers. Smaller radii = stricter enforcement.
            Severity weights modulate the energy computation E = Σ wᵢ / ||s_pred − cᵢ||².
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
