import { CreateProposalModal } from '@/components/modals/CreateProposalModal';
import { DonateModal } from '@/components/modals/DonateModal';
import { PixelAvatar, PixelButton, PixelCard, StatusBadge } from '@/components/retro';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockData } from '@/data/mockData';
import { useApp } from '@/store/AppContext';
import { ArrowDownLeft, ArrowLeft, Check, ChevronRight, Clock, FileText, Minus, Plus, Radio, Shield, Target, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const iconMap: Record<string, typeof Check> = {
  'arrow-up': ArrowDownLeft, 'arrow-down': ArrowDownLeft, 'file-text': FileText,
  'check': Check, 'thumbs-up': ThumbsUp, 'thumbs-down': ThumbsDown, 'minus': Minus,
  'user-plus': Users, 'users': Users, 'vote': FileText,
};

export function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { groups, proposals, activity, members, contribute, createProposal } = useApp();
  const [tab, setTab] = useState('overview');
  const [showDonate, setShowDonate] = useState(false);
  const [showCreateProposal, setShowCreateProposal] = useState(false);

  const group = groups.find(g => g.id === id) || groups[0];
  const groupProposals = proposals.filter(p => p.groupId === group.id);
  const groupActivity = activity.filter(a => a.detail.includes(group.name) || a.detail.includes('Group')).slice(0, 8);
  const groupMembers = members.slice(0, group.memberCount);

  const pct = Math.min(100, (group.currentBalance / group.requiredAmount) * 100);
  const remaining = Math.max(0, group.requiredAmount - group.currentBalance);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/groups')} className="flex items-center gap-2 text-txdim hover:text-txprim transition-colors">
        <ArrowLeft className="w-4 h-4" /><span className="text-sm">Back to groups</span>
      </button>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 flex items-center justify-center bg-cyan/10 border border-cyan/30 rounded-2xl font-heading font-bold text-xl text-cyan" style={{ boxShadow: '0 0 12px rgba(0,212,230,0.2)' }}>
            {group.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-heading font-semibold text-txprim mb-1">{group.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-txsec">{group.memberCount} members</span>
              <span className="text-sm text-green font-mono">${group.currentBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              <StatusBadge variant="info">{group.governance}</StatusBadge>
              <StatusBadge variant={group.visibility === 'public' ? 'success' : 'default'}>{group.visibility}</StatusBadge>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <PixelButton variant="green" size="sm" onClick={() => setShowDonate(true)}><ArrowDownLeft className="w-4 h-4" /> Donate</PixelButton>
          <PixelButton variant="primary" size="sm" onClick={() => setShowCreateProposal(true)}><FileText className="w-4 h-4" /> Create Proposal</PixelButton>
        </div>
      </div>

      <p className="text-sm text-txsec">{group.description}</p>

      {/* Funding progress - prominent */}
      <PixelCard className="border-cyan/20">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="text-xs font-medium text-txdim uppercase tracking-wide mb-2">Funding Progress</div>
            <div className="text-3xl font-heading font-semibold text-cyan mb-2 font-mono">
              ${group.currentBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-sm text-txsec mb-4">
              raised of <span className="font-mono text-txprim">${group.requiredAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> target
            </div>
            <div className="progress-bar mb-3" style={{ height: '12px' }}>
              <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#00e676' : '#00d4e6' }} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-cyan font-medium">{pct.toFixed(1)}% funded</span>
              <span className="text-txdim font-mono">${remaining.toLocaleString('en-US', { maximumFractionDigits: 0 })} still required</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="card bg-bgdark p-4">
              <Target className="w-4 h-4 text-cyan mb-2" />
              <div className="text-xs text-txdim uppercase tracking-wide mb-1">Required</div>
              <div className="text-lg font-mono text-txprim">${group.requiredAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="card bg-bgdark p-4">
              <Check className="w-4 h-4 text-green mb-2" />
              <div className="text-xs text-txdim uppercase tracking-wide mb-1">Raised</div>
              <div className="text-lg font-mono text-green">${group.currentBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="card bg-bgdark p-4">
              <Clock className="w-4 h-4 text-yellow mb-2" />
              <div className="text-xs text-txdim uppercase tracking-wide mb-1">Deadline</div>
              <div className="text-sm font-mono text-txprim">{group.deadline || 'No deadline'}</div>
            </div>
            <div className="card bg-bgdark p-4">
              <Users className="w-4 h-4 text-pink mb-2" />
              <div className="text-xs text-txdim uppercase tracking-wide mb-1">Members</div>
              <div className="text-lg font-mono text-txprim">{group.memberCount}</div>
            </div>
          </div>
        </div>
      </PixelCard>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full bg-bgpanel border border-bdlight p-1 rounded-xl h-auto overflow-x-auto">
          {['overview', 'proposals', 'contributions', 'members', 'activity'].map(t => (
            <TabsTrigger key={t} value={t} className="tab flex-1 capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <PixelCard className="lg:col-span-2">
              <h3 className="text-sm font-semibold text-txprim mb-4">Funding Activity</h3>
              <div className="h-48 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockData.groupActivityChart}>
                    <defs><linearGradient id="colorGroup" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00d4e6" stopOpacity={0.3} /><stop offset="100%" stopColor="#00d4e6" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="day" stroke="#6b7180" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7180" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ background: '#12141b', border: '1px solid #3a3f55', borderRadius: '12px', fontFamily: 'Inter', fontSize: '13px' }} />
                    <Area type="monotone" dataKey="raised" stroke="#00d4e6" strokeWidth={2} fill="url(#colorGroup)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </PixelCard>
            <PixelCard>
              <h3 className="text-sm font-semibold text-txprim mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <StatRow icon={Users} label="Members" value={String(group.memberCount)} color="#00e676" />
                <StatRow icon={FileText} label="Active Proposals" value={String(group.activeProposals)} color="#ffd600" />
                <StatRow icon={Target} label="Funding" value={`${pct.toFixed(1)}%`} color="#00d4e6" />
                <StatRow icon={Shield} label="Voting Threshold" value={`${group.votingThreshold}%`} color="#ff2e9a" />
              </div>
            </PixelCard>
          </div>
        </TabsContent>

        {/* Proposals */}
        <TabsContent value="proposals" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-txprim">Group Proposals</h3>
            <PixelButton variant="primary" size="sm" onClick={() => setShowCreateProposal(true)}><Plus className="w-4 h-4" /> Create Proposal</PixelButton>
          </div>
          {groupProposals.length === 0 ? (
            <PixelCard className="text-center py-12"><p className="text-sm text-txdim">No proposals yet. Create the first one!</p></PixelCard>
          ) : (
            groupProposals.map(p => (
              <PixelCard key={p.id} hover onClick={() => navigate(`/proposals/${p.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-cyan font-medium mb-1">PROPOSAL #{p.id}</div>
                    <div className="text-sm text-txprim font-medium">{p.title}</div>
                    <div className="text-xs text-txsec mt-1 line-clamp-1">{p.description}</div>
                  </div>
                  <StatusBadge variant={p.status === 'voting' ? 'pending' : p.status === 'passed' ? 'success' : p.status === 'rejected' ? 'rejected' : 'default'} className="ml-2 shrink-0">{p.status}</StatusBadge>
                </div>
                <div className="flex items-center gap-4 text-xs mb-3">
                  <span className="text-green flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {p.votes.yes}</span>
                  <span className="text-red flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> {p.votes.no}</span>
                  <span className="text-txdim flex items-center gap-1"><Minus className="w-3 h-3" /> {p.votes.abstain}</span>
                  <span className="text-txdim ml-auto">{p.hoursLeft > 0 ? `${p.hoursLeft}h left` : 'Ended'}</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-bgpanel2">
                  <div className="h-full bg-green" style={{ width: `${(p.votes.yes / p.totalMembers) * 100}%` }} />
                  <div className="h-full bg-red" style={{ width: `${(p.votes.no / p.totalMembers) * 100}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <StatusBadge variant="privacy">Private voting</StatusBadge>
                  <span className="text-xs text-cyan flex items-center gap-1">View <ChevronRight className="w-3 h-3" /></span>
                </div>
              </PixelCard>
            ))
          )}
        </TabsContent>

        {/* Contributions */}
        <TabsContent value="contributions" className="mt-4">
          <PixelCard>
            <h3 className="text-sm font-semibold text-txprim mb-4">Contribution History</h3>
            <div className="space-y-2">
              {group.contributions.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 border border-bdlight rounded-lg">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-bgpanel2 border border-bdlight">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-green" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-txprim font-medium">{c.anonymousId}</div>
                    <div className="text-xs text-txdim">{c.createdAt}</div>
                  </div>
                  <div className="text-sm font-mono text-green">+${c.amount} {c.currency}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-bdlight">
              <p className="text-xs text-txdim">Contributor identities are kept private. Only aggregate amounts and anonymous IDs are shown.</p>
            </div>
          </PixelCard>
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="mt-4">
          <PixelCard>
            <h3 className="text-sm font-semibold text-txprim mb-4">Group Members ({group.memberCount})</h3>
            <div className="space-y-2">
              {groupMembers.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-3 border border-bdlight rounded-lg hover:bg-bgpanel2 transition-colors">
                  <PixelAvatar name={m.name} color={m.avatarColor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-txprim font-medium">{m.name}</div>
                    <div className="text-xs text-txdim">{m.username}</div>
                  </div>
                  <StatusBadge variant={m.role === 'creator' ? 'approved' : 'default'}>{m.role}</StatusBadge>
                </div>
              ))}
            </div>
          </PixelCard>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="mt-4">
          <PixelCard>
            <h3 className="text-sm font-semibold text-txprim mb-4">Group Activity</h3>
            <div className="space-y-2">
              {(groupActivity.length > 0 ? groupActivity : activity.slice(0, 6)).map(event => {
                const Icon = iconMap[event.icon] || Radio;
                return (
                  <div key={event.id} className="flex items-center gap-3 p-3 border border-bdlight rounded-lg">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg" style={{ background: `${event.userColor}15`, border: `1px solid ${event.userColor}40` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: event.userColor }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-txprim"><span style={{ color: event.userColor }} className="font-medium">{event.user}</span> {event.action} {event.detail}</p>
                    </div>
                    <span className="text-xs text-txdim">{event.timeAgo}</span>
                  </div>
                );
              })}
            </div>
          </PixelCard>
        </TabsContent>
      </Tabs>

      <DonateModal open={showDonate} onClose={() => setShowDonate(false)} group={group} onContribute={contribute} />
      <CreateProposalModal open={showCreateProposal} onClose={() => setShowCreateProposal(false)} groupId={group.id} groupName={group.name} onCreate={async (data) => { await createProposal({ ...data, groupId: group.id }); setShowCreateProposal(false); }} />
    </div>
  );
}

function StatRow({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: `${color}15`, border: `1px solid ${color}40` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="flex-1">
        <div className="text-xs text-txdim uppercase tracking-wide">{label}</div>
        <div className="text-sm font-mono text-txprim">{value}</div>
      </div>
    </div>
  );
}
