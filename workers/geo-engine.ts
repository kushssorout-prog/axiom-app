/**
 * AxiomGeoEngine — Geopolitical Risk Assessment via Guenonian Manifold Mapping
 *
 * Applies the same energy-based invariance principle as the Circuit Breaker
 * to jurisdictional risk. Each country is mapped to an 8-dimensional vector.
 * Risk energy spikes when a jurisdiction drifts from the stable centroid.
 *
 * Dimensions:
 *  [0] Political Stability      0–100  (World Bank WGI 2024, normalised)
 *  [1] Rule of Law              0–100
 *  [2] Corruption Control       0–100  (Transparency Intl CPI 2024)
 *  [3] Armed Conflict Risk      0–100  (inverted — 0=high conflict, 100=peaceful)
 *  [4] Sanctions Exposure       0–100  (inverted — 0=heavily sanctioned, 100=none)
 *  [5] Economic Stability       0–100  (IMF + FX volatility, normalised)
 *  [6] Civil Liberties          0–100  (Freedom House 2024)
 *  [7] Trade Relations          0–100  (WTO + bilateral, normalised)
 *
 * Stationary Center (Guenonian "Vertical Axis" anchor):
 *  {100, 100, 100, 100, 100, 100, 100, 100} — theoretical perfect jurisdiction
 */

export interface GeoVector {
  iso2: string;            // ISO 3166-1 alpha-2
  name: string;
  region: string;
  vector: Float32Array;    // 8-dimensional risk vector
  riskTier: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  sanctioned: boolean;
  ofacListed: boolean;
  notes?: string;
}

export interface GeoRiskResult {
  iso2: string;
  name: string;
  energyScore: number;     // E = Σ wᵢ / ||v - centroid||²
  riskScore: number;       // 0–100 normalised
  riskTier: string;
  dimensions: {
    politicalStability: number;
    ruleOfLaw: number;
    corruptionControl: number;
    conflictRisk: number;
    sanctionsExposure: number;
    economicStability: number;
    civilLiberties: number;
    tradeRelations: number;
  };
  warnings: string[];
  sanctioned: boolean;
  recommendation: string;
}

export interface CorridorResult {
  origin: GeoRiskResult;
  destination: GeoRiskResult;
  transitRisk: number;
  corridorEnergy: number;
  overallRisk: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  flags: string[];
  safeAlternatives: string[];
  recommendation: string;
}

// Dimension weights for energy function (higher = more important)
const WEIGHTS: Float32Array = new Float32Array([
  2.0,  // Political Stability
  2.5,  // Rule of Law       (highest weight — most relevant to legal/finance)
  2.0,  // Corruption Control
  1.5,  // Armed Conflict
  3.0,  // Sanctions Exposure (highest weight — hardest legal risk)
  1.5,  // Economic Stability
  1.5,  // Civil Liberties
  1.0,  // Trade Relations
]);

const STABLE_CENTROID = new Float32Array([100, 100, 100, 100, 100, 100, 100, 100]);
const CRITICAL_RADIUS = 40; // Distance from centroid that triggers critical risk

export class GeoEngine {

  // ── CORE ENERGY FUNCTION ────────────────────────────────────────────────
  // E = Σ wᵢ × ((100 − vᵢ) / 100)²  — additive weighted squared normalised distance
  // Ranges from 0 (perfect centroid) to Σwᵢ = 15.0 (all dims at 0)
  // RiskScore = (E / 15.0) × 100
  static computeEnergy(vector: Float32Array): number {
    let energy = 0;
    for (let i = 0; i < 8; i++) {
      const normDist = (STABLE_CENTROID[i] - vector[i]) / 100; // 0..1
      energy += WEIGHTS[i] * (normDist ** 2);
    }
    return Math.round(energy * 1000) / 1000;
  }

  static vectorDistance(v: Float32Array): number {
    let sumSq = 0;
    for (let i = 0; i < 8; i++) {
      const d = (STABLE_CENTROID[i] - v[i]) / 100;
      sumSq += d * d;
    }
    return Math.round(Math.sqrt(sumSq) * 100) / 100;
  }

  static energyToRiskScore(energy: number): number {
    // Normalise: max possible energy = Σwᵢ = 15.0 (all dimensions at 0)
    const MAX_ENERGY = WEIGHTS.reduce((a, b) => a + b, 0); // 15.0
    return Math.min(100, Math.round((energy / MAX_ENERGY) * 100));
  }

  static riskTierFromScore(score: number): GeoVector['riskTier'] {
    if (score < 15) return 'minimal';
    if (score < 35) return 'low';
    if (score < 55) return 'moderate';
    if (score < 75) return 'high';
    return 'critical';
  }

  // ── ASSESS SINGLE JURISDICTION ──────────────────────────────────────────
  static assess(geo: GeoVector): GeoRiskResult {
    const energy  = this.computeEnergy(geo.vector);
    const riskScore = this.energyToRiskScore(energy);
    const riskTier  = this.riskTierFromScore(riskScore);
    const v = geo.vector;

    const warnings: string[] = [];
    if (geo.sanctioned)          warnings.push('⛔ OFAC/UN/EU Sanctioned jurisdiction');
    if (v[4] < 30)               warnings.push('⚠️ Severe sanctions exposure');
    if (v[0] < 30)               warnings.push('⚠️ Critical political instability');
    if (v[3] < 30)               warnings.push('⚠️ Active armed conflict zone');
    if (v[1] < 40)               warnings.push('⚠️ Rule of law severely compromised');
    if (v[2] < 35)               warnings.push('⚠️ Extreme corruption risk');
    if (v[5] < 30)               warnings.push('⚠️ Economic crisis / hyperinflation risk');
    if (v[7] < 40)               warnings.push('⚠️ Trade restrictions / export controls apply');

    const recommendation =
      riskTier === 'minimal'  ? 'Jurisdiction presents minimal risk. Standard due diligence applies.' :
      riskTier === 'low'      ? 'Low-risk jurisdiction. Enhanced due diligence recommended for transactions >$500k.' :
      riskTier === 'moderate' ? 'Moderate risk. Legal review required. Document risk assessment in file.' :
      riskTier === 'high'     ? 'High-risk jurisdiction. Senior approval required. Consider alternative structuring.' :
                                'CRITICAL: Legal counsel and compliance officer sign-off mandatory before any engagement.';

    return {
      iso2: geo.iso2,
      name: geo.name,
      energyScore: energy,
      riskScore,
      riskTier,
      dimensions: {
        politicalStability: v[0], ruleOfLaw: v[1], corruptionControl: v[2],
        conflictRisk: v[3], sanctionsExposure: v[4], economicStability: v[5],
        civilLiberties: v[6], tradeRelations: v[7],
      },
      warnings,
      sanctioned: geo.sanctioned,
      recommendation,
    };
  }

  // ── CORRIDOR ANALYSIS (origin → destination) ────────────────────────────
  static assessCorridor(origin: GeoVector, destination: GeoVector, transitCountries: GeoVector[] = []): CorridorResult {
    const originResult = this.assess(origin);
    const destResult   = this.assess(destination);
    const transitMax   = transitCountries.reduce((max, c) => Math.max(max, this.energyToRiskScore(this.computeEnergy(c.vector))), 0);

    // Corridor energy = weighted combination
    const corridorEnergy = (originResult.energyScore * 0.3 + destResult.energyScore * 0.5 + transitMax * 0.2);
    const overallScore   = Math.max(originResult.riskScore * 0.3, destResult.riskScore * 0.7, transitMax * 0.5);
    const overallRisk    = this.riskTierFromScore(overallScore);

    const flags: string[] = [];
    if (origin.sanctioned || destination.sanctioned)   flags.push('⛔ Sanctioned jurisdiction in corridor');
    if (destResult.dimensions.ruleOfLaw < 40)          flags.push('⚠️ Destination rule-of-law risk — legal enforceability uncertain');
    if (originResult.riskScore > destResult.riskScore + 30) flags.push('ℹ️ Significant risk reduction corridor — relocation may be beneficial');
    if (destResult.dimensions.politicalStability < 40) flags.push('⚠️ Destination political instability — long-term planning risk');
    if (transitMax > 70)                               flags.push('⚠️ High-risk transit jurisdiction — consider direct route');

    const safeAlternatives = overallRisk === 'critical' || overallRisk === 'high'
      ? ['Switzerland (CHE)', 'Singapore (SGP)', 'New Zealand (NZL)', 'Ireland (IRL)', 'Canada (CAN)']
      : [];

    const recommendation =
      overallRisk === 'minimal'  ? 'Corridor presents minimal risk. Standard processing applies.' :
      overallRisk === 'low'      ? 'Low-risk corridor. Proceed with standard legal documentation.' :
      overallRisk === 'moderate' ? 'Moderate corridor risk. Immigration attorney review recommended.' :
      overallRisk === 'high'     ? 'High-risk corridor. Senior legal counsel required. Alternative pathways should be explored.' :
                                   'CRITICAL CORRIDOR RISK: Specialist advice mandatory. Sanctions, conflict, or rule-of-law issues identified. Do not proceed without comprehensive legal opinion.';

    return {
      origin: originResult, destination: destResult,
      transitRisk: transitMax, corridorEnergy,
      overallRisk, flags, safeAlternatives, recommendation,
    };
  }
}

// ── JURISDICTION DATABASE ─────────────────────────────────────────────────
// 8-dim vectors: [Political, RuleOfLaw, Corruption, Conflict(inv), Sanctions(inv), Economic, CivilLib, Trade]
// Sources: World Bank WGI 2024, TI CPI 2024, Freedom House 2024, OFAC, IMF
export const JURISDICTIONS: GeoVector[] = [
  // ── TIER 1: MINIMAL RISK ─────────────────────────────────────────────────
  { iso2:'CH', name:'Switzerland',    region:'Europe',        vector: new Float32Array([96,98,96,98,99,97,96,97]), riskTier:'minimal', sanctioned:false, ofacListed:false },
  { iso2:'SG', name:'Singapore',      region:'Asia-Pacific',  vector: new Float32Array([95,98,95,99,99,96,82,98]), riskTier:'minimal', sanctioned:false, ofacListed:false },
  { iso2:'NZ', name:'New Zealand',    region:'Asia-Pacific',  vector: new Float32Array([97,98,97,99,99,88,98,90]), riskTier:'minimal', sanctioned:false, ofacListed:false },
  { iso2:'NO', name:'Norway',         region:'Europe',        vector: new Float32Array([97,98,96,98,99,95,98,93]), riskTier:'minimal', sanctioned:false, ofacListed:false },
  { iso2:'FI', name:'Finland',        region:'Europe',        vector: new Float32Array([97,97,97,99,99,91,97,92]), riskTier:'minimal', sanctioned:false, ofacListed:false },
  { iso2:'DK', name:'Denmark',        region:'Europe',        vector: new Float32Array([96,98,96,99,99,91,97,93]), riskTier:'minimal', sanctioned:false, ofacListed:false },
  { iso2:'SE', name:'Sweden',         region:'Europe',        vector: new Float32Array([94,97,95,98,99,90,96,93]), riskTier:'minimal', sanctioned:false, ofacListed:false },
  { iso2:'CA', name:'Canada',         region:'Americas',      vector: new Float32Array([89,95,88,98,99,87,96,92]), riskTier:'minimal', sanctioned:false, ofacListed:false },
  { iso2:'AU', name:'Australia',      region:'Asia-Pacific',  vector: new Float32Array([88,95,87,99,99,87,95,90]), riskTier:'minimal', sanctioned:false, ofacListed:false },
  { iso2:'IE', name:'Ireland',        region:'Europe',        vector: new Float32Array([91,93,90,99,99,88,95,93]), riskTier:'minimal', sanctioned:false, ofacListed:false },
  { iso2:'NL', name:'Netherlands',    region:'Europe',        vector: new Float32Array([90,95,88,98,99,88,94,94]), riskTier:'minimal', sanctioned:false, ofacListed:false },
  { iso2:'AT', name:'Austria',        region:'Europe',        vector: new Float32Array([89,92,88,99,99,88,92,93]), riskTier:'minimal', sanctioned:false, ofacListed:false },
  // ── TIER 2: LOW RISK ─────────────────────────────────────────────────────
  { iso2:'GB', name:'United Kingdom', region:'Europe',        vector: new Float32Array([76,93,85,94,99,82,90,92]), riskTier:'low', sanctioned:false, ofacListed:false },
  { iso2:'DE', name:'Germany',        region:'Europe',        vector: new Float32Array([82,91,85,97,99,85,91,93]), riskTier:'low', sanctioned:false, ofacListed:false },
  { iso2:'FR', name:'France',         region:'Europe',        vector: new Float32Array([75,85,73,90,99,80,82,89]), riskTier:'low', sanctioned:false, ofacListed:false },
  { iso2:'US', name:'United States',  region:'Americas',      vector: new Float32Array([72,87,71,88,99,85,85,90]), riskTier:'low', sanctioned:false, ofacListed:false },
  { iso2:'JP', name:'Japan',          region:'Asia-Pacific',  vector: new Float32Array([85,88,75,98,99,85,84,88]), riskTier:'low', sanctioned:false, ofacListed:false },
  { iso2:'KR', name:'South Korea',    region:'Asia-Pacific',  vector: new Float32Array([72,86,66,90,99,83,80,86]), riskTier:'low', sanctioned:false, ofacListed:false },
  { iso2:'ES', name:'Spain',          region:'Europe',        vector: new Float32Array([73,80,63,96,99,72,84,85]), riskTier:'low', sanctioned:false, ofacListed:false },
  { iso2:'PT', name:'Portugal',       region:'Europe',        vector: new Float32Array([82,83,72,99,99,73,87,83]), riskTier:'low', sanctioned:false, ofacListed:false },
  { iso2:'AE', name:'UAE',            region:'Middle East',   vector: new Float32Array([70,72,65,85,98,88,52,87]), riskTier:'low', sanctioned:false, ofacListed:false },
  { iso2:'IL', name:'Israel',         region:'Middle East',   vector: new Float32Array([48,80,68,45,98,75,72,70]), riskTier:'low', sanctioned:false, ofacListed:false, notes:'Regional conflict proximity' },
  // ── TIER 3: MODERATE RISK ────────────────────────────────────────────────
  { iso2:'IN', name:'India',          region:'South Asia',    vector: new Float32Array([52,55,43,68,98,65,55,72]), riskTier:'moderate', sanctioned:false, ofacListed:false },
  { iso2:'BR', name:'Brazil',         region:'Americas',      vector: new Float32Array([48,45,38,65,99,55,62,68]), riskTier:'moderate', sanctioned:false, ofacListed:false },
  { iso2:'ZA', name:'South Africa',   region:'Africa',        vector: new Float32Array([45,57,44,72,99,45,68,63]), riskTier:'moderate', sanctioned:false, ofacListed:false },
  { iso2:'MX', name:'Mexico',         region:'Americas',      vector: new Float32Array([40,42,34,52,99,58,60,72]), riskTier:'moderate', sanctioned:false, ofacListed:false },
  { iso2:'TR', name:'Turkey',         region:'Europe/ME',     vector: new Float32Array([35,45,44,60,90,50,38,62]), riskTier:'moderate', sanctioned:false, ofacListed:false },
  { iso2:'SA', name:'Saudi Arabia',   region:'Middle East',   vector: new Float32Array([52,52,49,72,97,80,22,74]), riskTier:'moderate', sanctioned:false, ofacListed:false },
  { iso2:'CN', name:'China',          region:'Asia',          vector: new Float32Array([42,38,43,77,88,75,12,70]), riskTier:'moderate', sanctioned:false, ofacListed:false, notes:'Variable sanctions exposure, rule of law concerns' },
  { iso2:'EG', name:'Egypt',          region:'Africa/ME',     vector: new Float32Array([38,40,37,60,97,42,30,55]), riskTier:'moderate', sanctioned:false, ofacListed:false },
  { iso2:'MA', name:'Morocco',        region:'Africa',        vector: new Float32Array([48,48,46,75,99,52,45,62]), riskTier:'moderate', sanctioned:false, ofacListed:false },
  { iso2:'GH', name:'Ghana',          region:'Africa',        vector: new Float32Array([62,60,53,82,99,48,72,58]), riskTier:'moderate', sanctioned:false, ofacListed:false },
  // ── TIER 4: HIGH RISK ────────────────────────────────────────────────────
  { iso2:'PK', name:'Pakistan',       region:'South Asia',    vector: new Float32Array([20,28,26,30,85,30,30,42]), riskTier:'high', sanctioned:false, ofacListed:false },
  { iso2:'NG', name:'Nigeria',        region:'Africa',        vector: new Float32Array([18,22,18,25,98,35,40,42]), riskTier:'high', sanctioned:false, ofacListed:false },
  { iso2:'VE', name:'Venezuela',      region:'Americas',      vector: new Float32Array([8,10,8,45,40,5,12,20]), riskTier:'high', sanctioned:false, ofacListed:false, notes:'US sanctions on specific entities' },
  { iso2:'AF', name:'Afghanistan',    region:'Central Asia',  vector: new Float32Array([2,5,5,2,55,5,2,5]), riskTier:'critical', sanctioned:false, ofacListed:false },
  { iso2:'IQ', name:'Iraq',           region:'Middle East',   vector: new Float32Array([10,15,10,15,80,20,12,30]), riskTier:'high', sanctioned:false, ofacListed:false },
  { iso2:'LY', name:'Libya',          region:'Africa',        vector: new Float32Array([5,8,8,5,75,12,10,15]), riskTier:'high', sanctioned:false, ofacListed:false },
  { iso2:'SD', name:'Sudan',          region:'Africa',        vector: new Float32Array([5,8,6,5,45,8,5,12]), riskTier:'high', sanctioned:false, ofacListed:false },
  { iso2:'MM', name:'Myanmar',        region:'Asia',          vector: new Float32Array([5,8,10,8,50,20,5,20]), riskTier:'high', sanctioned:false, ofacListed:false },
  { iso2:'BY', name:'Belarus',        region:'Europe',        vector: new Float32Array([5,8,35,70,10,30,5,10]), riskTier:'critical', sanctioned:true, ofacListed:true, notes:'EU/US sanctions active' },
  { iso2:'ZW', name:'Zimbabwe',       region:'Africa',        vector: new Float32Array([12,10,8,60,40,8,10,12]), riskTier:'high', sanctioned:false, ofacListed:false },
  // ── TIER 5: CRITICAL / SANCTIONED ───────────────────────────────────────
  { iso2:'RU', name:'Russia',         region:'Europe/Asia',   vector: new Float32Array([10,15,28,20,2,35,8,10]), riskTier:'critical', sanctioned:true, ofacListed:true, notes:'OFAC/EU/UK comprehensive sanctions — financial transactions severely restricted' },
  { iso2:'IR', name:'Iran',           region:'Middle East',   vector: new Float32Array([5,8,12,25,1,15,5,2]), riskTier:'critical', sanctioned:true, ofacListed:true, notes:'OFAC comprehensive sanctions — virtually all transactions prohibited' },
  { iso2:'KP', name:'North Korea',    region:'Asia',          vector: new Float32Array([1,1,2,20,1,2,1,1]), riskTier:'critical', sanctioned:true, ofacListed:true, notes:'OFAC comprehensive sanctions — all transactions prohibited' },
  { iso2:'CU', name:'Cuba',           region:'Americas',      vector: new Float32Array([10,12,38,75,2,15,10,8]), riskTier:'critical', sanctioned:true, ofacListed:true, notes:'OFAC embargo active' },
  { iso2:'SY', name:'Syria',          region:'Middle East',   vector: new Float32Array([2,2,5,2,1,3,2,2]), riskTier:'critical', sanctioned:true, ofacListed:true, notes:'OFAC/EU comprehensive sanctions' },
  { iso2:'SS', name:'South Sudan',    region:'Africa',        vector: new Float32Array([3,4,5,3,60,3,5,5]), riskTier:'critical', sanctioned:false, ofacListed:false },
  { iso2:'SO', name:'Somalia',        region:'Africa',        vector: new Float32Array([2,3,2,2,70,2,3,3]), riskTier:'critical', sanctioned:false, ofacListed:false },
  { iso2:'YE', name:'Yemen',          region:'Middle East',   vector: new Float32Array([2,3,4,2,55,3,4,5]), riskTier:'critical', sanctioned:false, ofacListed:false },
  { iso2:'CF', name:'Cent. Afr. Rep.',region:'Africa',        vector: new Float32Array([3,4,3,2,65,4,5,5]), riskTier:'critical', sanctioned:false, ofacListed:false },
  { iso2:'HT', name:'Haiti',          region:'Americas',      vector: new Float32Array([5,5,5,8,96,5,12,8]), riskTier:'critical', sanctioned:false, ofacListed:false },
];

export function getJurisdiction(iso2: string): GeoVector | undefined {
  return JURISDICTIONS.find(j => j.iso2.toUpperCase() === iso2.toUpperCase());
}

export function searchJurisdictions(query: string): GeoVector[] {
  const q = query.toLowerCase();
  return JURISDICTIONS.filter(j =>
    j.name.toLowerCase().includes(q) ||
    j.iso2.toLowerCase().includes(q) ||
    j.region.toLowerCase().includes(q)
  ).slice(0, 10);
}
