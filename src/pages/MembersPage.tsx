import { useState } from 'react';
import { Search, UserPlus, Settings } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { PixelCard, PixelButton, StatusBadge, SectionHeader, PixelAvatar } from '@/components/retro';

export function MembersPage() {
  const { members } = useApp();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showInvite, setShowInvite] = useState(false);

  const filtered = members.filter(m => {
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.username.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Members"
        subtitle={`${members.length} members across all groups`}
        action={
          <div className="flex gap-2">
            <PixelButton variant="ghost" size="sm"><Settings className="w-4 h-4" /> Manage</PixelButton>
            <PixelButton variant="primary" size="sm" onClick={() => setShowInvite(true)}><UserPlus className="w-4 h-4" /> Invite</PixelButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PixelCard className="p-4 text-center"><div className="text-2xl font-heading font-semibold text-cyan">{members.length}</div><div className="text-xs text-txdim uppercase tracking-wide mt-1">Total</div></PixelCard>
        <PixelCard className="p-4 text-center"><div className="text-2xl font-heading font-semibold text-green">{members.filter(m => m.status === 'active').length}</div><div className="text-xs text-txdim uppercase tracking-wide mt-1">Active</div></PixelCard>
        <PixelCard className="p-4 text-center"><div className="text-2xl font-heading font-semibold text-yellow">{members.filter(m => m.role === 'creator').length}</div><div className="text-xs text-txdim uppercase tracking-wide mt-1">Creators</div></PixelCard>
        <PixelCard className="p-4 text-center"><div className="text-2xl font-heading font-semibold text-pink">{members.filter(m => m.status === 'inactive').length}</div><div className="text-xs text-txdim uppercase tracking-wide mt-1">Inactive</div></PixelCard>
      </div>

      <PixelCard className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txdim" />
            <input type="text" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input w-auto">
            <option value="all">All Roles</option>
            <option value="creator">Creator</option>
            <option value="member">Member</option>
          </select>
        </div>
      </PixelCard>

      <PixelCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bdlight">
                <th className="text-xs text-txdim uppercase tracking-wide text-left p-3">Member</th>
                <th className="text-xs text-txdim uppercase tracking-wide text-left p-3 hidden md:table-cell">Role</th>
                <th className="text-xs text-txdim uppercase tracking-wide text-right p-3">Voting Power</th>
                <th className="text-xs text-txdim uppercase tracking-wide text-left p-3 hidden sm:table-cell">Joined</th>
                <th className="text-xs text-txdim uppercase tracking-wide text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 20).map(m => (
                <tr key={m.id} className="border-b border-bdlight/50 hover:bg-bgpanel2 transition-colors cursor-pointer">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <PixelAvatar name={m.name} color={m.avatarColor} size="sm" />
                      <div className="min-w-0"><div className="text-sm text-txprim">{m.name}</div><div className="text-xs text-txdim">{m.username}</div></div>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell"><StatusBadge variant={m.role === 'creator' ? 'approved' : 'default'}>{m.role}</StatusBadge></td>
                  <td className="p-3 text-right"><span className="font-mono text-sm text-cyan">{m.votingPower.toFixed(1)}%</span></td>
                  <td className="p-3 hidden sm:table-cell font-mono text-xs text-txsec">{m.joined}</td>
                  <td className="p-3"><StatusBadge variant={m.status === 'active' ? 'success' : 'default'}>{m.status}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 20 && <div className="p-4 text-center border-t border-bdlight"><span className="text-xs text-txdim">Showing 20 of {filtered.length} members</span></div>}
      </PixelCard>

      {showInvite && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)}>
          <div className="card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-heading font-semibold text-txprim mb-4">Invite Member</h3>
            <input type="text" placeholder="@username or wallet address" className="input mb-4" />
            <div className="flex gap-3">
              <PixelButton variant="ghost" className="flex-1" onClick={() => setShowInvite(false)}>Cancel</PixelButton>
              <PixelButton variant="primary" className="flex-1" onClick={() => setShowInvite(false)}>Send Invite</PixelButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
