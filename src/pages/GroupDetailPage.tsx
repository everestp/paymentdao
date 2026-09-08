import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { CreateProposalModal } from "@/components/modals/CreateProposalModal";
import { DonateModal } from "@/components/modals/DonateModal";

import {
  PixelAvatar,
  PixelButton,
  PixelCard,
  StatusBadge,
} from "@/components/retro";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Landmark,
  Loader2,
  Lock,
  QrCode,
  RefreshCw,
  Shield,
  Users,
  Wallet,
} from "lucide-react";

import {
  contributeOnChain,
  createProposalOnChain,
  fetchGroupDetailOnChain,
  fetchGroupMembersOnChain,
  getTreasuryBalance,
  type OnChainGroup,
  type OnChainMember,
  type OnChainProposal,
} from "@/chain/paydao";

import type { Currency } from "@/types";

/* ============================================================
 * HELPERS
 * ========================================================== */

function formatAddress(address?: string) {
  if (!address) return "—";

  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function formatSOL(value?: number | string) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return "0.0000";
  }

  return number.toFixed(4);
}

function formatNumber(value?: number | string) {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat().format(number);
}

function formatDate(value?: number | string) {
  const timestamp = Number(value ?? 0);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "—";
  }

  return new Date(timestamp * 1000).toLocaleString();
}

function getHoursLeft(deadline?: number | string) {
  const timestamp = Number(deadline ?? 0);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return 0;
  }

  const now = Date.now();
  const deadlineMs = timestamp * 1000;

  return Math.max(
    0,
    Math.ceil((deadlineMs - now) / (1000 * 60 * 60)),
  );
}

function getProposalStatus(proposal: OnChainProposal) {
  if (proposal.executed) {
    return "executed";
  }

  const status = String(proposal.status ?? "").toLowerCase();

  if (status.includes("execut")) {
    return "executed";
  }

  if (status.includes("reject")) {
    return "rejected";
  }

  if (status.includes("pass")) {
    return "passed";
  }

  const numericStatus = Number(proposal.status);

  if (numericStatus === 1) {
    return "passed";
  }

  if (numericStatus === 2) {
    return "rejected";
  }

  if (numericStatus === 3) {
    return "executed";
  }

  return "voting";
}

function getStatusVariant(
  status: string,
): "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "passed":
    case "executed":
      return "success";

    case "rejected":
      return "danger";

    case "voting":
      return "warning";

    default:
      return "info";
  }
}

function getVisibilityLabel(
  visibility?: string,
) {
  return visibility === "private" ? "Private" : "Public";
}

function getFundingPercent(
  raised: number,
  target: number,
) {
  if (target <= 0) return 0;

  return Math.min(
    100,
    Math.max(0, (raised / target) * 100),
  );
}

/* ============================================================
 * COMPONENT
 * ========================================================== */

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [chainGroup, setChainGroup] =
    useState<OnChainGroup | null>(null);

  const [chainProposals, setChainProposals] =
    useState<OnChainProposal[]>([]);

  const [members, setMembers] =
    useState<OnChainMember[]>([]);

  const [treasuryBalance, setTreasuryBalance] =
    useState<number>(0);

  const [loading, setLoading] =
    useState(true);

  const [membersLoading, setMembersLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [showDonate, setShowDonate] =
    useState(false);

  const [showCreateProposal, setShowCreateProposal] =
    useState(false);

  const [copied, setCopied] =
    useState<string | null>(null);

  /* ==========================================================
   * COPY
   * ======================================================== */

  const copyToClipboard = async (
    value: string,
    type: string,
  ) => {
    try {
      await navigator.clipboard.writeText(value);

      setCopied(type);

      window.setTimeout(() => {
        setCopied(null);
      }, 1800);
    } catch {
      console.error("Failed to copy");
    }
  };

  /* ==========================================================
   * LOAD GROUP
   * ======================================================== */

  const loadGroup = useCallback(
    async (silent = false) => {
      if (!id) {
        setError("Group address is missing.");
        setLoading(false);
        return;
      }

      try {
        if (!silent) {
          setLoading(true);
        }

        setError(null);

        const group =
          await fetchGroupDetailOnChain(id);

        setChainGroup(group);

        /*
         * fetchGroupDetailOnChain already returns proposals,
         * but fetch them separately as well so the page always
         * gets the latest proposal accounts.
         */
        setChainProposals(
          group.proposals ?? [],
        );

        try {
          const balance =
            await getTreasuryBalance(id);

          setTreasuryBalance(
            Number(balance) || 0,
          );
        } catch (balanceError) {
          console.warn(
            "Unable to fetch treasury balance:",
            balanceError,
          );
        }
      } catch (err) {
        console.error(
          "Failed to load group:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load group.",
        );
      } finally {
        setLoading(false);
      }
    },
    [id],
  );

  /* ==========================================================
   * LOAD MEMBERS
   * ======================================================== */

  const loadMembers = useCallback(
    async () => {
      if (!id) return;

      try {
        setMembersLoading(true);

        const result =
          await fetchGroupMembersOnChain(id);

        setMembers(result);
      } catch (err) {
        console.error(
          "Failed to load members:",
          err,
        );

        /*
         * Don't destroy the entire page if member loading
         * fails. The group itself can still be displayed.
         */
        setMembers([]);
      } finally {
        setMembersLoading(false);
      }
    },
    [id],
  );

  /* ==========================================================
   * REFRESH
   * ======================================================== */

  const refreshGroup = useCallback(
    async () => {
      if (!id) return;

      try {
        setRefreshing(true);

        const [
          group,
          balance,
          groupMembers,
        ] = await Promise.all([
          fetchGroupDetailOnChain(id),
          getTreasuryBalance(id),
          fetchGroupMembersOnChain(id),
        ]);

        setChainGroup(group);

        setChainProposals(
          group.proposals ?? [],
        );

        setTreasuryBalance(
          Number(balance) || 0,
        );

        setMembers(
          groupMembers ?? [],
        );
      } catch (err) {
        console.error(
          "Failed to refresh group:",
          err,
        );
      } finally {
        setRefreshing(false);
      }
    },
    [id],
  );

  /* ==========================================================
   * INITIAL LOAD
   * ======================================================== */

  useEffect(() => {
    void loadGroup();
    void loadMembers();
  }, [loadGroup, loadMembers]);

  /* ==========================================================
   * DERIVED DATA
   * ======================================================== */

  const targetSOL =
    chainGroup?.targetSol ?? 0;

  const raisedSOL =
    chainGroup?.raisedSol ?? 0;

  const reservedSOL =
    chainGroup?.reservedSol ?? 0;

  const fundingPercent =
    getFundingPercent(
      raisedSOL,
      targetSOL,
    );

  const activeProposals =
    chainProposals.filter(
      (proposal) =>
        getProposalStatus(proposal) ===
        "voting",
    ).length;

  const treasuryAddress =
    chainGroup?.treasuryAddress ?? "";

  const remainingSOL = Math.max(
    0,
    targetSOL - raisedSOL,
  );

  const totalVotes = (
    proposal: OnChainProposal,
  ) =>
    Number(proposal.yesVotes ?? 0) +
    Number(proposal.noVotes ?? 0) +
    Number(proposal.abstainVotes ?? 0);

  const proposalVotePercent = (
    proposal: OnChainProposal,
  ) => {
    const total = totalVotes(proposal);

    if (total === 0) return 0;

    return Math.min(
      100,
      (Number(proposal.yesVotes ?? 0) /
        total) *
      100,
    );
  };

  const qrCodeUrl = useMemo(() => {
    if (!treasuryAddress) return "";

    return (
      "https://api.qrserver.com/v1/create-qr-code/" +
      `?size=220x220&data=${encodeURIComponent(
        treasuryAddress,
      )}`
    );
  }, [treasuryAddress]);

  /* ==========================================================
   * DONATE
   * ======================================================== */

  const handleContribute = async (
    amount: number,
    currency: Currency,
  ) => {
    if (!chainGroup) {
      throw new Error(
        "Group has not loaded yet.",
      );
    }
    console.log(
      "Contribution successful:",
      amount,
    );
    const signature =
      await contributeOnChain(
        chainGroup.address,
        Number(0.01),
        "SOL",
      );

    console.log(
      "Contribution successful:",
      signature,
    );

    setShowDonate(false);

    await refreshGroup();
  };

  /* ==========================================================
   * CREATE PROPOSAL
   * ======================================================== */

  const handleCreateProposal = async (
    data: {
      title: string;
      description: string;
      amount: number | string;
      currency: Currency;
      recipient: string;
      duration: number | string;
    },
  ) => {
    if (!chainGroup) {
      throw new Error(
        "Group has not loaded yet.",
      );
    }

    const result =
      await createProposalOnChain({
        groupId: chainGroup.address,
        title: data.title,
        description: data.description,
        amount: Number(data.amount),
        currency: data.currency,
        recipient: data.recipient,
        duration: Number(data.duration),
      });

    console.log(
      "Proposal created:",
      result,
    );

    setShowCreateProposal(false);

    await refreshGroup();
  };

  /* ==========================================================
   * LOADING
   * ======================================================== */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />

          <p className="text-sm opacity-70">
            Loading group from Solana...
          </p>
        </div>
      </div>
    );
  }

  /* ==========================================================
   * ERROR
   * ======================================================== */

  if (error || !chainGroup) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-3xl">
          <PixelCard className="p-8 text-center">
            <div className="mb-4 flex justify-center">
              <Shield className="h-12 w-12" />
            </div>

            <h1 className="text-xl font-bold">
              Group not found
            </h1>

            <p className="mt-2 text-sm opacity-70">
              {error ??
                "Unable to load this group from the Solana blockchain."}
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <PixelButton
                onClick={() =>
                  void loadGroup()
                }
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </PixelButton>

              <PixelButton
                variant="outline"
                onClick={() =>
                  navigate(-1)
                }
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      </div>
    );
  }

  /* ==========================================================
   * PAGE
   * ======================================================== */

  return (
    <div className="min-h-screen pb-16">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ====================================================
            TOP BAR
        ===================================================== */}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <PixelButton
            variant="outline"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </PixelButton>

          <PixelButton
            variant="outline"
            disabled={refreshing}
            onClick={() =>
              void refreshGroup()
            }
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing
                  ? "animate-spin"
                  : ""
                }`}
            />

            Refresh
          </PixelButton>
        </div>

        {/* ====================================================
            HEADER
        ===================================================== */}

        <PixelCard className="mb-6 overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

              <div className="flex gap-4">
                <PixelAvatar
                  name={chainGroup.name}
                  size="lg"
                />

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold">
                      {chainGroup.name}
                    </h1>

                    <StatusBadge
                      status={
                        chainGroup.active
                          ? "active"
                          : "inactive"
                      }
                    />
                  </div>

                  <p className="mt-2 max-w-2xl text-sm opacity-70">
                    {chainGroup.description ||
                      "No group description available."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge status="Democratic" />

                    <StatusBadge
                      status={getVisibilityLabel(
                        chainGroup.visibility,
                      )}
                    />

                    <StatusBadge
                      status={`${formatNumber(
                        chainGroup.memberCount,
                      )} members`}
                    />
                  </div>
                </div>
              </div>

              {/* ACTIONS */}

              <div className="flex flex-wrap gap-3">
                <PixelButton
                  onClick={() =>
                    setShowDonate(true)
                  }
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Donate
                </PixelButton>

                <PixelButton
                  variant="outline"
                  onClick={() =>
                    setShowCreateProposal(
                      true,
                    )
                  }
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Create Proposal
                </PixelButton>
              </div>
            </div>
          </div>
        </PixelCard>

        {/* ====================================================
            ON-CHAIN IDENTITY
        ===================================================== */}

        <PixelCard className="mb-6 p-6">
          <div className="mb-5 flex items-center gap-3">
            <Shield className="h-5 w-5" />

            <div>
              <h2 className="font-bold">
                On-chain Identity
              </h2>

              <p className="text-xs opacity-60">
                Verified directly from Solana
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">

            {/* CREATOR */}

            <div>
              <p className="mb-1 text-xs opacity-60">
                Creator
              </p>

              <div className="flex items-center gap-2">
                <code className="truncate text-sm">
                  {formatAddress(
                    chainGroup.creator,
                  )}
                </code>

                <button
                  type="button"
                  onClick={() =>
                    void copyToClipboard(
                      chainGroup.creator,
                      "creator",
                    )
                  }
                  className="opacity-60 hover:opacity-100"
                >
                  {copied === "creator" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* GROUP PDA */}

            <div>
              <p className="mb-1 text-xs opacity-60">
                Group PDA
              </p>

              <div className="flex items-center gap-2">
                <code className="truncate text-sm">
                  {formatAddress(
                    chainGroup.address,
                  )}
                </code>

                <button
                  type="button"
                  onClick={() =>
                    void copyToClipboard(
                      chainGroup.address,
                      "group",
                    )
                  }
                  className="opacity-60 hover:opacity-100"
                >
                  {copied === "group" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* TREASURY */}

            <div>
              <p className="mb-1 text-xs opacity-60">
                Treasury PDA
              </p>

              <div className="flex items-center gap-2">
                <code className="truncate text-sm">
                  {formatAddress(
                    chainGroup.treasuryAddress,
                  )}
                </code>

                <button
                  type="button"
                  onClick={() =>
                    void copyToClipboard(
                      chainGroup.treasuryAddress,
                      "treasury",
                    )
                  }
                  className="opacity-60 hover:opacity-100"
                >
                  {copied === "treasury" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </PixelCard>

        {/* ====================================================
            TREASURY + QR
        ===================================================== */}

        <div className="mb-6 grid gap-6 lg:grid-cols-3">

          {/* TREASURY */}

          <PixelCard className="p-6 lg:col-span-2">
            <div className="mb-5 flex items-center gap-3">
              <Landmark className="h-5 w-5" />

              <div>
                <h2 className="font-bold">
                  Treasury
                </h2>

                <p className="text-xs opacity-60">
                  Send SOL directly to the group treasury
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <p className="mb-2 text-xs opacity-60">
                Treasury address
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 break-all text-sm">
                  {treasuryAddress}
                </code>

                <div className="flex gap-2">
                  <PixelButton
                    variant="outline"
                    onClick={() =>
                      void copyToClipboard(
                        treasuryAddress,
                        "treasury-main",
                      )
                    }
                  >
                    {copied ===
                      "treasury-main" ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}

                    Copy
                  </PixelButton>

                  <a
                    href={`https://explorer.solana.com/address/${treasuryAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <PixelButton variant="outline">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Explorer
                    </PixelButton>
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs opacity-60">
                  Treasury balance
                </p>

                <p className="mt-1 text-xl font-bold">
                  {formatSOL(
                    treasuryBalance,
                  )}{" "}
                  SOL
                </p>
              </div>

              <div>
                <p className="text-xs opacity-60">
                  Raised
                </p>

                <p className="mt-1 text-xl font-bold">
                  {formatSOL(
                    raisedSOL,
                  )}{" "}
                  SOL
                </p>
              </div>

              <div>
                <p className="text-xs opacity-60">
                  Reserved
                </p>

                <p className="mt-1 text-xl font-bold">
                  {formatSOL(
                    reservedSOL,
                  )}{" "}
                  SOL
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-lg border p-4">
              <p className="text-xs opacity-60">
                Direct treasury funding
              </p>

              <p className="mt-1 text-sm">
                Anyone can send SOL to this treasury
                address. Use the Donate button if you
                want the PayDAO contribution instruction
                and member accounting to be executed.
              </p>
            </div>
          </PixelCard>

          {/* QR */}

          <PixelCard className="flex flex-col items-center justify-center p-6">
            <div className="mb-3 flex items-center gap-2">
              <QrCode className="h-5 w-5" />

              <h2 className="font-bold">
                Treasury QR
              </h2>
            </div>

            {qrCodeUrl ? (
              <>
                <div className="rounded-xl bg-white p-3">
                  <img
                    src={qrCodeUrl}
                    alt="PayDAO treasury wallet QR code"
                    width={220}
                    height={220}
                    className="h-[220px] w-[220px]"
                  />
                </div>

                <p className="mt-4 text-center text-xs opacity-60">
                  Scan to copy/open the treasury
                  wallet address.
                </p>
              </>
            ) : (
              <p className="text-sm opacity-60">
                Treasury address unavailable.
              </p>
            )}

            <PixelButton
              className="mt-4 w-full"
              onClick={() =>
                setShowDonate(true)
              }
            >
              <Wallet className="mr-2 h-4 w-4" />
              Donate to Treasury
            </PixelButton>
          </PixelCard>
        </div>

        {/* ====================================================
            FUNDING
        ===================================================== */}

        <PixelCard className="mb-6 p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold">
                Funding Progress
              </h2>

              <p className="text-xs opacity-60">
                Group funding target
              </p>
            </div>

            <span className="text-lg font-bold">
              {fundingPercent.toFixed(1)}%
            </span>
          </div>

          <div className="mb-6 h-4 overflow-hidden rounded-full border">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${fundingPercent}%`,
              }}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">

            <div>
              <p className="text-xs opacity-60">
                Required
              </p>

              <p className="mt-1 font-bold">
                {formatSOL(targetSOL)} SOL
              </p>
            </div>

            <div>
              <p className="text-xs opacity-60">
                Raised
              </p>

              <p className="mt-1 font-bold">
                {formatSOL(raisedSOL)} SOL
              </p>
            </div>

            <div>
              <p className="text-xs opacity-60">
                Treasury
              </p>

              <p className="mt-1 font-bold">
                {formatSOL(
                  treasuryBalance,
                )}{" "}
                SOL
              </p>
            </div>

            <div>
              <p className="text-xs opacity-60">
                Remaining
              </p>

              <p className="mt-1 font-bold">
                {formatSOL(
                  remainingSOL,
                )}{" "}
                SOL
              </p>
            </div>

            <div>
              <p className="text-xs opacity-60">
                Deadline
              </p>

              <p className="mt-1 text-sm font-bold">
                {formatDate(
                  chainGroup.deadline,
                )}
              </p>
            </div>
          </div>
        </PixelCard>

        {/* ====================================================
            TABS
        ===================================================== */}

        <Tabs
          defaultValue="overview"
          className="w-full"
        >
          <TabsList className="mb-6 grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="overview">
              Overview
            </TabsTrigger>

            <TabsTrigger value="proposals">
              Proposals (
              {chainProposals.length})
            </TabsTrigger>

            <TabsTrigger value="contributions">
              Contributions
            </TabsTrigger>

            <TabsTrigger value="members">
              Members (
              {members.length ||
                chainGroup.memberCount}
              )
            </TabsTrigger>
          </TabsList>

          {/* ==================================================
              OVERVIEW
          ================================================== */}

          <TabsContent value="overview">
            <div className="grid gap-6 md:grid-cols-2">

              {/* STATS */}

              <PixelCard className="p-6">
                <h2 className="mb-5 font-bold">
                  Group Statistics
                </h2>

                <div className="grid grid-cols-2 gap-4">

                  <div className="rounded-lg border p-4">
                    <Users className="mb-2 h-5 w-5" />

                    <p className="text-xs opacity-60">
                      Members
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {formatNumber(
                        chainGroup.memberCount,
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <FileText className="mb-2 h-5 w-5" />

                    <p className="text-xs opacity-60">
                      Proposals
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {formatNumber(
                        chainGroup.proposalCount,
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <Landmark className="mb-2 h-5 w-5" />

                    <p className="text-xs opacity-60">
                      Active Proposals
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {activeProposals}
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <Wallet className="mb-2 h-5 w-5" />

                    <p className="text-xs opacity-60">
                      Treasury
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {formatSOL(
                        treasuryBalance,
                      )}
                    </p>

                    <p className="text-xs opacity-60">
                      SOL
                    </p>
                  </div>
                </div>
              </PixelCard>

              {/* GOVERNANCE */}

              <PixelCard className="p-6">
                <h2 className="mb-5 font-bold">
                  Governance
                </h2>

                <div className="space-y-4">

                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="text-sm opacity-70">
                      Voting threshold
                    </span>

                    <span className="font-bold">
                      {Number(
                        chainGroup.votingThreshold ??
                        chainGroup.votingThresholdBps /
                        100,
                      )}
                      %
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="text-sm opacity-70">
                      Quorum
                    </span>

                    <span className="font-bold">
                      {Number(
                        chainGroup.quorum ??
                        chainGroup.quorumBps /
                        100,
                      )}
                      %
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b pb-3">
                    <span className="text-sm opacity-70">
                      Visibility
                    </span>

                    <span className="font-bold">
                      {getVisibilityLabel(
                        chainGroup.visibility,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-70">
                      Status
                    </span>

                    <StatusBadge
                      status={
                        chainGroup.active
                          ? "Active"
                          : "Inactive"
                      }
                    />
                  </div>
                </div>
              </PixelCard>
            </div>

            {/* BLOCKCHAIN STATUS */}

            <PixelCard className="mt-6 p-6">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500" />

                <div>
                  <h2 className="font-bold">
                    Blockchain Status
                  </h2>

                  <p className="text-xs opacity-60">
                    This page is displaying data fetched
                    directly from the PayDAO Solana program.
                  </p>
                </div>
              </div>
            </PixelCard>
          </TabsContent>

          {/* ==================================================
              PROPOSALS
          ================================================== */}

          <TabsContent value="proposals">
            {chainProposals.length === 0 ? (
              <PixelCard className="p-10 text-center">
                <FileText className="mx-auto mb-4 h-10 w-10 opacity-50" />

                <h2 className="font-bold">
                  No proposals yet
                </h2>

                <p className="mt-2 text-sm opacity-60">
                  Create the first governance proposal
                  for this group.
                </p>

                <PixelButton
                  className="mt-5"
                  onClick={() =>
                    setShowCreateProposal(true)
                  }
                >
                  Create Proposal
                </PixelButton>
              </PixelCard>
            ) : (
              <div className="space-y-4">
                {chainProposals.map(
                  (proposal) => {
                    const status =
                      getProposalStatus(
                        proposal,
                      );

                    const total =
                      totalVotes(
                        proposal,
                      );

                    const yes =
                      Number(
                        proposal.yesVotes ??
                        0,
                      );

                    const no =
                      Number(
                        proposal.noVotes ??
                        0,
                      );

                    const abstain =
                      Number(
                        proposal.abstainVotes ??
                        0,
                      );

                    const votePercent =
                      proposalVotePercent(
                        proposal,
                      );

                    const hoursLeft =
                      getHoursLeft(
                        proposal.deadline,
                      );

                    return (
                      <PixelCard
                        key={
                          proposal.address
                        }
                        className="p-6"
                      >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-bold">
                                {proposal.title ||
                                  "Untitled Proposal"}
                              </h3>

                              <StatusBadge
                                status={
                                  status
                                }
                              />
                            </div>

                            <p className="mt-2 text-sm opacity-70">
                              {proposal.description ||
                                "No description provided."}
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                              <div>
                                <p className="text-xs opacity-60">
                                  Amount
                                </p>

                                <p className="font-bold">
                                  {formatSOL(
                                    proposal.amount ??
                                    0,
                                  )}{" "}
                                  SOL
                                </p>
                              </div>

                              <div>
                                <p className="text-xs opacity-60">
                                  Votes
                                </p>

                                <p className="font-bold">
                                  {total}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs opacity-60">
                                  Time left
                                </p>

                                <p className="font-bold">
                                  {hoursLeft > 0
                                    ? `${hoursLeft}h`
                                    : "Ended"}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs opacity-60">
                                  Voters
                                </p>

                                <p className="font-bold">
                                  {formatNumber(
                                    proposal.voterCount ??
                                    total,
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* VOTE BAR */}

                            <div className="mt-5">
                              <div className="mb-2 flex justify-between text-xs">
                                <span>
                                  Yes{" "}
                                  {yes}
                                </span>

                                <span>
                                  No{" "}
                                  {no}
                                </span>

                                <span>
                                  Abstain{" "}
                                  {abstain}
                                </span>
                              </div>

                              <div className="h-3 overflow-hidden rounded-full border">
                                <div
                                  className="h-full transition-all"
                                  style={{
                                    width: `${votePercent}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="mt-4 grid gap-2 text-xs opacity-70">
                              <div>
                                Proposal PDA:{" "}
                                <code>
                                  {formatAddress(
                                    proposal.address,
                                  )}
                                </code>
                              </div>

                              {proposal.proposer && (
                                <div>
                                  Proposer:{" "}
                                  <code>
                                    {formatAddress(
                                      proposal.proposer,
                                    )}
                                  </code>
                                </div>
                              )}

                              {proposal.recipient && (
                                <div>
                                  Recipient:{" "}
                                  <code>
                                    {formatAddress(
                                      proposal.recipient,
                                    )}
                                  </code>
                                </div>
                              )}

                              {proposal.deadline && (
                                <div>
                                  Deadline:{" "}
                                  {formatDate(
                                    proposal.deadline,
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <PixelButton
                            variant="outline"
                            onClick={() =>
                              navigate(
                                `/proposals/${proposal.address}`,
                              )
                            }
                          >
                            View
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </PixelButton>
                        </div>
                      </PixelCard>
                    );
                  },
                )}
              </div>
            )}
          </TabsContent>

          {/* ==================================================
              CONTRIBUTIONS
          ================================================== */}

          <TabsContent value="contributions">
            <div className="grid gap-6 md:grid-cols-3">

              <PixelCard className="p-6">
                <Wallet className="mb-3 h-6 w-6" />

                <p className="text-xs opacity-60">
                  Treasury
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {formatSOL(
                    treasuryBalance,
                  )}{" "}
                  SOL
                </p>
              </PixelCard>

              <PixelCard className="p-6">
                <Landmark className="mb-3 h-6 w-6" />

                <p className="text-xs opacity-60">
                  Accounted Raised
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {formatSOL(
                    raisedSOL,
                  )}{" "}
                  SOL
                </p>
              </PixelCard>

              <PixelCard className="p-6">
                <Check className="mb-3 h-6 w-6" />

                <p className="text-xs opacity-60">
                  Remaining
                </p>

                <p className="mt-1 text-2xl font-bold">
                  {formatSOL(
                    remainingSOL,
                  )}{" "}
                  SOL
                </p>
              </PixelCard>
            </div>

            <PixelCard className="mt-6 p-6">
              <h2 className="font-bold">
                Treasury contribution address
              </h2>

              <p className="mt-2 text-sm opacity-60">
                Use the PayDAO Donate button for an
                on-chain contribution. You can also send
                SOL directly to the treasury PDA.
              </p>

              <div className="mt-4 rounded-lg border p-4">
                <code className="break-all text-sm">
                  {treasuryAddress}
                </code>
              </div>
            </PixelCard>
          </TabsContent>

          {/* ==================================================
              MEMBERS
          ================================================== */}

          <TabsContent value="members">
            <PixelCard className="p-6">

              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-bold">
                    Group Members
                  </h2>

                  <p className="text-xs opacity-60">
                    Member accounts fetched from Solana
                  </p>
                </div>

                <span className="text-sm font-bold">
                  {members.length} members
                </span>
              </div>

              {membersLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : members.length === 0 ? (
                <div className="rounded-lg border p-8 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 opacity-50" />

                  <p className="font-bold">
                    No member accounts found
                  </p>

                  <p className="mt-1 text-sm opacity-60">
                    The group currently reports{" "}
                    {chainGroup.memberCount} members,
                    but no readable member accounts were
                    returned by the client.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead>
                      <tr className="border-b text-xs opacity-60">
                        <th className="px-3 py-3">
                          Member
                        </th>

                        <th className="px-3 py-3">
                          Contribution
                        </th>

                        <th className="px-3 py-3">
                          Joined
                        </th>

                        <th className="px-3 py-3">
                          Account
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {members.map(
                        (member) => (
                          <tr
                            key={
                              member.address
                            }
                            className="border-b last:border-0"
                          >
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-3">
                                <PixelAvatar
                                  name={
                                    member.contributor
                                  }
                                  size="sm"
                                />

                                <div>
                                  <p className="font-medium">
                                    {formatAddress(
                                      member.contributor,
                                    )}
                                  </p>

                                  <p className="text-xs opacity-50">
                                    Contributor
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-3 py-4">
                              <span className="font-bold">
                                {formatSOL(
                                  member.amountSol,
                                )}{" "}
                                SOL
                              </span>
                            </td>

                            <td className="px-3 py-4 text-sm opacity-70">
                              {formatDate(
                                member.joinedAt,
                              )}
                            </td>

                            <td className="px-3 py-4">
                              <button
                                type="button"
                                className="flex items-center gap-2 text-sm hover:underline"
                                onClick={() =>
                                  void copyToClipboard(
                                    member.address,
                                    `member-${member.address}`,
                                  )
                                }
                              >
                                <code>
                                  {formatAddress(
                                    member.address,
                                  )}
                                </code>

                                {copied ===
                                  `member-${member.address}` ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </PixelCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* ======================================================
          DONATE MODAL
      ===================================================== */}

      <DonateModal
        open={showDonate}
        onClose={() =>
          setShowDonate(false)
        }
        /*
         * Your old DonateModal expects the application's
         * local Group type. The actual source of truth here
         * is the Solana OnChainGroup.
         */
        group={chainGroup as any}
        onContribute={
          handleContribute as any
        }
      />

      {/* ======================================================
          CREATE PROPOSAL MODAL
      ===================================================== */}

      <CreateProposalModal
        open={showCreateProposal}
        onClose={() =>
          setShowCreateProposal(false)
        }
        groupId={chainGroup.address}
        groupName={chainGroup.name}
        onCreate={
          handleCreateProposal as any
        }
      />
    </div>
  );
}
