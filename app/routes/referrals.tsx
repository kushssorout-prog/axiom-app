import { useState, useEffect } from 'react';
import { AppLayout } from '~/components/AppLayout';
import { authFetch, getOperator } from '~/lib/api';

interface ReferralData {
  code: string;
  referralCode: string;
  total: number;
  converted: number;
  pending: number;
}

export default function Referrals() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const operator = getOperator();

  const loadReferral = async () => {
    if (!operator?.id) return;
    try {
      setLoading(true);
      const res = await authFetch(`/api/referrals/${operator.id}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReferral(); }, []);

  const generateCode = async () => {
    if (!operator?.id) return;
    setGenerating(true);
    try {
      const res = await authFetch('/api/referrals/create', {
        method: 'POST',
        body: JSON.stringify({ operatorId: operator.id }),
      });
      setData(res);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const referralCode = data?.code || data?.referralCode || '';
  const referralLink = referralCode ? `https://accrnova.app/?ref=${referralCode}` : '';

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const linkedInUrl = referralLink
    ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}&title=${encodeURIComponent('Try ACCRNOVA — AI governance for law firms')}`
    : '#';

  const mailtoUrl = referralLink
    ? `mailto:?subject=${encodeURIComponent('ACCRNOVA — AI Governance for Law Firms')}&body=${encodeURIComponent(
        `Hi,\n\nI've been using ACCRNOVA for AI governance and compliance. Thought you might find it useful.\n\nSign up here: ${referralLink}\n\nBest`
      )}`
    : '#';

  const STEPS = [
    {
      num: 1,
      title: 'Share your unique link',
      desc: 'Send your referral link to law firms, legal ops teams, or compliance leads looking to govern their AI use.',
    },
    {
      num: 2,
      title: 'Referred firm becomes a paying client',
      desc: 'When the firm signs up through your link and converts to a paid ACCRNOVA plan, your reward is triggered automatically.',
    },
    {
      num: 3,
      title: 'You receive 1 month free',
      desc: 'One month is credited to your current ACCRNOVA plan — no redemption needed, no cap on referrals.',
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Refer & Earn</h1>
          <p className="text-slate-500 text-sm mt-1">Earn 1 month free for every firm you refer</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">Loading your referral details…</div>
        ) : !data || !referralCode ? (
          /* No code yet */
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="text-5xl mb-4">🎁</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Get your referral link</h2>
            <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto">
              Generate your unique link and start sharing. Earn 1 free month for every firm that becomes a paying client.
            </p>
            <button
              onClick={generateCode}
              disabled={generating}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {generating ? 'Generating…' : 'Generate my referral link →'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Referral Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Your Referral Link</h2>

              {/* Link display */}
              <div className="flex items-center gap-2 mb-5">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-slate-800 overflow-x-auto whitespace-nowrap">
                  {referralLink}
                </div>
                <button
                  onClick={copyLink}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {copied ? 'Copied! ✓' : '⎘ Copy'}
                </button>
              </div>

              {/* Share buttons */}
              <div className="flex flex-wrap gap-2">
                <a
                  href={linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#0077b5] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#006097] transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn →
                </a>
                <a
                  href={mailtoUrl}
                  className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  <span>✉</span> Email →
                </a>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  <span>🔗</span> Copy Link
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Referred', value: data.total ?? 0, icon: '👥', color: 'bg-blue-50 border-blue-200' },
                { label: 'Converted', value: data.converted ?? 0, icon: '✅', color: 'bg-emerald-50 border-emerald-200' },
                { label: 'Pending', value: data.pending ?? 0, icon: '⏳', color: 'bg-amber-50 border-amber-200' },
              ].map(stat => (
                <div key={stat.label} className={`${stat.color} border rounded-xl p-5`}>
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-3xl font-extrabold text-slate-900">{stat.value}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Reward Info */}
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white text-lg flex-shrink-0">🎉</div>
              <div>
                <h3 className="font-bold text-teal-900 mb-1">Unlimited rewards, no cap</h3>
                <p className="text-sm text-teal-800 leading-relaxed">
                  For every firm you refer that becomes a paying ACCRNOVA client, you receive <strong>1 month free</strong> on
                  your current plan. No cap on referrals — refer 10 firms, get 10 months free.
                </p>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-5">How it works</h2>
              <div className="space-y-5">
                {STEPS.map((step, i) => (
                  <div key={step.num} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      {step.num}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 text-sm">{step.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="absolute translate-x-[14px] translate-y-[40px] w-0.5 h-5 bg-slate-200" style={{ position: 'relative', left: -212, top: 32, width: 2, height: 20, background: '#e2e8f0', flexShrink: 0 }}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
