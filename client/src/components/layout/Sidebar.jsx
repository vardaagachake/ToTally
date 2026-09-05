import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/reconciliation', label: 'Reconciliation', icon: '🔄' },
  { path: '/tax', label: 'Tax Matcher', icon: '🧾' },
  { path: '/forecast', label: 'Forecast', icon: '📈' },
  { path: '/fx', label: 'FX Tracker', icon: '💱' },
  { path: '/vendors', label: 'Vendors', icon: '🏢' },
  { path: '/ask', label: 'Ask AI', icon: '🤖' },
  { path: '/report', label: 'Closing Report', icon: '📋' },
  { path: '/actions', label: 'Actions Log', icon: '📝' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-navy flex flex-col h-screen shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-rzp-blue rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-rzp-blue/30">
            T
          </div>
          <div>
            <h1 className="text-white font-bold text-xl tracking-tight">ToTally</h1>
            <p className="text-white/40 text-[10px] font-medium tracking-widest uppercase">Finance Ops AI</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : 'text-white/60 hover:text-white'}`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-white/30 text-xs">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          <span>AI Agent Active</span>
        </div>
      </div>
    </aside>
  );
}
