import { useState } from 'react';
import { Link } from 'react-router';

const ENDPOINTS = [
  { method: 'POST', path: '/api/public/check', auth: 'API Key', desc: 'Run compliance check on a prompt' },
  { method: 'GET', path: '/api/sessions', auth: 'Bearer', desc: 'List AI sessions' },
  { method: 'POST', path: '/api/sessions', auth: 'Bearer', desc: 'Submit a new AI session' },
  { method: 'GET', path: '/api/approvals', auth: 'Bearer', desc: 'List pending approvals' },
  { method: 'POST', path: '/api/approvals/:id', auth: 'Bearer', desc: 'Review / resolve an approval' },
  { method: 'GET', path: '/api/audit', auth: 'Bearer', desc: 'Query the audit ledger' },
  { method: 'GET', path: '/api/dashboard', auth: 'Bearer', desc: 'Platform-wide stats' },
];

const JS_EXAMPLE = `// 1. Install nothing — pure fetch API
const AXIOM_KEY = 'acn_your_key_here';

// Run a compliance check
async function checkCompliance(prompt, module = 'general') {
  const res = await fetch('https://accrnova.app/api/public/check', {
    method: 'POST',
    headers: {
      'X-Axiom-Key': AXIOM_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, module }),
  });

  const result = await res.json();
  // result.allowed → true/false — whether to proceed
  // result.riskScore → 0–100
  // result.status → 'completed' | 'frozen' | 'blocked'

  if (!result.allowed) {
    console.warn('Blocked by ACCRNOVA:', result.message);
    return null;
  }

  return result;
}

// Example usage
const check = await checkCompliance(
  'Draft NDA summary for acquisition',
  'legal'
);

if (check?.allowed) {
  // Proceed with your AI call
}`;

const PYTHON_EXAMPLE = `import requests

AXIOM_KEY = "acn_your_key_here"
BASE_URL = "https://accrnova.app"

def check_compliance(prompt: str, module: str = "general") -> dict:
    """Run an ACCRNOVA compliance check before any AI call."""
    response = requests.post(
        f"{BASE_URL}/api/public/check",
        headers={
            "X-Axiom-Key": AXIOM_KEY,
            "Content-Type": "application/json",
        },
        json={"prompt": prompt, "module": module},
    )
    response.raise_for_status()
    return response.json()

# Example usage
result = check_compliance(
    prompt="Summarise the merger agreement",
    module="legal"
)

if result["allowed"]:
    print(f"Cleared — risk score: {result['riskScore']}")
    # Proceed with your AI call
else:
    print(f"Blocked: {result['message']}")
    # Handle blocked case

# List recent sessions
sessions = requests.get(
    f"{BASE_URL}/api/sessions",
    headers={"Authorization": "Bearer YOUR_JWT_TOKEN"},
).json()`;

const CURL_EXAMPLE = `# Compliance check (API Key auth)
curl -X POST https://accrnova.app/api/public/check \\
  -H "X-Axiom-Key: acn_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Draft NDA summary", "module": "legal"}'

# ─────────────────────────────────────────

# List sessions (Bearer auth)
curl https://accrnova.app/api/sessions \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# ─────────────────────────────────────────

# Review an approval
curl -X POST https://accrnova.app/api/approvals/appr_abc123 \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"decision": "approved", "note": "Reviewed and cleared"}'

# ─────────────────────────────────────────

# Query audit log
curl "https://accrnova.app/api/audit?limit=20&offset=0" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN"`;

const SECTIONS = [
  { id: 'authentication', label: 'Authentication' },
  { id: 'quickstart', label: 'Quick Start' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'response-schema', label: 'Response Schema' },
  { id: 'examples', label: 'Code Examples' },
  { id: 'sdk', label: 'SDK' },
];

type CodeTab = 'js' | 'python' | 'curl';

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    POST: 'bg-blue-50 text-blue-700 border-blue-200',
    DELETE: 'bg-red-50 text-red-700 border-red-200',
    PATCH: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border font-mono ${colors[method] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {method}
    </span>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between bg-slate-800 px-4 py-2.5">
        <span className="text-xs text-slate-400 font-mono">{language}</span>
        <button
          onClick={copy}
          className="text-xs text-slate-400 hover:text-white transition-colors font-medium"
        >
          {copied ? '✓ Copied' : '⎘ Copy'}
        </button>
      </div>
      <pre className="bg-slate-900 text-slate-100 text-sm p-5 overflow-x-auto leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ApiDocs() {
  const [activeTab, setActiveTab] = useState<CodeTab>('js');

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top nav */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xs">A</div>
            <span className="font-bold text-slate-900 text-[15px]">ACCRNOVA REST API</span>
            <span className="text-xs font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">v2.0</span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5">
              ← Dashboard
            </Link>
            <Link to="/api-keys" className="text-sm font-semibold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
              Get API Key
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 flex gap-10">
        {/* Sidebar */}
        <aside className="hidden lg:block w-48 flex-shrink-0">
          <div className="sticky top-24">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">On this page</p>
            <nav className="space-y-0.5">
              {SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className="block w-full text-left text-sm text-slate-600 hover:text-slate-900 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 max-w-4xl space-y-14">

          {/* Hero */}
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">ACCRNOVA REST API</h1>
            <p className="text-lg text-slate-500 mt-3 leading-relaxed">
              Integrate ACCRNOVA's AI governance engine directly into your applications.
              Run compliance checks, manage sessions, and access audit data programmatically.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200">Base URL: https://accrnova.app</span>
              <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">● Live</span>
            </div>
          </div>

          {/* 1. Authentication */}
          <section id="authentication">
            <h2 className="text-xl font-bold text-slate-900 mb-1">1. Authentication</h2>
            <div className="w-10 h-0.5 bg-blue-600 mb-4 rounded-full"></div>
            <p className="text-slate-600 mb-4 leading-relaxed">
              All authenticated routes require one of two auth methods:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Bearer Token</p>
                <p className="text-sm text-slate-700">Login-based auth. Use the JWT returned by <code className="bg-slate-200 px-1 rounded text-xs">/api/login</code>. Best for operator dashboards.</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">X-ACCRNOVA-Key Header</p>
                <p className="text-sm text-slate-700">API key auth. Pass your <code className="bg-blue-100 px-1 rounded text-xs">axm_...</code> key in the header. Best for server-to-server calls.</p>
              </div>
            </div>
            <CodeBlock
              language="bash — API key authentication"
              code={`curl https://accrnova.app/api/public/check \\
  -H "X-Axiom-Key: acn_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Your AI prompt here", "module": "general"}'`}
            />
          </section>

          {/* 2. Quick Start */}
          <section id="quickstart">
            <h2 className="text-xl font-bold text-slate-900 mb-1">2. Quick Start — Compliance Check</h2>
            <div className="w-10 h-0.5 bg-blue-600 mb-4 rounded-full"></div>
            <p className="text-slate-600 mb-4 leading-relaxed">
              The most common integration: run a compliance check <em>before</em> every AI call to gate unsafe prompts automatically.
            </p>
            <CodeBlock
              language="javascript"
              code={`const res = await fetch('https://accrnova.app/api/public/check', {
  method: 'POST',
  headers: {
    'X-Axiom-Key': 'axm_...',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ prompt: 'Draft NDA summary', module: 'legal' }),
});

const { status, riskScore, allowed } = await res.json();
// status: 'completed' | 'frozen' | 'blocked'
// riskScore: 0–100 (higher = riskier)
// allowed: true/false — whether to proceed with the AI call

if (!allowed) {
  // Block the request — ACCRNOVA flagged it
  return { error: 'Prompt blocked by compliance policy' };
}`}
            />
          </section>

          {/* 3. Endpoints */}
          <section id="endpoints">
            <h2 className="text-xl font-bold text-slate-900 mb-1">3. Endpoints</h2>
            <div className="w-10 h-0.5 bg-blue-600 mb-4 rounded-full"></div>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Method</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Path</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Auth</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ENDPOINTS.map((ep, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <MethodBadge method={ep.method} />
                      </td>
                      <td className="px-5 py-3.5">
                        <code className="text-xs text-slate-800 font-mono">{ep.path}</code>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          ep.auth === 'API Key'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ep.auth}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{ep.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Response Schema */}
          <section id="response-schema">
            <h2 className="text-xl font-bold text-slate-900 mb-1">4. Response Schema</h2>
            <div className="w-10 h-0.5 bg-blue-600 mb-4 rounded-full"></div>
            <p className="text-slate-600 mb-4">The <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">/api/public/check</code> endpoint returns:</p>
            <CodeBlock
              language="json — compliance check response"
              code={`{
  "sessionId": "sess_abc123",
  "status": "blocked",
  "allowed": false,
  "riskScore": 80,
  "triggeredRules": [
    {
      "name": "Attorney-Client Privilege Guard",
      "severity": "critical",
      "scoreImpact": 40
    }
  ],
  "message": "Session blocked by Circuit Breaker."
}`}
            />
            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-700 mb-3">Status values</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <code className="text-xs font-bold text-emerald-800">completed</code>
                  <span className="text-xs text-emerald-700">— Passed all checks</span>
                </div>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <code className="text-xs font-bold text-amber-800">frozen</code>
                  <span className="text-xs text-amber-700">— Pending human review</span>
                </div>
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <code className="text-xs font-bold text-red-800">blocked</code>
                  <span className="text-xs text-red-700">— Rejected by Circuit Breaker</span>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Code Examples */}
          <section id="examples">
            <h2 className="text-xl font-bold text-slate-900 mb-1">5. Code Examples</h2>
            <div className="w-10 h-0.5 bg-blue-600 mb-4 rounded-full"></div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-5">
              {(['js', 'python', 'curl'] as CodeTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab === 'js' ? 'JavaScript' : tab === 'python' ? 'Python' : 'cURL'}
                </button>
              ))}
            </div>

            {activeTab === 'js' && <CodeBlock language="javascript" code={JS_EXAMPLE} />}
            {activeTab === 'python' && <CodeBlock language="python" code={PYTHON_EXAMPLE} />}
            {activeTab === 'curl' && <CodeBlock language="bash" code={CURL_EXAMPLE} />}
          </section>

          {/* 6. SDK */}
          <section id="sdk">
            <h2 className="text-xl font-bold text-slate-900 mb-1">6. SDK</h2>
            <div className="w-10 h-0.5 bg-blue-600 mb-4 rounded-full"></div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <code className="text-sm font-mono font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                    npm install @axiom-gov/sdk
                  </code>
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                    Coming Soon
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  A fully-typed TypeScript/JavaScript SDK with automatic retries, rate-limit handling, and React hooks.
                </p>
              </div>
              <a
                href="mailto:hello@accrnova.app?subject=SDK Early Access"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex-shrink-0"
              >
                → Join Early Access
              </a>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-slate-100 pt-8 pb-4 flex items-center justify-between text-sm text-slate-400">
            <span>© 2025 ACCRNOVA Governance Inc.</span>
            <a href="mailto:hello@accrnova.app" className="hover:text-slate-600 transition-colors">hello@accrnova.app</a>
          </div>
        </main>
      </div>
    </div>
  );
}
