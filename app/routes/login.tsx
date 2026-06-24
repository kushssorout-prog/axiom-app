import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { setToken, setOperator, getToken, apiFetch } from '~/lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (token) navigate('/dashboard');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setOperator(data.operator);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Background grid subtle pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:48px_48px] opacity-40 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Top accent line */}
          <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-slate-800" />

          <div className="p-8">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner">
                <span className="text-white font-bold text-base tracking-tight">A</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 text-xl tracking-tight">ACCRNOVA</span>
                <span className="ml-2 text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200 align-middle">v2.0</span>
              </div>
            </div>

            {/* Headline */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to ACCRNOVA</h1>
              <p className="text-slate-500 text-sm mt-1">AI governance platform</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <span className="text-red-500 flex-shrink-0 mt-0.5">✕</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@firm.com"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            {/* Demo hint */}
            <div className="mt-5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Demo credentials:</span>{' '}
                admin@firm.com / axiom2026
              </p>
            </div>

            {/* Onboarding link */}
            <div className="mt-5 text-center">
              <Link
                to="/onboarding"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                New firm? Set up your account →
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-5">
          © 2026 ACCRNOVA AI Governance Platform · Enterprise Security
        </p>
      </div>
    </div>
  );
}
