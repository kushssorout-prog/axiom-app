import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { getOperator, clearToken } from '~/lib/api';

const NAV = [
  {
    group: 'Core', items: [
      { href: '/dashboard', label: 'Gov-Hub', icon: '⬡', desc: 'Master dashboard' },
      { href: '/sessions', label: 'AI Sessions', icon: '⚡', desc: 'Circuit Breaker workspace' },
      { href: '/approvals', label: 'Approvals', icon: '✍', desc: 'Human-in-the-loop' },
      { href: '/audit', label: 'Audit Ledger', icon: '🔐', desc: 'Tamper-evident log' },
    ]
  },
  {
    group: 'Governance', items: [
      { href: '/operators', label: 'Operators', icon: '👤', desc: 'Access & scorecard' },
      { href: '/lex', label: 'Axiom-Lex', icon: '◎', desc: 'Vector boundaries' },
      { href: '/terminology', label: 'Terminology', icon: '📖', desc: 'Canonical definitions' },
      { href: '/geopolitics', label: 'Geo Risk Engine', icon: '🌍', desc: 'Jurisdictional risk' },
    ]
  },
  {
    group: 'Axiom-Kinetic', items: [
      { href: '/kinetic', label: 'Kinetic FLNW', icon: '🤖', desc: 'Robotics interceptor' },
      { href: '/immigration', label: 'Immigration', icon: '✈️', desc: 'Relocation risk' },
    ]
  },
  {
    group: 'Finance', items: [
      { href: '/finance', label: 'Finance Hub', icon: '📊', desc: 'Arbitrage + routing + scarcity' },
    ]
  },
  {
    group: 'Reports', items: [
      { href: '/reports', label: 'Reg. Reporter', icon: '📋', desc: 'Compliance reports' },
    ]
  },
  {
    group: 'Platform', items: [
      { href: '/api-keys',    label: 'API Keys',       icon: '🔑', desc: 'External integrations' },
      { href: '/integrations',label: 'Bots',           icon: '🤖', desc: 'Telegram & Discord' },
      { href: '/referrals',  label: 'Refer & Earn',   icon: '🎁', desc: 'Grow Axiom' },
      { href: '/api-docs',   label: 'API Docs',       icon: '📄', desc: 'REST API reference' },
    ]
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [operator, setOperator] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const op = getOperator();
    if (!op) { navigate('/login'); return; }
    setOperator(op);
  }, []);

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-slate-200 flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex
      `}>
        {/* Logo */}
        <div className="h-14 px-5 flex items-center gap-3 border-b border-slate-100 flex-shrink-0">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
          <span className="font-bold text-slate-900 tracking-tight text-[15px]">Axiom</span>
          <span className="ml-auto text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-200">v2.0</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {NAV.map(group => (
            <div key={group.group} className="mb-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">{group.group}</p>
              {group.items.map(item => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all mb-0.5 ${
                    isActive(item.href)
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="text-[15px] w-5 text-center flex-shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 cursor-pointer" onClick={handleLogout}>
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs flex-shrink-0">
              {operator?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-slate-800 truncate">{operator?.name || 'Loading...'}</p>
              <p className="text-[10px] text-slate-400 capitalize">{operator?.role || 'operator'}</p>
            </div>
            <span className="text-slate-400 text-xs">↪</span>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center gap-4 flex-shrink-0">
          <button className="lg:hidden text-slate-500 hover:text-slate-900" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="flex items-center gap-1.5 text-[13px] text-slate-400">
            <span>Axiom</span>
            <span>/</span>
            <span className="text-slate-700 font-medium capitalize">{location.pathname.split('/')[1] || 'Dashboard'}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Circuit Breaker Active
            </div>
            <Link to="/pricing" className="text-[12px] font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">Upgrade</Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
