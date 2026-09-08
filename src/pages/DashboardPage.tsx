import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import {
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Users,
  Radio,
  TrendingUp,
  ChevronRight,
  Zap,
  Target,
  Check,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

import {
  fetchAllGroups,
  fetchAllProposals,
  getWalletBalance,
  getTreasuryBalance,
} from "@/chain/paydao";

import {
  PixelCard,
  StatCard,
  StatusBadge,
  PixelButton,
  NetworkBadge,
} from "@/components/retro";

/* ============================================================
 * TYPES
 * ========================================================== */

type ChainGroup = {
  publicKey?: string;
  account?: {
    name?: string;
    description?: string;

    currentBalance?: number | string;
    requiredAmount?: number | string;

    targetAmount?: number | string;

    visibility?: number;
    creator?: string;

    proposalCount?: number | string;
    memberCount?: number | string;

    [key: string]: unknown;
  };
};

type ChainProposal = {
  publicKey?: string;
  account?: {
    group?: string;
    creator?: string;

    title?: string;
    description?: string;

    amount?: number | string;
    amountLamports?: number | string;

    recipient?: string;

    votingDeadline?: number | string;

    yesVotes?: number | string;
    noVotes?: number | string;
    abstainVotes?: number | string;

    status?: string;

    [key: string]: unknown;
  };
};

/* ============================================================
 * COLORS
 * ========================================================== */

const CHART_COLORS = [
  "#00d4e6",
  "#00e676",
  "#ff2e9a",
  "#ffd600",
  "#4d7cff",
];

/* ============================================================
 * HELPERS
 * ========================================================== */

function safeNumber(
  value: unknown,
  fallback = 0,
): number {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : fallback;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  ) {
    try {
      return Number(
        (value as { toNumber: () => number }).toNumber(),
      );
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function lamportsToSol(
  value: unknown,
): number {
  return (
    safeNumber(value) /
    1_000_000_000
  );
}

function getAccount<T extends object>(
  item: unknown,
): T {
  if (
    item &&
    typeof item === "object" &&
    "account" in item
  ) {
    return (
      (item as { account?: T }).account ??
      ({} as T)
    );
  }

  return (item ?? {}) as T;
}

function getAddress(
  item: unknown,
): string {
  if (
    item &&
    typeof item === "object" &&
    "publicKey" in item
  ) {
    return String(
      (item as { publicKey?: unknown }).publicKey ??
      "",
    );
  }

  return "";
}

function formatMoney(
  amount: number,
): string {
  return amount.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function formatInteger(
  amount: number,
): string {
  return amount.toLocaleString(
    "en-US",
    {
      maximumFractionDigits: 0,
    },
  );
}

/* ============================================================
 * ICON MAP
 * ========================================================== */

const iconMap: Record<
  string,
  typeof ArrowUpRight
> = {
  "arrow-up": ArrowUpRight,
  "arrow-down": ArrowDownLeft,
  "file-text": FileText,
  check: Check,
  "thumbs-up": ThumbsUp,
  "thumbs-down": ThumbsDown,
  minus: Minus,
  "user-plus": Users,
  users: Users,
  vote: FileText,
};

/* ============================================================
 * DASHBOARD
 * ========================================================== */

export function DashboardPage() {
  const navigate = useNavigate();

  const [
    groups,
    setGroups,
  ] = useState<ChainGroup[]>([]);

  const [
    proposals,
    setProposals,
  ] = useState<ChainProposal[]>([]);

  const [
    walletBalance,
    setWalletBalance,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  /* ==========================================================
   * LOAD BLOCKCHAIN DATA
   * ======================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);

        const [
          chainGroups,
          chainProposals,
          balance,
        ] = await Promise.all([
          fetchAllGroups(),
          fetchAllProposals(),
          getWalletBalance().catch(() => 0),
        ]);

        if (cancelled) {
          return;
        }

        setGroups(
          Array.isArray(chainGroups)
            ? chainGroups
            : [],
        );

        setProposals(
          Array.isArray(chainProposals)
            ? chainProposals
            : [],
        );

        setWalletBalance(
          safeNumber(balance),
        );
      } catch (err) {
        console.error(
          "Failed to load dashboard blockchain data:",
          err,
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load blockchain data.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ==========================================================
   * NORMALIZE GROUPS
   * ======================================================== */

  const normalizedGroups = useMemo(() => {
    return groups.map(
      (item, index) => {
        const account =
          getAccount<ChainGroup["account"]>(
            item,
          );

        const address =
          getAddress(item);

        /*
         * If your Anchor account stores
         * currentBalance/requiredAmount in
         * lamports, convert here.
         *
         * If they are already SOL, remove
         * lamportsToSol().
         */

        const currentBalance =
          account?.currentBalance !== undefined
            ? lamportsToSol(
              account.currentBalance,
            )
            : 0;

        const requiredAmount =
          account?.requiredAmount !== undefined
            ? lamportsToSol(
              account.requiredAmount,
            )
            : account?.targetAmount !== undefined
              ? lamportsToSol(
                account.targetAmount,
              )
              : 0;

        return {
          id:
            address ||
            `group-${index}`,

          name:
            account?.name ??
            `Group ${index + 1}`,

          description:
            account?.description ??
            "",

          currentBalance,

          requiredAmount,

          proposalCount:
            safeNumber(
              account?.proposalCount,
            ),

          memberCount:
            safeNumber(
              account?.memberCount,
            ),
        };
      },
    );
  }, [groups]);

  /* ==========================================================
   * NORMALIZE PROPOSALS
   * ======================================================== */

  const normalizedProposals = useMemo(() => {
    return proposals.map(
      (item, index) => {
        const account =
          getAccount<ChainProposal["account"]>(
            item,
          );

        const address =
          getAddress(item);

        const amountRaw =
          account?.amount ??
          account?.amountLamports ??
          0;

        const amount =
          lamportsToSol(
            amountRaw,
          );

        const votingDeadline =
          safeNumber(
            account?.votingDeadline,
          );

        const now =
          Math.floor(
            Date.now() / 1000,
          );

        const hoursLeft =
          votingDeadline > now
            ? Math.ceil(
              (votingDeadline - now) /
              3600,
            )
            : 0;

        return {
          id:
            address ||
            `proposal-${index}`,

          title:
            account?.title ??
            `Proposal ${index + 1}`,

          description:
            account?.description ??
            "",

          groupId:
            String(
              account?.group ??
              "",
            ),

          amount,

          recipient:
            String(
              account?.recipient ??
              "",
            ),

          yes:
            safeNumber(
              account?.yesVotes,
            ),

          no:
            safeNumber(
              account?.noVotes,
            ),

          abstain:
            safeNumber(
              account?.abstainVotes,
            ),

          votingDeadline,

          hoursLeft,

          status:
            account?.status ??
            (
              votingDeadline > now
                ? "voting"
                : "ended"
            ),
        };
      },
    );
  }, [proposals]);

  /* ==========================================================
   * TOTAL FUNDING
   * ======================================================== */

  const totalFunded =
    useMemo(
      () =>
        normalizedGroups.reduce(
          (sum, group) =>
            sum +
            safeNumber(
              group.currentBalance,
            ),
          0,
        ),
      [normalizedGroups],
    );

  const totalTarget =
    useMemo(
      () =>
        normalizedGroups.reduce(
          (sum, group) =>
            sum +
            safeNumber(
              group.requiredAmount,
            ),
          0,
        ),
      [normalizedGroups],
    );

  /* ==========================================================
   * ACTIVE PROPOSALS
   * ======================================================== */

  const activeProposals =
    useMemo(
      () =>
        normalizedProposals
          .filter(
            (proposal) =>
              proposal.status ===
              "voting" ||
              proposal.hoursLeft > 0,
          )
          .sort(
            (a, b) =>
              a.hoursLeft -
              b.hoursLeft,
          )
          .slice(0, 2),
      [normalizedProposals],
    );

  /* ==========================================================
   * FUNDING DISTRIBUTION
   * ======================================================== */

  const fundingDistribution =
    useMemo(
      () =>
        normalizedGroups
          .filter(
            (group) =>
              group.currentBalance >
              0,
          )
          .map(
            (group) => ({
              name: group.name,
              value:
                group.currentBalance,
            }),
          ),
      [normalizedGroups],
    );

  /* ==========================================================
   * PROGRESS
   * ======================================================== */

  const fundingProgress =
    totalTarget > 0
      ? Math.min(
        100,
        (totalFunded /
          totalTarget) *
        100,
      )
      : 0;

  /* ==========================================================
   * LOADING
   * ======================================================== */

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-txprim">
            Loading dashboard...
          </h1>

          <p className="text-sm text-txsec mt-1">
            Reading PayDAO data directly from Solana.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(
            (item) => (
              <div
                key={item}
                className="card p-5 animate-pulse"
              >
                <div className="h-3 w-24 bg-bgpanel2 rounded mb-4" />
                <div className="h-7 w-32 bg-bgpanel2 rounded" />
              </div>
            ),
          )}
        </div>
      </div>
    );
  }

  /* ==========================================================
   * ERROR
   * ======================================================== */

  if (error) {
    return (
      <div className="space-y-6">
        <PixelCard className="border-red/30">
          <div className="flex items-start gap-3">
            <Radio className="w-5 h-5 text-red mt-0.5" />

            <div>
              <h2 className="text-base font-semibold text-txprim">
                Unable to load blockchain data
              </h2>

              <p className="text-sm text-txsec mt-1">
                {error}
              </p>

              <PixelButton
                className="mt-4"
                size="sm"
                onClick={() =>
                  window.location.reload()
                }
              >
                Retry
              </PixelButton>
            </div>
          </div>
        </PixelCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ======================================================
          HEADER
      ==================================================== */}

      <div className="flex items-start justify-between flex-wrap gap-4">

        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-txprim mb-1">
            Good evening,{" "}
            <span className="text-cyan">
              Everest
            </span>
          </h1>

          <p className="text-sm text-txsec">
            Here's what's happening across
            your PayDAO workspace.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          <PixelButton
            variant="primary"
            size="sm"
            onClick={() =>
              navigate("/send")
            }
          >
            <ArrowUpRight className="w-4 h-4" />
            Send Money
          </PixelButton>

          <PixelButton
            variant="green"
            size="sm"
            onClick={() =>
              navigate("/receive")
            }
          >
            <ArrowDownLeft className="w-4 h-4" />
            Request
          </PixelButton>

          <PixelButton
            size="sm"
            onClick={() =>
              navigate("/proposals")
            }
          >
            <FileText className="w-4 h-4" />
            Proposal
          </PixelButton>

        </div>
      </div>

      {/* ======================================================
          NETWORK
      ==================================================== */}

      <div className="flex items-center gap-3 flex-wrap">

        <NetworkBadge live />

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green/30 bg-green/5">

          <Radio className="w-3 h-3 text-green" />

          <span className="text-xs font-medium text-green">
            Solana Devnet
          </span>

        </div>

        <span className="text-xs text-txdim">
          Live on-chain data
        </span>

      </div>

      {/* ======================================================
          STATS
      ==================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <StatCard
          label="Total Funded"
          value={`$${formatInteger(totalFunded)}`}
          icon={
            <Target className="w-4 h-4" />
          }
          color="#00d4e6"
          trend={
            totalTarget > 0
              ? `${fundingProgress.toFixed(1)}% of target`
              : "No target set"
          }
          trendUp
        />

        <StatCard
          label="Active Groups"
          value={String(
            normalizedGroups.length,
          )}
          icon={
            <Users className="w-4 h-4" />
          }
          color="#00e676"
          trend="On-chain groups"
          trendUp
        />

        <StatCard
          label="Active Proposals"
          value={String(
            normalizedProposals.filter(
              (proposal) =>
                proposal.hoursLeft > 0,
            ).length,
          )}
          icon={
            <FileText className="w-4 h-4" />
          }
          color="#ffd600"
          trend="Currently voting"
          trendUp
        />

        <StatCard
          label="Wallet Balance"
          value={`${formatMoney(walletBalance)} SOL`}
          icon={
            <TrendingUp className="w-4 h-4" />
          }
          color="#ff2e9a"
          trend="Connected wallet"
          trendUp
        />

      </div>

      {/* ======================================================
          FUNDING + DISTRIBUTION
      ==================================================== */}

      <div className="grid lg:grid-cols-3 gap-6">

        <PixelCard className="lg:col-span-2">

          <div className="flex items-start justify-between mb-5">

            <div>

              <div className="text-xs font-medium text-txdim uppercase tracking-wide mb-2">
                Total Funding
              </div>

              <div className="text-3xl font-heading font-semibold text-cyan mb-1">
                ${formatInteger(totalFunded)}
              </div>

              <div className="flex items-center gap-2">

                <StatusBadge variant="success">
                  {normalizedGroups.length} groups
                </StatusBadge>

                <span className="text-xs text-green">
                  {fundingProgress.toFixed(1)}%
                  funded
                </span>

              </div>

            </div>

            <PixelButton
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate("/groups")
              }
            >
              View Groups
              <ChevronRight className="w-4 h-4" />
            </PixelButton>

          </div>

          {/* REAL ON-CHAIN PROGRESS */}

          <div className="space-y-3">

            <div className="flex justify-between text-xs">
              <span className="text-txdim">
                Current funding
              </span>

              <span className="text-txprim font-mono">
                {formatInteger(
                  totalFunded,
                )}{" "}
                /{" "}
                {formatInteger(
                  totalTarget,
                )}{" "}
                SOL
              </span>
            </div>

            <div className="h-3 rounded-full overflow-hidden bg-bgpanel2">

              <div
                className="h-full bg-cyan transition-all duration-700"
                style={{
                  width: `${fundingProgress}%`,
                }}
              />

            </div>

            <div className="text-xs text-txdim">
              Funding progress calculated
              directly from on-chain group
              accounts.
            </div>

          </div>

          <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-bdlight">

            <div>

              <div className="text-xs text-txdim uppercase tracking-wide mb-1">
                Wallet Balance
              </div>

              <div className="text-sm font-mono text-txprim">
                {formatMoney(
                  walletBalance,
                )}{" "}
                SOL
              </div>

            </div>

            <div>

              <div className="text-xs text-txdim uppercase tracking-wide mb-1">
                Treasury Funding
              </div>

              <div className="text-sm font-mono text-green">
                {formatMoney(
                  totalFunded,
                )}{" "}
                SOL
              </div>

            </div>

          </div>

        </PixelCard>

        {/* DISTRIBUTION */}

        <PixelCard>

          <div className="flex items-center justify-between mb-4">

            <h3 className="text-sm font-semibold text-txprim">
              Funding Distribution
            </h3>

          </div>

          <div className="relative h-40">

            {fundingDistribution.length >
              0 ? (
              <>
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>

                    <Pie
                      data={
                        fundingDistribution
                      }
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                    >

                      {fundingDistribution.map(
                        (_, index) => (
                          <Cell
                            key={index}
                            fill={
                              CHART_COLORS[
                              index %
                              CHART_COLORS.length
                              ]
                            }
                            stroke="#12141b"
                            strokeWidth={2}
                          />
                        ),
                      )}

                    </Pie>

                    <Tooltip
                      contentStyle={{
                        background:
                          "#12141b",
                        border:
                          "1px solid #3a3f55",
                        borderRadius:
                          "12px",
                        fontFamily:
                          "Inter",
                        fontSize:
                          "13px",
                      }}
                      formatter={(
                        value: number,
                      ) => [
                          `${formatMoney(
                            safeNumber(
                              value,
                            ),
                          )} SOL`,
                          "Funded",
                        ]}
                    />

                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">

                  <div className="text-xs text-txdim uppercase tracking-wide">
                    Total
                  </div>

                  <div className="text-sm font-mono text-txprim">
                    {formatMoney(
                      totalFunded,
                    )}{" "}
                    SOL
                  </div>

                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-txdim">
                No funding yet
              </div>
            )}

          </div>

          <div className="space-y-2 mt-4">

            {normalizedGroups
              .slice(0, 5)
              .map(
                (group, index) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between"
                  >

                    <div className="flex items-center gap-2 min-w-0">

                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          background:
                            CHART_COLORS[
                            index %
                            CHART_COLORS.length
                            ],
                        }}
                      />

                      <span className="text-xs text-txsec truncate">
                        {group.name}
                      </span>

                    </div>

                    <span className="text-xs font-mono text-txprim">
                      {formatMoney(
                        group.currentBalance,
                      )}{" "}
                      SOL
                    </span>

                  </div>
                ),
              )}

          </div>

        </PixelCard>

      </div>

      {/* ======================================================
          QUICK ACTIONS
      ==================================================== */}

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">

        {[
          {
            label: "Send",
            icon: ArrowUpRight,
            path: "/send",
            color: "#00d4e6",
          },
          {
            label: "Request",
            icon: ArrowDownLeft,
            path: "/receive",
            color: "#00e676",
          },
          {
            label: "Proposal",
            icon: FileText,
            path: "/proposals",
            color: "#ffd600",
          },
          {
            label: "Group",
            icon: Users,
            path: "/groups",
            color: "#ff2e9a",
          },
          {
            label: "Wallet",
            icon: Zap,
            path: "/wallet",
            color: "#ff8c00",
          },
          {
            label: "Activity",
            icon: Radio,
            path: "/activity",
            color: "#4d7cff",
          },
        ].map(
          (action) => (
            <button
              key={action.label}
              onClick={() =>
                navigate(
                  action.path,
                )
              }
              className="card p-4 flex flex-col items-center gap-2 card-hover transition-all"
            >

              <div
                className="w-9 h-9 flex items-center justify-center rounded-lg"
                style={{
                  background: `${action.color}15`,
                  border: `1px solid ${action.color}40`,
                }}
              >

                <action.icon
                  className="w-4 h-4"
                  style={{
                    color:
                      action.color,
                  }}
                />

              </div>

              <span className="text-xs text-txsec font-medium">
                {action.label}
              </span>

            </button>
          ),
        )}

      </div>

      {/* ======================================================
          ACTIVE PROPOSALS
      ==================================================== */}

      <PixelCard>

        <div className="flex items-center justify-between mb-4">

          <h3 className="text-sm font-semibold text-txprim">
            Active Proposals
          </h3>

          <PixelButton
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate(
                "/proposals",
              )
            }
          >
            View all
            <ChevronRight className="w-4 h-4" />
          </PixelButton>

        </div>

        {activeProposals.length ===
          0 ? (
          <div className="py-8 text-center">

            <FileText className="w-8 h-8 text-txdim mx-auto mb-2" />

            <p className="text-sm text-txsec">
              No active proposals
            </p>

            <p className="text-xs text-txdim mt-1">
              Proposal data will appear
              here when created on-chain.
            </p>

          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-3">

            {activeProposals.map(
              (proposal) => {

                const totalVotes =
                  proposal.yes +
                  proposal.no +
                  proposal.abstain;

                const yesPercent =
                  totalVotes > 0
                    ? (proposal.yes /
                      totalVotes) *
                    100
                    : 0;

                const noPercent =
                  totalVotes > 0
                    ? (proposal.no /
                      totalVotes) *
                    100
                    : 0;

                return (
                  <div
                    key={
                      proposal.id
                    }
                    className="card bg-bgdark p-4 cursor-pointer card-hover transition-all"
                    onClick={() =>
                      navigate(
                        `/proposals/${proposal.id}`,
                      )
                    }
                  >

                    <div className="flex items-start justify-between mb-3">

                      <div className="flex-1 min-w-0">

                        <div className="text-xs text-cyan font-medium mb-1">
                          PROPOSAL
                        </div>

                        <div className="text-sm text-txprim font-medium truncate">
                          {
                            proposal.title
                          }
                        </div>

                      </div>

                      <StatusBadge
                        variant="pending"
                        className="ml-2 shrink-0"
                      >
                        Voting
                      </StatusBadge>

                    </div>

                    <div className="text-xs text-txdim mb-3 truncate">
                      {proposal.recipient
                        ? `Recipient: ${proposal.recipient}`
                        : "Recipient unavailable"}
                    </div>

                    <div className="flex items-center justify-between text-xs mb-2">

                      <span className="text-green">
                        YES:{" "}
                        {
                          proposal.yes
                        }
                      </span>

                      <span className="text-red">
                        NO:{" "}
                        {
                          proposal.no
                        }
                      </span>

                      <span className="text-txdim">
                        ABS:{" "}
                        {
                          proposal.abstain
                        }
                      </span>

                    </div>

                    <div className="flex h-2 rounded-full overflow-hidden bg-bgpanel2">

                      <div
                        className="h-full bg-green"
                        style={{
                          width: `${yesPercent}%`,
                        }}
                      />

                      <div
                        className="h-full bg-red"
                        style={{
                          width: `${noPercent}%`,
                        }}
                      />

                    </div>

                    <div className="flex items-center justify-between mt-3">

                      <span className="text-xs text-cyan font-mono">
                        {formatMoney(
                          proposal.amount,
                        )}{" "}
                        SOL
                      </span>

                      <span className="text-xs text-txdim">
                        {proposal.hoursLeft >
                          0
                          ? `${proposal.hoursLeft}h left`
                          : "Ended"}
                      </span>

                    </div>

                  </div>
                );
              },
            )}

          </div>
        )}

      </PixelCard>

      {/* ======================================================
          ON-CHAIN STATUS
      ==================================================== */}

      <PixelCard className="border-green/30">

        <div className="flex items-center gap-2 mb-3">

          <span className="w-2 h-2 rounded-full bg-green blink" />

          <span className="text-xs font-semibold text-green uppercase tracking-wide">
            Live Blockchain
          </span>

        </div>

        <h3 className="text-base font-heading font-semibold text-txprim mb-2">
          PayDAO on Solana
        </h3>

        <p className="text-sm text-txsec mb-4">
          Dashboard values are loaded directly
          from Solana accounts using the PayDAO
          Anchor program. No mock funding or
          proposal values are used.
        </p>

        <div className="grid md:grid-cols-3 gap-3">

          <div className="card bg-bgdark p-3">

            <div className="text-xs text-txdim mb-1">
              Groups
            </div>

            <div className="text-lg font-mono text-cyan">
              {normalizedGroups.length}
            </div>

          </div>

          <div className="card bg-bgdark p-3">

            <div className="text-xs text-txdim mb-1">
              Proposals
            </div>

            <div className="text-lg font-mono text-yellow">
              {
                normalizedProposals.length
              }
            </div>

          </div>

          <div className="card bg-bgdark p-3">

            <div className="text-xs text-txdim mb-1">
              Wallet
            </div>

            <div className="text-lg font-mono text-green">
              {formatMoney(
                walletBalance,
              )}{" "}
              SOL
            </div>

          </div>

        </div>

      </PixelCard>

    </div>
  );
}
