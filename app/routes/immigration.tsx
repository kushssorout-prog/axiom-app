import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { AppLayout } from '~/components/AppLayout';
import { authFetch, getOperator, formatDate } from '~/lib/api';

// ─── Country Data ─────────────────────────────────────────────────────
const COUNTRIES = [
  { iso2: 'CH', name: 'Switzerland',    flag: '🇨🇭', tier: 'minimal' },
  { iso2: 'SG', name: 'Singapore',      flag: '🇸🇬', tier: 'minimal' },
  { iso2: 'IE', name: 'Ireland',        flag: '🇮🇪', tier: 'minimal' },
  { iso2: 'NL', name: 'Netherlands',    flag: '🇳🇱', tier: 'minimal' },
  { iso2: 'NZ', name: 'New Zealand',    flag: '🇳🇿', tier: 'minimal' },
  { iso2: 'NO', name: 'Norway',         flag: '🇳🇴', tier: 'minimal' },
  { iso2: 'CA', name: 'Canada',         flag: '🇨🇦', tier: 'minimal' },
  { iso2: 'AU', name: 'Australia',      flag: '🇦🇺', tier: 'minimal' },
  { iso2: 'GB', name: 'United Kingdom', flag: '🇬🇧', tier: 'low' },
  { iso2: 'US', name: 'United States',  flag: '🇺🇸', tier: 'low' },
  { iso2: 'DE', name: 'Germany',        flag: '🇩🇪', tier: 'low' },
  { iso2: 'FR', name: 'France',         flag: '🇫🇷', tier: 'low' },
  { iso2: 'JP', name: 'Japan',          flag: '🇯🇵', tier: 'low' },
  { iso2: 'KR', name: 'South Korea',    flag: '🇰🇷', tier: 'low' },
  { iso2: 'AE', name: 'UAE',            flag: '🇦🇪', tier: 'low' },
  { iso2: 'IL', name: 'Israel',         flag: '🇮🇱', tier: 'low' },
  { iso2: 'IN', name: 'India',          flag: '🇮🇳', tier: 'moderate' },
  { iso2: 'CN', name: 'China',          flag: '🇨🇳', tier: 'moderate' },
  { iso2: 'BR', name: 'Brazil',         flag: '🇧🇷', tier: 'moderate' },
  { iso2: 'TR', name: 'Turkey',         flag: '🇹🇷', tier: 'moderate' },
  { iso2: 'SA', name: 'Saudi Arabia',   flag: '🇸🇦', tier: 'moderate' },
  { iso2: 'ZA', name: 'South Africa',   flag: '🇿🇦', tier: 'moderate' },
  { iso2: 'MX', name: 'Mexico',         flag: '🇲🇽', tier: 'moderate' },
  { iso2: 'EG', name: 'Egypt',          flag: '🇪🇬', tier: 'moderate' },
  { iso2: 'MA', name: 'Morocco',        flag: '🇲🇦', tier: 'moderate' },
  { iso2: 'PK', name: 'Pakistan',       flag: '🇵🇰', tier: 'high' },
  { iso2: 'NG', name: 'Nigeria',        flag: '🇳🇬', tier: 'high' },
  { iso2: 'VE', name: 'Venezuela',      flag: '🇻🇪', tier: 'high' },
  { iso2: 'RU', name: 'Russia',         flag: '🇷🇺', tier: 'critical', sanctioned: true },
  { iso2: 'IR', name: 'Iran',           flag: '🇮🇷', tier: 'critical', sanctioned: true },
  { iso2: 'KP', name: 'North Korea',    flag: '🇰🇵', tier: 'critical', sanctioned: true },
  { iso2: 'AF', name: 'Afghanistan',    flag: '🇦🇫', tier: 'critical' },
  { iso2: 'SY', name: 'Syria',          flag: '🇸🇾', tier: 'critical', sanctioned: true },
  { iso2: 'BY', name: 'Belarus',        flag: '🇧🇾', tier: 'critical', sanctioned: true },
];

// ─── Types ─────────────────────────────────────────────────────────────
interface Country {
  iso2: string; name: string; flag: string; tier: string; sanctioned?: boolean;
}

interface CorridorResult {
  origin: Country; destination: Country; transit: Country | null;
  tier: string; energyScore: number; flags: string[];
  dimensions: { label: string; origin: number; destination: number }[];
  safeAlternatives?: string[];
  recommendation: string;
  visaPathwayRisk?: string;
  docRisk?: string;
}

interface HistoryRecord {
  id: string; corridor: string; tier: string; energy: number;
  recommendation: string; created_at: number;
}

// ─── Tier Config ─────────────────────────────────────────────────────
const TIER_META: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  minimal:  { label: 'Minimal',  bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500'  },
  low:      { label: 'Low',      bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200',    dot: 'bg-blue-500'     },
  moderate: { label: 'Moderate', bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   dot: 'bg-amber-500'    },
  high:     { label: 'High',     bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-200',  dot: 'bg-orange-500'   },
  critical: { label: 'Critical', bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200',     dot: 'bg-red-500'      },
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

// ─── Country Search ───────────────────────────────────────────────────
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

// ─── Mock Corridor ─────────────────────────────────────────────────────
function mockCorridor(origin: Country, dest: Country, transit: Country | null, reason: string): CorridorResult {
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
  const dimensions = ['Political Stability','Rule of Law','Corruption Control','Conflict Risk',
    'Sanctions Exposure','Economic Stability','Civil Liberties','Trade Relations'].map((label, i) => ({
    label,
    origin: Math.max(0, Math.min(100, oScores[i] + Math.floor((Math.random() - 0.5) * 10))),
    destination: Math.max(0, Math.min(100, dScores[i] + Math.floor((Math.random() - 0.5) * 10))),
  }));

  const flags: string[] = [];
  if (dest.sanctioned) flags.push(`${dest.name} is under active international sanctions — relocation may be restricted`);
  if (transit?.sanctioned) flags.push(`Transit through ${transit.name} involves sanctioned territory — document routing carefully`);
  if (destRank >= 3) flags.push(`Destination classified ${dest.tier} risk — immigration pathway requires enhanced assessment`);
  if (reason === 'Asylum' && destRank >= 2) flags.push('Asylum applications in moderate-risk destinations face compounded procedural challenges');

  const visaPathwayRisk = destRank >= 3
    ? `${dest.name} has complex visa requirements with significant processing risk. Rejection rates are elevated for this destination. Engage specialist immigration counsel.`
    : destRank >= 2
    ? `${dest.name} requires standard visa processing. Documentation must be complete and certified. Allow additional processing time.`
    : `${dest.name} offers straightforward visa pathways for qualified applicants. Standard documentation applies.`;

  const docRisk = `All relocation documents (passport, visa applications, employment contracts, financial statements) contain PII and must be transmitted through encrypted channels. Multi-jurisdiction privilege protections may apply to attorney-prepared materials. Do not share documentation with unverified third parties.`;

  const safeAlts = corridorTierIdx >= 3
    ? ['Switzerland 🇨🇭', 'Singapore 🇸🇬', 'New Zealand 🇳🇿', 'Ireland 🇮🇪', 'Canada 🇨🇦']
    : undefined;

  const recMap: Record<string, string> = {
    minimal:  `This relocation pathway is low-risk. ${dest.name} offers a stable destination environment. Standard immigration procedures apply. Processing timelines are predictable.`,
    low:      `This relocation pathway is operationally viable. ${dest.name} is a suitable destination. Routine immigration compliance applies. Consider engaging a local counsel for registration formalities.`,
    moderate: `Moderate relocation risk identified. ${dest.name} requires thorough visa preparation and documentation. Enhanced compliance review of the destination's immigration requirements is recommended before proceeding.`,
    high:     `High-risk relocation pathway. ${dest.name} presents significant immigration challenges. Senior compliance review required. PEP and AML screening of receiving entities mandatory. Consider alternative destinations.`,
    critical: `CRITICAL relocation risk. This pathway involves extreme-risk or sanctioned jurisdiction(s). Relocation to ${dest.name} is strongly cautioned against. Legal counsel and regulatory guidance must be sought before any action is taken.`,
  };

  return {
    origin, destination: dest, transit,
    tier: corridorTier,
    energyScore: corridorTierIdx * 20 + 10,
    flags, dimensions,
    safeAlternatives: safeAlts,
    recommendation: recMap[corridorTier],
    visaPathwayRisk,
    docRisk,
  };
}

// ─── Corridor Result Display ─────────────────────────────────────────
function CorridorResultDisplay({ result, context }: { result: CorridorResult; context: string }) {
  const om = TIER_META[result.origin.tier] || TIER_META.moderate;
  const dm = TIER_META[result.destination.tier] || TIER_META.moderate;

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className={`flex-1 rounded-xl border-2 ${om.border} p-4 text-center`}>
            <div className="text-3xl mb-1">{result.origin.flag}</div>
            <p className="font-bold text-slate-800 text-sm">{result.origin.name}</p>
            <p className="text-[10px] text-slate-400 mb-1">Relocating from</p>
            <TierBadge tier={result.origin.tier} />
          </div>
          <div className="flex flex-col items-center text-slate-400 flex-shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono">──</span>
              <span className="text-lg">✈️</span>
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
            <p className="text-[10px] text-slate-400 mb-1">Relocating to</p>
            <TierBadge tier={result.destination.tier} />
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-100">
          <div className="text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Pathway Risk</p>
            <TierBadge tier={result.tier} size="lg" />
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Energy Score</p>
            <span className="text-2xl font-black text-slate-800">{result.energyScore}</span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Reason</p>
            <span className="text-[12px] font-semibold text-slate-600">{context}</span>
          </div>
        </div>
      </div>

      {/* Flags */}
      {result.flags.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-2">⚑ Pathway Flags</p>
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

      {/* Visa pathway risk */}
      {result.visaPathwayRisk && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 text-sm flex-shrink-0">🛂</div>
            <div>
              <p className="text-[12px] font-bold text-slate-700 mb-1">Visa Pathway Risk</p>
              <p className="text-[12px] text-slate-600 leading-relaxed">{result.visaPathwayRisk}</p>
            </div>
          </div>
        </div>
      )}

      {/* Documentation risk */}
      {result.docRisk && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 text-sm flex-shrink-0">📄</div>
            <div>
              <p className="text-[12px] font-bold text-blue-800 mb-1">Documentation Risk</p>
              <p className="text-[12px] text-blue-700 leading-relaxed">{result.docRisk}</p>
            </div>
          </div>
        </div>
      )}

      {/* Dimension comparison */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Jurisdiction Comparison</p>
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
                      <span className={`text-[12px] font-semibold ${d.origin >= 60 ? 'text-emerald-600' : d.origin >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{d.origin}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[12px] font-semibold ${d.destination >= 60 ? 'text-emerald-600' : d.destination >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{d.destination}</span>
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
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide mb-2">✓ Recommended Lower-Risk Destinations</p>
          <div className="flex flex-wrap gap-2">
            {result.safeAlternatives.map(a => (
              <span key={a} className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-700 text-[12px] font-medium rounded-lg">{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Pathway Recommendation</p>
        <p className="text-sm text-slate-700 leading-relaxed">{result.recommendation}</p>
      </div>
    </div>
  );
}

// ─── Tab 1: Corridor Risk Planner ────────────────────────────────────
function CorridorPlannerTab({ operatorId }: { operatorId: string }) {
  const [origin, setOrigin] = useState<Country | null>(null);
  const [dest, setDest] = useState<Country | null>(null);
  const [transit, setTransit] = useState<Country | null>(null);
  const [showTransit, setShowTransit] = useState(false);
  const [reason, setReason] = useState('Employment');
  const [urgency, setUrgency] = useState('Standard');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CorridorResult | null>(null);

  const assess = async () => {
    if (!origin || !dest) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 1100));
    try {
      const data = await authFetch(`/api/geo/assess`, {
        method: 'POST',
        body: JSON.stringify({ operatorId, origin: origin.iso2, destination: dest.iso2, transit: transit?.iso2, context: reason, module: 'Immigration', urgency }),
      });
      setResult(data);
    } catch {
      setResult(mockCorridor(origin, dest, transit, reason));
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
            <span className="text-slate-400">✈️</span> Relocation Corridor
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Relocating from</label>
            <CountrySearch value={origin} onChange={setOrigin} placeholder="Origin country…" />
          </div>

          <div className="flex items-center justify-center">
            <div className="flex-1 h-px bg-slate-200" />
            <div className="px-3 py-1 bg-slate-100 text-slate-400 text-xs font-semibold rounded-full mx-2">PATHWAY ✈️</div>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Relocating to</label>
            <CountrySearch value={dest} onChange={setDest} placeholder="Destination country…" />
          </div>

          <div>
            <button onClick={() => setShowTransit(!showTransit)}
              className="text-[12px] text-blue-600 hover:text-blue-800 flex items-center gap-1.5 font-medium">
              <span>{showTransit ? '▾' : '▸'}</span>
              {showTransit ? 'Hide' : 'Add'} transit via (optional)
            </button>
            {showTransit && (
              <div className="mt-2">
                <CountrySearch value={transit} onChange={setTransit} placeholder="Transit country…" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Relocation Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['Employment','Family','Education','Business','Asylum','Investment Visa'].map(o =>
                <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Urgency Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['Standard','Expedited','Emergency'].map(u => (
                <button key={u} onClick={() => setUrgency(u)}
                  className={`py-2 text-[11px] font-semibold rounded-lg border transition-all ${
                    urgency === u
                      ? u === 'Emergency' ? 'bg-red-600 text-white border-red-600'
                        : u === 'Expedited' ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}>
                  {u}
                </button>
              ))}
            </div>
          </div>

          <button onClick={assess} disabled={!origin || !dest || loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Assessing Pathway…</>
            ) : 'Assess Relocation Risk →'}
          </button>
        </div>
      </div>

      {/* Result */}
      <div className="flex-1 min-w-0">
        {!result && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
            <div className="text-5xl mb-4">🌏</div>
            <p className="text-slate-700 font-semibold text-base mb-1">Plan a relocation pathway</p>
            <p className="text-slate-400 text-sm max-w-xs">Select origin and destination to assess immigration risk, visa complexity, and documentation requirements.</p>
          </div>
        )}
        {loading && (
          <div className="h-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-700 font-semibold text-sm">Assessing relocation pathway…</p>
            <p className="text-slate-400 text-xs mt-1">Mapping immigration corridors and compliance requirements</p>
          </div>
        )}
        {result && !loading && <CorridorResultDisplay result={result} context={reason} />}
      </div>
    </div>
  );
}

// ─── Tab 2: Compliance Rules ─────────────────────────────────────────
const IMMIGRATION_RULES = [
  {
    id: 'PHI-001',
    name: 'PHI Identifier Guard',
    severity: 'critical',
    desc: 'Blocks AI generation or storage of passport numbers, visa numbers, and government-issued ID fields without explicit encryption token.',
    catches: 'Passport numbers, visa IDs, national ID numbers, biometric data references',
  },
  {
    id: 'PRIV-002',
    name: 'Multi-Jurisdiction Privilege Map',
    severity: 'high',
    desc: 'Detects when legal advice spans multiple jurisdictions without documented privilege analysis for each territory.',
    catches: 'Cross-border legal advice, multi-country filings, bilateral treaty applications',
  },
  {
    id: 'WORK-003',
    name: 'Work Permit Compliance Checker',
    severity: 'moderate',
    desc: 'Validates that AI-assisted HR or legal sessions reference valid work authorisation status for the relevant jurisdiction.',
    catches: 'Employment letters, work visa references, labour permit documentation',
  },
  {
    id: 'SANC-004',
    name: 'Sanctioned Nationality Filter',
    severity: 'critical',
    desc: 'Automatically flags AI sessions that involve processing applications from sanctioned jurisdictions without compliance override.',
    catches: 'Applications from OFAC/UN sanctioned country nationals, dual-nationality edge cases',
  },
  {
    id: 'PEP-005',
    name: 'PEP Immigration Screener',
    severity: 'high',
    desc: 'Cross-references applicant names against PEP databases during immigration processing sessions.',
    catches: 'Politically exposed persons, family members of PEPs, beneficial owners seeking residency',
  },
];

const SEVERITY_META: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  high:     'bg-orange-50 text-orange-700 border-orange-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  low:      'bg-blue-50 text-blue-700 border-blue-200',
};

function ComplianceRulesTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-slate-800">Active Immigration Compliance Rules</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{IMMIGRATION_RULES.length} rules active in Immigration module</p>
        </div>
        <Link to="/operators#rules"
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          + Add Immigration Rule
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              {['Rule ID','Rule Name','Severity','What It Catches',''].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {IMMIGRATION_RULES.map(r => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 align-top">
                <td className="px-4 py-3.5">
                  <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{r.id}</span>
                </td>
                <td className="px-4 py-3.5">
                  <p className="font-semibold text-[13px] text-slate-800">{r.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">{r.desc}</p>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${SEVERITY_META[r.severity]}`}>
                    {r.severity}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-[11px] text-slate-500 max-w-xs">{r.catches}</td>
                <td className="px-4 py-3.5">
                  <button className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">Configure</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-blue-600 text-lg flex-shrink-0">ℹ</span>
        <div>
          <p className="text-[12px] font-semibold text-blue-800 mb-1">Rule Application</p>
          <p className="text-[12px] text-blue-700 leading-relaxed">
            These rules are applied automatically to all AI sessions running under the Immigration module.
            Rules with <strong>critical</strong> severity will freeze sessions automatically and require attorney review.
            High severity rules generate alerts to designated compliance officers.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 3: Recent Assessments ────────────────────────────────────────
function RecentAssessmentsTab({ operatorId }: { operatorId: string }) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch(`/api/geo/history?operatorId=${operatorId}&module=immigration`);
        setRecords(data.assessments || data || []);
      } catch {
        const mock: HistoryRecord[] = [
          { id: '1', corridor: 'GB → PK', tier: 'high', energy: 68, recommendation: 'Enhanced due diligence required. Employment visa pathway involves significant documentation risk.', created_at: Date.now()/1000 - 3600 },
          { id: '2', corridor: 'US → CH', tier: 'minimal', energy: 6, recommendation: 'Low-risk relocation pathway. Standard immigration procedures apply.', created_at: Date.now()/1000 - 7200 },
          { id: '3', corridor: 'IN → AE', tier: 'moderate', energy: 38, recommendation: 'Moderate risk corridor. UAE work permit documentation must be verified.', created_at: Date.now()/1000 - 14400 },
          { id: '4', corridor: 'NG → GB', tier: 'moderate', energy: 44, recommendation: 'Standard UK visa process. Enhanced source of funds documentation for Tier 2 visa.', created_at: Date.now()/1000 - 86400 },
        ];
        setRecords(mock);
      } finally {
        setLoading(false);
      }
    })();
  }, [operatorId]);

  if (loading) return (
    <div className="py-10 text-center text-slate-400 text-sm">Loading assessments…</div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold text-slate-800">Recent Immigration Assessments</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{records.length} assessments in Immigration module</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {records.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No immigration assessments yet. Run a corridor risk assessment above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['Corridor','Risk Tier','Energy Score','Recommendation','Date'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 align-top">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800 text-[13px] font-mono">{r.corridor}</span>
                  </td>
                  <td className="px-4 py-3"><TierBadge tier={r.tier} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-[13px] font-bold ${r.energy >= 70 ? 'text-red-600' : r.energy >= 40 ? 'text-amber-600' : r.energy >= 20 ? 'text-blue-600' : 'text-emerald-600'}`}>
                      {r.energy}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500 max-w-xs">{r.recommendation.slice(0, 90)}…</td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function ImmigrationPage() {
  const [tab, setTab] = useState<'planner' | 'compliance' | 'history'>('planner');
  const operator = getOperator();
  const operatorId = operator?.id || '';

  // Stats (would come from API in production)
  const STATS = [
    { label: 'Assessments Run',          value: '47',  icon: '📋', color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
    { label: 'High-Risk Corridors',       value: '8',   icon: '⚠️',  color: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-100' },
    { label: 'Safe Relocations Cleared', value: '31',  icon: '✅',  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Immigration & Relocation</h1>
          <p className="text-slate-500 mt-1 text-sm">Cross-border risk analysis — geopolitical, legal, and compliance assessment</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {STATS.map(s => (
            <div key={s.label} className={`bg-white rounded-xl border ${s.border} p-4 shadow-sm flex items-center gap-4`}>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                {s.icon}
              </div>
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
          {[
            { key: 'planner' as const, label: '✈️ Corridor Risk Planner' },
            { key: 'compliance' as const, label: '⚖️ Compliance Rules' },
            { key: 'history' as const, label: '📋 Recent Assessments' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mb-8">
          {tab === 'planner'    && <CorridorPlannerTab  operatorId={operatorId} />}
          {tab === 'compliance' && <ComplianceRulesTab />}
          {tab === 'history'    && <RecentAssessmentsTab operatorId={operatorId} />}
        </div>

        {/* Circuit Breaker Integration card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white relative overflow-hidden">
          {/* decorative rings */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute right-12 top-4 w-48 h-48 bg-white/5 rounded-full -translate-y-1/3" />

          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-xs">⚡</div>
                  <span className="text-emerald-400 text-[11px] font-bold uppercase tracking-widest">Circuit Breaker Integration</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Automated Immigration Compliance</h3>
                <p className="text-slate-300 text-sm leading-relaxed max-w-lg">
                  All AI sessions in the Immigration module are automatically evaluated against immigration compliance rules
                  and jurisdiction risk scores. High-risk corridors trigger automatic session freezing for attorney review.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { icon: '🔒', label: 'PII Protection', desc: 'Passport & visa data encrypted at session level' },
                { icon: '⚖️', label: 'Multi-Jurisdiction',   desc: 'Privilege mapping across all active corridors' },
                { icon: '🚨', label: 'Auto-Freeze',   desc: 'Critical-risk sessions halted for human review' },
              ].map(f => (
                <div key={f.label} className="bg-white/10 rounded-xl p-3">
                  <div className="text-xl mb-1.5">{f.icon}</div>
                  <p className="text-[12px] font-semibold text-white mb-0.5">{f.label}</p>
                  <p className="text-[11px] text-slate-400">{f.desc}</p>
                </div>
              ))}
            </div>

            <Link
              to="/sessions"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 font-semibold text-sm rounded-xl hover:bg-slate-100 transition-colors">
              Run AI Immigration Research →
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
