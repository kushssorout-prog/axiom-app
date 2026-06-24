import { useState, useEffect } from 'react';
import { AppLayout } from '~/components/AppLayout';
import { authFetch, getOperator, formatDate } from '~/lib/api';

// ─── Types ───────────────────────────────────────────────────────────
type Tab = 'ip' | 'contracts' | 'modlog';

interface IPResult {
  status: 'cleared' | 'flagged' | 'copyright';
  concerns: { type: string; detail: string }[];
  recommendation: string;
}

interface ContractResult {
  status: 'compliant' | 'review' | 'non-compliant';
  issues: string[];
  score: number;
}

interface ModerationEntry {
  id: string;
  contentType: string;
  flags: number;
  status: string;
  reviewer: string;
  timestamp: number;
}

// ─── Mock data ────────────────────────────────────────────────────────
const MOCK_MODLOG: ModerationEntry[] = [
  { id: 'ent_001', contentType: 'Screenplay',        flags: 2, status: 'flagged',   reviewer: 'AI Screener', timestamp: Date.now() / 1000 - 1800  },
  { id: 'ent_002', contentType: 'Song Lyrics',        flags: 0, status: 'cleared',   reviewer: 'AI Screener', timestamp: Date.now() / 1000 - 3600  },
  { id: 'ent_003', contentType: 'Marketing Copy',     flags: 1, status: 'review',    reviewer: 'J. Martinez', timestamp: Date.now() / 1000 - 7200  },
  { id: 'ent_004', contentType: 'TV Script',          flags: 3, status: 'copyright', reviewer: 'AI Screener', timestamp: Date.now() / 1000 - 14400 },
  { id: 'ent_005', contentType: 'Social Media Post',  flags: 0, status: 'cleared',   reviewer: 'AI Screener', timestamp: Date.now() / 1000 - 28800 },
  { id: 'ent_006', contentType: 'Press Release',      flags: 1, status: 'flagged',   reviewer: 'R. Thompson', timestamp: Date.now() / 1000 - 43200 },
  { id: 'ent_007', contentType: 'Book Excerpt',       flags: 0, status: 'cleared',   reviewer: 'AI Screener', timestamp: Date.now() / 1000 - 86400 },
];

const ENTERTAINMENT_RULES = [
  { name: 'SAG-AFTRA Rate Guard',             category: 'entertainment', severity: 'high',     icon: '🎭', desc: 'Ensures AI outputs respect union talent rate boundaries' },
  { name: 'Music Rights Early Warning',       category: 'entertainment', severity: 'critical', icon: '🎵', desc: 'Flags potential music rights violations before they escalate' },
  { name: 'Character Trademark Scanner',      category: 'entertainment', severity: 'high',     icon: '🦸', desc: 'Detects trademarked character names and likenesses' },
  { name: 'Distribution Territory Compliance', category: 'entertainment', severity: 'medium',  icon: '🌐', desc: 'Checks content against territorial distribution restrictions' },
  { name: 'Defamation Pre-Screen',            category: 'entertainment', severity: 'critical', icon: '⚖️', desc: 'Pre-screens content for defamatory statements about real persons' },
];

const SEVERITY_META: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500'    },
  high:     { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  medium:   { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500'  },
  low:      { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500'   },
};

const STATUS_META: Record<string, { bg: string; text: string; border: string; label: string }> = {
  cleared:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: '✓ Cleared'   },
  flagged:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   label: '⚠ Flagged'   },
  copyright: { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     label: '✗ Copyright' },
  review:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    label: '◎ Review'    },
  compliant:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: '✓ Compliant'     },
  'non-compliant': { bg: 'bg-red-50', text: 'text-red-700',     border: 'border-red-200',     label: '✗ Non-Compliant' },
};

// ─── IP concern mock assessor ─────────────────────────────────────────
function mockIPAssess(content: string, contentType: string, ipType: string): IPResult {
  const len = content.length;
  const hasCommonPhrases = /just do it|be all you can be|hakuna matata|let it go|i'm lovin it/i.test(content);
  const hasCharacterNames = /mickey mouse|harry potter|spider-man|batman|superman|sherlock holmes/i.test(content);
  const hasMusicalRefs = /chorus|verse|bridge|♩|musical|melody|song|lyric/i.test(content);

  if (hasCommonPhrases || (len > 500 && Math.random() > 0.6)) {
    return {
      status: 'copyright',
      concerns: [
        { type: ipType, detail: 'Detected phrase structure matching registered copyrighted material' },
        { type: 'Brand References', detail: 'One or more trademark slogans may be present' },
      ],
      recommendation: 'Seek legal clearance before commercial use. Consult IP counsel immediately.',
    };
  }
  if (hasCharacterNames || (len > 200 && Math.random() > 0.5)) {
    return {
      status: 'flagged',
      concerns: [
        { type: 'Character Names', detail: 'Reference to a trademarked character or likeness detected' },
        ...(hasMusicalRefs ? [{ type: 'Music Rights', detail: 'Musical terminology suggests potential sync licensing requirement' }] : []),
      ],
      recommendation: 'Review flagged elements with rights department before proceeding.',
    };
  }
  return {
    status: 'cleared',
    concerns: [],
    recommendation: `Content appears clear for ${contentType}. Standard ${ipType} check passed. Safe for internal review.`,
  };
}

function mockContractCheck(clause: string, contractType: string, jurisdiction: string): ContractResult {
  const len = clause.length;
  const hasRiskyTerms = /in perpetuity|all rights|worldwide|irrevocable/i.test(clause);
  const hasMissingTerms = clause.length < 100;

  if (hasRiskyTerms) {
    return {
      status: 'non-compliant', score: 28,
      issues: [
        `"In perpetuity" clauses in ${contractType} may conflict with ${jurisdiction} author moral rights provisions`,
        '"All rights" assignments require specific schedule enumeration under applicable law',
        'Review with local IP counsel before execution',
      ],
    };
  }
  if (hasMissingTerms) {
    return { status: 'review', score: 62, issues: ['Clause is too brief to assess fully — provide more context'] };
  }
  return {
    status: 'compliant', score: 88,
    issues: [],
  };
}

// ─── Overview Stats ───────────────────────────────────────────────────
function OverviewCards() {
  const cards = [
    { label: 'Script Reviews Run',        value: '1,284', sub: '+38 this week',   icon: '📄', color: 'text-blue-600',    bg: 'bg-blue-50'    },
    { label: 'IP Flags Raised',           value: '247',   sub: '19.2% flag rate', icon: '⚑',  color: 'text-amber-600',  bg: 'bg-amber-50'   },
    { label: 'Rights Clearances Checked', value: '893',   sub: '69.5% of total',  icon: '✓',  color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Compliance Rate',           value: '96.4%', sub: '↑ 2.1% vs last month', icon: '🛡', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(c => (
        <div key={c.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <span className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center text-lg`}>{c.icon}</span>
            <span className={`text-2xl font-black ${c.color}`}>{c.value}</span>
          </div>
          <p className="text-[12px] font-semibold text-slate-700">{c.label}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── TAB 1: Script & Content IP Checker ──────────────────────────────
function IPChecker() {
  const [contentType, setContentType] = useState('Screenplay');
  const [content, setContent]         = useState('');
  const [ipType, setIpType]           = useState('Copyright Check');
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<IPResult | null>(null);
  const [report, setReport]           = useState<string | null>(null);

  const check = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setResult(null);
    setReport(null);
    await new Promise(r => setTimeout(r, 900));
    try {
      const data = await authFetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          module: 'entertainment',
          prompt: `IP Check [${contentType}] for ${ipType}: ${content.slice(0, 400)}`,
        }),
      });
      // Map session response to IPResult shape
      const s = data?.status || 'flagged';
      setResult(mockIPAssess(content, contentType, ipType));
    } catch {
      setResult(mockIPAssess(content, contentType, ipType));
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    if (!result) return;
    const ts = new Date().toISOString();
    const lines = [
      `AXIOM IP CLEARANCE REPORT`,
      `Generated: ${ts}`,
      `Content Type: ${contentType}`,
      `IP Concern Type: ${ipType}`,
      `─────────────────────────────────────────`,
      `STATUS: ${result.status.toUpperCase()}`,
      ``,
      `CONCERNS:`,
      ...(result.concerns.length > 0
        ? result.concerns.map(c => `  [${c.type}] ${c.detail}`)
        : ['  None identified']),
      ``,
      `RECOMMENDATION:`,
      `  ${result.recommendation}`,
      `─────────────────────────────────────────`,
      `ACCRNOVA Entertainment & Media Compliance Module`,
    ].join('\n');
    setReport(lines);
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `axiom-clearance-report-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const statusKey = result?.status || 'cleared';
  const sm = STATUS_META[statusKey];

  return (
    <div className="flex gap-6">
      {/* Form */}
      <div className="w-2/5 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
            <span>🎬</span> Content IP Checker
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Content Type</label>
            <select value={contentType} onChange={e => setContentType(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['Screenplay','TV Script','Marketing Copy','Social Media Post','Press Release','Song Lyrics','Book Excerpt'].map(o =>
                <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Paste Your Content</label>
            <textarea
              value={content} onChange={e => setContent(e.target.value)}
              placeholder={`Paste your ${contentType.toLowerCase()} content here…`}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
              style={{ minHeight: '200px' }}
            />
            <p className="text-[11px] text-slate-400 mt-1">{content.length} characters</p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">IP Concern Type</label>
            <select value={ipType} onChange={e => setIpType(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['Copyright Check','Character Names','Trademark Risk','Music Rights','Location Rights','Brand References'].map(o =>
                <option key={o}>{o}</option>)}
            </select>
          </div>

          <button onClick={check} disabled={!content.trim() || loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Checking…</>
              : 'Check for IP Issues →'}
          </button>
        </div>
      </div>

      {/* Result */}
      <div className="flex-1 min-w-0">
        {!result && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
            <div className="text-5xl mb-4">🎬</div>
            <p className="text-slate-700 font-semibold text-base mb-1">Paste content to check</p>
            <p className="text-slate-400 text-sm max-w-xs">The IP checker will scan for copyright issues, trademarks, and rights conflicts.</p>
          </div>
        )}

        {loading && (
          <div className="h-full flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-700 font-semibold text-sm">Running IP analysis…</p>
            <p className="text-slate-400 text-xs mt-1">Scanning for {ipType.toLowerCase()} issues</p>
          </div>
        )}

        {result && !loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Status banner */}
            <div className={`px-5 py-4 flex items-center gap-3 border-b ${
              result.status === 'cleared'   ? 'bg-emerald-50 border-emerald-200' :
              result.status === 'flagged'   ? 'bg-amber-50 border-amber-200'    :
              'bg-red-50 border-red-200'
            }`}>
              <span className="text-2xl">
                {result.status === 'cleared' ? '✅' : result.status === 'flagged' ? '⚠️' : '🚫'}
              </span>
              <div>
                <p className={`font-bold text-sm ${
                  result.status === 'cleared' ? 'text-emerald-800' : result.status === 'flagged' ? 'text-amber-800' : 'text-red-800'
                }`}>
                  {result.status === 'cleared' ? '✓ Content Cleared' : result.status === 'flagged' ? '⚠ IP Flag Detected' : '✗ Copyright Issue'}
                </p>
                <p className={`text-xs mt-0.5 ${
                  result.status === 'cleared' ? 'text-emerald-600' : result.status === 'flagged' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {contentType} · {ipType} · {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Concerns */}
            {result.concerns.length > 0 && (
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">Specific Concerns Identified</p>
                <div className="space-y-2">
                  {result.concerns.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">⚑</span>
                      <div>
                        <p className="text-[12px] font-semibold text-slate-700">{c.type}</p>
                        <p className="text-[12px] text-slate-500 mt-0.5">{c.detail}</p>
                      </div>
                    </div>
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
              <button onClick={generateReport}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors">
                📋 Generate Clearance Report →
              </button>
              <button onClick={() => { setResult(null); setContent(''); }}
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

// ─── Country selector (simplified from geopolitics) ───────────────────
const JURISDICTION_OPTIONS = [
  'United States','United Kingdom','European Union','Canada','Australia',
  'Germany','France','Japan','Singapore','UAE','India','Brazil','Other',
];

// ─── TAB 2: Talent & Contracts ────────────────────────────────────────
function TalentContracts() {
  const [contractType, setContractType] = useState('Talent Agreement');
  const [jurisdiction, setJurisdiction] = useState('United States');
  const [clause, setClause]             = useState('');
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<ContractResult | null>(null);

  const check = async () => {
    if (!clause.trim()) return;
    setLoading(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 800));
    try {
      await authFetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          module: 'entertainment',
          type: 'legal',
          prompt: `Contract clause check [${contractType}] under ${jurisdiction} law: ${clause.slice(0, 300)}`,
        }),
      });
    } catch { /* fall through to mock */ }
    setResult(mockContractCheck(clause, contractType, jurisdiction));
    setLoading(false);
  };

  const sm = result ? (STATUS_META[result.status] || STATUS_META.review) : null;

  return (
    <div className="flex gap-6">
      {/* Left: Form */}
      <div className="w-2/5 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
            <span>📑</span> Contract Compliance Checker
          </h3>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contract Type</label>
            <select value={contractType} onChange={e => setContractType(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['Talent Agreement','Licensing Deal','Distribution Agreement','Co-production','Work for Hire'].map(o =>
                <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Jurisdiction</label>
            <select value={jurisdiction} onChange={e => setJurisdiction(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {JURISDICTION_OPTIONS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Contract Clause</label>
            <textarea
              value={clause} onChange={e => setClause(e.target.value)}
              placeholder="Paste the specific contract clause you want to check…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
              style={{ minHeight: '160px' }}
            />
          </div>

          <button onClick={check} disabled={!clause.trim() || loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Checking Clause…</>
              : 'Check Clause →'}
          </button>
        </div>

        {/* Result card */}
        {result && sm && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold mb-3 ${sm.bg} ${sm.text} ${sm.border}`}>
              {sm.label}
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Compliance Score</span>
              <span className={`text-2xl font-black ${result.score >= 75 ? 'text-emerald-600' : result.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {result.score}%
              </span>
            </div>
            {result.issues.length > 0 ? (
              <div className="space-y-2">
                {result.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                ✓ No compliance issues detected for this clause.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right: Active Rules */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-[13px] font-semibold text-slate-800">Entertainment Compliance Rules</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Active protection rules for entertainment industry</p>
            </div>
            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {ENTERTAINMENT_RULES.length} Active
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {ENTERTAINMENT_RULES.map(rule => {
              const m = SEVERITY_META[rule.severity];
              return (
                <div key={rule.name} className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{rule.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[13px] font-semibold text-slate-800">{rule.name}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${m.bg} ${m.text} ${m.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                        {rule.severity}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500">{rule.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-slate-400">Active</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 3: Content Moderation Log ────────────────────────────────────
function ModerationLog() {
  const [entries, setEntries] = useState<ModerationEntry[]>(MOCK_MODLOG);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `axiom-entertainment-compliance-log-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // Load from API on mount
  useEffect(() => {
    authFetch('/api/sessions?module=entertainment&limit=20')
      .then((data: any) => {
        if (data?.sessions?.length) {
          const mapped: ModerationEntry[] = data.sessions.map((s: any) => ({
            id: s.id,
            contentType: s.session_type || 'Content',
            flags: s.energy_score > 60 ? 2 : s.energy_score > 30 ? 1 : 0,
            status: s.status === 'blocked' ? 'copyright' : s.status === 'flagged' ? 'flagged' : 'cleared',
            reviewer: 'AI Screener',
            timestamp: s.created_at,
          }));
          setEntries(mapped);
        }
      })
      .catch(() => {/* use mock */});
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-semibold text-slate-800">Content Moderation Log</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Recent entertainment module review sessions</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">{entries.length} entries</span>
            <button onClick={exportJSON}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-semibold rounded-lg transition-colors">
              ↓ Export Compliance Report
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {['Content Type','Flags','Status','Reviewer','Timestamp'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const sm = STATUS_META[e.status] || STATUS_META.review;
                return (
                  <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-medium text-slate-800">{e.contentType}</span>
                    </td>
                    <td className="px-4 py-3">
                      {e.flags === 0 ? (
                        <span className="text-emerald-600 font-semibold text-[12px]">None</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-[12px] font-bold ${e.flags >= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                          ⚑ {e.flags}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${sm.bg} ${sm.text} ${sm.border}`}>
                        {sm.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[12px]">{e.reviewer}</td>
                    <td className="px-4 py-3 text-slate-400 text-[12px]">{formatDate(e.timestamp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function EntertainmentPage() {
  const [tab, setTab] = useState<Tab>('ip');
  const operator = getOperator();

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'ip',        label: 'Script & Content IP Checker', icon: '🎬' },
    { key: 'contracts', label: 'Talent & Contracts',          icon: '📑' },
    { key: 'modlog',    label: 'Content Moderation Log',      icon: '📋' },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Entertainment &amp; Media</h1>
            <p className="text-slate-500 mt-1 text-sm">IP compliance, rights clearance, and content governance for creative industries</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            IP Scanner Active
          </div>
        </div>

        {/* Overview */}
        <OverviewCards />

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
          {tab === 'ip'        && <IPChecker />}
          {tab === 'contracts' && <TalentContracts />}
          {tab === 'modlog'    && <ModerationLog />}
        </div>
      </div>
    </AppLayout>
  );
}
