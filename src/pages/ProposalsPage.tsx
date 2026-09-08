import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight, Check, ThumbsUp, ThumbsDown, Minus, Clock, Plus, Shield } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { PixelCard, PixelButton, StatusBadge, SectionHeader } from '@/components/retro';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CreateProposalModal } from '@/components/modals/CreateProposalModal';
import type { Proposal } from '@/types';

export function ProposalsPage() {
  const navigate = useNavigate();
  const { proposals, groups, stats, createProposal } = useApp();
  const [tab, setTab] = useState('active');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = proposals.filter(p => {
    if (tab === 'active') return p.status === 'voting';
    if (tab === 'passed') return p.status === 'passed' || p.status === 'executed';
    if (tab === 'rejected') return p.status === 'rejected' || p.status === 'expired';
    return true;
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Proposals"
        subtitle="Community governance — vote privately, execute automatically"
        action={<PixelButton variant="primary" size="sm" onClick={() => setShowCreate(true)}><FileText className="w-4 h-4" /> Create Proposal</PixelButton>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PixelCard className="p-4 text-center"><div className="text-2xl font-heading font-semibold text-txprim">{proposals.length}</div><div className="text-xs text-txdim uppercase tracking-wide mt-1">Total</div></PixelCard>
        <PixelCard className="p-4 text-center"><div className="text-2xl font-heading font-semibold text-yellow">{stats.activeProposals}</div><div className="text-xs text-txdim uppercase tracking-wide mt-1">Active</div></PixelCard>
        <PixelCard className="p-4 text-center"><div className="text-2xl font-heading font-semibold text-green">{stats.passedProposals}</div><div className="text-xs text-txdim uppercase tracking-wide mt-1">Passed</div></PixelCard>
        <PixelCard className="p-4 text-center"><div className="text-2xl font-heading font-semibold text-red">{stats.rejectedProposals}</div><div className="text-xs text-txdim uppercase tracking-wide mt-1">Rejected</div></PixelCard>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full bg-bgpanel border border-bdlight p-1 rounded-xl h-auto">
          {['active', 'passed', 'rejected', 'all'].map(t => (
            <TabsTrigger key={t} value={t} className="tab flex-1 capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map(p => {
              const group = groups.find(g => g.id === p.groupId);
              return <ProposalCard key={p.id} proposal={p} groupName={group?.name || 'Group'} onClick={() => navigate(`/proposals/${p.id}`)} />;
            })}
          </div>
        </TabsContent>
      </Tabs>

      <CreateProposalModal open={showCreate} onClose={() => setShowCreate(false)} groupId="" groupName="" onCreate={(data) => { createProposal({ ...data, groupId: data.groupId || groups[0]?.id || 'g1' }); setShowCreate(false); }} />
    </div>
  );
}

function ProposalCard({ proposal: p, groupName, onClick }: { proposal: Proposal; groupName: string; onClick: () => void }) {
  const totalVotes = p.votes.yes + p.votes.no + p.votes.abstain;
  const yesPct = (p.votes.yes / p.totalMembers) * 100;
  const noPct = (p.votes.no / p.totalMembers) * 100;
  const absPct = (p.votes.abstain / p.totalMembers) * 100;

  return (
    <PixelCard hover onClick={onClick} className="flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-cyan font-medium mb-1">PROPOSAL #{p.id}</div>
          <div className="text-sm text-txprim font-medium">{p.title}</div>
          <div className="text-xs text-txdim mt-0.5">{groupName}</div>
        </div>
        <StatusBadge variant={p.status === 'voting' ? 'pending' : p.status === 'passed' ? 'success' : p.status === 'rejected' ? 'rejected' : p.status === 'executed' ? 'approved' : 'default'} className="ml-2 shrink-0">{p.status}</StatusBadge>
      </div>

      <p className="text-xs text-txsec mb-3 line-clamp-2">{p.description}</p>

      <div className="card bg-bgdark p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-txdim uppercase tracking-wide">Requested</span>
          <span className="text-sm font-mono text-cyan">${p.amount.toLocaleString()} {p.currency}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-txdim uppercase tracking-wide">Quorum</span>
          <span className="text-sm font-mono text-txprim">{p.quorum}%</span>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-green flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {p.votes.yes}</span>
          <span className="text-red flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> {p.votes.no}</span>
          <span className="text-txdim flex items-center gap-1"><Minus className="w-3 h-3" /> {p.votes.abstain}</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden bg-bgpanel2">
          <div className="h-full bg-green" style={{ width: `${yesPct}%` }} />
          <div className="h-full bg-red" style={{ width: `${noPct}%` }} />
          <div className="h-full bg-bdbright" style={{ width: `${absPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-txdim">
          <span>{totalVotes}/{p.totalMembers} voted</span>
          {p.hoursLeft > 0 && <span className="text-yellow flex items-center gap-1"><Clock className="w-3 h-3" /> {p.hoursLeft}h left</span>}
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-bdlight">
        <StatusBadge variant="privacy"><Shield className="w-3 h-3" /> Private</StatusBadge>
        {p.userVote ? (
          <div className="flex items-center gap-1 text-xs text-green"><Check className="w-3 h-3" /> Voted</div>
        ) : p.status === 'voting' ? (
          <span className="text-xs text-cyan flex items-center gap-1">Vote now <ChevronRight className="w-3 h-3" /></span>
        ) : (
          <span className="text-xs text-cyan flex items-center gap-1">View <ChevronRight className="w-3 h-3" /></span>
        )}
      </div>
    </PixelCard>
  );
}
