import { NetworkBadge, PixelAvatar } from '@/components/retro';
import { cn } from '@/lib/utils';
import { useApp } from '@/store/AppContext';
import { Bell, CheckCheck, ChevronDown, LogOut, Menu, Search, UserCircle, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, walletAddress, notifications, markNotificationRead, markAllNotificationsRead, logout } = useApp();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchResults = searchQuery.length > 1 ? [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Groups', path: '/groups' },
    { label: 'Send Money', path: '/send' },
    { label: 'Proposals', path: '/proposals' },
    { label: 'Transactions', path: '/transactions' },
    { label: 'Wallet', path: '/wallet' },
  ].filter(r => r.label.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  return (
    <header className="sticky top-0 z-40 bg-bgpanel border-b border-bdlight">
      <div className="flex items-center gap-3 px-4 lg:px-6 h-16">
        {onMenuClick && (
          <button onClick={onMenuClick} className="lg:hidden text-txsec hover:text-txprim p-1">
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="hidden md:flex relative flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txdim" />
            <input
              type="text" placeholder="Search PayDAO..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              className="input pl-10"
            />
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full card bg-bgpanel z-50 p-1">
              {searchResults.map(r => (
                <button key={r.path} onClick={() => { navigate(r.path); setSearchOpen(false); setSearchQuery(''); }}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg hover:bg-bgpanel2 transition-colors text-left">
                  <span className="text-sm text-txprim">{r.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 md:hidden" />
        <div className="hidden xl:block"><NetworkBadge live /></div>

        <div ref={notifRef} className="relative">
          <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 text-txsec hover:text-txprim transition-colors border border-bdlight rounded-lg hover:border-bdbright">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red text-white text-xs font-bold flex items-center justify-center rounded-full">{unreadCount}</span>}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 card bg-bgpanel z-50 max-h-96 overflow-y-auto p-0">
              <div className="flex items-center justify-between p-3 border-b border-bdlight sticky top-0 bg-bgpanel">
                <span className="text-sm font-semibold text-txprim">Notifications</span>
                <button onClick={markAllNotificationsRead} className="flex items-center gap-1 text-cyan hover:text-cyan/80">
                  <CheckCheck className="w-3 h-3" /><span className="text-xs">Mark all</span>
                </button>
              </div>
              {notifications.slice(0, 8).map(n => (
                <button key={n.id} onClick={() => markNotificationRead(n.id)}
                  className={cn('w-full text-left p-3 border-b border-bdlight/50 hover:bg-bgpanel2 transition-colors', !n.read && 'bg-cyan/5')}>
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-cyan mt-1.5 shrink-0 blink" />}
                    <div className={cn('flex-1 min-w-0', n.read && 'ml-4')}>
                      <p className="text-sm text-txprim font-medium truncate">{n.title}</p>
                      <p className="text-xs text-txsec truncate">{n.message}</p>
                      <p className="text-xs text-txdim mt-1">{n.timeAgo}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={userRef} className="relative">
          <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-1 pr-2 border border-bdlight rounded-lg hover:border-bdbright transition-colors">
            <PixelAvatar name={user?.name || 'Wallet'} color={user?.avatarColor || '#00d4e6'} size="sm" />
            <div className="hidden sm:block text-left">
              <div className="text-sm text-txprim font-medium">{user?.name || 'Wallet'}</div>
              <div className="text-xs text-txdim font-mono">{walletAddress || 'Not connected'}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-txdim hidden sm:block" />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 card bg-bgpanel z-50 p-1">
              <div className="p-3 border-b border-bdlight">
                <div className="text-sm text-txprim font-medium">{user?.name || 'Wallet'}</div>
                <div className="text-xs text-txdim">{walletAddress || 'Not connected'}</div>
              </div>
              <button onClick={() => { navigate('/settings'); setUserMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-bgpanel2 transition-colors text-left">
                <UserCircle className="w-4 h-4 text-txsec" /><span className="text-sm text-txsec">Profile & Settings</span>
              </button>
              <button onClick={() => { navigate('/wallet'); setUserMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-bgpanel2 transition-colors text-left">
                <Zap className="w-4 h-4 text-yellow" /><span className="text-sm text-txsec">My Wallet</span>
              </button>
              <div className="border-t border-bdlight mt-1 pt-1">
                <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-red/10 transition-colors text-left">
                  <LogOut className="w-4 h-4 text-red" /><span className="text-sm text-red">Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
