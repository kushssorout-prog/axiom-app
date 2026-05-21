import { useState, useEffect, useRef } from 'react';
import type { MetaFunction } from 'react-router';
import { Link } from 'react-router';

export const meta: MetaFunction = () => [
  { title: 'AI Governance ROI Calculator | Axiom' },
  {
    name: 'description',
    content:
      'Calculate the ROI of AI governance for your firm. See your annual compliance risk exposure vs. the cost of Axiom — in 60 seconds.',
  },
];

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}

function fmtLong(n: number) {
  return '$' + Math.round(n).toLocaleString();
}

function fmtCount(n: number) {
  return Math.round(n).toLocaleString();
}

// Animated counter hook
function useAnimatedValue(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  const start = useRef<number>(0);
  const from = useRef<number>(0);

  useEffect(() => {
    from.current = value;
    start.current = 0;
    cancelAnimationFrame(raf.current);

    const animate = (ts: number) => {
      if (!start.current) start.current = ts;
      const elapsed = ts - start.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from.current + (target - from.current) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

const CLAIM_OPTIONS = [
  { label: '$500K',  value: 500_000 },
  { label: '$1M',    value: 1_000_000 },
  { label: '$2M',    value: 2_000_000 },
  { label: '$5M+',   value: 5_000_000 },
];

const SECTOR_OPTIONS = [
  { label: '⚖️ Law',        value: 'law' },
  { label: '📈 Finance',    value: 'finance' },
  { label: '🏥 Healthcare', value: 'healthcare' },
  { label: '🏢 Other',      value: 'other' },
];

function SliderInput({
  label, min, max, value, onChange, prefix = '', suffix = '', step = 1,
}: {
  label: string; min: number; max: number; value: number;
  onChange: (n: number) => void; prefix?: string; suffix?: string; step?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <span className="text-sm font-bold text-slate-900 tabular-nums min-w-[5rem] text-right">
          {prefix}{value.toLocaleString()}{suffix}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #0f172a ${pct}%, #e2e8f0 ${pct}%)`,
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-400">{prefix}{min.toLocaleString()}{suffix}</span>
        <span className="text-[10px] text-slate-400">{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  );
}

export default function RoiCalculator() {
  const [attorneys, setAttorneys]     = useState(50);
  const [sessions, setSessions]       = useState(20);
  const [rate, setRate]               = useState(400);
  const [claimValue, setClaimValue]   = useState(1_000_000);
  const [sector, setSector]           = useState('law');

  // Calculations
  const weeklySessions   = attorneys * sessions;
  const annualSessions   = weeklySessions * 52;
  const incidentRate     = 0.003;
  const uncaughtRate     = 0.15;
  const annualRisk       = annualSessions * incidentRate * uncaughtRate * claimValue;
  const axiomCost        = attorneys > 200 ? 8_000 : attorneys > 50 ? 5_000 : 3_000;
  const annualAxiomCost  = axiomCost * 12;
  const netROI           = annualRisk - annualAxiomCost;
  const roiMultiple      = annualRisk / Math.max(annualAxiomCost, 1);

  // Animated values
  const animRisk    = useAnimatedValue(annualRisk);
  const animCost    = useAnimatedValue(annualAxiomCost);
  const animNet     = useAnimatedValue(Math.max(netROI, 0));
  const animSessions = useAnimatedValue(annualSessions);

  const roiGood = roiMultiple >= 1;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
            <span className="font-bold text-slate-900 tracking-tight text-[15px]">Axiom</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/for-law-firms" className="text-sm text-slate-500 hover:text-slate-900 transition-colors hidden sm:block">Law Firms</Link>
            <Link to="/free-assessment" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Free Risk Assessment</Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-14 px-6 text-center">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
          AI Governance ROI Calculator
        </h1>
        <p className="text-slate-300 text-lg max-w-xl mx-auto">
          See your firm's annual AI compliance risk exposure — and how many times Axiom pays for itself.
        </p>
      </div>

      {/* Calculator */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Inputs */}
          <div className="space-y-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-7">
              <h2 className="text-lg font-bold text-slate-900">Your firm profile</h2>

              <SliderInput
                label="Professionals using AI"
                min={10}
                max={500}
                step={5}
                value={attorneys}
                onChange={setAttorneys}
                suffix=" people"
              />
              <SliderInput
                label="AI sessions per person, per week"
                min={5}
                max={50}
                value={sessions}
                onChange={setSessions}
                suffix=" sessions"
              />
              <SliderInput
                label="Average billable rate"
                min={200}
                max={1000}
                step={25}
                value={rate}
                onChange={setRate}
                prefix="$"
                suffix="/hr"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Risk parameters</h2>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">Estimated malpractice / regulatory claim value</p>
                <div className="grid grid-cols-4 gap-2">
                  {CLAIM_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setClaimValue(opt.value)}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        claimValue === opt.value
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">Industry sector</p>
                <div className="grid grid-cols-2 gap-2">
                  {SECTOR_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSector(opt.value)}
                      className={`py-2.5 px-4 rounded-xl text-sm font-semibold border transition-all text-left ${
                        sector === opt.value
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Methodology note */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 mb-1">Methodology</p>
              <p className="text-xs text-blue-600 leading-relaxed">
                Based on industry-reported incident rates: 0.3% of AI sessions produce a compliance incident.
                Without governance, ~15% of incidents go undetected. Axiom reduces undetected incidents to near zero.
                Claim values based on published industry data for {sector === 'law' ? 'legal malpractice' : sector === 'finance' ? 'regulatory enforcement' : 'professional liability'} cases.
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {/* Main ROI display */}
            <div className={`rounded-2xl p-7 border-2 ${roiGood ? 'bg-slate-900 border-slate-900 text-white' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${roiGood ? 'text-slate-400' : 'text-red-500'}`}>
                Net ROI
              </p>
              <div className="flex items-end gap-3 mb-2">
                <p className={`text-5xl font-black tabular-nums leading-none ${roiGood ? 'text-white' : 'text-red-700'}`}>
                  {roiMultiple.toFixed(1)}×
                </p>
                <p className={`text-lg font-semibold mb-1 ${roiGood ? 'text-slate-300' : 'text-red-600'}`}>return</p>
              </div>
              <p className={`text-sm ${roiGood ? 'text-slate-300' : 'text-red-600'}`}>
                Axiom pays for itself <strong className={roiGood ? 'text-white' : 'text-red-800'}>{roiMultiple.toFixed(1)} times over</strong> based on your risk profile
              </p>
            </div>

            {/* 4 numbers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Annual Risk Exposure</p>
                <p className="text-2xl font-black text-red-700 tabular-nums">{fmtLong(animRisk)}</p>
                <p className="text-xs text-red-500 mt-1">without governance</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Annual Axiom Cost</p>
                <p className="text-2xl font-black text-emerald-700 tabular-nums">{fmtLong(animCost)}</p>
                <p className="text-xs text-emerald-600 mt-1">{fmt(axiomCost)}/month</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Net Savings</p>
                <p className="text-2xl font-black text-blue-700 tabular-nums">{fmtLong(animNet)}</p>
                <p className="text-xs text-blue-500 mt-1">per year protected</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Protected Sessions</p>
                <p className="text-2xl font-black text-slate-700 tabular-nums">{fmtCount(animSessions)}</p>
                <p className="text-xs text-slate-400 mt-1">AI sessions per year</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">How we calculated this</h3>
              {[
                { label: 'Weekly sessions',                    value: fmtCount(weeklySessions) },
                { label: 'Annual sessions',                    value: fmtCount(annualSessions) },
                { label: 'Expected incidents (0.3% rate)',     value: fmtCount(annualSessions * incidentRate) },
                { label: 'Undetected without governance (15%)',value: fmtCount(annualSessions * incidentRate * uncaughtRate) },
                { label: 'Risk per undetected incident',       value: fmtLong(claimValue) },
                { label: 'Total annual risk exposure',         value: fmtLong(annualRisk), bold: true },
              ].map(({ label, value, bold }) => (
                <div key={label} className={`flex items-center justify-between text-xs ${bold ? 'border-t border-slate-200 pt-3 mt-1' : ''}`}>
                  <span className={bold ? 'font-bold text-slate-900' : 'text-slate-500'}>{label}</span>
                  <span className={bold ? 'font-black text-slate-900' : 'font-semibold text-slate-700 tabular-nums'}>{value}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white text-center">
              <p className="text-lg font-bold mb-2">Ready to see Axiom in action?</p>
              <p className="text-sm text-slate-400 mb-5">
                {attorneys} professionals · {fmtCount(annualSessions)} sessions/year · {roiMultiple.toFixed(1)}× ROI
              </p>
              <div className="space-y-3">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition-colors"
                >
                  See Axiom in action →
                </Link>
                <Link
                  to="/free-assessment"
                  className="flex items-center justify-center gap-2 w-full bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  Get your free risk assessment
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-white font-bold text-xs">A</div>
            <span className="text-sm font-semibold text-white">Axiom</span>
            <span className="text-xs">— AI Governance Platform</span>
          </div>
          <div className="flex gap-6 text-xs">
            <Link to="/for-law-firms" className="hover:text-white transition-colors">Law Firms</Link>
            <Link to="/for-financial-services" className="hover:text-white transition-colors">Financial Services</Link>
            <Link to="/free-assessment" className="hover:text-white transition-colors">Free Assessment</Link>
            <Link to="/login" className="hover:text-white transition-colors">Platform Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
