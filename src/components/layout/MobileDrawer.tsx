import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ArrowLeftRight, Wallet, FileText, Receipt, Activity, Settings, X, Zap } from 'lucide-react';
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

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const { user } = useApp();

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-bgpanel border-r border-bdlight overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-bdlight">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center bg-cyan text-bgdark font-heading font-bold rounded-lg">P</div>
                <span className="font-heading font-semibold text-txprim">PayDAO</span>
              </div>
              <button onClick={onClose} className="text-txdim hover:text-txprim"><X className="w-5 h-5" /></button>
            </div>

            <nav className="py-4 px-3">
              {navItems.map(group => (
                <div key={group.section} className="mb-4">
                  <div className="text-xs font-medium text-txdim uppercase tracking-wide px-3 mb-2">{group.section}</div>
                  {group.items.map(item => {
                    const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onClose}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all mb-0.5 text-sm',
                          active ? 'bg-bgpanel2 text-cyan font-medium' : 'text-txsec hover:text-txprim',
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="p-3 border-t border-bdlight">
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
        </div>
      )}
    </>
  );
}
