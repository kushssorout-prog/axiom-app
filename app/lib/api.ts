// Client-side API helpers
const BASE = '';

export async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as any).error || 'Request failed');
  return data;
}

export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  return localStorage.getItem('axiom_token');
}

export function setToken(token: string) {
  localStorage.setItem('axiom_token', token);
}

export function clearToken() {
  localStorage.removeItem('axiom_token');
  localStorage.removeItem('axiom_operator');
}

export function getOperator(): any {
  if (typeof document === 'undefined') return null;
  const s = localStorage.getItem('axiom_operator');
  return s ? JSON.parse(s) : null;
}

export function setOperator(op: any) {
  localStorage.setItem('axiom_operator', JSON.stringify(op));
}

export async function authFetch(path: string, opts?: RequestInit) {
  const token = getToken();
  return apiFetch(path, { ...opts, headers: { Authorization: `Bearer ${token}`, ...opts?.headers } });
}

export function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(ts: number) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function riskColor(score: number) {
  if (score >= 80) return 'text-red-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-emerald-600';
}

export function riskBg(score: number) {
  if (score >= 80) return 'bg-red-50 text-red-700 border-red-200';
  if (score >= 40) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

export function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blocked: 'bg-red-50 text-red-700 border-red-200',
    frozen: 'bg-amber-50 text-amber-700 border-amber-200',
    pending: 'bg-blue-50 text-blue-700 border-blue-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    flagged: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
}
