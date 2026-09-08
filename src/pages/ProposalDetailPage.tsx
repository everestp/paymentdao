import { PixelButton, PixelCard, StatusBadge } from '@/components/retro';
import { ConfirmModal } from '@/components/retro/PixelModal';
import { useApp } from '@/store/AppContext';
import type { VoteType } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Check, Clock, Minus, Shield, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export function ProposalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { proposals, groups, voteOnProposal } = useApp();
  const [voteModal, setVoteModal] = useState<{ open: boolean; vote: VoteType | null }>({ open: false, vote: null });
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const proposal = proposals.find(p => p.id === parseInt(id || '1'));
  if (!proposal) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-txdim mx-auto mb-4" />
        <h2 className="text-lg font-heading font-semibold text-txprim mb-2">Proposal not found</h2>
        <PixelButton variant="ghost" onClick={() => navigate('/proposals')}>Back to proposals</PixelButton>
      </div>
    );
  }

  const group = groups.find(g => g.id === proposal.groupId);
  const totalVotes = proposal.votes.yes + proposal.votes.no + proposal.votes.abstain;
  const yesPct = Math.round((proposal.votes.yes / proposal.totalMembers) * 100);
  const noPct = Math.round((proposal.votes.no / proposal.totalMembers) * 100);
  const absPct = Math.round((proposal.votes.abstain / proposal.totalMembers) * 100);

  const handleVote = async () => {
    if (!voteModal.vote) return;
    setVoting(true);
    setVoteError(null);
    try {
      await voteOnProposal(proposal.id, voteModal.vote);
      setVoting(false);
      setVoteModal({ open: false, vote: null });
    } catch (error) {
      setVoting(false);
      setVoteError(error instanceof Error ? error.message : 'Private vote was not submitted.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(group ? `/groups/${group.id}` : '/proposals')} className="flex items-center gap-2 text-txdim hover:text-txprim transition-colors">
        <ArrowLeft className="w-4 h-4" /><span className="text-sm">Back to {group?.name || 'proposals'}</span>
      </button>

      {/* Header */}
      <PixelCard>
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="text-xs text-cyan font-medium mb-2">PROPOSAL #{proposal.id}</div>
            <h1 className="text-xl md:text-2xl font-heading font-semibold text-txprim leading-tight">{proposal.title}</h1>
            {group && <button onClick={() => navigate(`/groups/${group.id}`)} className="text-sm text-cyan hover:text-cyan/80 mt-2">{group.name}</button>}
          </div>
          <StatusBadge variant={proposal.status === 'voting' ? 'pending' : proposal.status === 'passed' ? 'success' : proposal.status === 'rejected' ? 'rejected' : proposal.status === 'executed' ? 'approved' : 'default'}>
            {proposal.status}
          </StatusBadge>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <span className="text-txsec">Created {proposal.createdAt}</span>
          {proposal.hoursLeft > 0 && <span className="text-yellow flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {proposal.hoursLeft}h left</span>}
        </div>
      </PixelCard>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <PixelCard>
            <h3 className="text-sm font-semibold text-txprim mb-3">Description</h3>
            <p className="text-sm text-txsec leading-relaxed">{proposal.description}</p>
          </PixelCard>

          <PixelCard>
            <h3 className="text-sm font-semibold text-txprim mb-3">Details</h3>
            <div className="space-y-3">
              <DetailRow label="Requested Amount" value={`$${proposal.amount.toLocaleString()} ${proposal.currency}`} />
              <DetailRow label="Recipient" value={proposal.recipient} />
              <DetailRow label="Voting Deadline" value={proposal.deadline} />
              <DetailRow label="Quorum Required" value={`${proposal.quorum}%`} />
            </div>
          </PixelCard>

          <PixelCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-txprim">Voting Results</h3>
              <StatusBadge variant="privacy"><Shield className="w-3 h-3" /> Private voting</StatusBadge>
            </div>

            <div className="space-y-4">
              <VoteBar label="YES" icon={ThumbsUp} count={proposal.votes.yes} pct={yesPct} color="#00e676" />
              <VoteBar label="NO" icon={ThumbsDown} count={proposal.votes.no} pct={noPct} color="#ff3860" />
              <VoteBar label="ABSTAIN" icon={Minus} count={proposal.votes.abstain} pct={absPct} color="#6b7180" />
            </div>

            <div className="mt-4 pt-4 border-t border-bdlight">
              <div className="flex items-center justify-between text-sm">
                <span className="text-txsec">Total votes</span>
                <span className="font-mono text-txprim">{totalVotes} / {proposal.totalMembers}</span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-bgdark border border-bdlight">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-b14dff shrink-0 mt-0.5" style={{ color: '#b14dff' }} />
                <p className="text-xs text-txsec">Individual votes are never publicly associated with a wallet or identity. Only aggregate results are displayed.</p>
              </div>
            </div>
          </PixelCard>
        </div>

        {/* Voting panel */}
        <div>
          <PixelCard className="sticky top-20">
            <h3 className="text-sm font-semibold text-txprim mb-1">Cast Your Vote</h3>
            <p className="text-xs text-txdim mb-4">Your vote is private and anonymous.</p>
            {voteError && <p role="alert" className="text-xs text-yellow mb-3">{voteError}</p>}

            <AnimatePresence mode="wait">
              {proposal.userVote ? (
                <motion.div key="voted" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                    className="w-12 h-12 mx-auto flex items-center justify-center bg-green/15 border border-green rounded-full mb-3">
                    <Check className="w-6 h-6 text-green" />
                  </motion.div>
                  <div className="text-sm font-semibold text-green mb-1">Your vote has been recorded privately</div>
                  <p className="text-xs text-txsec">Individual votes are never publicly associated with a wallet or identity.</p>
                </motion.div>
              ) : (
                <motion.div key="voting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                  <PixelButton variant="green" className="w-full" onClick={() => setVoteModal({ open: true, vote: 'yes' })}><ThumbsUp className="w-4 h-4" /> Vote YES</PixelButton>
                  <PixelButton variant="red" className="w-full" onClick={() => setVoteModal({ open: true, vote: 'no' })}><ThumbsDown className="w-4 h-4" /> Vote NO</PixelButton>
                  <PixelButton className="w-full" onClick={() => setVoteModal({ open: true, vote: 'abstain' })}><Minus className="w-4 h-4" /> Abstain</PixelButton>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 pt-4 border-t border-bdlight space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-txdim">Quorum</span>
                <span className="font-mono text-txprim">{proposal.quorum}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-txdim">Status</span>
                <StatusBadge variant={proposal.status === 'voting' ? 'pending' : proposal.status === 'passed' ? 'success' : 'default'}>{proposal.status}</StatusBadge>
              </div>
            </div>
          </PixelCard>
        </div>
      </div>

      <ConfirmModal
        open={voteModal.open}
        onClose={() => setVoteModal({ open: false, vote: null })}
        onConfirm={handleVote}
        title={`Vote ${voteModal.vote?.toUpperCase()}?`}
        description="Your vote is private and final. It cannot be changed once submitted."
        confirmText={voting ? '' : 'Confirm Vote'}
        variant={voteModal.vote === 'yes' ? 'green' : voteModal.vote === 'no' ? 'red' : 'primary'}
        loading={voting}
      >
        <div className="card bg-bgdark p-4">
          <p className="text-sm text-txsec">You are voting <span className="text-txprim font-semibold">{voteModal.vote?.toUpperCase()}</span> on Proposal #{proposal.id}</p>
          <p className="text-xs text-txdim mt-1">{proposal.title}</p>
        </div>
      </ConfirmModal>
    </div>
  );
}

function VoteBar({ label, icon: Icon, count, pct, color }: { label: string; icon: typeof Check; count: number; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="text-sm font-medium" style={{ color }}>{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-txsec">{count} votes</span>
          <span className="text-sm font-mono font-semibold" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <div className="h-3 rounded-full bg-bgpanel2 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}40` }} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-txsec">{label}</span>
      <span className="text-sm font-mono text-txprim">{value}</span>
    </div>
  );
}
