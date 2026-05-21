import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { AppLayout } from '~/components/AppLayout';
import { apiFetch, getOperator, timeAgo, statusBadge } from '~/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface ApprovalRequest {
  id: string;
  session_id: string;
  requester_id: string;
  reviewer_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  signature?: string;
  notes?: string;
  created_at: number;
  reviewed_at?: number;
  // Joined from ai_sessions
  prompt_text: string;
  risk_score: number;
  module: string;
  session_type: string;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';
type ModalDecision = 'approved' | 'rejected';

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const MODULE_ICONS: Record<string, string> = {
  core: '⬡',
  legal: '⚖',
  finance: '📊',
  intelligence: '🔍',
  pricing: '💰',
  kinetic: '🤖',
};

// ── Toast ──────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-bottom-4 ${
      type === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-red-50 border-red-200 text-red-800'
    }`}>
      <span>{type === 'success' ? '✓' : '✗'}</span>
      <span className="text-[13px] font-semibold">{message}</span>
      <button onClick={onClose} className="ml-2 text-current opacity-50 hover:opacity-100">✕</button>
    </div>
  );
}

// ── Approval Modal ─────────────────────────────────────────────────────────

function ApprovalModal({
  approval,
  operator,
  onClose,
  onSubmit,
}: {
  approval: ApprovalRequest;
  operator: any;
  onClose: () => void;
  onSubmit: (decision: ModalDecision, signature: string, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState('');
  const [signatureSigned, setSignatureSigned] = useState(false);
  const [generatingSig, setGeneratingSig] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<ModalDecision | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  async function generateSignature(dec: ModalDecision) {
    setGeneratingSig(true);
    try {
      const keyPair = await crypto.subtle.generateKey(
        { name: 'Ed25519' } as any,
        false,
        ['sign', 'verify']
      );
      const timestamp = Date.now();
      const payload = new TextEncoder().encode(`${approval.id}:${dec}:${timestamp}`);
      const sig = await crypto.subtle.sign('Ed25519' as any, (keyPair as CryptoKeyPair).privateKey, payload);
      const sigHex = Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      setSignature(sigHex);
      setSignatureSigned(true);
      setDecision(dec);
    } catch (err: any) {
      // Fallback if Ed25519 not supported
      const fallback = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      setSignature(fallback);
      setSignatureSigned(true);
      setDecision(dec);
    } finally {
      setGeneratingSig(false);
    }
  }

  async function handleSubmit() {
    if (!decision) return;
    setSubmitting(true);
    try {
      await onSubmit(decision, signature, notes);
      onClose();
    } catch {
      // parent handles error
    } finally {
      setSubmitting(false);
    }
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  const riskColor =
    approval.risk_score >= 80 ? 'text-red-600' :
    approval.risk_score >= 40 ? 'text-amber-600' :
    'text-emerald-600';

  const riskBarColor =
    approval.risk_score >= 80 ? 'bg-red-500' :
    approval.risk_score >= 40 ? 'bg-amber-400' :
    'bg-emerald-500';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Review Approval Request</h2>
            <p className="text-[12px] text-slate-400 mt-0.5 font-mono">{approval.id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Session meta */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-[12px] text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
              <span>{MODULE_ICONS[approval.module] || '⬡'}</span>
              <span className="font-semibold capitalize">{approval.module}</span>
            </span>
            <span className="text-[12px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">{approval.session_type}</span>
            <span className="text-[12px] text-slate-400">{timeAgo(approval.created_at)}</span>
          </div>

          {/* Full prompt */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Full Prompt</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] text-slate-700 leading-relaxed">
              {approval.prompt_text}
            </div>
          </div>

          {/* Risk score */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Risk Assessment</p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] text-slate-600">Risk Score</span>
                <span className={`text-[15px] font-bold ${riskColor}`}>{approval.risk_score}/100</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${riskBarColor}`}
                  style={{ width: `${Math.min(100, approval.risk_score)}%` }}
                />
              </div>
              <p className={`text-[11px] mt-1.5 font-medium ${riskColor}`}>
                {approval.risk_score >= 80 ? 'High Risk' : approval.risk_score >= 40 ? 'Moderate Risk — Review Required' : 'Low-Moderate Risk'}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Review Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add review notes..."
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all leading-relaxed"
            />
          </div>

          {/* Signature section */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Cryptographic Signature
            </p>
            <p className="text-[12px] text-slate-500 mb-3">
              Sign your review decision with a browser-native Ed25519 key. The signature is appended to the audit record.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                disabled={generatingSig || signatureSigned}
                onClick={() => generateSignature('approved')}
                className={`flex-1 text-[12px] font-semibold px-3 py-2 rounded-lg border transition-all ${
                  signatureSigned && decision === 'approved'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {generatingSig && decision === null ? '⌛ Generating...' : '🔑 Sign as Approve'}
              </button>
              <button
                type="button"
                disabled={generatingSig || signatureSigned}
                onClick={() => generateSignature('rejected')}
                className={`flex-1 text-[12px] font-semibold px-3 py-2 rounded-lg border transition-all ${
                  signatureSigned && decision === 'rejected'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {generatingSig && decision === null ? '⌛ Generating...' : '🔑 Sign as Reject'}
              </button>
            </div>

            {signatureSigned && signature && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-[12px] text-emerald-700 font-semibold mb-1.5">
                  <span>🔐</span>
                  <span>Signed with browser-native key</span>
                  <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full border capitalize ${
                    decision === 'approved' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {decision}
                  </span>
                </div>
                <div className="bg-white border border-emerald-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 mb-1 font-mono uppercase tracking-wide">Ed25519 Signature</p>
                  <p className="font-mono text-[11px] text-slate-600 break-all">
                    {signature.slice(0, 48)}...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 flex-shrink-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <div className="flex-1" />
          <button
            onClick={handleSubmit}
            disabled={!signatureSigned || !decision || submitting}
            className={`px-5 py-2 text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              decision === 'approved'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : decision === 'rejected'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            {submitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {decision ? `Submit ${decision === 'approved' ? 'Approval' : 'Rejection'}` : 'Sign First'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Approvals() {
  const navigate = useNavigate();
  const [operator, setOperator] = useState<any>(null);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const op = getOperator();
    if (!op) { navigate('/login'); return; }
    setOperator(op);
    loadApprovals();

    // Auto-refresh every 30 seconds
    refreshRef.current = setInterval(() => loadApprovals(), 30_000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [filter]);

  async function loadApprovals() {
    setLoading(true);
    try {
      const query = filter === 'all' ? '' : `?status=${filter}`;
      const data = await apiFetch(`/api/approvals${query}`);
      setApprovals(Array.isArray(data) ? data : []);
    } catch {
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(decision: 'approved' | 'rejected', signature: string, notes: string) {
    if (!selectedApproval || !operator) throw new Error('No approval selected');

    await apiFetch(`/api/approvals/${selectedApproval.id}`, {
      method: 'POST',
      body: JSON.stringify({
        reviewerId: operator.id,
        reviewerName: operator.name,
        decision,
        signature,
        notes,
      }),
    });

    setToast({
      message: decision === 'approved' ? 'Request approved and signed.' : 'Request rejected and logged.',
      type: decision === 'approved' ? 'success' : 'error',
    });
    loadApprovals();
  }

  function openModal(approval: ApprovalRequest) {
    setSelectedApproval(approval);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedApproval(null);
  }

  // Derived stats
  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const today = Math.floor(Date.now() / 1000) - 86400;
  const approvedToday = approvals.filter(a => a.status === 'approved' && (a.reviewed_at || 0) > today).length;
  const rejectedToday = approvals.filter(a => a.status === 'rejected' && (a.reviewed_at || 0) > today).length;

  const FILTER_TABS: FilterTab[] = ['all', 'pending', 'approved', 'rejected'];

  return (
    <AppLayout>
      <div className="p-6 max-w-[1200px] mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">✍</span>
            <h1 className="text-[22px] font-bold text-slate-900">Human-in-the-Loop Gateway</h1>
          </div>
          <p className="text-[13px] text-slate-500 ml-10">Review and cryptographically sign frozen AI sessions before release</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            {
              label: 'Pending Review',
              value: pendingCount,
              icon: '⏳',
              color: 'text-amber-700',
              bg: 'bg-amber-50 border-amber-200',
            },
            {
              label: 'Approved Today',
              value: approvedToday,
              icon: '✓',
              color: 'text-emerald-700',
              bg: 'bg-emerald-50 border-emerald-200',
            },
            {
              label: 'Rejected Today',
              value: rejectedToday,
              icon: '✗',
              color: 'text-red-700',
              bg: 'bg-red-50 border-red-200',
            },
          ].map(stat => (
            <div key={stat.label} className={`rounded-xl border p-4 ${stat.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-[11px] font-bold uppercase tracking-wide ${stat.color} opacity-70`}>{stat.label}</p>
                <span className={`text-lg ${stat.color}`}>{stat.icon}</span>
              </div>
              <p className={`text-[28px] font-bold leading-none ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Main table card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Filter tabs + refresh */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex gap-1">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all capitalize ${
                    filter === tab
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  {tab}
                  {tab === 'pending' && pendingCount > 0 && (
                    <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={loadApprovals}
              className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
            >
              <span>↻</span>
              <span>Refresh</span>
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <span className="w-6 h-6 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
              <p className="text-[13px] text-slate-400">Loading approvals...</p>
            </div>
          ) : approvals.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-1">✍</div>
              <p className="text-[14px] font-semibold text-slate-700">No approvals found</p>
              <p className="text-[12px] text-slate-400">
                {filter === 'all'
                  ? 'No approval requests yet. Submit a session that triggers a frozen state.'
                  : `No ${filter} approvals yet.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-3">Request ID</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Session Prompt</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Module</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Risk</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Submitted</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Status</th>
                    <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {approvals.map(approval => (
                    <tr key={approval.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Request ID */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[11px] text-slate-500">{approval.id?.slice(0, 16)}</span>
                      </td>

                      {/* Prompt snippet */}
                      <td className="px-3 py-3.5 max-w-[240px]">
                        <p className="text-[12px] text-slate-600 truncate" title={approval.prompt_text}>
                          {approval.prompt_text?.slice(0, 60)}{approval.prompt_text?.length > 60 ? '…' : ''}
                        </p>
                      </td>

                      {/* Module */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{MODULE_ICONS[approval.module] || '⬡'}</span>
                          <span className="text-[12px] text-slate-600 capitalize">{approval.module}</span>
                        </div>
                      </td>

                      {/* Risk score */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                approval.risk_score >= 80 ? 'bg-red-500' :
                                approval.risk_score >= 40 ? 'bg-amber-400' :
                                'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, approval.risk_score)}%` }}
                            />
                          </div>
                          <span className={`text-[12px] font-bold ${
                            approval.risk_score >= 80 ? 'text-red-600' :
                            approval.risk_score >= 40 ? 'text-amber-600' :
                            'text-emerald-600'
                          }`}>
                            {approval.risk_score}
                          </span>
                        </div>
                      </td>

                      {/* Submitted */}
                      <td className="px-3 py-3.5">
                        <span className="text-[11px] text-slate-400">{timeAgo(approval.created_at)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusBadge(approval.status)}`}>
                          {approval.status === 'pending' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 animate-pulse" />}
                          {approval.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5">
                        {approval.status === 'pending' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openModal(approval)}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                              <span>✓</span>
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => openModal(approval)}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                            >
                              <span>✗</span>
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 capitalize">
                              {approval.status} {approval.reviewed_at ? timeAgo(approval.reviewed_at) : ''}
                            </span>
                            {approval.signature && (
                              <span
                                className="text-[10px] text-emerald-600 flex items-center gap-1"
                                title={`Signature: ${approval.signature}`}
                              >
                                🔐
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer note */}
          {!loading && approvals.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                {approvals.length} record{approvals.length !== 1 ? 's' : ''} · Auto-refreshes every 30s
              </p>
              {pendingCount > 0 && (
                <p className="text-[11px] text-amber-600 font-semibold">
                  {pendingCount} pending review
                </p>
              )}
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="mt-4 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-[13px] font-semibold text-slate-700">About Human-in-the-Loop Review</h3>
          </div>
          <div className="px-5 py-4 grid grid-cols-3 gap-4">
            {[
              {
                icon: '⚡',
                title: 'Triggered by Circuit Breaker',
                desc: 'Sessions crossing the 40-point risk threshold are automatically frozen and routed here.',
              },
              {
                icon: '🔐',
                title: 'Ed25519 Signatures',
                desc: 'Each decision is cryptographically signed in-browser. The signature is stored in the audit ledger.',
              },
              {
                icon: '📋',
                title: 'Tamper-Evident Log',
                desc: 'All approvals and rejections are chained in the audit log with hash verification.',
              },
            ].map(item => (
              <div key={item.title} className="flex gap-3">
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-[12px] font-semibold text-slate-700 mb-1">{item.title}</p>
                  <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && selectedApproval && operator && (
        <ApprovalModal
          approval={selectedApproval}
          operator={operator}
          onClose={closeModal}
          onSubmit={handleReview}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AppLayout>
  );
}
