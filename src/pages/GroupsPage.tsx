import { CreateGroupModal } from '@/components/modals/CreateGroupModal';
import {
  PixelButton,
  PixelCard,
  SectionHeader,
  StatusBadge,
} from '@/components/retro';
import { useApp } from '@/store/AppContext';
import { connectedProgram } from '@/chain/paydao';
import {
  ChevronRight,
  Clock,
  Plus,
  Target,
  Users,
  WalletCards,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GroupData } from '@/types';

export function GroupsPage() {
  const navigate = useNavigate();

  const {
    createGroup,
    isWalletConnected,
  } = useApp();

  const [showCreate, setShowCreate] = useState(false);

  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch ALL groups directly from Anchor.
   *
   * No mockData.
   * No localStorage.
   * Blockchain is the source of truth.
   */
  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { program } = await connectedProgram();

      /**
       * Anchor fetches every Group account owned by the program.
       */
      const accounts = await program.account.group.all();

      if (!accounts || accounts.length === 0) {
        setGroups([]);
        return;
      }

      const mappedGroups: GroupData[] = accounts.map(
        ({ publicKey, account }: any) => {
          const targetLamports = Number(account.targetLamports ?? 0);
          const currentLamports = Number(account.currentLamports ?? 0);
          const reservedLamports = Number(
            account.reservedLamports ?? 0,
          );

          const votingThresholdBps = Number(
            account.votingThresholdBps ?? 0,
          );

          const quorumBps = Number(
            account.quorumBps ?? 0,
          );

          const memberCount = Number(
            account.memberCount ?? 0,
          );

          const proposalCount = Number(
            account.proposalCount ?? 0,
          );

          const votingDeadline = Number(
            account.votingDeadline ?? 0,
          );

          return {
            id: publicKey.toBase58(),

            name: account.name ?? 'Unnamed Group',

            description:
              account.description ?? '',

            createdBy:
              account.creator?.toBase58?.() ??
              '',

            createdAvatarColor: 'cyan',

            /**
             * Convert lamports → SOL.
             */
            requiredAmount:
              targetLamports / 1_000_000_000,

            currentBalance:
              currentLamports / 1_000_000_000,

            currency: 'SOL',

            deadline:
              votingDeadline > 0
                ? new Date(
                  votingDeadline * 1000,
                ).toLocaleString()
                : undefined,

            visibility:
              Number(account.visibility ?? 1) === 1
                ? 'public'
                : 'private',

            members: [],

            memberCount,

            activeProposals: proposalCount,

            contributions: [],

            governance: 'democratic',

            votingThreshold:
              votingThresholdBps / 100,

            quorum:
              quorumBps / 100,

            createdAt:
              account.createdAt
                ? new Date(
                  Number(account.createdAt) * 1000,
                ).toISOString()
                : new Date().toISOString(),

            treasuryAddress: undefined,

            proposalCount,

            reservedAmount:
              reservedLamports /
              1_000_000_000,

            active:
              account.active ?? true,

            delegated: false,
          };
        },
      );

      setGroups(mappedGroups);
    } catch (err) {
      console.error(
        'Failed to load groups:',
        err,
      );

      setGroups([]);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load groups from blockchain',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load groups when page opens.
   */
  useEffect(() => {
    if (!isWalletConnected) {
      setGroups([]);
      setLoading(false);
      return;
    }

    loadGroups();
  }, [
    isWalletConnected,
    loadGroups,
  ]);

  const totalFunded = groups.reduce(
    (sum, group) =>
      sum + group.currentBalance,
    0,
  );

  const totalTarget = groups.reduce(
    (sum, group) =>
      sum + group.requiredAmount,
    0,
  );

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <SectionHeader
        title="Groups"
        subtitle="Collaborative funding pools — discover, contribute, and govern together"
        action={
          <PixelButton
            variant="primary"
            size="sm"
            onClick={() =>
              setShowCreate(true)
            }
            disabled={!isWalletConnected}
          >
            <Plus className="w-4 h-4" />
            Create Group
          </PixelButton>
        }
      />

      {/* =====================================================
          STATS
      ===================================================== */}

      <div className="grid grid-cols-3 gap-3">

        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-cyan">
            {groups.length}
          </div>

          <div className="text-xs text-txdim uppercase tracking-wide mt-1">
            On-chain Groups
          </div>
        </PixelCard>

        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-green">
            {totalFunded.toLocaleString(
              'en-US',
              {
                maximumFractionDigits: 4,
              },
            )}{' '}
            SOL
          </div>

          <div className="text-xs text-txdim uppercase tracking-wide mt-1">
            Total Funded
          </div>
        </PixelCard>

        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-yellow">
            {totalTarget.toLocaleString(
              'en-US',
              {
                maximumFractionDigits: 4,
              },
            )}{' '}
            SOL
          </div>

          <div className="text-xs text-txdim uppercase tracking-wide mt-1">
            Total Target
          </div>
        </PixelCard>

      </div>

      {/* =====================================================
          NOT CONNECTED
      ===================================================== */}

      {!isWalletConnected && (
        <PixelCard className="p-10 text-center">
          <WalletCards className="w-10 h-10 mx-auto text-cyan mb-4" />

          <h3 className="text-lg font-heading font-semibold text-txprim">
            Connect your wallet
          </h3>

          <p className="text-sm text-txdim mt-2">
            Connect a Solana wallet to load PayDAO groups
            from the blockchain.
          </p>
        </PixelCard>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}

      {isWalletConnected && loading && (
        <PixelCard className="p-10 text-center">
          <div className="w-8 h-8 mx-auto border-2 border-cyan border-t-transparent rounded-full animate-spin" />

          <p className="text-sm text-txdim mt-4">
            Loading groups from Solana...
          </p>
        </PixelCard>
      )}

      {/* =====================================================
          ERROR
      ===================================================== */}

      {isWalletConnected &&
        !loading &&
        error && (
          <PixelCard className="p-6 text-center border-red-500/30">
            <p className="text-sm text-red-400">
              {error}
            </p>

            <PixelButton
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={loadGroups}
            >
              Retry
            </PixelButton>
          </PixelCard>
        )}

      {/* =====================================================
          EMPTY BLOCKCHAIN STATE
      ===================================================== */}

      {isWalletConnected &&
        !loading &&
        !error &&
        groups.length === 0 && (
          <PixelCard className="p-12 text-center">

            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-2xl bg-cyan/10 border border-cyan/20">
              <Users className="w-8 h-8 text-cyan" />
            </div>

            <h3 className="mt-5 text-lg font-heading font-semibold text-txprim">
              No groups yet
            </h3>

            <p className="mt-2 text-sm text-txdim max-w-md mx-auto">
              There are currently no PayDAO groups
              on-chain. Create the first group and
              start a collaborative funding pool.
            </p>

            <PixelButton
              variant="primary"
              size="sm"
              className="mt-5"
              onClick={() =>
                setShowCreate(true)
              }
            >
              <Plus className="w-4 h-4" />
              Create First Group
            </PixelButton>

          </PixelCard>
        )}

      {/* =====================================================
          GROUP LIST
      ===================================================== */}

      {groups.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">

          {groups.map((group) => {

            const pct =
              group.requiredAmount > 0
                ? Math.min(
                  100,
                  (group.currentBalance /
                    group.requiredAmount) *
                  100,
                )
                : 0;

            const remaining = Math.max(
              0,
              group.requiredAmount -
              group.currentBalance,
            );

            return (
              <PixelCard
                key={group.id}
                hover
                onClick={() =>
                  navigate(
                    `/groups/${group.id}`,
                  )
                }
                className="group cursor-pointer"
              >

                {/* =================================================
                    GROUP HEADER
                ================================================= */}

                <div className="flex items-start justify-between mb-4">

                  <div className="flex items-center gap-3 min-w-0">

                    <div className="w-12 h-12 flex items-center justify-center bg-cyan/10 border border-cyan/30 rounded-xl font-heading font-semibold text-lg text-cyan shrink-0">
                      {group.name
                        ?.charAt(0)
                        ?.toUpperCase() || '?'}
                    </div>

                    <div className="min-w-0">

                      <div className="text-sm font-heading font-semibold text-txprim truncate">
                        {group.name}
                      </div>

                      <div className="text-xs text-txdim mt-0.5 font-mono">
                        {group.createdBy
                          ? `${group.createdBy.slice(
                            0,
                            4,
                          )}...${group.createdBy.slice(
                            -4,
                          )}`
                          : 'Unknown creator'}
                      </div>

                    </div>

                  </div>

                  <StatusBadge
                    variant={
                      pct >= 100
                        ? 'success'
                        : 'info'
                    }
                    className="shrink-0"
                  >
                    {pct >= 100
                      ? 'Funded'
                      : group.active
                        ? 'Active'
                        : 'Inactive'}
                  </StatusBadge>

                </div>

                {/* =================================================
                    DESCRIPTION
                ================================================= */}

                <p className="text-xs text-txsec mb-4 line-clamp-2">
                  {group.description ||
                    'No description provided.'}
                </p>

                {/* =================================================
                    FUNDING
                ================================================= */}

                <div className="mb-4">

                  <div className="flex items-center justify-between mb-2">

                    <span className="text-lg font-heading font-semibold text-txprim font-mono">
                      {group.currentBalance.toLocaleString(
                        'en-US',
                        {
                          maximumFractionDigits: 4,
                        },
                      )}{' '}
                      SOL
                    </span>

                    <span className="text-sm text-txdim font-mono">
                      of{' '}
                      {group.requiredAmount.toLocaleString(
                        'en-US',
                        {
                          maximumFractionDigits: 4,
                        },
                      )}{' '}
                      SOL
                    </span>

                  </div>

                  <div className="progress-bar mb-2">

                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${pct}%`,
                      }}
                    />

                  </div>

                  <div className="flex items-center justify-between text-xs">

                    <span className="text-cyan font-medium">
                      {pct.toFixed(1)}%
                      funded
                    </span>

                    <span className="text-txdim font-mono">
                      {remaining.toLocaleString(
                        'en-US',
                        {
                          maximumFractionDigits: 4,
                        },
                      )}{' '}
                      SOL remaining
                    </span>

                  </div>

                </div>

                {/* =================================================
                    GROUP STATS
                ================================================= */}

                <div className="grid grid-cols-3 gap-3 mb-4">

                  <div className="flex items-center gap-1.5">

                    <Users className="w-3.5 h-3.5 text-txdim" />

                    <div>
                      <div className="text-sm font-mono text-txprim">
                        {group.memberCount}
                      </div>

                      <div className="text-xs text-txdim">
                        Members
                      </div>
                    </div>

                  </div>

                  <div className="flex items-center gap-1.5">

                    <Target className="w-3.5 h-3.5 text-txdim" />

                    <div>
                      <div className="text-sm font-mono text-txprim">
                        {group.activeProposals}
                      </div>

                      <div className="text-xs text-txdim">
                        Proposals
                      </div>
                    </div>

                  </div>

                  <div className="flex items-center gap-1.5">

                    <Clock className="w-3.5 h-3.5 text-txdim" />

                    <div>

                      <div className="text-xs font-mono text-txprim truncate">
                        {group.deadline ||
                          'No deadline'}
                      </div>

                      <div className="text-xs text-txdim">
                        Deadline
                      </div>

                    </div>

                  </div>

                </div>

                {/* =================================================
                    FOOTER
                ================================================= */}

                <div className="flex items-center justify-between pt-3 border-t border-bdlight">

                  <span className="text-xs text-txdim">
                    {group.visibility ===
                      'public'
                      ? 'Public'
                      : 'Private'}{' '}
                    • Democratic
                  </span>

                  <div className="flex items-center gap-1 text-cyan group-hover:gap-2 transition-all">

                    <span className="text-sm font-medium">
                      Open Group
                    </span>

                    <ChevronRight className="w-4 h-4" />

                  </div>

                </div>

              </PixelCard>
            );
          })}

        </div>
      )}

      {/* =====================================================
          CREATE GROUP
      ===================================================== */}

      <CreateGroupModal
        open={showCreate}
        onClose={() =>
          setShowCreate(false)
        }
        onCreate={async (data) => {
          await createGroup(data);

          setShowCreate(false);

          /**
           * Re-read blockchain after transaction.
           */
          await loadGroups();
        }}
      />

    </div>
  );
}
