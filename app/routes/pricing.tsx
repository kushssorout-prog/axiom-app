import { useState } from 'react';
import { Link } from 'react-router';

const PLANS = [
  {
    name: 'ACCRNOVA Core',
    price: 3000,
    cta: 'Get Started',
    ctaStyle: 'bg-slate-900 hover:bg-slate-800 text-white',
    badge: null,
    features: [
      'AI Session Circuit Breaker',
      'Audit Ledger (tamper-evident)',
      'Human-in-the-loop approvals',
      'Operator access & scorecard',
      'ACCRNOVA-Lex vector boundaries',
      'Canonical Terminology Engine',
      'Regulatory Reporter',
      'Up to 5 operators',
    ],
  },
  {
    name: 'ACCRNOVA Legal',
    price: 2000,
    cta: 'Add to Core',
    ctaStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
    badge: 'Popular',
    features: [
      'Legal AI session governance',
      'ABA Model Rules alignment',
      'Attorney-client privilege guards',
      'Legal terminology injection',
      'Contract review routing',
      'Legal research model routing',
      'Privilege breach alerting',
      'Matter-level audit trails',
    ],
  },
  {
    name: 'ACCRNOVA Intelligence',
    price: 1500,
    cta: 'Add to Core',
    ctaStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
    badge: null,
    features: [
      'Cost-optimising model router',
      'V-JEPA inference integration',
      'Kinetic FLNW robotics module',
      'Multi-model session routing',
      'Scarcity ledger attribution',
      'AI provider cost dashboard',
      'Batch session analysis',
      'Advanced risk scoring',
    ],
  },
  {
    name: 'ACCRNOVA Pricing',
    price: 1000,
    cta: 'Add to Core',
    ctaStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
    badge: null,
    features: [
      'Manifold arbitrage engine',
      'Financial risk governance',
      'Delta-Governor scarcity ledger',
      'Transaction energy scoring',
      'Counterparty tier analysis',
      'Financial audit trails',
      'Regulatory finance reports',
      'Liquidity risk monitoring',
    ],
  },
];

const FAQS = [
  {
    q: 'How does billing work?',
    a: 'All plans are billed monthly. You can cancel or change plans at any time. Usage is metered per AI session processed through the circuit breaker.',
  },
  {
    q: 'Can I add modules to an existing subscription?',
    a: 'Yes. ACCRNOVA Legal, ACCRNOVA Intelligence, and ACCRNOVA Pricing are add-ons to ACCRNOVA Core. You need at least one Core subscription to activate add-on modules.',
  },
  {
    q: 'Is there a free trial?',
    a: 'We offer a 14-day pilot for enterprise customers. Reach out to hello@accrnova.app to discuss your specific needs and arrange a pilot.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit cards via Stripe, as well as bank transfer for annual enterprise contracts. Contact us at hello@accrnova.app for invoicing options.',
  },
];

export default function PricingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPlan, setModalPlan] = useState('');
  const [openFaqs, setOpenFaqs] = useState<number[]>([]);

  const openModal = (planName: string) => {
    setModalPlan(planName);
    setModalOpen(true);
  };

  const toggleFaq = (i: number) => {
    setOpenFaqs(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
            <span className="font-bold text-slate-900 tracking-tight text-[15px]">ACCRNOVA</span>
          </div>
          <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1.5 transition-colors">
            ← Back to ACCRNOVA
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-black text-slate-900 mb-3">Choose your plan</h1>
          <p className="text-lg text-slate-500">Start with Core. Expand as you grow.</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-16">
          {PLANS.map(plan => (
            <div key={plan.name} className={`bg-white rounded-2xl border-2 p-6 flex flex-col relative transition-shadow hover:shadow-lg ${
              plan.badge ? 'border-blue-500' : 'border-slate-200'
            }`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900">${plan.price.toLocaleString()}</span>
                  <span className="text-sm text-slate-400">/mo</span>
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => openModal(plan.name)}
                className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${plan.ctaStyle}`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div className="bg-slate-900 text-white rounded-2xl p-8 text-center mb-16">
          <h2 className="text-xl font-bold mb-2">Enterprise & custom deployment</h2>
          <p className="text-slate-400 text-sm mb-5">
            Need on-premise deployment, custom SLAs, white-labelling, or volume pricing? Let's talk.
          </p>
          <a
            href="mailto:hello@accrnova.app"
            className="inline-flex items-center gap-2 bg-white text-slate-900 font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Talk to us →
          </a>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900 text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-800">{faq.q}</span>
                  <span className={`text-slate-400 transition-transform text-lg ${openFaqs.includes(i) ? 'rotate-45' : ''}`}>+</span>
                </button>
                {openFaqs.includes(i) && (
                  <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stripe Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#635bff] rounded-xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Connect Stripe</h3>
                  <p className="text-xs text-slate-500">{modalPlan}</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>

            <p className="text-sm text-slate-600 mb-5">Connect your Stripe account to activate payments for your subscription.</p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3">Setup Steps</p>
              <ol className="space-y-2.5">
                {[
                  'Go to stripe.com and sign in or create an account',
                  'Navigate to Developers → API keys',
                  'Copy your secret key (starts with sk_live_…)',
                  'Add it in ACCRNOVA Settings → Integrations → Stripe',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-sm text-blue-800 font-medium">Manual setup available</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Email us at{' '}
                <a href="mailto:hello@accrnova.app" className="underline font-semibold">hello@accrnova.app</a>
                {' '}to set up your subscription manually. We'll respond within one business day.
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href={`mailto:hello@accrnova.app?subject=ACCRNOVA subscription - ${encodeURIComponent(modalPlan)}`}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl text-center transition-colors"
              >
                Email us to subscribe
              </a>
              <button onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
