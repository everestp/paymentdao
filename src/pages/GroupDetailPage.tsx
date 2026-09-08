
import { CreateProposalModal } from '@/components/modals/CreateProposalModal';
import { DonateModal } from '@/components/modals/DonateModal';

import {
  PixelAvatar,
  PixelButton,
  PixelCard,
  StatusBadge,
} from '@/components/retro';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { useApp } from '@/store/AppContext';

import {
  fetchGroupDetailOnChain,
  type OnChainGroup,
  type OnChainProposal,
} from '@/chain/paydao';

import {
  ArrowDownLeft,
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Minus,
  Plus,
  Shield,
  Target,
  ThumbsDown,
  ThumbsUp,
  Users,
  Wallet,
  AlertCircle,
} from 'lucide-react';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

const LAMPORTS_PER_SOL = 1_000_000_000;

type ProposalStatus =
  | 'voting'
  | 'passed'
  | 'rejected'
  | 'executed';

function lamportsToSol(
  value: unknown,
): number {
  if (typeof value === 'number') {
    return value / LAMPORTS_PER_SOL;
  }

  if (typeof value === 'string') {
    return (
      Number(value) /
      LAMPORTS_PER_SOL
    );
  }

  if (
    value &&
    typeof value === 'object' &&
    'toString' in value
  ) {
    return (
      Number(
        (
          value as {
            toString: () => string;
          }
        ).toString(),
      ) /
      LAMPORTS_PER_SOL
    );
  }

  return 0;
}

function bnToNumber(
  value: unknown,
): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return Number(value);
  }

  if (
    value &&
    typeof value === 'object' &&
    'toString' in value
  ) {
    return Number(
      (
        value as {
          toString: () => string;
        }
      ).toString(),
    );
  }

  return 0;
}

function formatSOL(
  value: number,
): string {
  return value.toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    },
  );
}

function formatAddress(
  address: string,
): string {
  if (!address) {
    return 'Unknown';
  }

  if (address.length <= 12) {
    return address;
  }

  return `${
  address.slice(
    0,
    6,
  )
}...${ address.slice(-6) } `;
}

function formatDate(
  timestamp: number,
): string {
  if (
    !timestamp ||
    timestamp <= 0
  ) {
    return 'No deadline';
  }

  return new Date(
    timestamp * 1000,
  ).toLocaleString();
}

function getProposalStatus(
  status: number,
): ProposalStatus {
  switch (status) {
    case 0:
      return 'voting';

    case 1:
      return 'passed';

    case 2:
      return 'rejected';

    case 3:
      return 'executed';

    default:
      return 'voting';
  }
}

function getStatusVariant(
  status: ProposalStatus,
) {
  switch (status) {
    case 'voting':
      return 'pending';

    case 'passed':
      return 'success';

    case 'rejected':
      return 'rejected';

    case 'executed':
      return 'default';

    default:
      return 'default';
  }
}

function getHoursLeft(
  timestamp: number,
): number {
  if (!timestamp) {
    return 0;
  }

  const now =
    Math.floor(
      Date.now() / 1000,
    );

  const secondsLeft =
    timestamp - now;

  if (secondsLeft <= 0) {
    return 0;
  }

  return Math.ceil(
    secondsLeft / 3600,
  );
}

export function GroupDetailPage() {
  const { id } = useParams();

  const navigate =
    useNavigate();

  /*
   * -------------------------------------------------------
   * Local app actions only
   * -------------------------------------------------------
   *
   * Blockchain data is NOT taken from groups/members.
   *
   * The actual group and proposal data come from Solana.
   */
  const {
    groups,
    contribute,
    createProposal,
  } = useApp();

  const [
    tab,
    setTab,
  ] = useState('overview');

  const [
    showDonate,
    setShowDonate,
  ] = useState(false);

  const [
    showCreateProposal,
    setShowCreateProposal,
  ] = useState(false);

  /*
   * -------------------------------------------------------
   * ON-CHAIN STATE
   * -------------------------------------------------------
   */

  const [
    chainGroup,
    setChainGroup,
  ] = useState<OnChainGroup | null>(
    null,
  );

  const [
    chainProposals,
    setChainProposals,
  ] = useState<
    OnChainProposal[]
  >([]);

  const [
    treasuryBalance,
    setTreasuryBalance,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  /*
   * -------------------------------------------------------
   * FETCH GROUP DIRECTLY FROM SOLANA
   * -------------------------------------------------------
   */

  useEffect(() => {
    if (!id) {
      setError(
        'Group address is missing.',
      );

      setLoading(false);

      return;
    }

    let cancelled = false;
    async function loadGroup() {
      try {
        setLoading(true);
        setError(null);

        console.log("Loading on-chain group:", id);

        if (!id) {
          throw new Error("Group address is missing.");
        }

        const result =
          await fetchGroupDetailOnChain(id);

        if (cancelled) {
          return;
        }

        /*
         * fetchGroupDetailOnChain() already returns
         * the mapped OnChainGroup object directly.
         */
        setChainGroup(result);

        /*
         * Proposals are already included
         * inside the OnChainGroup response.
         */
        setChainProposals(
          result.proposals ?? [],
        );

        /*
         * Treasury balance is NOT returned by
         * fetchGroupDetailOnChain().
         *
         * Fetch it separately if your paydao.ts
         * exports getTreasuryBalance().
         */
        try {
          const treasuryBalance =
            await getTreasuryBalance(id);

          if (!cancelled) {
            setTreasuryBalance(
              treasuryBalance,
            );

            console.log(
              "Treasury SOL:",
              treasuryBalance,
            );
          }
        } catch (treasuryError) {
          console.error(
            "Failed to fetch treasury balance:",
            treasuryError,
          );

          if (!cancelled) {
            setTreasuryBalance(0);
          }
        }

        console.log(
          "On-chain group loaded:",
          result,
        );

        console.log(
          "On-chain proposals:",
          result.proposals,
        );
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load on-chain group:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load group from Solana.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGroup();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /*
   * -------------------------------------------------------
   * OPTIONAL LOCAL DATA
   * -------------------------------------------------------
   *
   * Only used for legacy UI actions such as
   * DonateModal if your modal still requires
   * the old local Group object.
   *
   * This DOES NOT determine blockchain existence.
   */
  const localGroup =
    groups.find(
      group => group.id === id,
    );

  /*
   * -------------------------------------------------------
   * BLOCKCHAIN VALUES
   * -------------------------------------------------------
   */

  const targetSOL =
    useMemo(
      () =>
        chainGroup
          ? lamportsToSol(
              chainGroup.targetLamports,
            )
          : 0,
      [chainGroup],
    );

  const currentSOL =
    useMemo(
      () =>
        chainGroup
          ? lamportsToSol(
              chainGroup.currentLamports,
            )
          : 0,
      [chainGroup],
    );

  const reservedSOL =
    useMemo(
      () =>
        chainGroup
          ? lamportsToSol(
              chainGroup.reservedLamports,
            )
          : 0,
      [chainGroup],
    );

  const fundingPercent =
    targetSOL > 0
      ? Math.min(
          100,
          (currentSOL /
            targetSOL) *
            100,
        )
      : 0;

  const remainingSOL =
    Math.max(
      0,
      targetSOL -
        currentSOL,
    );

  const votingThreshold =
    chainGroup
      ? chainGroup.votingThresholdBps /
        100
      : 0;

  const quorum =
    chainGroup
      ? chainGroup.quorumBps /
        100
      : 0;

  /*
   * Active proposals are calculated
   * from actual on-chain proposals.
   */
  const activeProposals =
    chainProposals.filter(
      proposal =>
        getProposalStatus(
          bnToNumber(
            proposal.status,
          ),
        ) === 'voting',
    ).length;

  /*
   * -------------------------------------------------------
   * LOADING
   * -------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="space-y-6">
        <BackButton
          navigate={navigate}
        />

        <PixelCard className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-cyan mx-auto mb-4 animate-spin" />

          <h2 className="text-sm font-heading font-semibold text-txprim">
            Loading group
          </h2>

          <p className="text-xs text-txdim mt-2">
            Reading group data directly
            from Solana...
          </p>
        </PixelCard>
      </div>
    );
  }

  /*
   * -------------------------------------------------------
   * ERROR
   * -------------------------------------------------------
   */

  if (error) {
    return (
      <div className="space-y-6">
        <BackButton
          navigate={navigate}
        />

        <PixelCard className="text-center py-16">
          <AlertCircle className="w-10 h-10 text-red mx-auto mb-4" />

          <h2 className="text-lg font-heading font-semibold text-txprim">
            Unable to load group
          </h2>

          <p className="text-sm text-red mt-2 break-words">
            {error}
          </p>

          <PixelButton
            variant="primary"
            size="sm"
            className="mt-6"
            onClick={() =>
              window.location.reload()
            }
          >
            Retry
          </PixelButton>
        </PixelCard>
      </div>
    );
  }

  /*
   * -------------------------------------------------------
   * GROUP NOT FOUND
   * -------------------------------------------------------
   */

  if (!chainGroup) {
    return (
      <div className="space-y-6">
        <BackButton
          navigate={navigate}
        />

        <PixelCard className="text-center py-16">
          <AlertCircle className="w-10 h-10 text-red mx-auto mb-4" />

          <h2 className="text-lg font-heading font-semibold text-txprim">
            Group not found
          </h2>

          <p className="text-sm text-txdim mt-2">
            This group could not be decoded
            from the connected Solana
            program.
          </p>
        </PixelCard>
      </div>
    );
  }

  /*
   * -------------------------------------------------------
   * ON-CHAIN GROUP INFORMATION
   * -------------------------------------------------------
   */

  const groupName =
    chainGroup.name;

  const groupDescription =
    chainGroup.description;

  const creator =
    chainGroup.creator;

  const deadline =
    formatDate(
      bnToNumber(
        chainGroup.deadline,
      ),
    );

  /*
   * NEVER use local group visibility
   * when blockchain already exposes it.
   */
  const visibility =
    chainGroup.visibility;

  /*
   * -------------------------------------------------------
   * RENDER
   * -------------------------------------------------------
   */

  return (
    <div className="space-y-6">

      {/* Back */}
      <BackButton
        navigate={navigate}
      />

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex items-start justify-between flex-wrap gap-4">

        <div className="flex items-center gap-4">

          <div
            className="w-14 h-14 flex items-center justify-center bg-cyan/10 border border-cyan/30 rounded-2xl font-heading font-bold text-xl text-cyan"
            style={{
              boxShadow:
                '0 0 12px rgba(0,212,230,0.2)',
            }}
          >
            {groupName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>

            <h1 className="text-xl md:text-2xl font-heading font-semibold text-txprim mb-1">
              {groupName}
            </h1>

            <div className="flex items-center gap-3 flex-wrap">

              {/* ON-CHAIN */}
              <span className="text-sm text-txsec">
                {chainGroup.memberCount}{' '}
                members
              </span>

              {/* ON-CHAIN */}
              <span className="text-sm text-green font-mono">
                {formatSOL(
                  currentSOL,
                )}{' '}
                SOL
              </span>

              <StatusBadge variant="info">
                Democratic
              </StatusBadge>

              {/* ON-CHAIN */}
              <StatusBadge
                variant={
                  visibility ===
                  'public'
                    ? 'success'
                    : 'default'
                }
              >
                {visibility}
              </StatusBadge>

              {/* ON-CHAIN */}
              <StatusBadge
                variant={
                  chainGroup.active
                    ? 'success'
                    : 'rejected'
                }
              >
                {chainGroup.active
                  ? 'active'
                  : 'inactive'}
              </StatusBadge>

            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">

          <PixelButton
            variant="green"
            size="sm"
            onClick={() =>
              setShowDonate(true)
            }
          >
            <ArrowDownLeft className="w-4 h-4" />

            Donate
          </PixelButton>

          <PixelButton
            variant="primary"
            size="sm"
            onClick={() =>
              setShowCreateProposal(
                true,
              )
            }
          >
            <FileText className="w-4 h-4" />

            Create Proposal
          </PixelButton>

        </div>
      </div>

      {/* =================================================
          DESCRIPTION
      ================================================= */}

      <p className="text-sm text-txsec">
        {groupDescription}
      </p>

      {/* =================================================
          ON-CHAIN IDENTITY
      ================================================= */}

      <PixelCard>

        <div className="grid md:grid-cols-3 gap-4">

          <div>
            <div className="text-xs text-txdim uppercase tracking-wide mb-1">
              Creator
            </div>

            <div className="text-sm font-mono text-txprim truncate">
              {formatAddress(
                creator,
              )}
            </div>
          </div>

          <div>
            <div className="text-xs text-txdim uppercase tracking-wide mb-1">
              Group PDA
            </div>

            <div className="text-sm font-mono text-cyan truncate">
              {chainGroup.address}
            </div>
          </div>

          <div>
            <div className="text-xs text-txdim uppercase tracking-wide mb-1">
              Privacy Authority
            </div>

            <div className="text-sm font-mono text-txprim truncate">
              {formatAddress(
                chainGroup.privacyAuthority,
              )}
            </div>
          </div>

        </div>

      </PixelCard>

      {/* =================================================
          FUNDING
      ================================================= */}

      <PixelCard className="border-cyan/20">

        <div className="grid md:grid-cols-2 gap-6 items-center">

          <div>

            <div className="text-xs font-medium text-txdim uppercase tracking-wide mb-2">
              Funding Progress
            </div>

            <div className="text-3xl font-heading font-semibold text-cyan mb-2 font-mono">
              {formatSOL(
                currentSOL,
              )}{' '}
              SOL
            </div>

            <div className="text-sm text-txsec mb-4">
              raised of{' '}

              <span className="font-mono text-txprim">
                {formatSOL(
                  targetSOL,
                )}{' '}
                SOL
              </span>{' '}

              target
            </div>

            <div
              className="progress-bar mb-3"
              style={{
                height: '12px',
              }}
            >
              <div
                className="progress-bar-fill"
                style={{
                  width: `${ fundingPercent }% `,
                  background:
                    fundingPercent >=
                    100
                      ? '#00e676'
                      : '#00d4e6',
                }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">

              <span className="text-cyan font-medium">
                {fundingPercent.toFixed(
                  1,
                )}
                % funded
              </span>

              <span className="text-txdim font-mono">
                {formatSOL(
                  remainingSOL,
                )}{' '}
                SOL remaining
              </span>

            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">

            <ChainStat
              icon={Target}
              label="Required"
              value={`${
  formatSOL(
    targetSOL,
  )
} SOL`}
              color="#00d4e6"
            />

            <ChainStat
              icon={Check}
              label="Raised"
              value={`${
  formatSOL(
    currentSOL,
  )
} SOL`}
              color="#00e676"
            />

            <ChainStat
              icon={Wallet}
              label="Treasury"
              value={`${
  formatSOL(
    treasuryBalance,
  )
} SOL`}
              color="#00d4e6"
            />

            <ChainStat
              icon={Target}
              label="Reserved"
              value={`${
  formatSOL(
    reservedSOL,
  )
} SOL`}
              color="#ffd600"
            />

            <ChainStat
              icon={Clock}
              label="Deadline"
              value={deadline}
              color="#ffd600"
            />

            <ChainStat
              icon={Users}
              label="Members"
              value={String(
                chainGroup.memberCount,
              )}
              color="#ff2e9a"
            />

          </div>

        </div>

      </PixelCard>

      {/* =================================================
          TABS
      ================================================= */}

      <Tabs
        value={tab}
        onValueChange={setTab}
      >

        <TabsList className="flex w-full bg-bgpanel border border-bdlight p-1 rounded-xl h-auto overflow-x-auto">

          {[
            'overview',
            'proposals',
            'contributions',
            'members',
          ].map(item => (
            <TabsTrigger
              key={item}
              value={item}
              className="tab flex-1 capitalize"
            >
              {item}
            </TabsTrigger>
          ))}

        </TabsList>

        {/* =================================================
            OVERVIEW
        ================================================= */}

        <TabsContent
          value="overview"
          className="mt-4 space-y-4"
        >

          <div className="grid lg:grid-cols-3 gap-4">

            <PixelCard className="lg:col-span-2">

              <h3 className="text-sm font-semibold text-txprim mb-4">
                On-chain Group Statistics
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                <StatRow
                  icon={Users}
                  label="Members"
                  value={String(
                    chainGroup.memberCount,
                  )}
                  color="#00e676"
                />

                <StatRow
                  icon={FileText}
                  label="Proposals"
                  value={String(
                    chainGroup.proposalCount,
                  )}
                  color="#ffd600"
                />

                <StatRow
                  icon={FileText}
                  label="Active Proposals"
                  value={String(
                    activeProposals,
                  )}
                  color="#ffd600"
                />

                <StatRow
                  icon={Target}
                  label="Funding"
                  value={`${
  fundingPercent.toFixed(
    1,
  )
}% `}
                  color="#00d4e6"
                />

                <StatRow
                  icon={Shield}
                  label="Threshold"
                  value={`${ votingThreshold }% `}
                  color="#ff2e9a"
                />

                <StatRow
                  icon={Shield}
                  label="Quorum"
                  value={`${ quorum }% `}
                  color="#a855f7"
                />

              </div>

            </PixelCard>

            <PixelCard>

              <h3 className="text-sm font-semibold text-txprim mb-4">
                Blockchain Status
              </h3>

              <div className="space-y-3">

                <StatusLine
                  label="Group"
                  value={
                    chainGroup.active
                      ? 'Active'
                      : 'Inactive'
                  }
                  active={
                    chainGroup.active
                  }
                />

                <StatusLine
                  label="Treasury"
                  value={`${
  formatSOL(
    treasuryBalance,
  )
} SOL`}
                  active
                />

                <StatusLine
                  label="Proposals"
                  value={String(
                    chainGroup.proposalCount,
                  )}
                  active
                />

                <StatusLine
                  label="Network"
                  value="Solana Devnet"
                  active
                />

                <StatusLine
                  label="Data source"
                  value="On-chain"
                  active
                />

              </div>

            </PixelCard>

          </div>

        </TabsContent>

        {/* =================================================
            PROPOSALS
        ================================================= */}

        <TabsContent
          value="proposals"
          className="mt-4 space-y-3"
        >

          <div className="flex items-center justify-between">

            <h3 className="text-sm font-semibold text-txprim">
              Group Proposals
            </h3>

            <PixelButton
              variant="primary"
              size="sm"
              onClick={() =>
                setShowCreateProposal(
                  true,
                )
              }
            >
              <Plus className="w-4 h-4" />

              Create Proposal
            </PixelButton>

          </div>

          {chainProposals.length ===
          0 ? (
            <PixelCard className="text-center py-12">

              <FileText className="w-8 h-8 text-txdim mx-auto mb-3" />

              <p className="text-sm text-txdim">
                No proposals on-chain
                yet.
              </p>

              <p className="text-xs text-txdim mt-2">
                Proposal count:{' '}
                {
                  chainGroup.proposalCount
                }
              </p>

            </PixelCard>
          ) : (
            chainProposals.map(
              proposal => {

                const status =
                  getProposalStatus(
                    bnToNumber(
                      proposal.status,
                    ),
                  );

                const yes =
                  bnToNumber(
                    proposal.yes,
                  );

                const no =
                  bnToNumber(
                    proposal.no,
                  );

                const abstain =
                  bnToNumber(
                    proposal.abstain,
                  );

                const totalVotes =
                  yes +
                  no +
                  abstain;

                const yesPercent =
                  totalVotes > 0
                    ? (yes /
                        totalVotes) *
                      100
                    : 0;

                const noPercent =
                  totalVotes > 0
                    ? (no /
                        totalVotes) *
                      100
                    : 0;

                const abstainPercent =
                  totalVotes > 0
                    ? (abstain /
                        totalVotes) *
                      100
                    : 0;

                const hoursLeft =
                  getHoursLeft(
                    bnToNumber(
                      proposal.votingDeadline,
                    ),
                  );

                const proposalAmount =
                  lamportsToSol(
                    proposal.amountLamports,
                  );

                const proposalId =
                  bnToNumber(
                    proposal.id,
                  );

                return (
                  <PixelCard
                    key={String(
                      proposalId,
                    )}
                    hover
                    onClick={() =>
                      navigate(
                        `/ proposals / ${ proposalId } `,
                      )
                    }
                  >

                    <div className="flex items-start justify-between mb-3">

                      <div className="flex-1 min-w-0">

                        <div className="text-xs text-cyan font-medium mb-1">
                          PROPOSAL #
                          {proposalId}
                        </div>

                        <div className="text-sm text-txprim font-medium">
                          {proposal.title}
                        </div>

                        <div className="text-xs text-txsec mt-1 line-clamp-2">
                          {
                            proposal.description
                          }
                        </div>

                        <div className="text-sm font-mono text-green mt-2">
                          {formatSOL(
                            proposalAmount,
                          )}{' '}
                          SOL
                        </div>

                      </div>

                      <StatusBadge
                        variant={getStatusVariant(
                          status,
                        )}
                        className="ml-2 shrink-0"
                      >
                        {status}
                      </StatusBadge>

                    </div>

                    <div className="flex items-center gap-4 text-xs mb-3">

                      <span className="text-green flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {yes}
                      </span>

                      <span className="text-red flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3" />
                        {no}
                      </span>

                      <span className="text-txdim flex items-center gap-1">
                        <Minus className="w-3 h-3" />
                        {abstain}
                      </span>

                      <span className="text-txdim ml-auto">
                        {hoursLeft >
                        0
                          ? `${ hoursLeft }h left`
                          : 'Ended'}
                      </span>

                    </div>

                    <div className="flex h-2 rounded-full overflow-hidden bg-bgpanel2">

                      <div
                        className="h-full bg-green"
                        style={{
                          width: `${ yesPercent }% `,
                        }}
                      />

                      <div
                        className="h-full bg-red"
                        style={{
                          width: `${ noPercent }% `,
                        }}
                      />

                      <div
                        className="h-full bg-txdim"
                        style={{
                          width: `${ abstainPercent }% `,
                        }}
                      />

                    </div>

                    <div className="flex items-center justify-between mt-3 gap-3">

                      <StatusBadge variant="privacy">
                        Private voting
                      </StatusBadge>

                      <div className="flex items-center gap-3">

                        <span className="text-xs text-txdim">
                          {bnToNumber(
                            proposal.voterCount,
                          )}{' '}
                          voters
                        </span>

                        <span className="text-xs text-cyan flex items-center gap-1">
                          View
                          <ChevronRight className="w-3 h-3" />
                        </span>

                      </div>

                    </div>

                    <div className="text-xs text-txdim mt-2 font-mono truncate">
                      Recipient:{' '}
                      {formatAddress(
                        proposal.recipient.toString(),
                      )}
                    </div>

                  </PixelCard>
                );
              },
            )
          )}

        </TabsContent>

        {/* =================================================
            CONTRIBUTIONS
        ================================================= */}

        <TabsContent
          value="contributions"
          className="mt-4"
        >

          <PixelCard>

            <h3 className="text-sm font-semibold text-txprim mb-4">
              Treasury
            </h3>

            <div className="grid md:grid-cols-3 gap-3">

              <ChainStat
                icon={Wallet}
                label="Treasury Balance"
                value={`${
  formatSOL(
    treasuryBalance,
  )
} SOL`}
                color="#00d4e6"
              />

              <ChainStat
                icon={Target}
                label="Group Balance"
                value={`${
  formatSOL(
    currentSOL,
  )
} SOL`}
                color="#00e676"
              />

              <ChainStat
                icon={ArrowDownLeft}
                label="Remaining"
                value={`${
  formatSOL(
    remainingSOL,
  )
} SOL`}
                color="#ffd600"
              />

            </div>

            <div className="mt-6 pt-4 border-t border-bdlight">

              <p className="text-xs text-txdim">
                Current balances are read
                directly from the Group and
                Treasury accounts on Solana.
                Historical contribution
                records require contribution
                events or dedicated
                contribution accounts.
              </p>

            </div>

          </PixelCard>

        </TabsContent>

        {/* =================================================
            MEMBERS
        ================================================= */}

        <TabsContent
          value="members"
          className="mt-4"
        >

          <PixelCard>

            <h3 className="text-sm font-semibold text-txprim mb-4">
              Group Members (
              {chainGroup.memberCount})
            </h3>

            <div className="text-center py-10">

              <Users className="w-8 h-8 text-txdim mx-auto mb-3" />

              <p className="text-sm text-txdim">
                {chainGroup.memberCount ===
                0
                  ? 'No members on-chain yet.'
                  : `${ chainGroup.memberCount } members registered on - chain.`}
              </p>

              <p className="text-xs text-txdim mt-2">
                Member profiles require
                fetching the individual
                Member accounts from the
                Solana program.
              </p>

            </div>

          </PixelCard>

        </TabsContent>

      </Tabs>

      {/* =================================================
          DONATE
      ================================================= */}

      {localGroup && (
        <DonateModal
          open={showDonate}
          onClose={() =>
            setShowDonate(false)
          }
          group={localGroup}
          onContribute={
            contribute
          }
        />
      )}

      {!localGroup &&
        showDonate && (
          <PixelCard>
            <p className="text-sm text-red">
              Donate UI is still connected
              to the old local group model.
              The group itself is correctly
              loaded from Solana.
            </p>
          </PixelCard>
        )}

      {/* =================================================
          CREATE PROPOSAL
      ================================================= */}

      <CreateProposalModal
        open={
          showCreateProposal
        }
        onClose={() =>
          setShowCreateProposal(
            false,
          )
        }
        groupId={
          chainGroup.address
        }
        groupName={
          chainGroup.name
        }
        onCreate={async data => {

          await createProposal({
            ...data,

            /*
             * IMPORTANT:
             * Proposal creation should
             * use the Group PDA.
             */
            groupId:
              chainGroup.address,
          });

          setShowCreateProposal(
            false,
          );

          /*
           * Reload blockchain data so
           * the new proposal appears.
           */
          window.location.reload();
        }}
      />

    </div>
  );
}

/* ============================================================
 * BACK BUTTON
 * ========================================================== */

function BackButton({
  navigate,
}: {
  navigate: ReturnType<
    typeof useNavigate
  >;
}) {
  return (
    <button
      onClick={() =>
        navigate('/groups')
      }
      className="flex items-center gap-2 text-txdim hover:text-txprim transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />

      <span className="text-sm">
        Back to groups
      </span>
    </button>
  );
}

/* ============================================================
 * CHAIN STAT
 * ========================================================== */

function ChainStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="card bg-bgdark p-4">

      <Icon
        className="w-4 h-4 mb-2"
        style={{
          color,
        }}
      />

      <div className="text-xs text-txdim uppercase tracking-wide mb-1">
        {label}
      </div>

      <div className="text-lg font-mono text-txprim">
        {value}
      </div>

    </div>
  );
}

/* ============================================================
 * STAT ROW
 * ========================================================== */

function StatRow({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">

      <div
        className="w-8 h-8 flex items-center justify-center rounded-lg"
        style={{
          background: `${ color } 15`,
          border: `1px solid ${ color } 40`,
        }}
      >
        <Icon
          className="w-3.5 h-3.5"
          style={{
            color,
          }}
        />
      </div>

      <div className="flex-1 min-w-0">

        <div className="text-xs text-txdim uppercase tracking-wide">
          {label}
        </div>

        <div className="text-sm font-mono text-txprim truncate">
          {value}
        </div>

      </div>

    </div>
  );
}

/* ============================================================
 * STATUS LINE
 * ========================================================== */

function StatusLine({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center justify-between">

      <span className="text-xs text-txdim">
        {label}
      </span>

      <span
        className={
          active
            ? 'text-xs text-green font-mono'
            : 'text-xs text-red font-mono'
        }
      >
        {value}
      </span>

    </div>
  );
}
