import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, ChevronRight, Target, Clock } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { PixelCard, PixelButton, StatusBadge, SectionHeader } from '@/components/retro';
import { CreateGroupModal } from '@/components/modals/CreateGroupModal';

export function GroupsPage() {
  const navigate = useNavigate();
  const { groups, createGroup } = useApp();
  const [showCreate, setShowCreate] = useState(false);

  const totalFunded = groups.reduce((s, g) => s + g.currentBalance, 0);
  const totalTarget = groups.reduce((s, g) => s + g.requiredAmount, 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Groups"
        subtitle="Collaborative funding pools — discover, contribute, and govern together"
        action={<PixelButton variant="primary" size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create Group</PixelButton>}
      />

      <div className="grid grid-cols-3 gap-3">
        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-cyan">{groups.length}</div>
          <div className="text-xs text-txdim uppercase tracking-wide mt-1">Total Groups</div>
        </PixelCard>
        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-green">${totalFunded.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-txdim uppercase tracking-wide mt-1">Total Funded</div>
        </PixelCard>
        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-yellow">${totalTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-txdim uppercase tracking-wide mt-1">Total Target</div>
        </PixelCard>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {groups.map(group => {
          const pct = Math.min(100, (group.currentBalance / group.requiredAmount) * 100);
          const remaining = Math.max(0, group.requiredAmount - group.currentBalance);
          return (
            <PixelCard key={group.id} hover onClick={() => navigate(`/groups/${group.id}`)} className="group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 flex items-center justify-center bg-cyan/10 border border-cyan/30 rounded-xl font-heading font-semibold text-lg text-cyan shrink-0">
                    {group.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-heading font-semibold text-txprim truncate">{group.name}</div>
                    <div className="text-xs text-txdim mt-0.5">Created by {group.createdBy}</div>
                  </div>
                </div>
                <StatusBadge variant={pct >= 100 ? 'success' : 'info'} className="shrink-0">
                  {pct >= 100 ? 'Funded' : 'Active'}
                </StatusBadge>
              </div>

              <p className="text-xs text-txsec mb-4 line-clamp-2">{group.description}</p>

              {/* Funding progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-heading font-semibold text-txprim font-mono">
                    ${group.currentBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-sm text-txdim font-mono">
                    of ${group.requiredAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="progress-bar mb-2">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#00e676' : '#00d4e6' }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan font-medium">{pct.toFixed(1)}% funded</span>
                  <span className="text-txdim font-mono">${remaining.toLocaleString('en-US', { maximumFractionDigits: 0 })} remaining</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-txdim" />
                  <div>
                    <div className="text-sm font-mono text-txprim">{group.memberCount}</div>
                    <div className="text-xs text-txdim">Members</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-txdim" />
                  <div>
                    <div className="text-sm font-mono text-txprim">{group.activeProposals}</div>
                    <div className="text-xs text-txdim">Proposals</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-txdim" />
                  <div>
                    <div className="text-xs font-mono text-txprim truncate">{group.deadline || 'No deadline'}</div>
                    <div className="text-xs text-txdim">Deadline</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-bdlight">
                <span className="text-xs text-txdim">{group.visibility === 'public' ? 'Public' : 'Private'} • {group.governance}</span>
                <div className="flex items-center gap-1 text-cyan group-hover:gap-2 transition-all">
                  <span className="text-sm font-medium">Open Group</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </PixelCard>
          );
        })}
      </div>

      <CreateGroupModal open={showCreate} onClose={() => setShowCreate(false)} onCreate={(data) => { createGroup(data); setShowCreate(false); }} />
    </div>
  );
}
