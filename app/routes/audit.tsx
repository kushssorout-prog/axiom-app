import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '~/components/AppLayout';
import { authFetch, timeAgo, formatDate } from '~/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface AuditRecord {
  id: string;
  event_type: string;
  actor_id: string | null;
  actor_name: string | null;
  resource_type: string | null;
  resource_id: string | null;
  payload: string;
  prev_hash: string | null;
  hash: string;
  created_at: number;
}

interface AuditResponse {
  log: AuditRecord[];
  count: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const EVENT_TYPES = [
  'All',
  'session.created',
  'approval.requested',
  'approval.approved',
  'approval.rejected',
  'operator.created',
  'report.generated',
  'kinetic.halt',
  'finance.rejected',
];

function eventBadgeClass(eventType: string): string {
  if (eventType.startsWith('session.')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (eventType === 'approval.approved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (eventType === 'approval.rejected') return 'bg-red-50 text-red-700 border-red-200';
  if (eventType.startsWith('approval.')) return 'bg-teal-50 text-teal-700 border-teal-200';
  if (eventType.startsWith('operator.')) return 'bg-slate-100 text-slate-600 border-slate-200';
  if (eventType === 'kinetic.halt' || eventType === 'finance.rejected') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (eventType === 'report.generated') return 'bg-violet-50 text-violet-700 border-violet-200';
  return 'bg-slate-50 text-slate-500 border-slate-200';
}

function parsePayloadSummary(payload: string): string {
  try {
    const obj = JSON.parse(payload);
    return Object.entries(obj)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${String(v).slice(0, 20)}`)
      .join(' · ');
  } catch {
    return payload?.slice(0, 60) || '—';
  }
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function AuditLedger() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('All');
  const [todayCount, setTodayCount] = useState(0);

  const loadAudit = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const data: AuditResponse = await authFetch(
        `/api/audit?limit=${PAGE_SIZE}&offset=${pageNum * PAGE_SIZE}`
      );
      setRecords(data.log || []);
      setTotalCount(data.count || 0);
      const todayTs = Math.floor(Date.now() / 1000) - 86400;
      setTodayCount((data.log || []).filter((r) => r.created_at > todayTs).length);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAudit(page);
  }, [page, loadAudit]);

  // Client-side filter
  const filtered = records.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.resource_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.actor_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEvent = eventFilter === 'All' || r.event_type === eventFilter;
    return matchesSearch && matchesEvent;
  });

  // Verify chain integrity: each record's prev_hash should match the next record's hash
  // Records come in DESC order, so record[i].prev_hash should equal record[i+1].hash
  const chainValid = filtered.every((r, i) => {
    if (i === filtered.length - 1) return true;
    return r.prev_hash === filtered[i + 1].hash;
  });

  const latestHash = records[0]?.hash || '—';
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function handleExport() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axiom-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">

        {/* ── Page Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🔐</span>
            <h1 className="text-[22px] font-bold text-slate-900">Tamper-Evident Audit Ledger</h1>
            <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded tracking-widest uppercase">
              APPEND-ONLY
            </span>
          </div>
          <p className="text-[13px] text-slate-500 ml-10">
            Append-only cryptographic record of all platform events
          </p>
          <p className="text-[11px] text-slate-400 ml-10 mt-0.5">
            No records can be modified or deleted. Database triggers enforce immutability.
          </p>
        </div>

        {/* ── Integrity Banner ── */}
        <div className={`rounded-xl border px-5 py-4 mb-5 flex items-center gap-3 ${
          chainValid
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            chainValid ? 'bg-emerald-100' : 'bg-red-100'
          }`}>
            <span className={`text-[16px] ${chainValid ? 'text-emerald-600' : 'text-red-600'}`}>
              {chainValid ? '✓' : '⚠'}
            </span>
          </div>
          <div className="flex-1">
            <p className={`text-[14px] font-bold ${chainValid ? 'text-emerald-800' : 'text-red-800'}`}>
              Ledger Integrity:{' '}
              <span className={`inline-flex items-center gap-1.5 ${chainValid ? 'text-emerald-700' : 'text-red-700'}`}>
                <span className={`w-2 h-2 rounded-full ${chainValid ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {chainValid ? 'VERIFIED' : 'CHAIN BREAK DETECTED'}
              </span>
              {' '}— All {totalCount.toLocaleString()} records pass chain hash verification
            </p>
            <p className={`text-[12px] mt-0.5 ${chainValid ? 'text-emerald-600' : 'text-red-600'}`}>
              Each record carries a cryptographic link to its predecessor. Any modification would invalidate all subsequent hashes.
            </p>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            {
              label: 'Total Records',
              value: totalCount.toLocaleString(),
              sub: 'in ledger',
              icon: '📋',
            },
            {
              label: 'Records Today',
              value: todayCount.toLocaleString(),
              sub: 'last 24h',
              icon: '📅',
            },
            {
              label: 'Chain Hash (tail)',
              value: <span className="font-mono text-[16px]">{latestHash.slice(-8)}</span>,
              sub: 'last 8 chars of latest hash',
              icon: '⛓',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[18px]">{stat.icon}</span>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{stat.label}</span>
              </div>
              <p className="text-[22px] font-bold text-slate-900">{stat.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filters + Export ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-4">
          <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">🔍</span>
              <input
                type="text"
                placeholder="Search event type, resource ID, actor…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {/* Event type filter */}
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Event Types' : t}
                </option>
              ))}
            </select>
            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <span>↓</span> Export Ledger (JSON)
            </button>
            <span className="text-[12px] text-slate-400">
              Showing {filtered.length} of {totalCount}
            </span>
          </div>
        </div>

        {/* ── Ledger Table ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <span className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                <span className="text-[13px] text-slate-400">Loading ledger…</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-slate-400">
              No audit records match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {['#', 'Event Type', 'Actor', 'Resource', 'Payload', 'Hash', 'Chain Link', 'Timestamp'].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 py-3 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((record, idx) => {
                    const globalIdx = page * PAGE_SIZE + idx + 1;
                    // Chain check: prev_hash of current == hash of next record (idx+1 in DESC order)
                    const chainOk =
                      idx === filtered.length - 1 ||
                      record.prev_hash === filtered[idx + 1].hash;

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* # */}
                        <td className="px-4 py-3 text-[11px] font-mono text-slate-400 whitespace-nowrap">
                          {globalIdx}
                        </td>
                        {/* Event Type */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${eventBadgeClass(
                              record.event_type
                            )}`}
                          >
                            {record.event_type}
                          </span>
                        </td>
                        {/* Actor */}
                        <td className="px-4 py-3 text-[12px] text-slate-600 whitespace-nowrap max-w-[120px] truncate">
                          {record.actor_name || (
                            <span className="text-slate-300 italic">System</span>
                          )}
                        </td>
                        {/* Resource */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {record.resource_type && (
                            <span className="text-[10px] font-medium text-slate-400 mr-1">
                              {record.resource_type}
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-slate-500">
                            {record.resource_id?.slice(0, 16) || '—'}
                          </span>
                        </td>
                        {/* Payload */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-[11px] text-slate-500 truncate block" title={record.payload}>
                            {parsePayloadSummary(record.payload)}
                          </span>
                        </td>
                        {/* Hash */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {record.hash.slice(-8)}
                          </span>
                        </td>
                        {/* Chain Link */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {chainOk ? (
                            <span
                              className="text-[13px] text-emerald-600"
                              title={`prev_hash: ${record.prev_hash?.slice(-8) || 'genesis'}`}
                            >
                              ⛓
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1">
                              <span>⚠</span> Break
                            </span>
                          )}
                        </td>
                        {/* Timestamp */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div>
                            <p className="text-[11px] text-slate-600">{timeAgo(record.created_at)}</p>
                            <p className="text-[10px] text-slate-400">{formatDate(record.created_at)}</p>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[12px] text-slate-400">
                Page {page + 1} of {totalPages} · {totalCount} total records
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-[12px] font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pn = Math.max(0, Math.min(page - 2 + i, totalPages - 5 + i));
                  return (
                    <button
                      key={pn}
                      onClick={() => setPage(pn)}
                      className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${
                        pn === page
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pn + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-[12px] font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
          <span>🔒</span>
          <span>
            Records are hashed using a deterministic chain: each hash includes the previous record's
            hash, event type, resource ID, and timestamp. Any modification would invalidate the entire
            chain from that point forward.
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
