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

const LAMPORTS_PER_SOL = 1_000_000_000;

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }

  try {
    const result = Number(value);

    return Number.isFinite(result)
      ? result
      : fallback;
  } catch {
    return fallback;
  }
}

function lamportsToSol(value: unknown): number {
  return (
    toNumber(value) /
    LAMPORTS_PER_SOL
  );
}

function formatSol(value: number): string {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 4,
  });
}

function shortenAddress(address?: string): string {
  if (!address) {
    return 'Unknown creator';
  }

  if (address.length <= 10) {
    return address;
  }

  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatDeadline(
  timestamp: unknown,
): string | undefined {
  const value = toNumber(timestamp);

  if (value <= 0) {
    return undefined;
  }

  return new Date(
    value * 1000,
  ).toLocaleString();
}

export function GroupsPage() {
  const navigate = useNavigate();

  const {
    createGroup,
    isWalletConnected,
  } = useApp();

  const [showCreate, setShowCreate] =
    useState(false);

  const [groups, setGroups] =
    useState<GroupData[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * ============================================================
   * LOAD GROUPS DIRECTLY FROM ANCHOR / SOLANA
   * ============================================================
   */

  const loadGroups = useCallback(async () => {
    if (!isWalletConnected) {
      setGroups([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result =
        await connectedProgram();

      const program = result?.program;

      if (!program) {
        throw new Error(
          'Unable to initialize PayDAO program.',
        );
      }

      const accounts =
        await program.account.group.all();

      const mappedGroups: GroupData[] =
        (accounts ?? []).map(
          ({ publicKey, account }: any) => {
            const targetLamports =
              toNumber(
                account?.targetLamports,
              );

            const currentLamports =
              toNumber(
                account?.currentLamports,
              );

            const reservedLamports =
              toNumber(
                account?.reservedLamports,
              );

            const memberCount =
              toNumber(
                account?.memberCount,
              );

            const proposalCount =
              toNumber(
                account?.proposalCount,
              );

            const votingThresholdBps =
              toNumber(
                account?.votingThresholdBps,
              );

            const quorumBps =
              toNumber(
                account?.quorumBps,
              );

            const createdBy =
              account?.creator?.toBase58?.() ??
              '';

            const deadline =
              formatDeadline(
                account?.deadline,
              );

            return {
              id:
                publicKey?.toBase58?.() ??
                '',

              name:
                account?.name ??
                'Unnamed Group',

              description:
                account?.description ??
                '',

              createdBy,

              createdAvatarColor:
                'cyan',

              requiredAmount:
                lamportsToSol(
                  targetLamports,
                ),

              currentBalance:
                lamportsToSol(
                  currentLamports,
                ),

              reservedAmount:
                lamportsToSol(
                  reservedLamports,
                ),

              currency: 'SOL',

              deadline,

              visibility:
                toNumber(
                  account?.visibility,
                  1,
                ) === 1
                  ? 'public'
                  : 'private',

              members: [],

              memberCount,

              activeProposals:
                proposalCount,

              proposalCount,

              contributions: [],

              governance:
                'democratic',

              votingThreshold:
                votingThresholdBps / 100,

              quorum:
                quorumBps / 100,

              createdAt:
                new Date().toISOString(),

              treasuryAddress:
                undefined,

              active:
                account?.active ?? true,

              delegated: false,
            };
          },
        );

      setGroups(mappedGroups);
    } catch (err) {
      console.error(
        'Failed to load groups from Solana:',
        err,
      );

      setGroups([]);

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load groups from blockchain.',
      );
    } finally {
      setLoading(false);
    }
  }, [isWalletConnected]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const totalFunded =
    groups.reduce(
      (sum, group) =>
        sum +
        (group?.currentBalance ?? 0),
      0,
    );

  const totalTarget =
    groups.reduce(
      (sum, group) =>
        sum +
        (group?.requiredAmount ?? 0),
      0,
    );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="space-y-8">

      {/* ======================================================
          HEADER
      ====================================================== */}

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

      {/* ======================================================
          STATS
      ====================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        <PixelCard className="p-5 text-center card-hover">
          <div className="text-3xl font-heading font-semibold text-cyan tabular-nums">
            {groups.length}
          </div>

          <div className="text-xs text-txdim mt-1.5">
            On-chain groups
          </div>
        </PixelCard>

        <PixelCard className="p-5 text-center card-hover">
          <div className="text-3xl font-heading font-semibold text-green font-mono tabular-nums">
            {formatSol(totalFunded)}{' '}
            <span className="text-lg text-txdim font-body">SOL</span>
          </div>

          <div className="text-xs text-txdim mt-1.5">
            Total funded
          </div>
        </PixelCard>

        <PixelCard className="p-5 text-center card-hover">
          <div className="text-3xl font-heading font-semibold text-yellow font-mono tabular-nums">
            {formatSol(totalTarget)}{' '}
            <span className="text-lg text-txdim font-body">SOL</span>
          </div>

          <div className="text-xs text-txdim mt-1.5">
            Total target
          </div>
        </PixelCard>

      </div>

      {/* ======================================================
          WALLET NOT CONNECTED
      ====================================================== */}

      {!isWalletConnected && (
        <PixelCard className="p-12 text-center">

          <div className="w-14 h-14 mx-auto flex items-center justify-center rounded-2xl bg-cyan/10 border border-cyan/20 mb-5">
            <WalletCards className="w-7 h-7 text-cyan" />
          </div>

          <h3 className="text-lg font-heading font-semibold text-txprim">
            Connect your wallet
          </h3>

          <p className="text-sm text-txdim mt-2 max-w-sm mx-auto">
            Connect a Solana wallet to load PayDAO groups directly from the blockchain.
          </p>

        </PixelCard>
      )}

      {/* ======================================================
          LOADING
      ====================================================== */}

      {isWalletConnected &&
        loading && (
          <PixelCard className="p-12 text-center">

            <div className="w-9 h-9 mx-auto border-2 border-bdlight border-t-cyan rounded-full spin" />

            <p className="text-sm text-txdim mt-4">
              Loading groups from Solana...
            </p>

          </PixelCard>
        )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {isWalletConnected &&
        !loading &&
        error && (
          <PixelCard className="p-8 text-center border-red/30 bg-red/5">

            <p className="text-sm text-red">
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

      {/* ======================================================
          EMPTY
      ====================================================== */}

      {isWalletConnected &&
        !loading &&
        !error &&
        groups.length === 0 && (
          <PixelCard className="p-14 text-center">

            <div className="w-16 h-16 mx-auto flex items-center justify-center rounded-2xl bg-cyan/10 border border-cyan/20">
              <Users className="w-8 h-8 text-cyan" />
            </div>

            <h3 className="mt-5 text-lg font-heading font-semibold text-txprim">
              No groups yet
            </h3>

            <p className="mt-2 text-sm text-txdim max-w-md mx-auto">
              There are currently no PayDAO groups on-chain. Create the first group and start a collaborative funding pool.
            </p>

            <PixelButton
              variant="primary"
              size="sm"
              className="mt-6"
              onClick={() =>
                setShowCreate(true)
              }
            >
              <Plus className="w-4 h-4" />
              Create First Group
            </PixelButton>

          </PixelCard>
        )}

      {/* ======================================================
          GROUP LIST
      ====================================================== */}

      {!loading &&
        !error &&
        groups.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">

            {groups.map((group) => {
              const requiredAmount =
                group?.requiredAmount ?? 0;

              const currentBalance =
                group?.currentBalance ?? 0;

              const percentage =
                requiredAmount > 0
                  ? (currentBalance /
                    requiredAmount) *
                  100
                  : 0;

              const pct =
                Math.min(
                  100,
                  Math.max(
                    0,
                    percentage,
                  ),
                );

              const remaining =
                Math.max(
                  0,
                  requiredAmount -
                  currentBalance,
                );

              const isFunded = pct >= 100;

              return (
                <PixelCard
                  key={group.id}
                  hover
                  onClick={() =>
                    navigate(
                      `/groups/${group.id}`,
                    )
                  }
                  className={`group cursor-pointer card-hover p-5 ${isFunded ? 'glow-green' : ''
                    }`}
                >

                  {/* ==================================================
                      HEADER
                  ================================================== */}

                  <div className="flex items-start justify-between mb-4">

                    <div className="flex items-center gap-3 min-w-0">

                      <div className="w-11 h-11 flex items-center justify-center bg-cyan/10 border border-cyan/30 rounded-xl font-heading font-semibold text-lg text-cyan shrink-0">
                        {group?.name
                          ?.charAt(0)
                          ?.toUpperCase() ||
                          '?'}
                      </div>

                      <div className="min-w-0">

                        <div className="text-sm font-heading font-semibold text-txprim truncate">
                          {group?.name ||
                            'Unnamed Group'}
                        </div>

                        <div className="text-xs text-txdim mt-0.5 font-mono">
                          {shortenAddress(
                            group?.createdBy,
                          )}
                        </div>

                      </div>

                    </div>

                    <StatusBadge
                      variant={
                        isFunded
                          ? 'success'
                          : group?.active
                            ? 'info'
                            : 'warning'
                      }
                      className="shrink-0"
                    >
                      {isFunded
                        ? 'Funded'
                        : group?.active
                          ? 'Active'
                          : 'Inactive'}
                    </StatusBadge>

                  </div>

                  {/* ==================================================
                      DESCRIPTION
                  ================================================== */}

                  <p className="text-xs text-txsec mb-4 line-clamp-2 leading-relaxed">
                    {group?.description ||
                      'No description provided.'}
                  </p>

                  {/* ==================================================
                      FUNDING
                  ================================================== */}

                  <div className="card bg-bgdark p-3.5 mb-4">

                    <div className="flex items-center justify-between mb-2.5">

                      <span className="text-lg font-heading font-semibold text-txprim font-mono tabular-nums">
                        {formatSol(
                          currentBalance,
                        )}{' '}
                        <span className="text-xs text-txdim font-body">SOL</span>
                      </span>

                      <span className="text-xs text-txdim font-mono">
                        of {formatSol(requiredAmount)} SOL
                      </span>

                    </div>

                    <div className="progress-bar mb-2">

                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: isFunded
                            ? 'var(--accent-green)'
                            : 'var(--accent-cyan)',
                        }}
                      />

                    </div>

                    <div className="flex items-center justify-between text-xs">

                      <span
                        className={`font-medium ${isFunded ? 'text-green' : 'text-cyan'
                          }`}
                      >
                        {pct.toFixed(1)}% funded
                      </span>

                      <span className="text-txdim font-mono">
                        {isFunded
                          ? 'Goal reached'
                          : `${formatSol(remaining)} SOL remaining`}
                      </span>

                    </div>

                  </div>

                  {/* ==================================================
                      GROUP STATS
                  ================================================== */}

                  <div className="grid grid-cols-3 gap-2 mb-4 divide-x divide-bdlight">

                    <div className="flex items-center gap-2 pl-0.5">

                      <Users className="w-3.5 h-3.5 text-txdim shrink-0" />

                      <div>
                        <div className="text-sm font-mono text-txprim tabular-nums">
                          {group?.memberCount ??
                            0}
                        </div>

                        <div className="text-xs text-txdim">
                          Members
                        </div>
                      </div>

                    </div>

                    <div className="flex items-center gap-2 pl-3">

                      <Target className="w-3.5 h-3.5 text-txdim shrink-0" />

                      <div>
                        <div className="text-sm font-mono text-txprim tabular-nums">
                          {group?.proposalCount ??
                            0}
                        </div>

                        <div className="text-xs text-txdim">
                          Proposals
                        </div>
                      </div>

                    </div>

                    <div className="flex items-center gap-2 pl-3 min-w-0">

                      <Clock className="w-3.5 h-3.5 text-txdim shrink-0" />

                      <div className="min-w-0">

                        <div className="text-xs font-mono text-txprim truncate">
                          {group?.deadline ||
                            'No deadline'}
                        </div>

                        <div className="text-xs text-txdim">
                          Deadline
                        </div>

                      </div>

                    </div>

                  </div>

                  {/* ==================================================
                      FOOTER
                  ================================================== */}

                  <div className="flex items-center justify-between pt-3 border-t border-bdlight">

                    <span className="text-xs text-txdim">
                      {group?.visibility ===
                        'public'
                        ? 'Public'
                        : 'Private'}{' '}
                      · Democratic
                    </span>

                    <div className="flex items-center gap-1 text-cyan group-hover:gap-1.5 transition-all">

                      <span className="text-xs font-medium">
                        Open group
                      </span>

                      <ChevronRight className="w-3.5 h-3.5" />

                    </div>

                  </div>

                </PixelCard>
              );
            })}

          </div>
        )}

      {/* ======================================================
          CREATE GROUP
      ====================================================== */}

      <CreateGroupModal
        open={showCreate}
        onClose={() =>
          setShowCreate(false)
        }
        onCreate={async (data) => {
          await createGroup(data);

          setShowCreate(false);

          await loadGroups();
        }}
      />

    </div>
  );
}
