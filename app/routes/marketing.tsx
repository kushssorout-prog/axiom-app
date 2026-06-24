import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '~/components/AppLayout';

type ContentItem = {
  id: string;
  vertical: string;
  type: string;
  title: string;
  content: string;
  status: string;
  published_at: number | null;
  performance_score: number;
  created_at: number;
};

type Lead = {
  id: string;
  email: string;
  firm_name: string;
  firm_size: string;
  sector: string;
  source: string;
  lead_score: number;
  status: string;
  created_at: number;
};

type MarketingStats = {
  total: number;
  approved: number;
  published: number;
  byVertical: { vertical: string; count: number }[];
};

const TYPE_LABELS: Record<string, string> = {
  linkedin_post: 'LinkedIn',
  blog_intro: 'Blog',
  email_subject: 'Email',
};

const TYPE_COLORS: Record<string, string> = {
  linkedin_post: 'bg-blue-100 text-blue-700 border-blue-200',
  blog_intro: 'bg-violet-100 text-violet-700 border-violet-200',
  email_subject: 'bg-teal-100 text-teal-700 border-teal-200',
};

const VERTICAL_COLORS: Record<string, string> = {
  legal: 'bg-amber-100 text-amber-700 border-amber-200',
  finance: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  healthcare: 'bg-pink-100 text-pink-700 border-pink-200',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  approved: 'bg-green-100 text-green-700',
  published: 'bg-blue-100 text-blue-700',
};

const EMAIL_SEQUENCES = [
  {
    day: 0,
    subject: 'Welcome to ACCRNOVA — Here\'s what happens next',
    preview: 'Your AI governance journey starts here. Let\'s show you what\'s possible.',
    condition: 'On signup',
    status: 'Active',
  },
  {
    day: 3,
    subject: 'The AI risk no one in [sector] is talking about',
    preview: 'Most firms don\'t discover the gap until it\'s too late. Here\'s what to watch for.',
    condition: '3 days after signup',
    status: 'Active',
  },
  {
    day: 7,
    subject: 'One question for you, [name]',
    preview: 'We\'d love to understand your current AI governance setup — 2 min read.',
    condition: '7 days, no demo booked',
    status: 'Active',
  },
  {
    day: 30,
    subject: 'ACCRNOVA is ready for your firm',
    preview: 'Everything in place. Here\'s how leading firms in your sector are deploying it.',
    condition: '30 days, warm leads only',
    status: 'Paused',
  },
];

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 60 ? 'bg-green-500' : score >= 30 ? 'bg-amber-500' : 'bg-red-500';
  const textColor =
    score >= 60 ? 'text-green-700' : score >= 30 ? 'text-amber-700' : 'text-red-700';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${textColor}`}>{score}</span>
    </div>
  );
}

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<'content' | 'leads'>('content');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<MarketingStats>({ total: 0, approved: 0, published: 0, byVertical: [] });
  const [verticalFilter, setVerticalFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [contentRes, leadsRes, statsRes] = await Promise.all([
        fetch('/api/marketing/content'),
        fetch('/api/leads'),
        fetch('/api/marketing/stats'),
      ]);
      if (contentRes.ok) setContent(await contentRes.json());
      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch('/api/marketing/generate', { method: 'POST' });
      await fetchAll();
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/marketing/content/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setContent(prev =>
      prev.map(c => c.id === id ? { ...c, status } : c)
    );
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const filteredContent = content.filter(c => {
    if (verticalFilter !== 'all' && c.vertical !== verticalFilter) return false;
    if (typeFilter !== 'all') {
      const typeMap: Record<string, string> = { linkedin: 'linkedin_post', blog: 'blog_intro', email: 'email_subject' };
      if (c.type !== (typeMap[typeFilter] || typeFilter)) return false;
    }
    return true;
  });

  const hotLeads = leads.filter(l => l.lead_score >= 60).length;
  const warmLeads = leads.filter(l => l.lead_score >= 30 && l.lead_score < 60).length;
  const coldLeads = leads.filter(l => l.lead_score < 30).length;

  const maxVerticalCount = Math.max(...stats.byVertical.map(v => v.count), 1);

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Marketing Engine</h1>
            <p className="text-slate-500 mt-1">Agentic content pipeline + lead management</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Cron: Mon 9am UTC
            </span>
          </div>
        </div>

        {/* Performance Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Generated', value: stats.total, icon: '✍️', color: 'text-slate-700' },
            { label: 'Approved', value: stats.approved, icon: '✅', color: 'text-green-700' },
            { label: 'Published', value: stats.published, icon: '🚀', color: 'text-blue-700' },
          ].map(metric => (
            <div key={metric.label} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{metric.icon}</span>
                <div>
                  <div className={`text-3xl font-bold ${metric.color}`}>{metric.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{metric.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content by Vertical Bar Chart */}
        {stats.byVertical.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Content by Vertical</h3>
            <div className="flex gap-6 items-end h-20">
              {['legal', 'finance', 'healthcare'].map(v => {
                const found = stats.byVertical.find(b => b.vertical === v);
                const count = found?.count || 0;
                const heightPct = maxVerticalCount > 0 ? (count / maxVerticalCount) * 100 : 0;
                const colors: Record<string, string> = {
                  legal: 'bg-amber-400',
                  finance: 'bg-emerald-400',
                  healthcare: 'bg-pink-400',
                };
                return (
                  <div key={v} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-xs font-bold text-slate-600">{count}</span>
                    <div className="w-full rounded-t-md" style={{ height: `${Math.max(4, heightPct * 0.6)}px` }}>
                      <div className={`w-full h-full rounded-t-md ${colors[v]}`} />
                    </div>
                    <span className="text-xs text-slate-500 capitalize">{v}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex border-b border-slate-200">
            {(['content', 'leads'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'content' ? '📝 Content Queue' : '🎯 Lead Management'}
              </button>
            ))}
          </div>

          {/* CONTENT QUEUE TAB */}
          {activeTab === 'content' && (
            <div className="p-5">
              {/* Filters + Generate */}
              <div className="flex items-center gap-3 flex-wrap mb-5">
                <select
                  value={verticalFilter}
                  onChange={e => setVerticalFilter(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white"
                >
                  <option value="all">All Verticals</option>
                  <option value="legal">Legal</option>
                  <option value="finance">Finance</option>
                  <option value="healthcare">Healthcare</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="blog">Blog</option>
                  <option value="email">Email</option>
                </select>
                <div className="ml-auto">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors"
                  >
                    {generating ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>⚡ Generate Now</>
                    )}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3 animate-pulse">
                      <div className="h-4 bg-slate-100 rounded w-1/2" />
                      <div className="h-16 bg-slate-100 rounded" />
                      <div className="h-4 bg-slate-100 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : filteredContent.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">📭</div>
                  <p className="text-slate-500 font-medium">No content generated yet.</p>
                  <p className="text-slate-400 text-sm mt-1">Click <strong>Generate Now</strong> to run the content engine.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredContent.map(item => (
                    <div key={item.id} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-300 transition-colors">
                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[item.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {TYPE_LABELS[item.type] || item.type}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${VERTICAL_COLORS[item.vertical] || 'bg-slate-100 text-slate-600 border-slate-200'} capitalize`}>
                          {item.vertical}
                        </span>
                        <span className={`ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-500'} capitalize`}>
                          {item.status}
                        </span>
                      </div>

                      {/* Content Preview */}
                      <p className="text-xs text-slate-600 leading-relaxed flex-1">
                        {item.content.length > 150 ? item.content.slice(0, 150) + '…' : item.content}
                      </p>

                      {/* Date */}
                      <p className="text-[11px] text-slate-400">
                        Generated {new Date(item.created_at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        {item.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'approved')}
                            className="flex-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            ✓ Approve
                          </button>
                        )}
                        {item.status === 'approved' && (
                          <button
                            onClick={() => handleStatusChange(item.id, 'published')}
                            className="flex-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            🚀 Mark Published
                          </button>
                        )}
                        {item.status === 'published' && (
                          <span className="flex-1 text-xs font-medium text-center text-blue-600 px-2 py-1.5">✓ Published</span>
                        )}
                        <button
                          onClick={() => handleCopy(item.id, item.content)}
                          className="text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                          {copied === item.id ? '✓ Copied!' : '⎘ Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LEAD MANAGEMENT TAB */}
          {activeTab === 'leads' && (
            <div className="p-5 space-y-5">
              {/* Lead Stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Leads', value: leads.length, color: 'text-slate-700', bg: 'bg-slate-50' },
                  { label: 'Hot (≥60)', value: hotLeads, color: 'text-green-700', bg: 'bg-green-50' },
                  { label: 'Warm (30–59)', value: warmLeads, color: 'text-amber-700', bg: 'bg-amber-50' },
                  { label: 'Cold (<30)', value: coldLeads, color: 'text-red-700', bg: 'bg-red-50' },
                ].map(stat => (
                  <div key={stat.label} className={`${stat.bg} border border-slate-200 rounded-xl p-4 text-center`}>
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Leads Table */}
              {leads.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="font-medium text-slate-500">No leads captured yet.</p>
                  <p className="text-sm mt-1">Leads appear here when captured via the free assessment or API.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {['Email', 'Firm', 'Size', 'Sector', 'Score', 'Source', 'Status', 'Date'].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leads.map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-700 font-medium">{lead.email}</td>
                          <td className="px-4 py-3 text-slate-600">{lead.firm_name || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{lead.firm_size || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 capitalize">{lead.sector || '—'}</td>
                          <td className="px-4 py-3">
                            <ScoreBar score={lead.lead_score} />
                          </td>
                          <td className="px-4 py-3 text-slate-500 capitalize">{lead.source || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                              lead.status === 'new' ? 'bg-blue-50 text-blue-700' :
                              lead.status === 'contacted' ? 'bg-amber-50 text-amber-700' :
                              'bg-green-50 text-green-700'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {new Date(lead.created_at * 1000).toLocaleDateString('en-GB')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Lead Scoring Breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">How Leads Are Scored</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Firm size 500+', points: '+40 pts' },
                    { label: 'Firm size 100–500', points: '+30 pts' },
                    { label: 'Legal / Finance sector', points: '+30 pts' },
                    { label: 'Healthcare sector', points: '+25 pts' },
                    { label: 'Referral source', points: '+20 pts' },
                    { label: 'Demo source', points: '+15 pts' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-600">{item.label}</span>
                      <span className="text-xs font-bold text-green-700">{item.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Email Sequences */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">📧 Email Nurture Sequences</h2>
              <p className="text-xs text-slate-500 mt-0.5">4-email sequence for new signups</p>
            </div>
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full font-medium">
              Connect Resend to activate sending
            </span>
          </div>
          <div className="p-5">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[28px] top-8 bottom-8 w-0.5 bg-slate-200" />
              <div className="space-y-4">
                {EMAIL_SEQUENCES.map((seq, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    {/* Day badge */}
                    <div className={`relative z-10 flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center text-center ${
                      seq.status === 'Active' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <span className="text-[10px] font-medium opacity-70">Day</span>
                      <span className="text-lg font-bold leading-none">{seq.day}</span>
                    </div>
                    {/* Content */}
                    <div className={`flex-1 border rounded-xl p-4 ${seq.status === 'Active' ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{seq.subject}</p>
                          <p className="text-xs text-slate-500 mt-1">{seq.preview}</p>
                          <p className="text-[11px] text-slate-400 mt-2">
                            <span className="font-medium">Send condition:</span> {seq.condition}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          seq.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {seq.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              💡 <strong>Note:</strong> Connect Resend or Mailchimp to activate email sending. Currently generating sequences for approval.
            </p>
          </div>
        </div>

        {/* Agentic Setup Guide */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setHowItWorksOpen(prev => !prev)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🤖</span>
              <div className="text-left">
                <h2 className="text-sm font-semibold text-slate-900">How the Agentic Marketing Engine Works</h2>
                <p className="text-xs text-slate-500">Setup guide + automation overview</p>
              </div>
            </div>
            <span className="text-slate-400 text-lg">{howItWorksOpen ? '▲' : '▼'}</span>
          </button>

          {howItWorksOpen && (
            <div className="border-t border-slate-100 p-5 space-y-5">
              {/* Automated */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-green-800 mb-3">✅ AUTOMATED — runs without you</h3>
                <ul className="space-y-2">
                  {[
                    'Monday 9am: AI generates content for all 3 verticals × 3 formats = 9 pieces/week',
                    'On signup: Lead score calculated, segment assigned, email sequence triggered',
                    'Daily: Lead scoring refreshed, hot leads flagged',
                  ].map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-green-700">
                      <span className="mt-0.5">▸</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Semi-automated */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-blue-800 mb-3">📋 SEMI-AUTOMATED — 1-click for you</h3>
                <ul className="space-y-2">
                  {[
                    'Review generated content → Approve → Copy to LinkedIn/Blog',
                    'Review email sequences → Approve → Send when Resend is connected',
                  ].map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-blue-700">
                      <span className="mt-0.5">▸</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Needs input */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-amber-800 mb-3">🔌 NEEDS YOUR INPUT ONCE</h3>
                <ul className="space-y-2">
                  {[
                    'Connect email sender (Resend.com — free tier: 100 emails/day)',
                    'Point accrnova.app domain to Cloudflare',
                    'First 3 LinkedIn posts from the queue → schedule manually',
                  ].map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm text-amber-700">
                      <span className="mt-0.5">▸</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
