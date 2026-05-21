import { useState } from 'react';
import { AppLayout } from '~/components/AppLayout';
import { authFetch, getOperator } from '~/lib/api';

// ─── Types ────────────────────────────────────────────────────────────
type Tab = 'originality' | 'brand' | 'brief';

interface OriginalityResult {
  score: number;
  indicators: { label: string; detected: boolean; detail: string }[];
  recommendation: string;
  level: 'low' | 'moderate' | 'high';
}

interface BrandResult {
  status: 'approved' | 'review' | 'misaligned';
  alignmentScore: number;
  issues: string[];
  strengths: string[];
}

interface BriefResult {
  complianceScore: number;
  requirements: { text: string; found: boolean; detail: string }[];
  missed: string[];
}

// ─── Client-side originality scorer ──────────────────────────────────
const COMMON_PHRASES = [
  'in conclusion', 'it is important to note', 'as a result', 'in today\'s world',
  'at the end of the day', 'think outside the box', 'leverage', 'synergy',
  'moving forward', 'going forward', 'deep dive', 'touch base', 'circle back',
  'paradigm shift', 'best practices', 'low-hanging fruit', 'game changer',
  'it goes without saying', 'needless to say', 'in order to', 'ensure that',
];

const QUOTE_PATTERNS = [
  /^"[^"]{10,}"/m,
  /\bfamous\s+(?:quote|saying|words)\b/i,
  /\bonce said\b/i,
  /\bwrote (?:in|that)\b/i,
];

const LONG_SENTENCE_RE = /[^.!?]{120,}[.!?]/g;

function computeOriginality(text: string): OriginalityResult {
  const lower = text.toLowerCase();
  const commonCount = COMMON_PHRASES.filter(p => lower.includes(p)).length;
  const quoteDetected = QUOTE_PATTERNS.some(r => r.test(text));
  const longSentences = (text.match(LONG_SENTENCE_RE) || []).length;

  // Score starts at 100 and diminishes
  let score = 100;
  score -= commonCount * 6;
  if (quoteDetected) score -= 18;
  if (longSentences >= 2) score -= 10;
  if (text.length < 80) score -= 15; // Too short to assess
  score = Math.max(0, Math.min(100, Math.round(score)));

  const indicators = [
    {
      label: 'Very Long Running Sentences',
      detected: longSentences >= 2,
      detail: longSentences >= 2
        ? `${longSentences} sentence(s) exceed 120 characters, which may indicate copy-pasted or AI-reproduced text.`
        : 'Sentence length distribution looks natural.',
    },
    {
      label: 'Recognizable Pattern Detected',
      detected: commonCount >= 3,
      detail: commonCount >= 3
        ? `${commonCount} generic/cliché phrases detected. High density may indicate templated or reproduced content.`
        : commonCount > 0
          ? `${commonCount} common phrase(s) found — within acceptable range.`
          : 'No recognizable generic patterns detected.',
    },
    {
      label: 'Quote-like Structure',
      detected: quoteDetected,
      detail: quoteDetected
        ? 'Content contains quote-like structures that may reference existing copyrighted material.'
        : 'No quote-like structures detected.',
    },
  ];

  const level: 'low' | 'moderate' | 'high' =
    score >= 70 ? 'low' : score >= 45 ? 'moderate' : 'high';

  const recommendation =
    level === 'low'
      ? 'Low risk — appears original. Suitable for commercial use pending standard review.'
      : level === 'moderate'
        ? 'Moderate risk — review before commercial use. Check any quote-like structures and common phrases.'
        : 'High risk — seek legal clearance before any commercial or public use.';

  return { score, indicators, recommendation, level };
}

// ─── Brand mock assessor ──────────────────────────────────────────────
function mockBrandCheck(copy: string, brandName: string, voiceDesc: string): BrandResult {
  const copyLower = copy.toLowerCase();
  const voiceLower = voiceDesc.toLowerCase();

  const issues: string[] = [];
  const strengths: string[] = [];

  // Simple heuristics based on brand voice description
  if (voiceLower.includes('no exclamation') && copy.includes('!')) {
    issues.push('Copy contains exclamation marks, which conflict with the brand voice guidelines');
  }
  if (voiceLower.includes('oxford comma') && /\w+, \w+ and \w+/.test(copy)) {
    issues.push('Oxford comma appears to be missing in at least one list');
  }
  if (voiceLower.includes('professional') && /lol|omg|wow|omg|haha/i.test(copy)) {
    issues.push('Informal language detected — inconsistent with professional brand voice');
  }
  if (voiceLower.includes('direct') && copy.split(' ').length > 80) {
    issues.push('Copy is lengthy — a more direct voice would benefit from concision');
  }
  if (copy.includes(brandName)) {
    strengths.push(`Brand name "${brandName}" is correctly referenced`);
  }
  if (copy.length >= 30 && copy.length <= 200) {
    strengths.push('Copy length is appropriate for concise brand communication');
  }
  if (issues.length === 0) {
    strengths.push('No voice guideline violations detected');
  }

  const alignmentScore = Math.max(20, Math.min(100, 90 - issues.length * 18 + strengths.length * 5));
  const status: BrandResult['status'] =
    alignmentScore >= 75 ? 'approved' : alignmentScore >= 50 ? 'review' : 'misaligned';

  return { status, alignmentScore, issues, strengths };
}

// ─── Brief compliance mock ────────────────────────────────────────────
function extractRequirements(brief: string): string[] {
  // Naively split on newlines / bullets / numbers
  return brief
    .split(/[\n\r]+/)
    .map(l => l.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(l => l.length > 6)
    .slice(0, 10);
}

function mockBriefCheck(brief: string, output: string): BriefResult {
  const requirements = extractRequirements(brief);
  const outputLower = output.toLowerCase();

  const checked = requirements.map(req => {
    const keywords = req.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const found = keywords.length > 0 && keywords.filter(k => outputLower.includes(k)).length >= Math.ceil(keywords.length * 0.4);
    return {
      text: req,
      found,
      detail: found
        ? 'Addressed in the output'
        : 'Not clearly addressed — consider revising the output to cover this requirement',
    };
  });

  const missed = checked.filter(c => !c.found).map(c => c.text);
  const foundCount = checked.filter(c => c.found).length;
  const complianceScore = requirements.length > 0
    ? Math.round((foundCount / requirements.length) * 100)
    : 100;

  return { complianceScore, requirements: checked, missed };
}

// ─── Score Ring ───────────────────────────────────────────────────────
function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-slate-900">{score}</span>
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">/ 100</span>
        </div>
      </div>
      <span className="text-[11px] text-slate-500 font-medium">{label}</span>
    </div>
  );
}

// ─── TAB 1: Originality & IP Checker ─────────────────────────────────
function OriginalityChecker() {
  const [text, setText]         = useState('');
  const [workType, setWorkType] = useState('Literary');
  const [result, setResult]     = useState<OriginalityResult | null>(null);
  const [loading, setLoading]   = useState(false);

  const check = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    setResult(computeOriginality(text));
    setLoading(false);
  };

  const levelMeta = {
    low:      { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', color: '#10b981', label: 'Low Risk' },
    moderate: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   color: '#f59e0b', label: 'Moderate Risk' },
    high:     { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     color: '#ef4444', label: 'High Risk' },
  };

  return (
    <div className="flex gap-6">
      {/* Form */}
      <div className="w-2/5 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
            <span>🔍</span> Originality &amp; IP Checker
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Original Work Type</label>
            <select value={workType} onChange={e => setWorkType(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500">
              {['Literary','Musical','Artistic','Architectural','Software','Other'].map(o =>
                <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">AI-Generated Content</label>
            <textarea
              value={text} onChange={e => setText(e.target.value)}
              placeholder="Paste the AI-generated content you want to check for originality…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              style={{ minHeight: '200px' }}
            />
            <p className="text-[11px] text-slate-400 mt-1">{text.length} characters — scored client-side</p>
          </div>

          <button onClick={check} disabled={!text.trim() || loading}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scoring…</>
              : 'Check Originality →'}
          </button>
        </div>

        {/* How it works */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">How Scoring Works</p>
          <ul className="space-y-1.5">
            {[
              'Starts at 100 (fully original)',
              '−6 pts per generic/cliché phrase',
              '−18 pts for quote-like structures',
              '−10 pts for abnormally long sentences',
              'Score computed entirely client-side',
            ].map(t => (
              <li key={t} className="flex items-start gap-2 text-[12px] text-slate-600">
                <span className="text-purple-400 flex-shrink-0 mt-0.5">•</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Result */}
      <div className="flex-1 min-w-0">
        {!result && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
            <div className="text-5xl mb-4">🎨</div>
            <p className="text-slate-700 font-semibold text-base mb-1">Paste AI-generated content to check</p>
            <p className="text-slate-400 text-sm max-w-xs">The originality scorer analyses patterns, sentence structure, and common phrases to estimate IP risk.</p>
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-700 font-semibold text-sm">Analysing originality…</p>
          </div>
        )}

        {result && !loading && (() => {
          const lm = levelMeta[result.level];
          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Score header */}
              <div className={`px-5 py-5 border-b ${lm.border} ${lm.bg}`}>
                <div className="flex items-center gap-6">
                  <ScoreRing score={result.score} label="Originality Score" color={lm.color} />
                  <div className="flex-1">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold mb-2 ${lm.bg} ${lm.text} ${lm.border}`}>
                      {result.level === 'low' ? '✓' : result.level === 'moderate' ? '⚠' : '✗'} {lm.label}
                    </div>
                    <p className={`text-sm leading-relaxed ${lm.text}`}>{result.recommendation}</p>
                    <p className="text-[11px] text-slate-400 mt-2">{workType} work · Client-side analysis</p>
                  </div>
                </div>
              </div>

              {/* Indicators */}
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Risk Indicators</p>
                <div className="space-y-3">
                  {result.indicators.map(ind => (
                    <div key={ind.label} className={`flex items-start gap-3 p-3 rounded-lg border ${
                      ind.detected ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <span className={`text-base flex-shrink-0 mt-0.5 ${ind.detected ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {ind.detected ? '⚠' : '✓'}
                      </span>
                      <div>
                        <p className={`text-[12px] font-semibold ${ind.detected ? 'text-amber-800' : 'text-emerald-800'}`}>
                          {ind.label}
                        </p>
                        <p className={`text-[12px] mt-0.5 ${ind.detected ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {ind.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-4 flex gap-3">
                <button onClick={() => { setResult(null); setText(''); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Check Another
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── TAB 2: Brand Voice Guardian ──────────────────────────────────────
function BrandVoiceGuardian() {
  const [brandName, setBrandName]   = useState('');
  const [voiceDesc, setVoiceDesc]   = useState('');
  const [copy, setCopy]             = useState('');
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<BrandResult | null>(null);

  const check = async () => {
    if (!copy.trim() || !brandName.trim()) return;
    setLoading(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 850));
    try {
      await authFetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          module: 'creativity',
          prompt: `Brand voice check for "${brandName}". Voice: ${voiceDesc}. Copy: ${copy.slice(0, 300)}`,
        }),
      });
    } catch { /* mock fallback */ }
    setResult(mockBrandCheck(copy, brandName, voiceDesc));
    setLoading(false);
  };

  const statusMeta = {
    approved:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: '✓ Brand Aligned',   icon: '✅', color: '#10b981' },
    review:     { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: '⚠ Needs Review',    icon: '⚠️', color: '#f59e0b' },
    misaligned: { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     label: '✗ Off-Brand',       icon: '🚫', color: '#ef4444' },
  };

  return (
    <div className="flex gap-6">
      {/* Form */}
      <div className="w-2/5 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
            <span>🎯</span> Brand Voice Guardian
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Brand Name</label>
            <input
              type="text" value={brandName} onChange={e => setBrandName(e.target.value)}
              placeholder="e.g. Axiom, Acme Corp, Stellar"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Brand Voice Description</label>
            <textarea
              value={voiceDesc} onChange={e => setVoiceDesc(e.target.value)}
              placeholder="e.g. Professional, direct, never uses exclamation marks, uses Oxford comma, avoids jargon, second-person address…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              style={{ minHeight: '100px' }}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">AI-Generated Copy to Check</label>
            <textarea
              value={copy} onChange={e => setCopy(e.target.value)}
              placeholder="Paste the AI-generated marketing copy, headline, or body text…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              style={{ minHeight: '140px' }}
            />
          </div>

          <button onClick={check} disabled={!copy.trim() || !brandName.trim() || loading}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing Brand Voice…</>
              : 'Check Brand Alignment →'}
          </button>
        </div>
      </div>

      {/* Result */}
      <div className="flex-1 min-w-0">
        {!result && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
            <div className="text-5xl mb-4">🎯</div>
            <p className="text-slate-700 font-semibold text-base mb-1">Define your brand voice</p>
            <p className="text-slate-400 text-sm max-w-xs">Enter brand name, voice guidelines, and the AI copy to check alignment.</p>
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-700 font-semibold text-sm">Checking brand alignment…</p>
            <p className="text-slate-400 text-xs mt-1">Comparing copy against voice guidelines</p>
          </div>
        )}

        {result && !loading && (() => {
          const sm = statusMeta[result.status];
          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Score header */}
              <div className={`px-5 py-5 border-b ${sm.border} ${sm.bg}`}>
                <div className="flex items-center gap-6">
                  <ScoreRing score={result.alignmentScore} label="Brand Alignment" color={sm.color} />
                  <div className="flex-1">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold mb-2 ${sm.bg} ${sm.text} ${sm.border}`}>
                      {sm.label}
                    </div>
                    <p className={`text-sm font-semibold ${sm.text}`}>
                      Brand alignment score: {result.alignmentScore}%
                    </p>
                    <p className="text-[12px] text-slate-500 mt-1">"{brandName}" voice check completed</p>
                  </div>
                </div>
              </div>

              {/* Issues */}
              {result.issues.length > 0 && (
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Voice Violations</p>
                  <div className="space-y-2">
                    {result.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <span className="text-red-500 flex-shrink-0 mt-0.5">⚠</span>
                        <p className="text-[12px] text-red-800">{issue}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {result.strengths.length > 0 && (
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">On-Brand Elements</p>
                  <div className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>
                        <p className="text-[12px] text-emerald-800">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-5 py-4 flex gap-3">
                <button onClick={() => { setResult(null); setCopy(''); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                  Check New Copy
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── TAB 3: Creative Brief Compliance ────────────────────────────────
function BriefCompliance() {
  const [brief, setBrief]   = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<BriefResult | null>(null);

  const check = async () => {
    if (!brief.trim() || !output.trim()) return;
    setLoading(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 750));
    setResult(mockBriefCheck(brief, output));
    setLoading(false);
  };

  const scoreColor = result
    ? result.complianceScore >= 75 ? '#10b981' : result.complianceScore >= 45 ? '#f59e0b' : '#ef4444'
    : '#6366f1';

  return (
    <div className="flex gap-6">
      {/* Form */}
      <div className="w-2/5 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
            <span>📋</span> Creative Brief Compliance
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Original Brief</label>
            <textarea
              value={brief} onChange={e => setBrief(e.target.value)}
              placeholder={"Enter the creative brief, one requirement per line:\n- Mention our sustainability story\n- Target audience: 25–40 professionals\n- Include a CTA for free trial\n- No pricing information…"}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono"
              style={{ minHeight: '160px' }}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {extractRequirements(brief).length} requirement(s) detected
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">AI Output to Check</label>
            <textarea
              value={output} onChange={e => setOutput(e.target.value)}
              placeholder="Paste the AI-generated output you want to check against the brief…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              style={{ minHeight: '140px' }}
            />
          </div>

          <button onClick={check} disabled={!brief.trim() || !output.trim() || loading}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Checking Brief…</>
              : 'Check Brief Compliance →'}
          </button>
        </div>
      </div>

      {/* Result */}
      <div className="flex-1 min-w-0">
        {!result && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-slate-700 font-semibold text-base mb-1">Paste brief and AI output</p>
            <p className="text-slate-400 text-sm max-w-xs">The checker maps each brief requirement against the AI output to measure compliance.</p>
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-700 font-semibold text-sm">Mapping requirements…</p>
          </div>
        )}

        {result && !loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Score header */}
            <div className={`px-5 py-5 border-b ${
              result.complianceScore >= 75 ? 'bg-emerald-50 border-emerald-200' :
              result.complianceScore >= 45 ? 'bg-amber-50 border-amber-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-6">
                <ScoreRing score={result.complianceScore} label="Brief Compliance" color={scoreColor} />
                <div className="flex-1">
                  <p className={`text-lg font-black ${
                    result.complianceScore >= 75 ? 'text-emerald-800' :
                    result.complianceScore >= 45 ? 'text-amber-800' : 'text-red-800'
                  }`}>
                    {result.complianceScore >= 75 ? '✓ Brief Satisfied' :
                     result.complianceScore >= 45 ? '⚠ Partially Compliant' : '✗ Brief Not Met'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    result.complianceScore >= 75 ? 'text-emerald-700' :
                    result.complianceScore >= 45 ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    {result.requirements.filter(r => r.found).length} of {result.requirements.length} requirements addressed
                  </p>
                </div>
              </div>
            </div>

            {/* Requirements table */}
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Brief Requirements</p>
              <div className="space-y-2">
                {result.requirements.map((req, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    req.found ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <span className={`text-base flex-shrink-0 mt-0.5 ${req.found ? 'text-emerald-500' : 'text-red-500'}`}>
                      {req.found ? '✓' : '✗'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-semibold ${req.found ? 'text-emerald-800' : 'text-red-800'}`}>
                        {req.text}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${req.found ? 'text-emerald-600' : 'text-red-600'}`}>
                        {req.detail}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      req.found ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {req.found ? 'Found' : 'Missing'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Missed summary */}
            {result.missed.length > 0 && (
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  ✗ {result.missed.length} Missed Requirement{result.missed.length > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  Revise the AI output to explicitly address: {result.missed.join(' · ')}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="px-5 py-4 flex gap-3">
              <button onClick={() => { setResult(null); setBrief(''); setOutput(''); }}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                Check Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function CreativityPage() {
  const [tab, setTab] = useState<Tab>('originality');
  const operator = getOperator();

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'originality', label: 'Originality & IP Checker',  icon: '🔍' },
    { key: 'brand',       label: 'Brand Voice Guardian',      icon: '🎯' },
    { key: 'brief',       label: 'Creative Brief Compliance', icon: '📋' },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Creativity Hub</h1>
            <p className="text-slate-500 mt-1 text-sm">IP protection, brand voice alignment, and originality governance for creative work</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            Originality Engine Active
          </div>
        </div>

        {/* Overview stat strip */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Originality Checks',   value: '3,421', icon: '🔍', color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Brand Checks Run',      value: '1,182', icon: '🎯', color: 'text-blue-600',   bg: 'bg-blue-50'   },
            { label: 'Brief Compliance Rate', value: '88.3%', icon: '📋', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center text-lg`}>{c.icon}</span>
                <span className={`text-2xl font-black ${c.color}`}>{c.value}</span>
              </div>
              <p className="text-[12px] font-semibold text-slate-700">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {tab === 'originality' && <OriginalityChecker />}
          {tab === 'brand'       && <BrandVoiceGuardian />}
          {tab === 'brief'       && <BriefCompliance />}
        </div>
      </div>
    </AppLayout>
  );
}
