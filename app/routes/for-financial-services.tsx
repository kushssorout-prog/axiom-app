import type { MetaFunction } from 'react-router';
import { Link } from 'react-router';

export const meta: MetaFunction = () => [
  { title: 'AI Governance for Financial Services | ACCRNOVA' },
  {
    name: 'description',
    content:
      'AI governance built for regulated financial markets. When the SEC asks for your AI governance documentation, ACCRNOVA provides it. Audit-ready compliance for banks, asset managers, and brokers.',
  },
  { property: 'og:title', content: 'AI Governance for Financial Services | ACCRNOVA' },
  {
    property: 'og:description',
    content: 'Regulators are examining AI use at financial services firms. ACCRNOVA governs every AI session with cryptographic audit trails, sanctions screening, and market abuse prevention.',
  },
];

const VALUES = [
  {
    icon: '🌍',
    title: 'Sanctions Screening',
    desc: 'Every AI session is evaluated against current OFAC, EU, and UN sanctions lists. High-risk entity references are intercepted in real-time before appearing in AI-generated output.',
  },
  {
    icon: '📈',
    title: 'Market Abuse Prevention',
    desc: "ACCRNOVA's Geo Risk Engine monitors AI sessions for MAR and MiFID II trigger patterns. Front-running signals, insider information exposure, and market manipulation indicators are flagged instantly.",
  },
  {
    icon: '📋',
    title: 'Audit-Ready Compliance',
    desc: "SEC Rule 17a-4, FINRA supervisory obligations, and MiFID II record-keeping — all satisfied by ACCRNOVA's cryptographic audit ledger. Immutable, timestamped, and discoverable.",
  },
];

export default function ForFinancialServices() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
            <span className="font-bold text-slate-900 tracking-tight text-[15px]">ACCRNOVA</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/for-law-firms" className="text-sm text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Law Firms</Link>
            <Link to="/roi-calculator" className="text-sm text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">ROI Calculator</Link>
            <a
              href="mailto:finance@accrnova.app"
              className="bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Request Demo
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#0a1628] to-[#0f2040] text-white pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-sm font-semibold px-4 py-2 rounded-full mb-8">
            <span>📈</span>
            <span>Built for Regulated Markets</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">
            AI governance built for<br />
            <span className="text-blue-400">regulated financial markets.</span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-100/80 max-w-2xl mx-auto leading-relaxed mb-10">
            Regulators are examining AI use at financial services firms. When the SEC, FCA, or ESMA asks for your
            AI governance documentation — ACCRNOVA provides it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:finance@accrnova.app?subject=Compliance Assessment Request"
              className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold px-8 py-4 rounded-xl text-base transition-colors"
            >
              Request compliance assessment →
            </a>
            <Link
              to="/free-assessment"
              className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors"
            >
              Free risk assessment
            </Link>
          </div>
          <p className="text-xs text-blue-200/40 mt-6">No credit card required · Speak with a financial governance specialist</p>
        </div>
      </section>

      {/* Compliance strip */}
      <div className="bg-[#0a1628] border-y border-blue-900/50 py-4 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 text-xs text-blue-300/70 font-semibold uppercase tracking-widest">
          <span>SEC Rule 17a-4</span>
          <span className="hidden sm:block text-blue-800">·</span>
          <span>MiFID II Art. 16</span>
          <span className="hidden sm:block text-blue-800">·</span>
          <span>FINRA 4511</span>
          <span className="hidden sm:block text-blue-800">·</span>
          <span>OFAC Sanctions</span>
          <span className="hidden sm:block text-blue-800">·</span>
          <span>MAR</span>
        </div>
      </div>

      {/* Regulatory Context */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border-l-4 border-blue-600 rounded-r-2xl p-8 shadow-sm mb-8">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Regulatory Landscape</p>
            <blockquote className="text-xl sm:text-2xl font-semibold text-slate-900 leading-relaxed mb-6">
              "Regulators are examining AI use at financial services firms. When the SEC asks for your AI governance documentation, ACCRNOVA provides it."
            </blockquote>
            <p className="text-base text-slate-600 leading-relaxed">
              The SEC's 2024 AI guidance, ESMA's MiFID II supervisory expectations, and the FCA's AI principles all
              require firms to demonstrate that AI systems used in client-facing or investment contexts are subject to
              documented governance controls. ACCRNOVA creates that documentation automatically — at the session level,
              in real-time, with cryptographic integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { stat: 'Day 1', desc: 'SEC AI guidance requires governance documentation from Day 1 of deployment' },
              { stat: '$6.4M', desc: 'average regulatory fine for inadequate AI supervision controls (2024)' },
              { stat: '94%', desc: 'of firms lack the documentation to respond to an AI-related regulator inquiry' },
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
              Compliance for every layer of your AI stack
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              ACCRNOVA is a governance layer — not a replacement. It wraps your existing AI tools with real-time oversight.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="border border-slate-200 rounded-2xl p-7 hover:shadow-md hover:border-blue-200 transition-all">
                <div className="w-12 h-12 bg-[#0a1628] rounded-xl flex items-center justify-center text-2xl mb-5">
                  {v.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{v.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 px-6 bg-[#0a1628] text-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">ACCRNOVA for financial services</h2>
            <p className="text-blue-300/70 text-lg">Across every regulated activity where AI is now deployed</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: '🏦', title: 'Investment Banks', desc: 'Research generation, client communications, deal documentation — governed in real-time with MAR and MiFID II controls.' },
              { icon: '📊', title: 'Asset Managers', desc: 'Investment memos, fund analysis, and investor reporting — with conflict-of-interest and MNPI detection at every session.' },
              { icon: '🏢', title: 'Broker-Dealers', desc: 'Suitability assessments, order flow analysis, and client advisory — with FINRA supervisory obligations built in.' },
              { icon: '🌍', title: 'Regional & Global Banks', desc: 'Cross-border AI governance with jurisdiction-aware rules for GDPR, DORA, CRD, and local regulatory frameworks.' },
            ].map(u => (
              <div key={u.title} className="flex gap-4 p-5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/8 transition-colors">
                <span className="text-3xl flex-shrink-0">{u.icon}</span>
                <div>
                  <p className="font-bold text-white mb-1">{u.title}</p>
                  <p className="text-sm text-blue-200/60 leading-relaxed">{u.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">Pricing for financial services</h2>
          <p className="text-lg text-slate-500 mb-12">
            One regulatory fine covers 15 years of ACCRNOVA. Enterprise SLAs available.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Core */}
            <div className="border border-slate-200 rounded-2xl p-7 text-left">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ACCRNOVA Core + Finance</p>
              <p className="text-3xl font-black text-slate-900 mb-1">$4,000<span className="text-lg text-slate-400 font-normal">/mo</span></p>
              <p className="text-sm text-slate-500 mb-6">Up to 50 professionals</p>
              <div className="space-y-2.5">
                {[
                  'Streaming Circuit Breaker',
                  'OFAC/UN sanctions screening',
                  'MAR pattern detection',
                  'MiFID II record-keeping',
                  'SEC 17a-4 audit trail',
                  'Unlimited AI sessions',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-emerald-500 font-bold">✓</span>{f}
                  </div>
                ))}
              </div>
            </div>

            {/* Enterprise */}
            <div className="border-2 border-slate-900 rounded-2xl p-7 text-left bg-slate-900 text-white relative">
              <span className="absolute -top-3 left-6 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">Enterprise</span>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ACCRNOVA Enterprise</p>
              <p className="text-3xl font-black text-white mb-1">Custom</p>
              <p className="text-sm text-slate-400 mb-6">200+ professionals</p>
              <div className="space-y-2.5">
                {[
                  'Everything in Core + Finance',
                  'Multi-jurisdiction rulesets',
                  'Custom compliance modules',
                  'DORA operational resilience',
                  'Dedicated compliance team',
                  'White-glove onboarding',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="text-blue-400 font-bold">✓</span>{f}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <a
            href="mailto:finance@accrnova.app?subject=Financial Services Compliance Assessment"
            className="inline-flex items-center justify-center gap-2 mt-8 bg-slate-900 hover:bg-slate-700 text-white font-bold px-8 py-4 rounded-xl text-base transition-colors"
          >
            Request compliance assessment →
          </a>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 bg-slate-50 border-t border-slate-200">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-4">
            The regulator will ask.<br />Will you have an answer?
          </h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            AI governance documentation is now a regulatory expectation, not an optional best practice.
            ACCRNOVA ensures you can demonstrate oversight, supervision, and control at every AI interaction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:finance@accrnova.app?subject=Compliance Assessment Request"
              className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-bold px-8 py-4 rounded-xl text-base transition-colors"
            >
              Request compliance assessment →
            </a>
            <Link
              to="/roi-calculator"
              className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 font-semibold px-8 py-4 rounded-xl text-base transition-colors"
            >
              Calculate your risk exposure
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-white font-bold text-xs">A</div>
            <span className="text-sm font-semibold text-white">ACCRNOVA</span>
            <span className="text-xs">— AI Governance Platform</span>
          </div>
          <div className="flex gap-6 text-xs">
            <Link to="/for-law-firms" className="hover:text-white transition-colors">Law Firms</Link>
            <Link to="/roi-calculator" className="hover:text-white transition-colors">ROI Calculator</Link>
            <Link to="/free-assessment" className="hover:text-white transition-colors">Free Assessment</Link>
            <Link to="/login" className="hover:text-white transition-colors">Platform Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
