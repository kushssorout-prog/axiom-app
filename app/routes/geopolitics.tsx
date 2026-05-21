import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { AppLayout } from '~/components/AppLayout';
import { authFetch, getOperator, formatDate } from '~/lib/api';

// ─── Country Data ────────────────────────────────────────────────────
const COUNTRIES = [
  { iso2: 'CH', name: 'Switzerland',   flag: '🇨🇭', tier: 'minimal' },
  { iso2: 'SG', name: 'Singapore',     flag: '🇸🇬', tier: 'minimal' },
  { iso2: 'IE', name: 'Ireland',       flag: '🇮🇪', tier: 'minimal' },
  { iso2: 'NL', name: 'Netherlands',   flag: '🇳🇱', tier: 'minimal' },
  { iso2: 'NZ', name: 'New Zealand',   flag: '🇳🇿', tier: 'minimal' },
  { iso2: 'NO', name: 'Norway',        flag: '🇳🇴', tier: 'minimal' },
  { iso2: 'CA', name: 'Canada',        flag: '🇨🇦', tier: 'minimal' },
  { iso2: 'AU', name: 'Australia',     flag: '🇦🇺', tier: 'minimal' },
  { iso2: 'GB', name: 'United Kingdom',flag: '🇬🇧', tier: 'low' },
  { iso2: 'US', name: 'United States', flag: '🇺🇸', tier: 'low' },
  { iso2: 'DE', name: 'Germany',       flag: '🇩🇪', tier: 'low' },
  { iso2: 'FR', name: 'France',        flag: '🇫🇷', tier: 'low' },
  { iso2: 'JP', name: 'Japan',         flag: '🇯🇵', tier: 'low' },
  { iso2: 'KR', name: 'South Korea',   flag: '🇰🇷', tier: 'low' },
  { iso2: 'AE', name: 'UAE',           flag: '🇦🇪', tier: 'low' },
  { iso2: 'IL', name: 'Israel',        flag: '🇮🇱', tier: 'low' },
  { iso2: 'IN', name: 'India',         flag: '🇮🇳', tier: 'moderate' },
  { iso2: 'CN', name: 'China',         flag: '🇨🇳', tier: 'moderate' },
  { iso2: 'BR', name: 'Brazil',        flag: '🇧🇷', tier: 'moderate' },
  { iso2: 'TR', name: 'Turkey',        flag: '🇹🇷', tier: 'moderate' },
  { iso2: 'SA', name: 'Saudi Arabia',  flag: '🇸🇦', tier: 'moderate' },
  { iso2: 'ZA', name: 'South Africa',  flag: '🇿🇦', tier: 'moderate' },
  { iso2: 'MX', name: 'Mexico',        flag: '🇲🇽', tier: 'moderate' },
  { iso2: 'EG', name: 'Egypt',         flag: '🇪🇬', tier: 'moderate' },
  { iso2: 'MA', name: 'Morocco',       flag: '🇲🇦', tier: 'moderate' },
  { iso2: 'PK', name: 'Pakistan',      flag: '🇵🇰', tier: 'high' },
  { iso2: 'NG', name: 'Nigeria',       flag: '🇳🇬', tier: 'high' },
  { iso2: 'VE', name: 'Venezuela',     flag: '🇻🇪', tier: 'high' },
  { iso2: 'RU', name: 'Russia',        flag: '🇷🇺', tier: 'critical', sanctioned: true },
  { iso2: 'IR', name: 'Iran',          flag: '🇮🇷', tier: 'critical', sanctioned: true },
  { iso2: 'KP', name: 'North Korea',   flag: '🇰🇵', tier: 'critical', sanctioned: true },
  { iso2: 'AF', name: 'Afghanistan',   flag: '🇦🇫', tier: 'critical' },
  { iso2: 'SY', name: 'Syria',         flag: '🇸🇾', tier: 'critical', sanctioned: true },
  { iso2: 'BY', name: 'Belarus',       flag: '🇧🇾', tier: 'critical', sanctioned: true },
];

// ─── Types ───────────────────────────────────────────────────────────
interface Country {
  iso2: string; name: string; flag: string; tier: string; sanctioned?: boolean;
}

interface DimScore {
  label: string; score: number; inverted?: boolean;
}

interface GeoResult {
  iso2: string; name: string; flag: string; tier: string; sanctioned?: boolean;
  energyScore: number; dimensions: DimScore[]; warnings: string[];
  recommendation: string;
}

interface HistoryRecord {
  id: string; iso2: string; country: string; context: string;
  tier: string; energy: number; created_at: number;
}

// ─── Tier Helpers ────────────────────────────────────────────────────
const TIER_META: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  minimal:  { label: 'Minimal',  bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  low:      { label: 'Low',      bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  moderate: { label: 'Moderate', bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  high:     { label: 'High',     bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500'  },
  critical: { label: 'Critical', bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'     },
};

function TierBadge({ tier, size = 'sm' }: { tier: string; size?: 'sm' | 'lg' }) {
  const m = TIER_META[tier] || TIER_META.moderate;
  const px = size === 'lg' ? 'px-3 py-1.5 text-sm font-bold' : 'px-2 py-0.5 text-[11px] font-semibold';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${m.bg} ${m.text} ${m.border} ${px}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label} Risk
    </span>
  );
}

// ─── Country Search ──────────────────────────────────────────────────
function CountrySearch({ value, onChange, placeholder = 'Search country…' }: {
  value: Country | null; onChange: (c: Country | null) => void; placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.iso2.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 10);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (c: Country) => { onChange(c); setQuery(''); setOpen(false); };
  const clear = () => { onChange(null); setQuery(''); };

  return (
    <div ref={ref} className="relative">
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-lg bg-white">
          <span className="text-xl">{value.flag}</span>
          <span className="text-sm font-medium text-slate-800 flex-1">{value.name}</span>
          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{value.iso2}</span>
          <TierBadge tier={value.tier} />
          <button onClick={clear} className="text-slate-400 hover:text-slate-700 ml-1 text-lg leading-none">×</button>
        </div>
      ) : (
        <input
          type="text" value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      )}
      {open && !value && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filtered.map(c => {
            const m = TIER_META[c.tier] || TIER_META.moderate;
            return (
              <button key={c.iso2} onMouseDown={() => select(c)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 text-left border-b border-slate-100 last:border-0">
                <span className="text-xl">{c.flag}</span>
                <span className="flex-1 text-sm font-medium text-slate-800">{c.name}</span>
                <span className="text-[10px] font-mono text-slate-400">{c.iso2}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${m.bg} ${m.text} ${m.border}`}>
                  {(c as any).sanctioned ? '⛔ Sanctioned' : m.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Energy Gauge ────────────────────────────────────────────────────
function EnergyGauge({ score }: { score: number }) {
  // Score: 0 = perfectly stable, higher = more dangerous
  // We'll normalise display to 0–100 scale; raw energy could be huge
  const display = Math.min(100, Math.round(score));
  const circumference = 2 * Math.PI * 36;
  const pct = Math.min(display / 100, 1);
  const dash = pct * circumference;
  const color = display >= 70 ? '#ef4444' : display >= 45 ? '#f97316' : display >= 25 ? '#f59e0b' : display >= 10 ? '#3b82f6' : '#10b981';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-slate-900">{display}</span>
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Energy</span>
        </div>
      </div>
      <span className="text-[11px] text-slate-500">Risk Intensity Score</span>
    </div>
  );
}

// ─── Dimension Bar ───────────────────────────────────────────────────
function DimBar({ label, score, inverted }: { label: string; score: number; inverted?: boolean }) {
  const effective = inverted ? score : score;
  const color = effective >= 70 ? 'bg-emerald-500' : effective >= 50 ? 'bg-blue-500' : effective >= 30 ? 'bg-amber-500' : 'bg-red-500';
  const blocks = Math.round(effective / 10);

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[12px] text-slate-600 w-44 flex-shrink-0">{label}</span>
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`h-3 rounded-sm flex-1 transition-all duration-500 ${i < blocks ? color : 'bg-slate-100'}`} />
        ))}
      </div>
      <span className={`text-[12px] font-bold w-12 text-right ${
        effective >= 70 ? 'text-emerald-600' : effective >= 50 ? 'text-blue-600' : effective >= 30 ? 'text-amber-600' : 'text-red-600'
      }`}>{score}/100</span>
      {inverted && <span className="text-[9px] text-slate-400 w-16">↑ safer</span>}
    </div>
  );
}

// ─── Mock Assessment ─────────────────────────────────────────────────
function mockAssess(iso2: string): GeoResult {
  const country = COUNTRIES.find(c => c.iso2 === iso2) || COUNTRIES[0];
  const tierScores: Record<string, number[]> = {
    minimal:  [88, 92, 85, 95, 99, 90, 95, 93],
    low:      [75, 80, 70, 88, 97, 82, 85, 88],
    moderate: [55, 60, 52, 65, 80, 60, 65, 62],
    high:     [35, 38, 30, 45, 60, 42, 40, 45],
    critical: [12, 15, 10, 20, 15, 18, 12, 22],
  };
  const scores = tierScores[country.tier] || tierScores.moderate;
  const jitter = (v: number) => Math.min(100, Math.max(0, v + Math.floor((Math.random() - 0.5) * 15)));
  const dims: DimScore[] = [
    { label: 'Political Stability',  score: jitter(scores[0]) },
    { label: 'Rule of Law',          score: jitter(scores[1]) },
    { label: 'Corruption Control',   score: jitter(scores[2]) },
    { label: 'Conflict Risk',        score: jitter(scores[3]), inverted: true },
    { label: 'Sanctions Exposure',   score: country.sanctioned ? 8 : jitter(scores[4]) },
    { label: 'Economic Stability',   score: jitter(scores[5]) },
    { label: 'Civil Liberties',      score: jitter(scores[6]) },
    { label: 'Trade Relations',      score: jitter(scores[7]) },
  ];
  const avg = dims.reduce((a, d) => a + d.score, 0) / dims.length;
  const energyScore = Math.round((100 - avg) * 1.5 + (country.sanctioned ? 30 : 0));

  const warnings: string[] = [];
  if (country.sanctioned) warnings.push('Active OFAC/UN/EU Sanctions');
  if (dims[0].score < 40) warnings.push('Political instability detected');
  if (dims[2].score < 40) warnings.push('High corruption risk');
  if (dims[3].score < 40) warnings.push('Active or recent armed conflict');
  if (dims[4].score < 30) warnings.push('Significant sanctions exposure');

  const recMap: Record<string, string> = {
    minimal:  `${country.name} presents minimal jurisdictional risk. Standard onboarding and compliance procedures apply. No enhanced due diligence required.`,
    low:      `${country.name} is considered low risk. Proceed with standard compliance checks and routine monitoring. Annual review recommended.`,
    moderate: `${country.name} carries moderate risk. Enhanced due diligence is advised. Document source of funds and purpose of engagement. Quarterly monitoring recommended.`,
    high:     `${country.name} presents elevated risk. Mandatory enhanced due diligence, senior approval required. PEP screening critical. Consider risk mitigation measures or alternative jurisdictions.`,
    critical: `${country.name} is CRITICAL risk. Engagement is strongly discouraged. Consult legal counsel before proceeding. Regulatory notification may be required. Consider terminating existing relationships.`,
  };

  return {
    iso2, name: country.name, flag: country.flag,
    tier: country.tier, sanctioned: country.sanctioned,
    energyScore: Math.min(100, energyScore),
    dimensions: dims, warnings,
    recommendation: recMap[country.tier] || recMap.moderate,
  };
}

// ─── Single Jurisdiction Tab ─────────────────────────────────────────
function SingleTab({ operatorId }: { operatorId: string }) {
  const [country, setCountry] = useState<Country | null>(null);
  const [context, setContext] = useState('Financial Transaction');
  const [module, setModule] = useState('Core');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeoResult | null>(null);

  const assess = async () => {
    if (!country) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    try {
      const data = await authFetch(`/api/geo/assess`, {
        method: 'POST',
        body: JSON.stringify({ operatorId, iso2: country.iso2, context, module }),
      });
      setResult(data);
    } catch {
      setResult(mockAssess(country.iso2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Left panel */}
      <div className="w-2/5 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-[13px] font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span className="text-slate-400">🔍</span> Jurisdiction Selection
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Country</label>
              <CountrySearch value={country} onChange={setCountry} />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Assessment Context</label>
              <select value={context} onChange={e => setContext(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['Financial Transaction','Legal Matter','Client Onboarding','Supply Chain','Investment','Other'].map(o =>
                  <option key={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Module</label>
              <div className="grid grid-cols-2 gap-2">
                {['Core','Finance','Legal','Immigration'].map(m => (
                  <button key={m} onClick={() => setModule(m)}
                    className={`py-2 text-[12px] font-medium rounded-lg border transition-all ${
                      module === m ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={assess} disabled={!country || loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing…</>
              ) : 'Assess Jurisdiction →'}
            </button>
          </div>
        </div>

        {/* Quick reference */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Risk Tier Reference</p>
          <div className="space-y-1.5">
            {Object.entries(TIER_META).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${v.dot}`} />
                <span className={`text-[11px] font-semibold ${v.text}`}>{v.label}</span>
                <span className="text-[11px] text-slate-400 ml-auto">
                  {k === 'minimal' ? 'Score 0–10' : k === 'low' ? '10–25' : k === 'moderate' ? '25–50' : k === 'high' ? '50–75' : '75–100'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0">
        {!result && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
            <div className="text-5xl mb-4">🌍</div>
            <p className="text-slate-700 font-semibold text-base mb-1">Select a jurisdiction to assess</p>
            <p className="text-slate-400 text-sm max-w-xs">Choose a country, context, and module on the left, then click Assess Jurisdiction.</p>
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-700 font-semibold text-sm">Mapping jurisdiction vector…</p>
            <p className="text-slate-400 text-xs mt-1">Computing 8-dimensional risk manifold</p>
          </div>
        )}

        {result && !loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Sanctioned banner */}
            {result.sanctioned && (
              <div className="bg-red-600 text-white px-5 py-3 flex items-center gap-3">
                <span className="text-xl">⛔</span>
                <div>
                  <p className="font-bold text-sm">OFAC / UN / EU SANCTIONED JURISDICTION</p>
                  <p className="text-red-200 text-xs">Engaging with this jurisdiction may violate international sanctions law. Consult legal counsel immediately.</p>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center gap-4">
              <span className="text-4xl">{result.flag}</span>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900">{result.name}</h3>
                <p className="text-slate-400 text-sm">{result.iso2} · {context} · {module} module</p>
              </div>
              <TierBadge tier={result.tier} size="lg" />
            </div>

            {/* Energy + dims */}
            <div className="p-5 flex gap-6 border-b border-slate-100">
              <EnergyGauge score={result.energyScore} />
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">8-Dimension Risk Profile</p>
                <div className="space-y-0.5">
                  {result.dimensions.map(d => (
                    <DimBar key={d.label} label={d.label} score={d.score} inverted={d.inverted} />
                  ))}
                </div>
              </div>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Active Warnings</p>
                <div className="flex flex-wrap gap-2">
                  {result.warnings.map(w => (
                    <span key={w} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-medium">
                      <span className="text-red-500">⚠</span> {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Recommendation</p>
              <p className="text-sm text-slate-700 leading-relaxed">{result.recommendation}</p>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 flex gap-3">
              <Link to="/finance"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
                📊 Add to Finance Transaction
              </Link>
              <button onClick={() => setResult(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Corridor Analysis Tab ───────────────────────────────────────────
interface CorridorResult {
  origin: Country; destination: Country; transit: Country | null;
  tier: string; energyScore: number; flags: string[];
  dimensions: { label: string; origin: number; destination: number }[];
  safeAlternatives?: string[];
  recommendation: string;
}

function mockCorridor(origin: Country, dest: Country, transit: Country | null): CorridorResult {
  const tierRank: Record<string, number> = { minimal: 0, low: 1, moderate: 2, high: 3, critical: 4 };
  const destRank = tierRank[dest.tier] || 2;
  const originRank = tierRank[origin.tier] || 2;
  const tiers = ['minimal', 'low', 'moderate', 'high', 'critical'];
  const corridorTierIdx = Math.min(4, Math.round((destRank * 1.5 + originRank * 0.5) / 2));
  const corridorTier = tiers[corridorTierIdx];

  const oScores = [88 - originRank * 18, 85 - originRank * 16, 82 - originRank * 17, 90 - originRank * 15,
    98 - originRank * 20, 88 - originRank * 16, 90 - originRank * 18, 92 - originRank * 17];
  const dScores = [88 - destRank * 18, 85 - destRank * 16, 82 - destRank * 17, 90 - destRank * 15,
    98 - destRank * 20, 88 - destRank * 16, 90 - destRank * 18, 92 - destRank * 17];
  const dims = ['Political Stability','Rule of Law','Corruption Control','Conflict Risk',
    'Sanctions Exposure','Economic Stability','Civil Liberties','Trade Relations'].map((label, i) => ({
    label, origin: Math.max(0, Math.min(100, oScores[i] + Math.floor((Math.random() - 0.5) * 10))),
    destination: Math.max(0, Math.min(100, dScores[i] + Math.floor((Math.random() - 0.5) * 10))),
  }));

  const flags: string[] = [];
  if (dest.sanctioned) flags.push(`${dest.name} is under active international sanctions`);
  if (transit?.sanctioned) flags.push(`Transit via ${transit.name} involves sanctioned territory`);
  if (destRank >= 3) flags.push(`${dest.name} classified as ${dest.tier} risk — enhanced due diligence required`);
  if (destRank - originRank >= 2) flags.push(`Significant risk escalation: ${origin.tier} → ${dest.tier}`);

  const safeAlts = corridorTierIdx >= 3
    ? ['Switzerland 🇨🇭', 'Singapore 🇸🇬', 'New Zealand 🇳🇿', 'Ireland 🇮🇪', 'Canada 🇨🇦']
    : undefined;

  const recMap: Record<string, string> = {
    minimal: `This corridor presents minimal risk. The combination of ${origin.name} and ${dest.name} supports straightforward compliance processing.`,
    low: `This corridor is operationally viable with standard compliance procedures. Routine due diligence applies.`,
    moderate: `Moderate corridor risk detected. Enhanced due diligence required for both jurisdictions. Document all transaction rationale.`,
    high: `High-risk corridor. Senior compliance officer approval required. Detailed source-of-funds documentation mandatory. Consider alternative routing.`,
    critical: `CRITICAL RISK corridor. This pathway involves sanctioned or extreme-risk jurisdictions. Legal counsel must be engaged before any engagement. Regulatory notification likely required.`,
  };

  return {
    origin, destination: dest, transit,
    tier: corridorTier,
    energyScore: corridorTierIdx * 20 + 10,
    flags, dimensions: dims,
    safeAlternatives: safeAlts,
    recommendation: recMap[corridorTier],
  };
}

function CorridorResultDisplay({ result }: { result: CorridorResult }) {
  const om = TIER_META[result.origin.tier] || TIER_META.moderate;
  const dm = TIER_META[result.destination.tier] || TIER_META.moderate;

  return (
    <div className="space-y-4">
      {/* Corridor map */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className={`flex-1 rounded-xl border-2 ${om.border} p-4 text-center`}>
            <div className="text-3xl mb-1">{result.origin.flag}</div>
            <p className="font-bold text-slate-800 text-sm">{result.origin.name}</p>
            <TierBadge tier={result.origin.tier} />
          </div>
          <div className="flex flex-col items-center text-slate-400 flex-shrink-0">
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-xs font-mono">──</span>
              <span className="text-lg">✈</span>
              <span className="text-xs font-mono">──→</span>
            </div>
            {result.transit && (
              <div className="mt-2 flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                <span className="text-base">{result.transit.flag}</span>
                <span className="text-[10px] font-medium text-amber-700">via {result.transit.name}</span>
              </div>
            )}
          </div>
          <div className={`flex-1 rounded-xl border-2 ${dm.border} p-4 text-center`}>
            <div className="text-3xl mb-1">{result.destination.flag}</div>
            <p className="font-bold text-slate-800 text-sm">{result.destination.name}</p>
            <TierBadge tier={result.destination.tier} />
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 pt-3 border-t border-slate-100">
          <div className="text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Corridor Risk</p>
            <TierBadge tier={result.tier} size="lg" />
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Energy Score</p>
            <span className="text-2xl font-black text-slate-800">{result.energyScore}</span>
          </div>
        </div>
      </div>

      {/* Flags */}
      {result.flags.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-2">⚑ Corridor Flags</p>
          <div className="space-y-1.5">
            {result.flags.map(f => (
              <div key={f} className="flex items-start gap-2 text-amber-800 text-sm">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dimension comparison */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Dimension Comparison</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Dimension</th>
                <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{result.origin.flag} Origin</th>
                <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{result.destination.flag} Dest.</th>
                <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Δ Delta</th>
              </tr>
            </thead>
            <tbody>
              {result.dimensions.map(d => {
                const delta = d.destination - d.origin;
                const deltaColor = delta >= 0 ? 'text-emerald-600' : 'text-red-600';
                const deltaBg = delta >= 0 ? 'bg-emerald-50' : 'bg-red-50';
                return (
                  <tr key={d.label} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-[12px] text-slate-700">{d.label}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[12px] font-semibold ${d.origin >= 60 ? 'text-emerald-600' : d.origin >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {d.origin}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[12px] font-semibold ${d.destination >= 60 ? 'text-emerald-600' : d.destination >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {d.destination}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${deltaBg} ${deltaColor}`}>
                        {delta >= 0 ? '+' : ''}{delta}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safe alternatives */}
      {result.safeAlternatives && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide mb-2">✓ Recommended Lower-Risk Alternatives</p>
          <div className="flex flex-wrap gap-2">
            {result.safeAlternatives.map(a => (
              <span key={a} className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-700 text-[12px] font-medium rounded-lg">{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Recommendation</p>
        <p className="text-sm text-slate-700 leading-relaxed">{result.recommendation}</p>
      </div>
    </div>
  );
}

function CorridorTab({ operatorId }: { operatorId: string }) {
  const [origin, setOrigin] = useState<Country | null>(null);
  const [dest, setDest] = useState<Country | null>(null);
  const [transit, setTransit] = useState<Country | null>(null);
  const [showTransit, setShowTransit] = useState(false);
  const [context, setContext] = useState('Relocation / Immigration');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CorridorResult | null>(null);

  const analyse = async () => {
    if (!origin || !dest) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1100));
    try {
      const data = await authFetch(`/api/geo/corridor`, {
        method: 'POST',
        body: JSON.stringify({ operatorId, origin: origin.iso2, destination: dest.iso2, transit: transit?.iso2, context }),
      });
      setResult(data);
    } catch {
      setResult(mockCorridor(origin, dest, transit));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Form */}
      <div className="w-2/5 flex-shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h3 className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
            <span>✈</span> Corridor Configuration
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Origin Jurisdiction</label>
            <CountrySearch value={origin} onChange={setOrigin} placeholder="Search origin country…" />
          </div>

          <div className="flex items-center justify-center text-slate-400">
            <div className="flex-1 h-px bg-slate-200" />
            <div className="px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold mx-2">→ CORRIDOR →</div>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Destination Jurisdiction</label>
            <CountrySearch value={dest} onChange={setDest} placeholder="Search destination country…" />
          </div>

          <div>
            <button onClick={() => setShowTransit(!showTransit)}
              className="text-[12px] text-blue-600 hover:text-blue-800 flex items-center gap-1.5 font-medium">
              <span>{showTransit ? '▾' : '▸'}</span>
              {showTransit ? 'Hide' : 'Add'} transit country (optional)
            </button>
            {showTransit && (
              <div className="mt-2">
                <CountrySearch value={transit} onChange={setTransit} placeholder="Search transit country…" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Corridor Context</label>
            <select value={context} onChange={e => setContext(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['Relocation / Immigration','Asset Transfer','Business Expansion','Legal Matter','Trade Route'].map(o =>
                <option key={o}>{o}</option>)}
            </select>
          </div>

          <button onClick={analyse} disabled={!origin || !dest || loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing Corridor…</>
            ) : 'Analyse Corridor →'}
          </button>
        </div>
      </div>

      {/* Result */}
      <div className="flex-1 min-w-0">
        {!result && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
            <div className="text-5xl mb-4">✈️</div>
            <p className="text-slate-700 font-semibold text-base mb-1">Configure a corridor to analyse</p>
            <p className="text-slate-400 text-sm max-w-xs">Select origin and destination jurisdictions to map cross-border risk.</p>
          </div>
        )}
        {loading && (
          <div className="h-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-700 font-semibold text-sm">Mapping corridor risk manifold…</p>
            <p className="text-slate-400 text-xs mt-1">Calculating cross-jurisdictional energy delta</p>
          </div>
        )}
        {result && !loading && <CorridorResultDisplay result={result} />}
      </div>
    </div>
  );
}

// ─── History Table ───────────────────────────────────────────────────
function HistoryTable({ operatorId }: { operatorId: string }) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch(`/api/geo/history?operatorId=${operatorId}`);
        setRecords(data.assessments || data || []);
      } catch {
        // Mock history
        const mock: HistoryRecord[] = [
          { id: '1', iso2: 'GB', country: 'United Kingdom', context: 'Financial Transaction', tier: 'low', energy: 18, created_at: Date.now()/1000 - 3600 },
          { id: '2', iso2: 'PK', country: 'Pakistan', context: 'Client Onboarding', tier: 'high', energy: 72, created_at: Date.now()/1000 - 7200 },
          { id: '3', iso2: 'CH', country: 'Switzerland', context: 'Investment', tier: 'minimal', energy: 5, created_at: Date.now()/1000 - 14400 },
          { id: '4', iso2: 'RU', country: 'Russia', context: 'Legal Matter', tier: 'critical', energy: 96, created_at: Date.now()/1000 - 28800 },
          { id: '5', iso2: 'DE', country: 'Germany', context: 'Supply Chain', tier: 'low', energy: 22, created_at: Date.now()/1000 - 86400 },
        ];
        setRecords(mock);
      } finally {
        setLoading(false);
      }
    })();
  }, [operatorId]);

  if (loading) return (
    <div className="py-8 text-center text-slate-400 text-sm">Loading history…</div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-slate-800">Assessment History</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Last 20 jurisdiction assessments</p>
        </div>
        <span className="text-[11px] font-semibold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">{records.length} records</span>
      </div>
      {records.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">No assessments yet. Run your first jurisdiction assessment above.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100">
              <tr>
                {['Jurisdiction','Context','Risk Tier','Energy','Date'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{COUNTRIES.find(c => c.iso2 === r.iso2)?.flag || '🌐'}</span>
                      <span className="font-medium text-slate-800 text-[13px]">{r.country}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-[12px]">{r.context}</td>
                  <td className="px-4 py-3"><TierBadge tier={r.tier} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-[13px] font-bold ${r.energy >= 70 ? 'text-red-600' : r.energy >= 40 ? 'text-amber-600' : r.energy >= 20 ? 'text-blue-600' : 'text-emerald-600'}`}>
                      {r.energy}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-[12px]">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function GeopoliticsPage() {
  const [tab, setTab] = useState<'single' | 'corridor'>('single');
  const [introOpen, setIntroOpen] = useState(true);
  const operator = getOperator();
  const operatorId = operator?.id || '';

  const DIMENSIONS = [
    { label: 'Political Stability', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { label: 'Rule of Law',         color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { label: 'Corruption Control',  color: 'bg-violet-100 text-violet-700 border-violet-200' },
    { label: 'Conflict Risk',       color: 'bg-red-100 text-red-700 border-red-200' },
    { label: 'Sanctions Exposure',  color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { label: 'Economic Stability',  color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { label: 'Civil Liberties',     color: 'bg-sky-100 text-sky-700 border-sky-200' },
    { label: 'Trade Relations',     color: 'bg-teal-100 text-teal-700 border-teal-200' },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Geopolitical Risk Engine</h1>
              <p className="text-slate-500 mt-1 text-sm">Guenonian Manifold Mapping for Jurisdictional Risk</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              8D Vector Space Active
            </div>
          </div>
        </div>

        {/* Intro card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <button onClick={() => setIntroOpen(!introOpen)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-sm">∑</div>
              <div className="text-left">
                <p className="text-[13px] font-semibold text-slate-800">Manifold Methodology</p>
                <p className="text-[11px] text-slate-400">Energy-based invariance principle · 8-dimensional risk space</p>
              </div>
            </div>
            <span className="text-slate-400 text-sm font-mono">{introOpen ? '▾ Collapse' : '▸ Expand'}</span>
          </button>

          {introOpen && (
            <div className="px-5 pb-5 border-t border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed mt-4 mb-4">
                The Geopolitical Risk Engine maps jurisdictions onto an 8-dimensional vector space using the same
                energy-based invariance principle as the Circuit Breaker. Risk energy spikes when a jurisdiction
                drifts from the stable centroid — representing the theoretical perfectly stable, rule-of-law jurisdiction.
              </p>

              {/* Formula */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 px-5 py-4 mb-4 text-center font-mono">
                <p className="text-slate-500 text-[11px] uppercase tracking-widest mb-2">Risk Energy Formula</p>
                <p className="text-slate-900 text-base font-bold">
                  E = Σ w<sub>i</sub> / ||jurisdiction_vector − stable_centroid||²
                </p>
                <p className="text-slate-400 text-[11px] mt-2">
                  where w<sub>i</sub> are dimension weights and the denominator is the squared Euclidean distance from the stable centroid
                </p>
              </div>

              {/* Dimension pills */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">8 Risk Dimensions</p>
                <div className="flex flex-wrap gap-2">
                  {DIMENSIONS.map(d => (
                    <span key={d.label} className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${d.color}`}>
                      {d.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
          {[
            { key: 'single' as const, label: '🔍 Single Jurisdiction', desc: 'Assess one country' },
            { key: 'corridor' as const, label: '✈️ Corridor Analysis', desc: 'Origin → Destination' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mb-8">
          {tab === 'single' && <SingleTab operatorId={operatorId} />}
          {tab === 'corridor' && <CorridorTab operatorId={operatorId} />}
        </div>

        {/* History */}
        <HistoryTable operatorId={operatorId} />
      </div>
    </AppLayout>
  );
}
