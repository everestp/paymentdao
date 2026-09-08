import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Wallet, FileText, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Groups', icon: Users, path: '/groups' },
  { label: 'Wallet', icon: Wallet, path: '/wallet' },
  { label: 'Votes', icon: FileText, path: '/proposals' },
  { label: 'Activity', icon: Activity, path: '/activity' },
];

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bgpanel border-t border-bdlight">
      <div className="flex items-center justify-around h-16">
        {navItems.map(item => {
          const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn('flex flex-col items-center gap-1 px-3 py-2 transition-all', active ? 'text-cyan' : 'text-txdim')}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
              {active && <span className="w-1 h-1 rounded-full bg-cyan" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
