import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { apiFetch, setToken, setOperator } from '~/lib/api';

type Step = 1 | 2 | 3;

interface FirmData {
  firmName: string;
  industry: string;
  firmSize: string;
}

interface AdminData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const INDUSTRIES = [
  { value: 'law_firm', label: 'Law Firm' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'enterprise_legal', label: 'Enterprise Legal' },
  { value: 'other', label: 'Other' },
];

const FIRM_SIZES = [
  { value: 'under_20', label: 'Under 20' },
  { value: '20_100', label: '20–100' },
  { value: '100_500', label: '100–500' },
  { value: '500_plus', label: '500+' },
];

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'Firm Setup' },
    { n: 2, label: 'Admin Account' },
    { n: 3, label: 'Confirmation' },
  ];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              current === s.n
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : current > s.n
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}>
              {current > s.n ? '✓' : s.n}
            </div>
            <span className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${
              current === s.n ? 'text-blue-600' : current > s.n ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px flex-1 mx-2 mb-4 transition-all ${current > s.n ? 'bg-slate-900' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [firm, setFirm] = useState<FirmData>({
    firmName: '',
    industry: '',
    firmSize: '',
  });

  const [admin, setAdmin] = useState<AdminData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!firm.firmName.trim()) { setError('Please enter your firm name.'); return; }
    if (!firm.industry) { setError('Please select an industry.'); return; }
    if (!firm.firmSize) { setError('Please select firm size.'); return; }
    setStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!admin.fullName.trim()) { setError('Please enter your full name.'); return; }
    if (!admin.email.trim()) { setError('Please enter your work email.'); return; }
    if (admin.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (admin.password !== admin.confirmPassword) { setError('Passwords do not match.'); return; }
    setStep(3);
  };

  const handleLaunch = async () => {
    setError('');
    setLoading(true);
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: admin.fullName,
          email: admin.email,
          password: admin.password,
          role: 'admin',
          department: firm.firmName,
        }),
      });
      // Auto-login
      const loginData = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: admin.email, password: admin.password }),
      });
      setToken(loginData.token);
      setOperator(loginData.operator);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Setup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const industryLabel = INDUSTRIES.find(i => i.value === firm.industry)?.label || firm.industry;
  const sizeLabel = FIRM_SIZES.find(s => s.value === firm.firmSize)?.label || firm.firmSize;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-lg">
        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-slate-800" />

          <div className="p-8">
            {/* Logo */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                  <span className="text-white font-bold text-base">A</span>
                </div>
                <span className="font-bold text-slate-900 text-xl tracking-tight">ACCRNOVA</span>
              </div>
              <Link to="/login" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                ← Back to login
              </Link>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Set up your firm</h1>
              <p className="text-slate-500 text-sm mt-1">Get started with AI governance in minutes</p>
            </div>

            {/* Step indicator */}
            <StepIndicator current={step} />

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <span className="text-red-500 flex-shrink-0 mt-0.5">✕</span>
                <span>{error}</span>
              </div>
            )}

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <form onSubmit={handleStep1} className="space-y-5">
                <div className="pb-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Step 1 — Firm Setup</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Firm Name
                  </label>
                  <input
                    type="text"
                    value={firm.firmName}
                    onChange={e => setFirm(f => ({ ...f, firmName: e.target.value }))}
                    placeholder="e.g. Aldridge & Partners LLP"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Industry
                  </label>
                  <select
                    value={firm.industry}
                    onChange={e => setFirm(f => ({ ...f, industry: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select industry…</option>
                    {INDUSTRIES.map(i => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Number of Attorneys / Professionals
                  </label>
                  <select
                    value={firm.firmSize}
                    onChange={e => setFirm(f => ({ ...f, firmSize: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select firm size…</option>
                    {FIRM_SIZES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm"
                  >
                    Continue →
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <form onSubmit={handleStep2} className="space-y-5">
                <div className="pb-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Step 2 — Admin Account</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={admin.fullName}
                    onChange={e => setAdmin(a => ({ ...a, fullName: e.target.value }))}
                    placeholder="Jane Smith"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={admin.email}
                    onChange={e => setAdmin(a => ({ ...a, email: e.target.value }))}
                    placeholder="jane@firm.com"
                    required
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                      Password
                    </label>
                    <input
                      type="password"
                      value={admin.password}
                      onChange={e => setAdmin(a => ({ ...a, password: e.target.value }))}
                      placeholder="••••••••"
                      required
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                      Confirm
                    </label>
                    <input
                      type="password"
                      value={admin.confirmPassword}
                      onChange={e => setAdmin(a => ({ ...a, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                      required
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-5 h-5 bg-blue-100 border border-blue-200 rounded flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 text-xs">👑</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Role: Admin</span> — Full platform access, user management, compliance configuration
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); }}
                    className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors px-4 py-2"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm"
                  >
                    Continue →
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="pb-3 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Step 3 — Confirmation</p>
                </div>

                {/* Summary */}
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Firm Details</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Firm Name</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{firm.firmName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Industry</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{industryLabel}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Firm Size</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{sizeLabel} professionals</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Admin Account</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Full Name</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{admin.fullName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Email</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{admin.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Role</p>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full mt-0.5">
                          👑 Admin
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Included features */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-2">What's included</p>
                  <ul className="space-y-1.5">
                    {['Circuit Breaker AI governance', 'Energy-Based Model risk scoring', 'Human-in-the-loop approvals', 'Tamper-evident audit ledger', 'ACCRNOVA-Lex vector boundaries'].map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-emerald-800">
                        <span className="text-emerald-500 font-bold">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep(2); setError(''); }}
                    className="text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors px-4 py-2"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleLaunch}
                    disabled={loading}
                    className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Launching…
                      </>
                    ) : 'Launch Your ACCRNOVA Platform →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          © 2026 ACCRNOVA AI Governance Platform · Enterprise Security
        </p>
      </div>
    </div>
  );
}
