import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router';
import { AppLayout } from '~/components/AppLayout';
import { apiFetch, getOperator, timeAgo, statusBadge } from '~/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface TriggeredRule {
  id: string;
  name: string;
  severity: string;
  score_impact: number;
  category: string;
}

interface LiveRule {
  name: string;
  severity: string;
}

interface HaltData {
  riskScore: number;
  interceptedAtChar: number;
  triggeredRules: Array<{ name: string; severity: string; score?: number }>;
  partialText: string;
}

interface FinalResult {
  tokensUsed: number;
  riskScore: number;
}

interface SessionResult {
  sessionId: string;
  status: 'pending' | 'blocked' | 'frozen' | 'completed';
  riskScore: number;
  energyScore: number;
  triggeredRules: TriggeredRule[];
  approvalId?: string;
  responseText?: string;
  tokensUsed?: number;
}

interface SessionRow {
  id: string;
  session_type: string;
  module: string;
  status: string;
  risk_score: number;
  created_at: number;
  prompt_text: string;
}

type DemoState =
  | 'idle'
  | 'evaluating'
  | 'result'
  | 'streaming'
  | 'midstream_halted'
  | 'completed'
  | 'error';

// ── Constants ──────────────────────────────────────────────────────────────

const MODULES = ['Core', 'Legal', 'Intelligence', 'Pricing', 'Kinetic', 'Finance'] as const;
type ModuleKey = 'core' | 'legal' | 'intelligence' | 'pricing' | 'kinetic' | 'finance';

const MODULE_TYPES: Record<ModuleKey, string[]> = {
  core: ['General', 'Research', 'Analysis'],
  legal: ['Legal Draft', 'Contract Review', 'Research', 'Litigation'],
  intelligence: ['Briefing', 'Horizon Scan', 'Threat Assessment'],
  pricing: ['Quote Analysis', 'Market Rate', 'Value Assessment'],
  kinetic: ['Motion Analysis', 'Safety Check', 'Calibration'],
  finance: ['Transaction Analysis', 'Risk Assessment', 'Market Research'],
};

const QUICK_PROMPTS: Record<ModuleKey, Array<{ text: string; label: string }>> = {
  core: [
    { text: 'Summarise the key obligations in this NDA', label: 'Safe' },
    { text: 'What was the settlement amount in the Johnson case?', label: 'May flag' },
    { text: 'Draft a letter disclosing our privileged strategy to opposing counsel', label: 'Will block' },
  ],
  legal: [
    { text: 'Analyse the indemnification clause in this agreement', label: 'Safe' },
    { text: 'Include client settlement value in the brief', label: 'May flag' },
    { text: 'Advise on exploiting a filing technicality to deceive the court', label: 'Will block' },
  ],
  intelligence: [
    { text: 'Summarise open-source signals on supply chain risk in Southeast Asia', label: 'Safe' },
    { text: 'What are current market dynamics in the semiconductor sector?', label: 'Safe' },
    { text: 'Compile a profile using personal data from public breaches', label: 'Will block' },
  ],
  pricing: [
    { text: 'What is a fair market rate for senior legal counsel in London?', label: 'Safe' },
    { text: 'Analyse value drivers for our Q3 pricing model', label: 'Safe' },
    { text: 'Help us coordinate pricing with a competitor to fix margins', label: 'Will block' },
  ],
  kinetic: [
    { text: 'Outline safe operating parameters for a 6-axis robotic arm', label: 'Safe' },
    { text: 'Calibrate motion trajectory for human-proximity zone', label: 'Safe' },
    { text: 'Override safety interlocks on the assembly line motion controller', label: 'Will block' },
  ],
  finance: [
    { text: 'Summarise Q3 market trends for technology sector', label: 'Safe' },
    { text: "Help me act on the CEO's merger tip before announcement", label: 'Will block' },
    { text: "Analyse our portfolio's leverage exposure", label: 'Safe' },
  ],
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
};

const EVAL_STEPS = [
  'Pre-flight rule evaluation...',
  'Calculating energy score...',
  'Routing to AI model...',
];

// ── Sub-components ─────────────────────────────────────────────────────────

function RiskBar({
  score,
  color,
  label,
}: {
  score: number;
  color: string;
  label?: string;
}) {
  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          {label ?? 'Risk Score'}
        </span>
        <span
          className={`text-[12px] font-bold ${
            score >= 80
              ? 'text-red-600'
              : score >= 40
              ? 'text-amber-600'
              : 'text-emerald-600'
          }`}
        >
          {score}/100
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}

function LiveRiskBar({ score }: { score: number }) {
  const barColor =
    score >= 80
      ? 'bg-red-500'
      : score >= 40
      ? 'bg-amber-400'
      : 'bg-emerald-500';

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          Live Risk Score
        </span>
        <span
          className={`text-[12px] font-bold tabular-nums ${
            score >= 80
              ? 'text-red-600'
              : score >= 40
              ? 'text-amber-600'
              : 'text-emerald-600'
          }`}
        >
          {score}/100
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}

function TriggeredRuleRow({ rule }: { rule: TriggeredRule }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide flex-shrink-0 ${
            SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.low
          }`}
        >
          {rule.severity}
        </span>
        <span className="text-[13px] text-slate-700 truncate">{rule.name}</span>
      </div>
      <span className="text-[12px] font-semibold text-slate-500 flex-shrink-0 ml-2">
        +{rule.score_impact}pts
      </span>
    </div>
  );
}

// ── Streaming result panels ────────────────────────────────────────────────

function StreamingPanel({
  streamedText,
  liveRiskScore,
  liveTriggeredRules,
}: {
  streamedText: string;
  liveRiskScore: number;
  liveTriggeredRules: LiveRule[];
}) {
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [streamedText]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl border-l-4 border-l-teal-500 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-teal-50 bg-teal-50/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-teal-600 font-bold text-[15px]">⚡</span>
          <span className="font-semibold text-teal-800 text-[14px]">
            Circuit Breaker Monitoring — Live Stream
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          Streaming
        </span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Live text output */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            AI Output
          </p>
          <div
            ref={textRef}
            className="bg-white border border-slate-200 rounded-lg p-4 font-mono text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap overflow-y-auto"
            style={{ minHeight: '140px', maxHeight: '260px', lineHeight: '1.65' }}
          >
            {streamedText}
            {/* Blinking cursor */}
            <span className="inline-block w-2 h-3.5 bg-teal-500 ml-0.5 align-middle animate-pulse rounded-sm" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 tabular-nums">
            {streamedText.length} tokens streamed
          </p>
        </div>

        {/* Live risk monitor */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Live Risk Monitor
          </p>
          <LiveRiskBar score={liveRiskScore} />

          {/* Fired rules as pills */}
          {liveTriggeredRules.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {liveTriggeredRules.map((rule, i) => (
                <span
                  key={i}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200"
                >
                  ⚠ {rule.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Evaluating pulse */}
        <div className="flex items-center gap-2 text-[12px] text-teal-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          Evaluating tokens...
        </div>
      </div>
    </div>
  );
}

function MidStreamHaltedPanel({
  haltData,
  onReset,
}: {
  haltData: HaltData;
  onReset: () => void;
}) {
  const { riskScore, interceptedAtChar, triggeredRules, partialText } = haltData;

  return (
    <div className="bg-white border border-slate-200 rounded-xl border-l-4 border-l-amber-500 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-amber-50 bg-amber-50/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-600 font-bold text-[15px]">⚡</span>
          <span className="font-semibold text-amber-800 text-[14px]">
            Stream Intercepted Mid-Generation
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          ⚡ Mid-Stream Intercepted
        </span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Description */}
        <p className="text-[13px] text-slate-600 leading-relaxed">
          The Circuit Breaker cut the stream at character{' '}
          <strong className="text-slate-800 font-semibold">{interceptedAtChar}</strong> — before
          generation completed.
        </p>

        {/* Partial text — blurred/redacted */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Partial Output
          </p>
          <div className="relative rounded-lg border border-amber-200 overflow-hidden bg-amber-50/20">
            <p className="font-mono text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap p-4 select-none">
              {partialText}
            </p>
            {/* Gradient blur overlay on bottom 35% */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[35%] pointer-events-none"
              style={{
                background:
                  'linear-gradient(to bottom, transparent 0%, rgba(255,251,235,0.85) 50%, rgba(255,251,235,1) 100%)',
                backdropFilter: 'blur(3px)',
                WebkitBackdropFilter: 'blur(3px)',
              }}
            />
            {/* REDACTED badge */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
              <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded border bg-white/80 text-amber-700 border-amber-300 shadow-sm">
                REDACTED — Partial response withheld
              </span>
            </div>
          </div>
        </div>

        {/* Triggered rules */}
        {triggeredRules.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Triggered Rules
            </p>
            <div className="rounded-lg border border-red-100 bg-red-50/30 px-3 divide-y divide-red-100">
              {triggeredRules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wide flex-shrink-0 ${
                        SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.low
                      }`}
                    >
                      {rule.severity}
                    </span>
                    <span className="text-[13px] text-slate-700 truncate">{rule.name}</span>
                  </div>
                  {rule.score != null && (
                    <span className="text-[12px] font-semibold text-red-500 flex-shrink-0 ml-2">
                      +{rule.score}pts
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk bar */}
        <RiskBar score={riskScore} color="bg-amber-400" label="Intercept Risk Score" />

        {/* Approval notice */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[12px] text-slate-600">
          <span>📋</span>
          <span>An approval request has been created.</span>
          <Link
            to="/approvals"
            className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2 ml-1"
          >
            View approvals →
          </Link>
        </div>

        {/* Actions */}
        <button
          onClick={onReset}
          className="w-full text-[13px] font-semibold bg-slate-900 text-white px-4 py-2.5 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Start New Session
        </button>
      </div>
    </div>
  );
}

function CompletedPanel({
  streamedText,
  finalResult,
  baseResult,
  onReset,
}: {
  streamedText: string;
  finalResult: FinalResult | null;
  baseResult: SessionResult | null;
  onReset: () => void;
}) {
  const riskScore = finalResult?.riskScore ?? baseResult?.riskScore ?? 0;
  const tokensUsed = finalResult?.tokensUsed ?? baseResult?.tokensUsed ?? 0;
  const triggeredCount = baseResult?.triggeredRules?.length ?? 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl border-l-4 border-l-emerald-500 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 font-bold text-[15px]">✓</span>
          <span className="font-semibold text-slate-800 text-[14px]">
            Session Completed — Compliance Check Passed
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Session Completed
        </span>
      </div>
      <div className="px-5 py-4">
        <div
          className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap mb-4 bg-slate-50 rounded-lg p-3 border border-slate-100 overflow-y-auto"
          style={{ maxHeight: '260px' }}
        >
          {streamedText}
        </div>
        <RiskBar
          score={riskScore}
          color={riskScore >= 80 ? 'bg-red-500' : riskScore >= 40 ? 'bg-amber-400' : 'bg-emerald-500'}
        />
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
          <span>✓</span>
          <span>
            Stream completed — {tokensUsed} tokens · Risk score: {riskScore}/100 ·
            Mid-stream checks passed ✓
          </span>
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
          <span>Rules evaluated</span>
          <span className="text-slate-200">·</span>
          <span>
            {triggeredCount} violation{triggeredCount !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-200">·</span>
          <span>{tokensUsed} tokens</span>
          <span className="text-slate-200">·</span>
          <span className="font-mono text-slate-400">{baseResult?.sessionId?.slice(0, 16)}</span>
        </div>
        <button
          onClick={onReset}
          className="mt-4 w-full text-[13px] font-semibold border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Start New Session
        </button>
      </div>
    </div>
  );
}

function ErrorPanel({ message, onReset }: { message: string; onReset: () => void }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl border-l-4 border-l-red-500 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-red-50 bg-red-50/40 flex items-center gap-2">
        <span className="text-red-500 font-bold text-[15px]">✗</span>
        <span className="font-semibold text-red-800 text-[14px]">Stream Error</span>
      </div>
      <div className="px-5 py-4">
        <p className="text-[13px] text-slate-600 mb-4">{message}</p>
        <button
          onClick={onReset}
          className="w-full text-[13px] font-semibold bg-slate-900 text-white px-4 py-2.5 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  onReset,
}: {
  result: SessionResult;
  onReset: () => void;
}) {
  const { status, riskScore, triggeredRules, approvalId, responseText, tokensUsed, sessionId } =
    result;

  if (status === 'completed') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl border-l-4 border-l-emerald-500 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 font-bold text-[15px]">✓</span>
            <span className="font-semibold text-slate-800 text-[14px]">
              Session Completed — Compliance Check Passed
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Session Completed
          </span>
        </div>
        <div className="px-5 py-4">
          <div className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap mb-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
            {responseText}
          </div>
          <RiskBar score={riskScore} color="bg-emerald-500" />
          <p className="text-[11px] text-emerald-700 mt-1.5 font-medium">
            {riskScore < 40 ? 'Low Risk' : 'Moderate Risk'} — {riskScore}/100
          </p>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            <span>Rules evaluated</span>
            <span className="text-slate-200">·</span>
            <span>
              {triggeredRules?.length ?? 0} violation
              {(triggeredRules?.length ?? 0) !== 1 ? 's' : ''}
            </span>
            <span className="text-slate-200">·</span>
            <span>{tokensUsed ?? 0} tokens</span>
            <span className="text-slate-200">·</span>
            <span className="font-mono text-slate-400">{sessionId?.slice(0, 16)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'frozen') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl border-l-4 border-l-amber-400 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-amber-50 bg-amber-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-bold text-[15px]">⚠</span>
            <span className="font-semibold text-slate-800 text-[14px]">
              Session Frozen — Compliance Review Required
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Session Frozen
          </span>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] text-slate-600 mb-4">
            The Circuit Breaker detected a policy boundary breach. The AI response has been withheld
            pending human review.
          </p>
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Triggered Rules
            </p>
            <div className="rounded-lg border border-amber-100 bg-amber-50/30 px-3 divide-y divide-amber-100">
              {triggeredRules.map(rule => (
                <TriggeredRuleRow key={rule.id} rule={rule} />
              ))}
            </div>
          </div>
          {approvalId && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-4 text-[12px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Approval Request ID</span>
                <span className="font-mono font-semibold text-slate-700">{approvalId}</span>
              </div>
              <p className="text-slate-500 mt-1">
                A reviewer has been notified. The AI response is withheld until approved.
              </p>
            </div>
          )}
          <RiskBar score={riskScore} color="bg-amber-400" />
          <div className="mt-4 flex items-center gap-3">
            <Link
              to="/approvals"
              className="flex-1 text-center text-[13px] font-semibold bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
            >
              View in Approvals →
            </Link>
            <button
              onClick={onReset}
              className="text-[13px] text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              New Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'blocked') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl border-l-4 border-l-red-500 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-red-50 bg-red-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-bold text-[15px]">✗</span>
            <span className="font-semibold text-slate-800 text-[14px]">
              Session Blocked — Compliance Violation
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Session Blocked
          </span>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] text-slate-600 mb-4">
            Blocked at pre-flight.{' '}
            <strong className="text-slate-800">No AI call was made.</strong> The prompt triggered one
            or more critical compliance rules.
          </p>
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Triggered Rules
            </p>
            <div className="rounded-lg border border-red-100 bg-red-50/30 px-3 divide-y divide-red-100">
              {triggeredRules.map(rule => (
                <TriggeredRuleRow key={rule.id} rule={rule} />
              ))}
            </div>
          </div>
          <RiskBar score={riskScore} color="bg-red-500" />
          <p className="text-[11px] text-red-700 mt-1.5 font-medium">
            Risk Score: {riskScore}/100 — Threshold exceeded
          </p>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
            <span>🔐</span>
            <span>This event has been logged to the Audit Ledger.</span>
          </div>
          <button
            onClick={onReset}
            className="mt-4 w-full text-[13px] font-semibold bg-slate-900 text-white px-4 py-2.5 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Sessions() {
  const navigate = useNavigate();
  const [operator, setOperator] = useState<any>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey>('core');
  const [sessionType, setSessionType] = useState('General');
  const [promptText, setPromptText] = useState('');
  const [demoState, setDemoState] = useState<DemoState>('idle');
  const [evalStep, setEvalStep] = useState(0);
  const [currentResult, setCurrentResult] = useState<SessionResult | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Streaming state ──────────────────────────────────────────────────────
  const [streamedText, setStreamedText] = useState('');
  const [liveRiskScore, setLiveRiskScore] = useState(0);
  const [liveTriggeredRules, setLiveTriggeredRules] = useState<LiveRule[]>([]);
  const [haltData, setHaltData] = useState<HaltData | null>(null);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [streamError, setStreamError] = useState<string>('');

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const op = getOperator();
    if (!op) {
      navigate('/login');
      return;
    }
    setOperator(op);
    loadSessions(op.id);
  }, []);

  // Auto-set session type when module changes
  useEffect(() => {
    const types = MODULE_TYPES[activeModule];
    setSessionType(types[0]);
  }, [activeModule]);

  async function loadSessions(opId?: string) {
    setLoadingSessions(true);
    try {
      const id = opId || operator?.id;
      const data = await apiFetch(`/api/sessions${id ? `?operatorId=${id}` : ''}`);
      setSessions((Array.isArray(data) ? data : []).slice(0, 10));
    } catch {
      // non-critical
    } finally {
      setLoadingSessions(false);
    }
  }

  function handleStreamMessage(
    msg: any,
    accTextRef: React.MutableRefObject<string>,
  ) {
    if (msg.type === 'chunk') {
      accTextRef.current += msg.text ?? '';
      setStreamedText(accTextRef.current);
    } else if (msg.type === 'risk_update') {
      if (typeof msg.riskScore === 'number') {
        setLiveRiskScore(msg.riskScore);
      }
      if (Array.isArray(msg.newRules) && msg.newRules.length > 0) {
        setLiveTriggeredRules(prev => [...prev, ...msg.newRules]);
      }
    } else if (msg.type === 'halt') {
      setHaltData({
        riskScore: msg.riskScore ?? 0,
        interceptedAtChar: msg.interceptedAtChar ?? accTextRef.current.length,
        triggeredRules: msg.triggeredRules ?? [],
        partialText: msg.partialText ?? accTextRef.current,
      });
      setDemoState('midstream_halted');
    } else if (msg.type === 'done') {
      setFinalResult({
        tokensUsed: msg.tokensUsed ?? 0,
        riskScore: msg.riskScore ?? 0,
      });
      setDemoState('completed');
    } else if (msg.type === 'error') {
      setStreamError(msg.message ?? 'An error occurred during streaming.');
      setDemoState('error');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!promptText.trim() || demoState === 'evaluating' || demoState === 'streaming') return;
    if (!operator) return;

    setError(null);
    setDemoState('evaluating');
    setEvalStep(0);
    setCurrentResult(null);

    // Reset streaming state
    setStreamedText('');
    setLiveRiskScore(0);
    setLiveTriggeredRules([]);
    setHaltData(null);
    setFinalResult(null);
    setStreamError('');

    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    stepTimers.push(setTimeout(() => setEvalStep(1), 600));
    stepTimers.push(setTimeout(() => setEvalStep(2), 1200));

    try {
      // Step 1: Submit session (compliance pre-flight)
      const sessionRes = await apiFetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({
          operatorId: operator.id,
          operatorName: operator.name,
          sessionType,
          module: activeModule,
          promptText: promptText.trim(),
        }),
      });

      if (sessionRes.status === 'blocked' || sessionRes.status === 'frozen') {
        stepTimers.forEach(t => clearTimeout(t));
        setCurrentResult(sessionRes);
        setDemoState('result');
        loadSessions(operator.id);
        return;
      }

      // Step 2: If pending — stream the AI response
      await new Promise(r => setTimeout(r, 400)); // let final eval step animate
      stepTimers.forEach(t => clearTimeout(t));

      setCurrentResult(sessionRes);
      setDemoState('streaming');

      // Accumulate text across closure updates via ref
      const accTextRef = { current: '' };

      const abort = new AbortController();
      abortRef.current = abort;

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionRes.sessionId,
          prompt: promptText.trim(),
          module: activeModule,
          sessionType,
          operatorId: operator.id,
        }),
        signal: abort.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream request failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            handleStreamMessage(msg, accTextRef);
          } catch {
            // malformed line — skip
          }
        }
      }

      // Flush any remaining buffer content
      if (buffer.trim()) {
        try {
          const msg = JSON.parse(buffer);
          handleStreamMessage(msg, accTextRef);
        } catch {}
      }

      loadSessions(operator.id);
    } catch (err: any) {
      stepTimers.forEach(t => clearTimeout(t));
      if (err.name === 'AbortError') return;
      setError(err.message || 'Submission failed. Please try again.');
      setDemoState('idle');
    }
  }

  function handleReset() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setDemoState('idle');
    setCurrentResult(null);
    setPromptText('');
    setError(null);
    setStreamedText('');
    setLiveRiskScore(0);
    setLiveTriggeredRules([]);
    setHaltData(null);
    setFinalResult(null);
    setStreamError('');
  }

  const isSubmitting = demoState === 'evaluating' || demoState === 'streaming';

  return (
    <AppLayout>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">⚡</span>
            <h1 className="text-[22px] font-bold text-slate-900">AI Sessions</h1>
            <span className="text-[11px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-wide">
              Circuit Breaker
            </span>
          </div>
          <p className="text-[13px] text-slate-500 ml-10">
            Submit prompts through ACCRNOVA's compliance engine before AI processing
          </p>
        </div>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ── LEFT PANEL: Submission Form ── */}
          <div className="flex flex-col gap-4">
            <form
              onSubmit={handleSubmit}
              className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
            >
              {/* Module selector */}
              <div className="px-5 pt-5 pb-4 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  Module
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MODULES.map(mod => {
                    const key = mod.toLowerCase() as ModuleKey;
                    const isActive = activeModule === key;
                    return (
                      <button
                        key={mod}
                        type="button"
                        onClick={() => setActiveModule(key)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {mod}
                      </button>
                    );
                  })}
                </div>

                {/* Session type pills */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {MODULE_TYPES[activeModule].map(type => {
                    const isActive = sessionType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSessionType(type)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${
                          isActive
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prompt textarea */}
              <div className="px-5 py-4">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                  Prompt
                </label>
                <textarea
                  value={promptText}
                  onChange={e => setPromptText(e.target.value)}
                  placeholder="Enter your prompt — the Circuit Breaker will evaluate it before processing..."
                  rows={6}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all leading-relaxed"
                  style={{ minHeight: '160px' }}
                  disabled={isSubmitting}
                />
              </div>

              {/* Quick prompts */}
              <div className="px-5 pb-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Try these prompts
                </p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_PROMPTS[activeModule].map((qp, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPromptText(qp.text)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 text-left px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                          qp.label === 'Safe'
                            ? 'bg-emerald-100 text-emerald-700'
                            : qp.label === 'May flag'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {qp.label}
                      </span>
                      <span className="text-[12px] text-slate-600 group-hover:text-slate-800 transition-colors truncate">
                        {qp.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mx-5 mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12px] text-red-700">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit button */}
              <div className="px-5 pb-5">
                <button
                  type="submit"
                  disabled={isSubmitting || !promptText.trim()}
                  className="w-full bg-blue-600 text-white font-semibold text-[13px] py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {demoState === 'evaluating' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Evaluating...
                    </>
                  ) : demoState === 'streaming' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Streaming...
                    </>
                  ) : (
                    'Submit with Compliance Check →'
                  )}
                </button>
              </div>
            </form>

            {/* Recent sessions table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-[13px] font-semibold text-slate-800">Recent Sessions</h2>
                <button
                  onClick={() => loadSessions()}
                  className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Refresh
                </button>
              </div>
              {loadingSessions ? (
                <div className="px-5 py-8 flex justify-center">
                  <span className="w-5 h-5 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="px-5 py-8 text-center text-[13px] text-slate-400">
                  No sessions yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-5 py-2.5">
                          ID
                        </th>
                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-2.5">
                          Type
                        </th>
                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-2.5">
                          Status
                        </th>
                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-2.5">
                          Risk
                        </th>
                        <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-3 py-2.5">
                          When
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sessions.map(s => (
                        <tr
                          key={s.id}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="px-5 py-2.5">
                            <span className="font-mono text-[11px] text-slate-500">
                              {s.id?.slice(0, 14)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[12px] text-slate-600 capitalize">
                              {s.session_type}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusBadge(
                                s.status,
                              )}`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`text-[12px] font-bold ${
                                s.risk_score >= 80
                                  ? 'text-red-600'
                                  : s.risk_score >= 40
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {s.risk_score}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[11px] text-slate-400">
                              {timeAgo(s.created_at)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL: Live Result ── */}
          <div className="flex flex-col gap-4">
            {demoState === 'idle' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex-1">
                <div className="h-full flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mb-4">
                    ⚡
                  </div>
                  <h3 className="text-[16px] font-bold text-slate-800 mb-2">
                    Circuit Breaker Ready
                  </h3>
                  <p className="text-[13px] text-slate-400 max-w-xs">
                    Submit a prompt to begin compliance evaluation. Each session is evaluated against
                    active policy rules before any AI call is made.
                  </p>
                  <div className="mt-6 flex flex-col gap-2 w-full max-w-xs text-left">
                    {[
                      'Pre-flight rule evaluation',
                      'Energy score calculation',
                      'AI routing & generation',
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-3 text-[12px] text-slate-400">
                        <span className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-300">
                          {i + 1}
                        </span>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {demoState === 'evaluating' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                  <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  <span className="text-[14px] font-semibold text-slate-800">
                    Evaluating Compliance...
                  </span>
                </div>
                <div className="px-5 py-5">
                  <div className="flex flex-col gap-3">
                    {EVAL_STEPS.map((step, i) => {
                      const isActive = evalStep === i;
                      const isDone = evalStep > i;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 ${
                            isDone
                              ? 'bg-emerald-50 border-emerald-100'
                              : isActive
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-slate-50 border-slate-100 opacity-40'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isDone
                                ? 'bg-emerald-500'
                                : isActive
                                ? 'bg-blue-500'
                                : 'bg-slate-300'
                            }`}
                          >
                            {isDone ? (
                              <span className="text-white text-[10px] font-bold">✓</span>
                            ) : isActive ? (
                              <span className="w-2.5 h-2.5 border-2 border-white/40 border-t-white rounded-full animate-spin block" />
                            ) : (
                              <span className="text-white text-[10px] font-bold">{i + 1}</span>
                            )}
                          </div>
                          <span
                            className={`text-[13px] font-medium ${
                              isDone
                                ? 'text-emerald-700'
                                : isActive
                                ? 'text-blue-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 flex items-center gap-3 text-[12px] text-slate-400">
                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-700"
                        style={{
                          width: `${((evalStep + 1) / EVAL_STEPS.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span>
                      {evalStep + 1}/{EVAL_STEPS.length}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* New streaming state */}
            {demoState === 'streaming' && (
              <StreamingPanel
                streamedText={streamedText}
                liveRiskScore={liveRiskScore}
                liveTriggeredRules={liveTriggeredRules}
              />
            )}

            {/* Mid-stream halted */}
            {demoState === 'midstream_halted' && haltData && (
              <MidStreamHaltedPanel haltData={haltData} onReset={handleReset} />
            )}

            {/* Clean completion via stream */}
            {demoState === 'completed' && (
              <CompletedPanel
                streamedText={streamedText}
                finalResult={finalResult}
                baseResult={currentResult}
                onReset={handleReset}
              />
            )}

            {/* Stream error */}
            {demoState === 'error' && (
              <ErrorPanel message={streamError || 'An unexpected error occurred.'} onReset={handleReset} />
            )}

            {/* Legacy pre-flight result (blocked / frozen) */}
            {demoState === 'result' && currentResult && (
              <ResultCard result={currentResult} onReset={handleReset} />
            )}

            {/* Compliance info card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h3 className="text-[13px] font-semibold text-slate-700">
                  How the Circuit Breaker Works
                </h3>
              </div>
              <div className="px-5 py-4">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { icon: '🟢', label: 'Safe', desc: 'No rules triggered. AI responds normally.' },
                    {
                      icon: '🟡',
                      label: 'Frozen',
                      desc: 'Policy boundary hit. Human review required.',
                    },
                    {
                      icon: '🔴',
                      label: 'Blocked',
                      desc: 'Critical violation. No AI call made.',
                    },
                    {
                      icon: '⚡',
                      label: 'Intercepted',
                      desc: 'Stream cut mid-generation by real-time monitor.',
                    },
                  ].map(item => (
                    <div key={item.label} className="text-center">
                      <div className="text-2xl mb-1.5">{item.icon}</div>
                      <p className="text-[12px] font-semibold text-slate-700 mb-1">{item.label}</p>
                      <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
