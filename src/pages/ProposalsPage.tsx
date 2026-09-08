import { CreateProposalModal } from '@/components/modals/CreateProposalModal';
import {
  PixelButton,
  PixelCard,
  SectionHeader,
  StatusBadge,
} from '@/components/retro';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useApp } from '@/store/AppContext';
import type { Proposal } from '@/types';
import {
  Check,
  ChevronRight,
  Clock,
  FileText,
  Minus,
  Shield,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function ProposalsPage() {
  const navigate = useNavigate();

  const {
    proposals,
    groups,
    stats,
    createProposal,
  } = useApp();

  const [tab, setTab] = useState('active');
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  /*
   * ---------------------------------------------------------
   * FILTER PROPOSALS
   * ---------------------------------------------------------
   */

  const filtered = useMemo(() => {
    return proposals.filter((proposal) => {
      switch (tab) {
        case 'active':
          return proposal.status === 'voting';

        case 'passed':
          return (
            proposal.status === 'passed' ||
            proposal.status === 'executed'
          );

        case 'rejected':
          return (
            proposal.status === 'rejected' ||
            proposal.status === 'expired'
          );

        case 'all':
        default:
          return true;
      }
    });
  }, [proposals, tab]);

  /*
   * ---------------------------------------------------------
   * CREATE PROPOSAL
   * ---------------------------------------------------------
   */

  const handleCreateProposal = async (
    data: Parameters<typeof createProposal>[0],
  ) => {
    if (!data.groupId) {
      throw new Error(
        'Please select a group before creating a proposal.',
      );
    }

    try {
      setIsCreating(true);

      await createProposal(data);

      setShowCreate(false);
    } finally {
      setIsCreating(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <SectionHeader
        title="Proposals"
        subtitle="Community governance — vote privately, execute automatically"
        action={
          <PixelButton
            variant="primary"
            size="sm"
            onClick={() => setShowCreate(true)}
            disabled={isCreating}
          >
            <FileText className="w-4 h-4" />

            Create Proposal
          </PixelButton>
        }
      />

      {/* STATS */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-txprim">
            {proposals.length}
          </div>

          <div className="text-xs text-txdim uppercase tracking-wide mt-1">
            Total
          </div>
        </PixelCard>

        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-yellow">
            {stats.activeProposals}
          </div>

          <div className="text-xs text-txdim uppercase tracking-wide mt-1">
            Active
          </div>
        </PixelCard>

        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-green">
            {stats.passedProposals}
          </div>

          <div className="text-xs text-txdim uppercase tracking-wide mt-1">
            Passed
          </div>
        </PixelCard>

        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-red">
            {stats.rejectedProposals}
          </div>

          <div className="text-xs text-txdim uppercase tracking-wide mt-1">
            Rejected
          </div>
        </PixelCard>
      </div>

      {/* TABS */}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full bg-bgpanel border border-bdlight p-1 rounded-xl h-auto">
          {[
            'active',
            'passed',
            'rejected',
            'all',
          ].map((value) => (
            <TabsTrigger
              key={value}
              value={value}
              className="tab flex-1 capitalize"
            >
              {value}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value={tab}
          className="mt-4"
        >
          {filtered.length === 0 ? (
            <PixelCard className="p-10 text-center">
              <FileText className="w-8 h-8 mx-auto mb-3 text-txdim" />

              <div className="text-sm text-txprim font-medium">
                No {tab === 'all' ? '' : `${tab} `}proposals
              </div>

              <div className="text-xs text-txdim mt-1">
                {tab === 'active'
                  ? 'Create a proposal to start a community vote.'
                  : 'There are no proposals in this category yet.'}
              </div>

              {tab === 'active' && (
                <PixelButton
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    setShowCreate(true)
                  }
                >
                  <FileText className="w-4 h-4" />

                  Create Proposal
                </PixelButton>
              )}
            </PixelCard>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filtered.map((proposal) => {
                const group = groups.find(
                  (item) =>
                    item.id === proposal.groupId,
                );

                return (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    groupName={
                      group?.name || 'Unknown Group'
                    }
                    onClick={() =>
                      navigate(
                        `/proposals/${proposal.id}`,
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* CREATE PROPOSAL MODAL */}

      <CreateProposalModal
        open={showCreate}
        onClose={() => {
          if (!isCreating) {
            setShowCreate(false);
          }
        }}
        groupId=""
        groupName=""
        onCreate={handleCreateProposal}
      />
    </div>
  );
}

/*
 * ============================================================
 * PROPOSAL CARD
 * ============================================================
 */

function ProposalCard({
  proposal: p,
  groupName,
  onClick,
}: {
  proposal: Proposal;
  groupName: string;
  onClick: () => void;
}) {
  /*
   * ---------------------------------------------------------
   * VOTE COUNTS
   * ---------------------------------------------------------
   */

  const totalVotes =
    p.votes.yes +
    p.votes.no +
    p.votes.abstain;

  /*
   * ---------------------------------------------------------
   * MEMBER COUNT
   * ---------------------------------------------------------
   *
   * Prevent division by zero.
   */

  const memberCount = Math.max(
    p.totalMembers || 0,
    0,
  );

  const denominator =
    memberCount > 0 ? memberCount : 1;

  /*
   * ---------------------------------------------------------
   * VOTE PERCENTAGES
   * ---------------------------------------------------------
   */

  const yesPct = Math.min(
    100,
    (p.votes.yes / denominator) * 100,
  );

  const noPct = Math.min(
    100,
    (p.votes.no / denominator) * 100,
  );

  const abstainPct = Math.min(
    100,
    (p.votes.abstain / denominator) * 100,
  );

  /*
   * ---------------------------------------------------------
   * STATUS
   * ---------------------------------------------------------
   */

  const statusVariant =
    p.status === 'voting'
      ? 'pending'
      : p.status === 'passed'
        ? 'success'
        : p.status === 'rejected'
          ? 'rejected'
          : p.status === 'executed'
            ? 'approved'
            : 'default';

  /*
   * ---------------------------------------------------------
   * CARD
   * ---------------------------------------------------------
   */

  return (
    <PixelCard
      hover
      onClick={onClick}
      className="flex flex-col cursor-pointer"
    >
      {/* HEADER */}

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs text-cyan font-medium mb-1">
            PROPOSAL #{p.id}
          </div>

          <div className="text-sm text-txprim font-medium truncate">
            {p.title}
          </div>

          <div className="text-xs text-txdim mt-0.5 truncate">
            {groupName}
          </div>
        </div>

        <StatusBadge
          variant={statusVariant}
          className="ml-2 shrink-0"
        >
          {p.status}
        </StatusBadge>
      </div>

      {/* DESCRIPTION */}

      <p className="text-xs text-txsec mb-3 line-clamp-2">
        {p.description}
      </p>

      {/* PROPOSAL INFO */}

      <div className="card bg-bgdark p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-txdim uppercase tracking-wide">
            Requested
          </span>

          <span className="text-sm font-mono text-cyan">
            {p.amount.toLocaleString()} {p.currency}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-txdim uppercase tracking-wide">
            Quorum
          </span>

          <span className="text-sm font-mono text-txprim">
            {p.quorum}%
          </span>
        </div>
      </div>

      {/* VOTING RESULTS */}

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-xs">
          {/* YES */}

          <span className="text-green flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" />

            {p.votes.yes}
          </span>

          {/* NO */}

          <span className="text-red flex items-center gap-1">
            <ThumbsDown className="w-3 h-3" />

            {p.votes.no}
          </span>

          {/* ABSTAIN */}

          <span className="text-txdim flex items-center gap-1">
            <Minus className="w-3 h-3" />

            {p.votes.abstain}
          </span>
        </div>

        {/* VOTE BAR */}

        <div className="flex h-2 rounded-full overflow-hidden bg-bgpanel2">
          {yesPct > 0 && (
            <div
              className="h-full bg-green"
              style={{
                width: `${yesPct}%`,
              }}
            />
          )}

          {noPct > 0 && (
            <div
              className="h-full bg-red"
              style={{
                width: `${noPct}%`,
              }}
            />
          )}

          {abstainPct > 0 && (
            <div
              className="h-full bg-bdbright"
              style={{
                width: `${abstainPct}%`,
              }}
            />
          )}
        </div>

        {/* VOTE TOTAL */}

        <div className="flex items-center justify-between text-xs text-txdim">
          <span>
            {totalVotes}/{memberCount} voted
          </span>

          {p.hoursLeft > 0 && (
            <span className="text-yellow flex items-center gap-1">
              <Clock className="w-3 h-3" />

              {p.hoursLeft}h left
            </span>
          )}
        </div>
      </div>

      {/* FOOTER */}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-bdlight">
        {/* PRIVATE VOTING */}

        <StatusBadge variant="privacy">
          <Shield className="w-3 h-3" />

          Private
        </StatusBadge>

        {/* ACTION */}

        {p.userVote ? (
          <div className="flex items-center gap-1 text-xs text-green">
            <Check className="w-3 h-3" />

            Voted
          </div>
        ) : p.status === 'voting' ? (
          <span className="text-xs text-cyan flex items-center gap-1">
            Vote now

            <ChevronRight className="w-3 h-3" />
          </span>
        ) : (
          <span className="text-xs text-cyan flex items-center gap-1">
            View

            <ChevronRight className="w-3 h-3" />
          </span>
        )}
      </div>
    </PixelCard>
  );
}
