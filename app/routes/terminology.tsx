import { useState, useEffect } from 'react';
import { AppLayout } from '~/components/AppLayout';
import { authFetch } from '~/lib/api';

interface Term {
  id: string;
  term: string;
  definition: string;
  framework: string;
  sector: string;
  status: string;
  created_at?: number;
}

const SECTOR_COLORS: Record<string, string> = {
  All:       'bg-slate-100 text-slate-700 border-slate-200',
  Legal:     'bg-blue-50 text-blue-700 border-blue-200',
  Financial: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const EMPTY_FORM = { term: '', definition: '', framework: '', sector: 'All' };

export default function TerminologyPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    authFetch('/api/terminology')
      .then(d => setTerms(d.terms || d || []))
      .catch(() => setTerms([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (t: Term) => {
    setEditId(t.id);
    setForm({ term: t.term, definition: t.definition, framework: t.framework, sector: t.sector });
    setError('');
    setShowForm(true);
  };

  const save = async () => {
    if (!form.term.trim() || !form.definition.trim()) {
      setError('Term and definition are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await authFetch(`/api/terminology/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await authFetch('/api/terminology', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTerm = async (id: string) => {
    try {
      await authFetch(`/api/terminology/${id}`, { method: 'DELETE' });
      setDeleteId(null);
      load();
    } catch {}
  };

  const filtered = terms.filter(t => {
    const matchSearch = t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.definition.toLowerCase().includes(search.toLowerCase());
    const matchSector = sectorFilter === 'All' || t.sector === sectorFilter;
    return matchSearch && matchSector;
  });

  const activeCount = terms.filter(t => t.status === 'active' || !t.status).length;

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Canonical Terminology Engine</h1>
            <p className="text-sm text-slate-500 mt-0.5">Inject canonical definitions into every AI session context</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span> Add Term
          </button>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex gap-3">
          <span className="text-blue-500 text-lg flex-shrink-0 mt-0.5">ℹ</span>
          <div>
            <p className="text-sm text-blue-800 leading-relaxed">
              These definitions are automatically prepended to every AI session context, ensuring consistent terminology
              across all operators and preventing concept drift.
            </p>
            <p className="text-xs font-semibold text-blue-700 mt-2">
              {activeCount} terms active — injected into every AI session
            </p>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800">{editId ? 'Edit Term' : 'Add New Term'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Term *</label>
                <input
                  type="text"
                  value={form.term}
                  onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                  placeholder="e.g. Fiduciary Duty"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Regulatory Framework</label>
                <input
                  type="text"
                  value={form.framework}
                  onChange={e => setForm(f => ({ ...f, framework: e.target.value }))}
                  placeholder="e.g. ABA Model Rules"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Definition *</label>
                <textarea
                  value={form.definition}
                  onChange={e => setForm(f => ({ ...f, definition: e.target.value }))}
                  rows={3}
                  placeholder="Canonical definition that will be injected into AI sessions…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Sector</label>
                <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="All">All Sectors</option>
                  <option value="Legal">Legal</option>
                  <option value="Financial">Financial</option>
                </select>
              </div>
            </div>

            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

            <div className="flex gap-2 mt-4">
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Term'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="flex gap-3 flex-wrap items-center">
          <input
            type="text"
            placeholder="Search terms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-1">
            {['All', 'Legal', 'Financial'].map(s => (
              <button key={s} onClick={() => setSectorFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  sectorFilter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}>
                {s}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-slate-400">{filtered.length} of {terms.length} terms</span>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading terminology…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm font-medium mb-1">{terms.length === 0 ? 'No terms defined yet' : 'No matching terms'}</p>
              {terms.length === 0 && <p className="text-xs">Add your first canonical term above.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Term', 'Definition', 'Framework', 'Sector', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{t.term}</span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="text-slate-600 text-xs line-clamp-2">
                          {t.definition.length > 120 ? t.definition.slice(0, 120) + '…' : t.definition}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{t.framework || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SECTOR_COLORS[t.sector] || SECTOR_COLORS.All}`}>
                          {t.sector || 'All'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          t.status === 'active' || !t.status
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {t.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(t)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            Edit
                          </button>
                          <button onClick={() => setDeleteId(t.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete confirm modal */}
        {deleteId && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-base font-bold text-slate-900 mb-2">Delete Term?</h3>
              <p className="text-sm text-slate-500 mb-5">This will remove the term from the terminology engine and all future AI session contexts.</p>
              <div className="flex gap-2">
                <button onClick={() => deleteTerm(deleteId)}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  Delete
                </button>
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
