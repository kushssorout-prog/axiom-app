import { useState } from 'react';
import { AppLayout } from '~/components/AppLayout';

const TELEGRAM_WEBHOOK = 'https://axiom-app-d1wced.camelai.app/api/telegram/webhook';
const DISCORD_ENDPOINT = 'https://axiom-app-d1wced.camelai.app/api/discord/interactions';

const TELEGRAM_COMMANDS = [
  { cmd: '/start', desc: 'Connect and activate the bot' },
  { cmd: '/status', desc: 'Platform overview and stats' },
  { cmd: '/approvals', desc: 'List pending reviews (inline approve/reject buttons)' },
];

function CopyableUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 bg-slate-900 rounded-xl px-4 py-3">
      <code className="flex-1 text-xs text-emerald-400 font-mono overflow-x-auto whitespace-nowrap">{url}</code>
      <button
        onClick={copy}
        className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
          copied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        {copied ? '✓ Copied' : '⎘ Copy'}
      </button>
    </div>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
        <span className="text-xs text-slate-400 font-mono">{language}</span>
        <button onClick={copy} className="text-xs text-slate-400 hover:text-white transition-colors">
          {copied ? '✓ Copied' : '⎘ Copy'}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-200 text-xs p-4 overflow-x-auto leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
      {n}
    </span>
  );
}

export default function Integrations() {
  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Bot Integrations</h1>
          <p className="text-slate-500 text-sm mt-1">Approve sessions from Telegram and Discord</p>
        </div>

        {/* Telegram + Discord grid */}
        <div className="grid md:grid-cols-2 gap-5 mb-5">

          {/* ─── TELEGRAM ─── */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Card header */}
            <div className="bg-[#229ED9]/10 border-b border-[#229ED9]/20 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#229ED9] flex items-center justify-center text-white text-xl">
                ✈️
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-slate-900 text-base">Telegram</h2>
                <p className="text-xs text-slate-500">Inline approval buttons via DM</p>
              </div>
              <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                ● Webhook Ready
              </span>
            </div>

            <div className="p-6 space-y-5">
              {/* Setup steps */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Setup</p>
                <ol className="space-y-3">
                  {[
                    <>Message <strong>@BotFather</strong> on Telegram → type <code className="bg-slate-100 px-1 rounded text-xs">/newbot</code></>,
                    <>Name your bot (e.g. <em>"ACCRNOVA Compliance Bot"</em>)</>,
                    <>Copy the <strong>bot token</strong> you receive</>,
                    <>Add it to your ACCRNOVA environment: <code className="bg-slate-100 px-1 rounded text-xs">TELEGRAM_BOT_TOKEN=your_token</code></>,
                    <>Register webhook (one-time):</>,
                    <>Message your bot <code className="bg-slate-100 px-1 rounded text-xs">/start</code></>,
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} />
                      <span className="text-sm text-slate-700 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Register webhook code */}
              <CodeBlock
                language="http — register webhook"
                code={`POST https://api.telegram.org/bot{YOUR_TOKEN}/setWebhook\nContent-Type: application/json\n\n{\n  "url": "${TELEGRAM_WEBHOOK}"\n}`}
              />

              {/* Webhook URL */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Webhook URL</p>
                <CopyableUrl url={TELEGRAM_WEBHOOK} />
              </div>

              {/* Commands */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Bot Commands</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Command</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {TELEGRAM_COMMANDS.map(c => (
                        <tr key={c.cmd} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <code className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono">{c.cmd}</code>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">{c.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* ─── DISCORD ─── */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Card header */}
            <div className="bg-violet-500/10 border-b border-violet-200 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 00-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 00-5.487 0 12.36 12.36 0 00-.617-1.23A.077.077 0 008.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 00-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 00.031.055 20.03 20.03 0 005.993 2.98.078.078 0 00.084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 01-1.872-.878.075.075 0 01-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 01.078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 01.079.009c.12.098.245.195.372.288a.075.075 0 01-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 00-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 00.084.028 19.963 19.963 0 006.002-2.981.076.076 0 00.032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 00-.031-.028z"/>
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-slate-900 text-base">Discord</h2>
                <p className="text-xs text-slate-500">Slash commands for your server</p>
              </div>
              <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                ● Endpoint Ready
              </span>
            </div>

            <div className="p-6 space-y-5">
              {/* Setup steps */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Setup</p>
                <ol className="space-y-3">
                  {[
                    <>Go to <strong>discord.com/developers</strong> → New Application → name it <em>"ACCRNOVA"</em></>,
                    <>Bot tab → Add Bot → copy the <strong>bot token</strong></>,
                    <>OAuth2 → URL Generator → check <code className="bg-slate-100 px-1 rounded text-xs">bot</code> + <code className="bg-slate-100 px-1 rounded text-xs">applications.commands</code> → copy invite link → add to server</>,
                    <>General Information → set <strong>Interactions Endpoint URL</strong> to the URL below</>,
                    <>Register slash commands using the curl below</>,
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} />
                      <span className="text-sm text-slate-700 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Endpoint URL */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Interactions Endpoint URL</p>
                <CopyableUrl url={DISCORD_ENDPOINT} />
              </div>

              {/* Register commands */}
              <CodeBlock
                language="bash — register slash commands"
                code={`curl -X POST \\
  https://discord.com/api/v10/applications/{APP_ID}/commands \\
  -H "Authorization: Bot {BOT_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '[
    {
      "name": "status",
      "description": "Get ACCRNOVA platform status"
    },
    {
      "name": "approvals",
      "description": "List pending AI session approvals"
    }
  ]'`}
              />
            </div>
          </div>
        </div>

        {/* ─── WHATSAPP ─── */}
        <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Card header */}
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center text-white text-xl">
              💬
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-bold text-slate-900 text-base">WhatsApp Business</h2>
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300 px-2.5 py-1 rounded-full">
                  ⚠ Setup Required — Pending Meta Approval
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Compliance alerts via WhatsApp Business API</p>
            </div>
          </div>

          <div className="px-6 py-5 flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 leading-relaxed">
                WhatsApp Business API requires <strong>Meta Business Verification</strong>, which typically takes 3–6 weeks.
                Email <a href="mailto:hello@accrnova.app" className="text-blue-600 hover:underline">hello@accrnova.app</a> to join
                the waitlist — we'll notify you as soon as the integration is ready to activate.
              </p>
            </div>
            <a
              href="mailto:hello@accrnova.app?subject=WhatsApp%20Integration%20Waitlist&body=Hi%2C%20I%27d%20like%20to%20join%20the%20WhatsApp%20Business%20API%20waitlist%20for%20ACCRNOVA."
              className="flex-shrink-0 flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#22c55e] transition-colors"
            >
              Join WhatsApp Waitlist →
            </a>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
