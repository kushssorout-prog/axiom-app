import type { MetaFunction } from 'react-router';
import { Link } from 'react-router';

export const meta: MetaFunction = () => [
  { title: 'AI Governance for Law Firms | Axiom' },
  {
    name: 'description',
    content:
      'Axiom protects law firms from AI malpractice liability. Streaming Circuit Breaker, cryptographic audit trails, and privilege doctrine enforcement. Try free.',
  },
  { property: 'og:title', content: 'AI Governance for Law Firms | Axiom' },
  {
    property: 'og:description',
    content: 'Axiom protects law firms from AI malpractice liability. Streaming Circuit Breaker, cryptographic audit trails, and privilege doctrine enforcement.',
  },
];

const VALUES = [
  {
    icon: '🔐',
    title: 'Privilege Protection',
    desc: 'Every AI session is evaluated against your jurisdiction\'s privilege doctrine. Attorney-client communications flagged for AI exposure are intercepted before they reach unprotected systems.',
  },
  {
    icon: '📜',
    title: 'Audit Trail for Regulators',
    desc: 'Cryptographically signed, tamper-evident records of every AI interaction. When a disciplinary board or malpractice insurer asks what your attorneys did with AI — you can answer precisely.',
  },
  {
    icon: '👤',
    title: 'Partner-Level Control',
    desc: 'Managing partners set firm-wide AI governance policies. Associates operate within those boundaries automatically. Human-in-the-loop approvals for high-stakes outputs.',
  },
];

export default function ForLawFirms() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
            <span className="font-bold text-slate-900 tracking-tight text-[15px]">Axiom</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/for-financial-services" className="text-sm text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Financial Services</Link>
            <Link to="/roi-calculator" className="text-sm text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">ROI Calculator</Link>
            <a
              href="mailto:legal@useaxiom.io"
              className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Request Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-sm font-semibold px-4 py-2 rounded-full mb-8">
            <span>⚖️</span>
            <span>Built for the Legal Profession</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">
            The AI compliance layer<br />
            for law firms.<br />
            <span className="text-blue-400">Finally.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
            Every AI session your attorneys run is a potential malpractice liability. Axiom governs them
            <strong className="text-white"> deterministically</strong> — not probabilistically.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:legal@useaxiom.io?subject=AI Risk Assessment Request"
              className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold px-8 py-4 rounded-xl text-base transition-colors"
            >
              Request a 20-minute AI risk assessment →
            </a>
            <Link
              to="/free-assessment"
              className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors"
            >
              Free online assessment
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-6">No credit card required · Results in 20 minutes · Speak with a governance specialist</p>
        </div>
      </section>

      {/* Social proof strip */}
      <div className="bg-slate-800 border-y border-slate-700 py-4 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 text-xs text-slate-400 font-semibold uppercase tracking-widest">
          <span>ABA Model Rules Compliant</span>
          <span className="hidden sm:block text-slate-600">·</span>
          <span>SOC 2 Type II</span>
          <span className="hidden sm:block text-slate-600">·</span>
          <span>GDPR Ready</span>
          <span className="hidden sm:block text-slate-600">·</span>
          <span>End-to-End Encrypted</span>
        </div>
      </div>

      {/* ABA Context */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border-l-4 border-slate-900 rounded-r-2xl p-8 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Professional Responsibility Context</p>
            <blockquote className="text-xl sm:text-2xl font-semibold text-slate-900 leading-relaxed mb-6">
              "The ABA has been clear: lawyers using AI bear professional responsibility for the output."
            </blockquote>
            <p className="text-base text-slate-600 leading-relaxed">
              ABA Formal Opinion 512 (2023) and subsequent bar guidance confirm that attorneys cannot delegate
              professional judgment to AI systems. The responsibility — and the liability — remains with the lawyer.
              Axiom creates the audit trail that demonstrates that responsibility was exercised with appropriate
              diligence and oversight.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {[
              { stat: '78%', desc: 'of Am Law 200 firms now use Gen-AI tools regularly' },
              { stat: '$4.2M', desc: 'average malpractice claim cost in AI-related incidents (est.)' },
              { stat: '0', desc: 'firms with documented AI governance responded to bar complaints' },
            ].map(({ stat, desc }) => (
              <div key={stat} className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                <p className="text-3xl font-black text-slate-900 mb-1">{stat}</p>
                <p className="text-xs text-slate-500 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 Core Values */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              Governance built for how law firms work
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Axiom integrates with your existing AI tools — it doesn't replace them. It governs them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="border border-slate-200 rounded-2xl p-7 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-2xl mb-5">
                  {v.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{v.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">How Axiom works for law firms</h2>
            <p className="text-slate-400 text-lg">From prompt to protected output in milliseconds</p>
          </div>
          <div className="space-y-4">
            {[
              { step: '01', title: 'Attorney initiates AI session', desc: 'Axiom captures the session context, attorney credentials, and matter classification.' },
              { step: '02', title: 'Streaming Circuit Breaker evaluates in real-time', desc: 'Every token of AI output is evaluated against your firm\'s compliance rules as it streams. Not after — during.' },
              { step: '03', title: 'Privilege & compliance checks fire automatically', desc: 'PII detection, privilege flags, jurisdiction checks, and output quality gates run simultaneously without adding latency.' },
              { step: '04', title: 'Cryptographic record committed to audit ledger', desc: 'A tamper-evident, timestamped record of every session is committed to your audit ledger. Immutable. Discoverable if needed.' },
              { step: '05', title: 'Partner review for flagged sessions', desc: 'High-risk outputs are escalated for human review before reaching the attorney. Human-in-the-loop governance, not post-hoc review.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5 p-5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 transition-colors">
                <span className="text-2xl font-black text-blue-400 tabular-nums flex-shrink-0 w-10">{step}</span>
                <div>
                  <p className="font-bold text-white mb-1">{title}</p>
                  <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Simple, predictable pricing</h2>
          <p className="text-lg text-slate-500 mb-12">
            One malpractice claim costs more than Axiom for a decade. That's the ROI.
          </p>
          <div className="border-2 border-slate-900 rounded-2xl p-8 text-left">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Axiom for Law Firms</p>
                <p className="text-4xl font-black text-slate-900">$3,000<span className="text-xl text-slate-400 font-normal">/mo</span></p>
                <p className="text-sm text-slate-500 mt-1">Starting price · scales with firm size</p>
              </div>
              <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full">Most Popular</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {[
                'Streaming Circuit Breaker',
                'Cryptographic audit ledger',
                'Privilege doctrine enforcement',
                'ABA compliance mapping',
                'Partner-level access controls',
                'Human-in-the-loop approvals',
                'Unlimited AI sessions',
                'Dedicated onboarding',
              ].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="text-emerald-500 font-bold">✓</span>
                  {f}
                </div>
              ))}
            </div>
            <a
              href="mailto:legal@useaxiom.io?subject=Law Firm Pricing Inquiry"
              className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-700 text-white font-bold py-4 rounded-xl text-base transition-colors"
            >
              Request a 20-minute AI risk assessment for your firm →
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Enterprise pricing available for 50+ attorney firms · Custom compliance modules · Multi-jurisdiction support
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-slate-50 border-t border-slate-200">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-4">
            Your firm is already using AI.<br />Is it governed?
          </h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            If an attorney at your firm made an AI-assisted error today, could you demonstrate the oversight process
            that was in place? If not — Axiom fixes that in one afternoon.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:legal@useaxiom.io?subject=AI Risk Assessment Request"
              className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-bold px-8 py-4 rounded-xl text-base transition-colors"
            >
              Request a 20-minute AI risk assessment →
            </a>
            <Link
              to="/roi-calculator"
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 font-semibold px-8 py-4 rounded-xl text-base transition-colors"
            >
              Calculate your ROI
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-white font-bold text-xs">A</div>
            <span className="text-sm font-semibold text-white">Axiom</span>
            <span className="text-xs">— AI Governance Platform</span>
          </div>
          <div className="flex gap-6 text-xs">
            <Link to="/for-financial-services" className="hover:text-white transition-colors">Financial Services</Link>
            <Link to="/roi-calculator" className="hover:text-white transition-colors">ROI Calculator</Link>
            <Link to="/free-assessment" className="hover:text-white transition-colors">Free Assessment</Link>
            <Link to="/login" className="hover:text-white transition-colors">Platform Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
