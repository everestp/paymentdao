import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ArrowLeftRight, Wallet, FileText, Receipt, Activity, Settings, ChevronRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/store/AppContext';

const navItems = [
  { section: 'MAIN', items: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Groups', icon: Users, path: '/groups' },
    { label: 'Payments', icon: ArrowLeftRight, path: '/payments' },
    { label: 'Wallet', icon: Wallet, path: '/wallet' },
  ]},
  { section: 'WORKSPACE', items: [
    { label: 'Proposals', icon: FileText, path: '/proposals' },
    { label: 'Send', icon: ArrowLeftRight, path: '/send' },
    { label: 'Receive', icon: Receipt, path: '/receive' },
  ]},
  { section: 'SYSTEM', items: [
    { label: 'Transactions', icon: Receipt, path: '/transactions' },
    { label: 'Activity', icon: Activity, path: '/activity' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ]},
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useApp();

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-bgpanel border-r border-bdlight h-screen sticky top-0">
      <Link to="/dashboard" className="flex items-center gap-3 p-5 border-b border-bdlight">
        <div className="w-9 h-9 flex items-center justify-center bg-cyan text-bgdark font-heading font-bold text-lg rounded-lg" style={{ boxShadow: '0 0 12px rgba(0,212,230,0.3)' }}>
          P
        </div>
        <div>
          <div className="font-heading font-semibold text-txprim">PayDAO</div>
          <div className="text-xs text-txdim font-mono">v2.0 Demo</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navItems.map(group => (
          <div key={group.section} className="mb-5">
            <div className="text-xs font-medium text-txdim uppercase tracking-wide px-3 mb-2">{group.section}</div>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm',
                      active ? 'bg-bgpanel2 text-cyan font-medium' : 'text-txsec hover:text-txprim hover:bg-bgpanel2',
                    )}
                    style={active ? { boxShadow: 'inset 0 0 0 1px rgba(0,212,230,0.2)' } : {}}
                  >
                    <item.icon className="w-4 h-4" style={active ? { color: '#00d4e6' } : {}} />
                    <span>{item.label}</span>
                    {active && <ChevronRight className="w-3 h-3 ml-auto text-cyan" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-bdlight">
        <div className="card p-3 bg-bgdark">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-green blink" />
            <span className="text-xs font-medium text-green">Connected as Demo</span>
          </div>
          <div className="text-xs font-mono text-txsec truncate">{user.walletAddress}</div>
          <div className="flex items-center gap-1 mt-1">
            <Zap className="w-3 h-3 text-yellow" />
            <span className="text-xs text-txdim">Solana • Demo Network</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
