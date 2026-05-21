import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { AppLayout } from '~/components/AppLayout';
import { authFetch, getOperator, timeAgo } from '~/lib/api';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsed: number | null;
  status: 'active' | 'revoked';
  createdAt: number;
}

const ALL_SCOPES = ['sessions', 'approvals', 'audit'];

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['sessions', 'approvals', 'audit']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const operator = getOperator();

  const loadKeys = async () => {
    if (!operator?.id) return;
    try {
      setLoading(true);
      const data = await authFetch(`/api/keys/list/${operator.id}`);
      setKeys(data.keys || data || []);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadKeys(); }, []);

  const toggleScope = (scope: string) => {
    setNewKeyScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleCreate = async () => {
    if (!newKeyName.trim() || newKeyScopes.length === 0) return;
    setCreating(true);
    try {
      const data = await authFetch('/api/keys/create', {
        method: 'POST',
        body: JSON.stringify({ operatorId: operator?.id, name: newKeyName.trim(), scopes: newKeyScopes }),
      });
      setCreatedKey(data.key || data.apiKey || '');
      setShowModal(false);
      setNewKeyName('');
      setNewKeyScopes(['sessions', 'approvals', 'audit']);
      await loadKeys();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await authFetch(`/api/keys/${id}`, { method: 'DELETE' });
      setRevokeConfirm(null);
      await loadKeys();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRevoking(null);
    }
  };

  const copyKey = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
            <p className="text-slate-500 text-sm mt-1">Connect Axiom to external tools via the REST API</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <span>+</span> New API Key
          </button>
        </div>

        {/* Info box */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-blue-500 text-lg flex-shrink-0">ℹ</span>
          <div>
            <p className="text-sm text-blue-800">
              These keys authenticate the Axiom browser extension, SDK integrations, and REST API calls.
            </p>
            <Link to="/api-docs" className="text-sm font-semibold text-blue-600 hover:text-blue-700 mt-1 inline-block">
              → View API Documentation
            </Link>
          </div>
        </div>

        {/* Newly created key banner */}
        {createdKey && (
          <div className="mb-6 bg-white border border-amber-300 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-amber-400 px-4 py-2.5 flex items-center gap-2">
              <span className="text-amber-900 font-bold text-sm">⚠ Store this key now — it cannot be shown again</span>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600 mb-3">Your new API key has been created. Copy it now — we don't store the full key.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-900 text-emerald-400 text-sm font-mono px-4 py-3 rounded-lg overflow-x-auto whitespace-nowrap">
                  {createdKey}
                </code>
                <button
                  onClick={() => copyKey(createdKey)}
                  className="flex-shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-3 rounded-lg text-sm font-medium transition-colors"
                >
                  {copied ? '✓ Copied!' : '⎘ Copy'}
                </button>
              </div>
              <button
                onClick={() => setCreatedKey(null)}
                className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                I've saved it — dismiss
              </button>
            </div>
          </div>
        )}

        {/* Keys Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading keys…</div>
          ) : keys.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-3xl mb-3">🔑</p>
              <p className="text-slate-600 font-medium">No API keys yet</p>
              <p className="text-slate-400 text-sm mt-1">Create your first key to start integrating with Axiom</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Key Prefix</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Scopes</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Used</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Revoke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keys.map(key => (
                  <tr key={key.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-900">{key.name}</td>
                    <td className="px-5 py-4">
                      <code className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-mono">
                        {key.prefix || 'axm_•••••'}
                      </code>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(key.scopes || []).map(scope => (
                          <span key={scope} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {key.lastUsed ? timeAgo(key.lastUsed) : 'Never'}
                    </td>
                    <td className="px-5 py-4">
                      {key.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {key.status === 'active' && (
                        revokeConfirm === key.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Sure?</span>
                            <button
                              onClick={() => handleRevoke(key.id)}
                              disabled={revoking === key.id}
                              className="text-xs bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg font-medium transition-colors disabled:opacity-50"
                            >
                              {revoking === key.id ? '…' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setRevokeConfirm(null)}
                              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRevokeConfirm(key.id)}
                            className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            Revoke
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Create API Key</h2>
              <p className="text-sm text-slate-500 mt-1">Configure access for external integrations</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="e.g. Browser Extension"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>

              {/* Scopes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Scopes</label>
                <div className="space-y-2">
                  {ALL_SCOPES.map(scope => (
                    <label key={scope} className="flex items-center gap-3 cursor-pointer group">
                      <div
                        onClick={() => toggleScope(scope)}
                        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 cursor-pointer ${
                          newKeyScopes.includes(scope)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        {newKeyScopes.includes(scope) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div onClick={() => toggleScope(scope)} className="flex-1">
                        <span className="text-sm font-medium text-slate-800 capitalize">{scope}</span>
                        <span className="text-xs text-slate-400 ml-2">
                          {scope === 'sessions' && '— read/write AI sessions'}
                          {scope === 'approvals' && '— manage approval workflows'}
                          {scope === 'audit' && '— access audit ledger'}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => { setShowModal(false); setNewKeyName(''); setNewKeyScopes(['sessions', 'approvals', 'audit']); }}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newKeyName.trim() || newKeyScopes.length === 0}
                className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating…' : 'Create Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
