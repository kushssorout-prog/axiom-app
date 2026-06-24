import { useState } from 'react';
import type { MetaFunction } from 'react-router';
import { Link } from 'react-router';

export const meta: MetaFunction = () => [
  { title: 'Free AI Governance Risk Assessment | ACCRNOVA' },
  {
    name: 'description',
    content:
      'Get your free AI governance risk assessment in 5 questions. Instantly receive a personalised risk report with estimated liability exposure and recommended governance actions.',
  },
];

const AI_TOOLS = ['ChatGPT', 'Claude', 'Copilot', 'Gemini', 'Other'];

type Answers = {
  userCount: string;
  tools: string[];
  reviewProcess: string;
  hadIncident: string;
  email: string;
  firmName: string;
};

function calcScore(a: Answers): { score: number; level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'; pct: number } {
  let score = 0;
  if (a.userCount === '10-50')   score += 1;
  if (a.userCount === '50-200')  score += 2;
  if (a.userCount === '200+')    score += 3;

  score += Math.min(a.tools.length, 3);

  if (a.reviewProcess === 'Informal') score += 2;
  if (a.reviewProcess === 'No')       score += 4;

  if (a.hadIncident === 'Yes')      score += 4;
  if (a.hadIncident === 'Not sure') score += 2;

  const pct = Math.round((score / 14) * 100);
  const level = score >= 11 ? 'CRITICAL' : score >= 7 ? 'HIGH' : score >= 4 ? 'MODERATE' : 'LOW';
  return { score, level, pct };
}

function calcExposure(a: Answers): { low: number; high: number } {
  const users = a.userCount === 'Under 10' ? 8 : a.userCount === '10-50' ? 30 : a.userCount === '50-200' ? 100 : 250;
  const uncaught = a.reviewProcess === 'Yes' ? 0.05 : a.reviewProcess === 'Informal' ? 0.15 : 0.35;
  const annual = users * 20 * 52 * 0.003 * uncaught * 1_000_000;
  const plus  = annual * (a.hadIncident === 'Yes' ? 1.8 : a.hadIncident === 'Not sure' ? 1.3 : 1);
  return { low: Math.round(annual / 1000) * 1000, high: Math.round((plus * 2) / 100000) * 100000 };
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(n / 1000).toLocaleString()}K`;
}

type Finding = { status: 'ok' | 'warn' | 'crit'; title: string; detail: string; risk: string };

function buildFindings(a: Answers): Finding[] {
  const findings: Finding[] = [];

  if (a.reviewProcess === 'No') {
    findings.push({ status: 'crit', title: 'No formal AI review process detected', detail: 'Risk Level: CRITICAL — liability exposure without documented oversight.', risk: 'CRITICAL' });
  } else if (a.reviewProcess === 'Informal') {
    findings.push({ status: 'warn', title: 'Informal AI review process only', detail: 'Risk Level: HIGH — undocumented processes cannot defend against malpractice claims.', risk: 'HIGH' });
  } else {
    findings.push({ status: 'ok', title: 'Formal AI review process in place', detail: 'Recommendation: Ensure processes are cryptographically logged and auditable.', risk: 'LOW' });
  }

  findings.push({ status: 'crit', title: 'No cryptographic audit trail detected', detail: 'Risk Level: CRITICAL — cannot demonstrate compliance in discovery or regulatory inquiry.', risk: 'CRITICAL' });

  const toolCount = a.tools.length;
  if (toolCount >= 3) {
    findings.push({ status: 'warn', title: `${toolCount} AI tools in use simultaneously`, detail: 'Risk Level: HIGH — multiple ungoverned tools create compounding liability surface.', risk: 'HIGH' });
  } else if (toolCount > 0) {
    findings.push({ status: 'ok', title: 'AI tool usage within normal range for firm size', detail: 'Recommendation: Governance framework sufficient for current scale with proper oversight.', risk: 'LOW' });
  }

  if (a.hadIncident === 'Yes') {
    findings.push({ status: 'crit', title: 'Prior AI-related compliance incident reported', detail: 'Risk Level: CRITICAL — repeat incidents increase regulatory scrutiny significantly.', risk: 'CRITICAL' });
  } else if (a.hadIncident === 'Not sure') {
    findings.push({ status: 'warn', title: 'Cannot confirm absence of AI incidents', detail: 'Risk Level: HIGH — inability to audit past AI activity indicates governance gap.', risk: 'HIGH' });
  }

  return findings;
}

function getRec(a: Answers, level: string) {
  const gaps = [
    a.reviewProcess !== 'Yes' && 'formal AI review process',
    true && 'cryptographic audit trail',
    a.hadIncident !== 'No' && 'incident response protocol',
  ].filter(Boolean) as string[];

  return `Implement ACCRNOVA Core to address ${gaps.length} critical governance gap${gaps.length !== 1 ? 's' : ''}: ${gaps.join(', ')}.`;
}

export default function FreeAssessment() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>({
    userCount: '',
    tools: [],
    reviewProcess: '',
    hadIncident: '',
    email: '',
    firmName: '',
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [done, setDone] = useState(false);

  const canNext = () => {
    if (step === 1) return !!answers.userCount;
    if (step === 2) return answers.tools.length > 0;
    if (step === 3) return !!answers.reviewProcess;
    if (step === 4) return !!answers.hadIncident;
    if (step === 5) return !!answers.email && !!answers.firmName;
    return false;
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(s => s + 1);
    } else {
      setAnalyzing(true);
      setTimeout(() => { setAnalyzing(false); setDone(true); }, 2200);
    }
  };

  const toggleTool = (t: string) => {
    setAnswers(prev => ({
      ...prev,
      tools: prev.tools.includes(t) ? prev.tools.filter(x => x !== t) : [...prev.tools, t],
    }));
  };

  const { level, score, pct } = done ? calcScore(answers) : { level: 'MODERATE' as const, score: 0, pct: 0 };
  const exposure = done ? calcExposure(answers) : { low: 0, high: 0 };
  const findings = done ? buildFindings(answers) : [];
  const rec = done ? getRec(answers, level) : '';

  const levelColors = {
    LOW:      { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: '✅' },
    MODERATE: { bg: 'bg-amber-50',   border: 'border-amber-300',   text: 'text-amber-800',   badge: 'bg-amber-100 text-amber-800 border-amber-300',   icon: '⚠️' },
    HIGH:     { bg: 'bg-orange-50',  border: 'border-orange-300',  text: 'text-orange-800',  badge: 'bg-orange-100 text-orange-800 border-orange-300',  icon: '🔶' },
    CRITICAL: { bg: 'bg-red-50',     border: 'border-red-300',     text: 'text-red-800',     badge: 'bg-red-100 text-red-800 border-red-300',          icon: '🔴' },
  };
  const lc = levelColors[level];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
            <span className="font-bold text-slate-900 tracking-tight text-[15px]">ACCRNOVA</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/roi-calculator" className="text-sm text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">ROI Calculator</Link>
            <Link to="/login" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Platform Login</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        {!done && !analyzing && (
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold px-4 py-2 rounded-full mb-5">
              <span>🔍</span> Free · No credit card · Instant results
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
              Free AI Governance<br />Risk Assessment
            </h1>
            <p className="text-slate-500 text-lg">
              5 questions. 2 minutes. A personalised risk report.
            </p>
          </div>
        )}

        {/* Progress bar */}
        {!done && !analyzing && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">Question {step} of 5</span>
              <span className="text-xs text-slate-400">{Math.round((step / 5) * 100)}% complete</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full transition-all duration-500"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── ANALYZING ── */}
        {analyzing && (
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-6" />
            <p className="text-xl font-bold text-slate-900 mb-2">Analysing your responses…</p>
            <p className="text-sm text-slate-500">Calculating risk exposure and governance gaps</p>
            <div className="mt-6 space-y-2 max-w-xs mx-auto">
              {['Evaluating AI tool surface area…', 'Mapping governance gaps…', 'Calculating liability exposure…'].map((t, i) => (
                <p key={t} className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse flex-shrink-0" style={{ animationDelay: `${i * 0.3}s` }} />
                  {t}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ── REPORT ── */}
        {done && (
          <div className="space-y-5">
            {/* Header */}
            <div className={`border-2 ${lc.border} ${lc.bg} rounded-2xl p-6`}>
              <div className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">AI GOVERNANCE RISK ASSESSMENT</p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span><strong className="text-slate-900">{answers.firmName}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  <span className="text-slate-300">·</span>
                  <span>Score: {pct}/100</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-4xl">{lc.icon}</span>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5">Overall Risk</p>
                  <p className={`text-3xl font-black ${lc.text}`}>{level}</p>
                </div>
                <div className="ml-auto">
                  <div className="w-20 h-20 relative">
                    <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke={level === 'LOW' ? '#10b981' : level === 'MODERATE' ? '#f59e0b' : level === 'HIGH' ? '#f97316' : '#ef4444'}
                        strokeWidth="3"
                        strokeDasharray={`${pct} ${100 - pct}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-sm font-black ${lc.text}`}>{pct}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Findings */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Key Findings</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {findings.map((f, i) => (
                  <div key={i} className="p-5 flex gap-4">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {f.status === 'crit' ? '✗' : f.status === 'warn' ? '⚠' : '✓'}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className={`text-sm font-bold ${f.status === 'crit' ? 'text-red-700' : f.status === 'warn' ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {f.title}
                        </p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          f.risk === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                          f.risk === 'HIGH'     ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>{f.risk}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{f.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exposure */}
            <div className="bg-slate-900 text-white rounded-2xl p-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Estimated Annual Risk Exposure</p>
              <p className="text-4xl font-black mb-1 tabular-nums">
                {fmt(exposure.low)} – {fmt(exposure.high)}
              </p>
              <p className="text-sm text-slate-400">Based on industry incident rate data for firms with {answers.userCount} professionals using {answers.tools.length} AI tools.</p>
            </div>

            {/* Recommendation */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">Recommendation</p>
              <p className="text-sm text-slate-700 leading-relaxed">{rec}</p>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href={`mailto:${answers.email.includes('law') || answers.firmName.toLowerCase().includes('law') ? 'legal' : 'hello'}@accrnova.app?subject=Full Risk Assessment - ${encodeURIComponent(answers.firmName)}&body=Hi, I just completed the free risk assessment for ${encodeURIComponent(answers.firmName)}. Risk level: ${level}. I'd like to discuss a full assessment.`}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-colors text-sm"
              >
                Request Full Assessment →
              </a>
              <Link
                to="/pricing"
                className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-400 text-slate-700 font-semibold py-4 rounded-xl transition-colors text-sm"
              >
                See ACCRNOVA Pricing →
              </Link>
            </div>

            <div className="text-center">
              <button
                onClick={() => { setStep(1); setDone(false); setAnswers({ userCount: '', tools: [], reviewProcess: '', hadIncident: '', email: '', firmName: '' }); }}
                className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
              >
                Start over
              </button>
            </div>
          </div>
        )}

        {/* ── QUESTIONNAIRE ── */}
        {!done && !analyzing && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {/* Step 1 */}
            {step === 1 && (
              <div className="p-7">
                <h2 className="text-xl font-bold text-slate-900 mb-2">How many professionals at your firm use AI tools?</h2>
                <p className="text-sm text-slate-500 mb-6">Include any staff using ChatGPT, Copilot, Claude, or similar AI assistants for work tasks.</p>
                <div className="space-y-3">
                  {['Under 10', '10-50', '50-200', '200+'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setAnswers(a => ({ ...a, userCount: opt }))}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                        answers.userCount === opt
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 hover:border-slate-400 text-slate-700'
                      }`}
                    >
                      {opt} professionals
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="p-7">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Which AI tools are currently in use?</h2>
                <p className="text-sm text-slate-500 mb-6">Select all that apply across your organisation.</p>
                <div className="space-y-3">
                  {AI_TOOLS.map(tool => (
                    <button
                      key={tool}
                      onClick={() => toggleTool(tool)}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-semibold transition-all flex items-center gap-3 ${
                        answers.tools.includes(tool)
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 hover:border-slate-400 text-slate-700'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        answers.tools.includes(tool) ? 'border-white bg-white' : 'border-slate-300'
                      }`}>
                        {answers.tools.includes(tool) && <span className="text-slate-900 text-xs font-black">✓</span>}
                      </span>
                      {tool}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="p-7">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Do you have a formal AI review process?</h2>
                <p className="text-sm text-slate-500 mb-6">This includes documented policies, approval workflows, or oversight procedures for AI-generated outputs.</p>
                <div className="space-y-3">
                  {[
                    { val: 'Yes', desc: 'We have written policies and documented approval workflows' },
                    { val: 'Informal', desc: 'We have some practices but nothing formally documented' },
                    { val: 'No', desc: 'We have no formal AI review process in place' },
                  ].map(({ val, desc }) => (
                    <button
                      key={val}
                      onClick={() => setAnswers(a => ({ ...a, reviewProcess: val }))}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm transition-all ${
                        answers.reviewProcess === val
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <p className={`font-bold mb-0.5 ${answers.reviewProcess === val ? 'text-white' : 'text-slate-900'}`}>{val}</p>
                      <p className={`text-xs ${answers.reviewProcess === val ? 'text-slate-300' : 'text-slate-500'}`}>{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="p-7">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Have you experienced an AI-related compliance incident?</h2>
                <p className="text-sm text-slate-500 mb-6">This includes any instance where AI output caused a client issue, regulatory question, or internal complaint.</p>
                <div className="space-y-3">
                  {[
                    { val: 'Yes', desc: 'We have had at least one AI-related incident or near-miss' },
                    { val: 'Not sure', desc: "We may have — we don't have complete visibility into AI usage" },
                    { val: 'No', desc: 'We have not experienced any AI-related compliance issues' },
                  ].map(({ val, desc }) => (
                    <button
                      key={val}
                      onClick={() => setAnswers(a => ({ ...a, hadIncident: val }))}
                      className={`w-full text-left px-5 py-4 rounded-xl border-2 text-sm transition-all ${
                        answers.hadIncident === val
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <p className={`font-bold mb-0.5 ${answers.hadIncident === val ? 'text-white' : 'text-slate-900'}`}>{val}</p>
                      <p className={`text-xs ${answers.hadIncident === val ? 'text-slate-300' : 'text-slate-500'}`}>{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5 */}
            {step === 5 && (
              <div className="p-7">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Where should we send your report?</h2>
                <p className="text-sm text-slate-500 mb-6">Your assessment will display instantly on screen. We may follow up with detailed recommendations.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Work email address</label>
                    <input
                      type="email"
                      placeholder="you@yourfirm.com"
                      value={answers.email}
                      onChange={e => setAnswers(a => ({ ...a, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Firm / organisation name</label>
                    <input
                      type="text"
                      placeholder="Acme Law LLP"
                      value={answers.firmName}
                      onChange={e => setAnswers(a => ({ ...a, firmName: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    We'll never share your information. You can opt out of follow-up at any time.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between px-7 py-4 bg-slate-50 border-t border-slate-200">
              {step > 1 ? (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  ← Back
                </button>
              ) : <div />}
              <button
                onClick={handleNext}
                disabled={!canNext()}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                  canNext()
                    ? 'bg-slate-900 hover:bg-slate-700 text-white cursor-pointer'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {step === 5 ? 'Generate My Report →' : 'Next →'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-white font-bold text-xs">A</div>
            <span className="text-sm font-semibold text-white">ACCRNOVA</span>
            <span className="text-xs">— AI Governance Platform</span>
          </div>
          <div className="flex gap-6 text-xs">
            <Link to="/for-law-firms"           className="hover:text-white transition-colors">Law Firms</Link>
            <Link to="/for-financial-services"  className="hover:text-white transition-colors">Financial Services</Link>
            <Link to="/roi-calculator"          className="hover:text-white transition-colors">ROI Calculator</Link>
            <Link to="/login"                   className="hover:text-white transition-colors">Platform Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
