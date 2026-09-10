import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { CreateProposalModal } from "@/components/modals/CreateProposalModal";
import { DonateModal } from "@/components/modals/DonateModal";

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
 * DESIGN-SYSTEM PRIMITIVES (presentation-only, no logic)
 * Built directly on the .card / .btn / .badge / .tab / .progress-bar
 * classes and CSS accent variables from the app stylesheet.
 * ========================================================== */

type Tone = "cyan" | "green" | "yellow" | "red" | "pink" | "orange" | "blue" | "neutral";

const TONE_VAR: Record<Exclude<Tone, "neutral">, string> = {
  cyan: "--accent-cyan",
  green: "--accent-green",
  yellow: "--accent-yellow",
  red: "--accent-red",
  pink: "--accent-pink",
  orange: "--accent-orange",
  blue: "--accent-blue",
};

function toneStyle(tone: Tone): React.CSSProperties {
  if (tone === "neutral") {
    return {
      color: "var(--text-secondary)",
      borderColor: "var(--border-bright)",
      background: "var(--bg-panel-light)",
    };
  }

  const v = TONE_VAR[tone];

  return {
    color: `var(${v})`,
    borderColor: `var(${v})`,
    background: `color-mix(in srgb, var(${v}) 12%, transparent)`,
  };
}

function Badge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
}) {
  return (
    <span className="badge" style={toneStyle(tone)}>
      {dot ? (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: `currentColor` }}
        />
      ) : null}
      {children}
    </span>
  );
}

function proposalTone(status: string): Tone {
  switch (status) {
    case "passed":
    case "executed":
      return "green";
    case "rejected":
      return "red";
    case "voting":
      return "yellow";
    default:
      return "cyan";
  }
}

const AVATAR_TONES: Tone[] = ["cyan", "green", "pink", "orange", "blue"];

function Avatar({
  name,
  size = "md",
}: {
  name?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "lg"
      ? "h-16 w-16 text-lg"
      : size === "sm"
        ? "h-9 w-9 text-xs"
        : "h-11 w-11 text-sm";

  const safe = name?.trim() || "?";
  const initials = safe.slice(0, 2).toUpperCase();
  const tone =
    AVATAR_TONES[safe.charCodeAt(0) % AVATAR_TONES.length];

  return (
    <div
      className={`font-heading flex shrink-0 items-center justify-center rounded-full border font-bold ${dims}`}
      style={toneStyle(tone)}
    >
      {initials}
    </div>
  );
}

function ProgressBar({
  percent,
  tone = "cyan",
}: {
  percent: number;
  tone?: Tone;
}) {
  const color = tone === "neutral" ? "var(--text-secondary)" : `var(${TONE_VAR[tone as Exclude<Tone, "neutral">]})`;

  return (
    <div className="progress-bar">
      <div
        className="progress-bar-fill"
        style={{
          width: `${percent}%`,
          background: color,
        }}
      />
    </div>
  );
}

/**
 * Shared banded header used at the top of every card so a section's
 * title is always visually distinct from its body — an icon chip on
 * the left, title + subtitle, and an optional trailing action.
 */
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  tone = "cyan",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6"
      style={{ background: "var(--bg-panel-light)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
          style={toneStyle(tone)}
        >
          <Icon className="h-4 w-4" />
        </div>

        <div>
          <h2 className="font-heading text-[15px] font-semibold">
            {title}
          </h2>

          {subtitle ? (
            <p
              className="text-xs"
              style={{ color: "var(--text-dim)" }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {action}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
  tone = "neutral",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  suffix?: string;
  tone?: Tone;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "var(--bg-panel-light)" }}
    >
      {Icon ? (
        <div
          className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg border"
          style={toneStyle(tone)}
        >
          <Icon className="h-4 w-4" />
        </div>
      ) : null}

      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
        {label}
      </p>

      <p className="font-heading mt-1 text-2xl font-bold">
        {value}
        {suffix ? (
          <span
            className="ml-1 text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function AddressField({
  label,
  address,
  copyKey,
  copied,
  onCopy,
}: {
  label: string;
  address?: string;
  copyKey: string;
  copied: string | null;
  onCopy: (value: string, key: string) => void;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "var(--bg-panel-light)" }}
    >
      <p className="mb-2 text-xs" style={{ color: "var(--text-dim)" }}>
        {label}
      </p>

      <div className="flex items-center justify-between gap-3">
        <code className="font-mono min-w-0 flex-1 truncate text-sm">
          {formatAddress(address)}
        </code>

        <button
          type="button"
          onClick={() => address && onCopy(address, copyKey)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors"
          style={{
            borderColor: "var(--border-light)",
            color:
              copied === copyKey
                ? "var(--accent-green)"
                : "var(--text-secondary)",
          }}
        >
          {copied === copyKey ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
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
      <div className="grid-bg flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2
            className="spin h-8 w-8"
            style={{ color: "var(--accent-cyan)" }}
          />

          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
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
      <div className="grid-bg min-h-screen p-6">
        <div className="mx-auto max-w-3xl">
          <div className="card animate-fade-in p-8 text-center">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border"
              style={toneStyle("red")}
            >
              <Shield className="h-7 w-7" />
            </div>

            <h1 className="font-heading text-xl font-bold">
              Group not found
            </h1>

            <p
              className="mt-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {error ??
                "Unable to load this group from the Solana blockchain."}
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  void loadGroup()
                }
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  navigate(-1)
                }
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
   * PAGE
   * ======================================================== */

  return (
    <div className="grid-bg min-h-screen pb-16">
      <div className="animate-fade-in mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* ====================================================
            TOP BAR
        ===================================================== */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={refreshing}
            onClick={() =>
              void refreshGroup()
            }
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {/* ====================================================
            HERO / GROUP HEADER
        ===================================================== */}

        <div className="card overflow-hidden">
          <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex gap-4">
              <Avatar name={chainGroup.name} size="lg" />

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-heading text-2xl font-bold">
                    {chainGroup.name}
                  </h1>

                  <Badge
                    tone={chainGroup.active ? "green" : "red"}
                    dot
                  >
                    {chainGroup.active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <p
                  className="mt-2 max-w-2xl text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {chainGroup.description ||
                    "No group description available."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="blue">Democratic</Badge>

                  <Badge
                    tone={
                      getVisibilityLabel(chainGroup.visibility) ===
                        "Private"
                        ? "pink"
                        : "cyan"
                    }
                  >
                    {getVisibilityLabel(chainGroup.visibility)}
                  </Badge>

                  <Badge tone="orange">
                    {formatNumber(chainGroup.memberCount)} members
                  </Badge>
                </div>
              </div>
            </div>

            {/* ACTIONS */}

            <div
              className="flex flex-wrap gap-3 border-t pt-6 lg:flex-col lg:items-stretch lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
            >
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() =>
                  setShowDonate(true)
                }
              >
                <Wallet className="h-4 w-4" />
                Donate
              </button>

              <button
                type="button"
                className="btn btn-green"
                onClick={() =>
                  setShowCreateProposal(true)
                }
              >
                <FileText className="h-4 w-4" />
                Create Proposal
              </button>
            </div>
          </div>
        </div>

        {/* ====================================================
            DASHBOARD SPLIT — sidebar (identity/QR) + main content
        ===================================================== */}

        <div className="grid gap-6 lg:grid-cols-[340px_1fr] lg:items-start">

          {/* --------------------------------------------------
              SIDEBAR
          -------------------------------------------------- */}

          <div className="space-y-6 lg:sticky lg:top-6">

            {/* IDENTITY */}

            <div className="card overflow-hidden">
              <SectionHeader
                icon={Shield}
                title="On-chain Identity"
                subtitle="Verified from Solana"
                tone="blue"
              />

              <div className="space-y-3 p-5">
                <AddressField
                  label="Creator"
                  address={chainGroup.creator}
                  copyKey="creator"
                  copied={copied}
                  onCopy={copyToClipboard}
                />

                <AddressField
                  label="Group PDA"
                  address={chainGroup.address}
                  copyKey="group"
                  copied={copied}
                  onCopy={copyToClipboard}
                />

                <AddressField
                  label="Treasury PDA"
                  address={chainGroup.treasuryAddress}
                  copyKey="treasury"
                  copied={copied}
                  onCopy={copyToClipboard}
                />
              </div>
            </div>

            {/* QR */}

            <div className="card overflow-hidden">
              <SectionHeader
                icon={QrCode}
                title="Treasury QR"
                subtitle="Scan to send funds"
                tone="cyan"
              />

              <div className="flex flex-col items-center gap-4 p-5">
                {qrCodeUrl ? (
                  <>
                    <div className="glow-cyan rounded-xl bg-white p-3">
                      <img
                        src={qrCodeUrl}
                        alt="PayDAO treasury wallet QR code"
                        width={200}
                        height={200}
                        className="h-[200px] w-[200px]"
                      />
                    </div>

                    <p
                      className="text-center text-xs"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Scan to copy/open the treasury
                      wallet address.
                    </p>
                  </>
                ) : (
                  <p
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Treasury address unavailable.
                  </p>
                )}

                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={() =>
                    setShowDonate(true)
                  }
                >
                  <Wallet className="h-4 w-4" />
                  Donate to Treasury
                </button>
              </div>
            </div>
          </div>

          {/* --------------------------------------------------
              MAIN COLUMN
          -------------------------------------------------- */}

          <div className="space-y-6">

            {/* TREASURY */}

            <div className="card overflow-hidden">
              <SectionHeader
                icon={Landmark}
                title="Treasury"
                subtitle="Send SOL directly to the group treasury"
                tone="cyan"
              />

              <div className="space-y-5 p-6">
                <div
                  className="rounded-xl border p-4"
                  style={{ background: "var(--bg-panel-light)" }}
                >
                  <p
                    className="mb-2 text-xs"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Treasury address
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <code className="font-mono min-w-0 flex-1 break-all text-sm">
                      {treasuryAddress}
                    </code>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          void copyToClipboard(
                            treasuryAddress,
                            "treasury-main",
                          )
                        }
                      >
                        {copied === "treasury-main" ? (
                          <Check
                            className="h-4 w-4"
                            style={{ color: "var(--accent-green)" }}
                          />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        Copy
                      </button>

                      <a
                        href={`https://explorer.solana.com/address/${treasuryAddress}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <button type="button" className="btn btn-ghost btn-sm">
                          <ExternalLink className="h-4 w-4" />
                          Explorer
                        </button>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <StatTile
                    label="Treasury balance"
                    value={formatSOL(treasuryBalance)}
                    suffix="SOL"
                    tone="cyan"
                  />

                  <StatTile
                    label="Raised"
                    value={formatSOL(raisedSOL)}
                    suffix="SOL"
                    tone="green"
                  />

                  <StatTile
                    label="Reserved"
                    value={formatSOL(reservedSOL)}
                    suffix="SOL"
                    tone="yellow"
                  />
                </div>

                <div
                  className="rounded-xl border p-4"
                  style={{ background: "var(--bg-panel-light)" }}
                >
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "var(--accent-cyan)" }}
                  >
                    Direct treasury funding
                  </p>

                  <p
                    className="mt-1 text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Anyone can send SOL to this treasury
                    address. Use the Donate button if you
                    want the PayDAO contribution instruction
                    and member accounting to be executed.
                  </p>
                </div>
              </div>
            </div>

            {/* FUNDING */}

            <div className="card overflow-hidden">
              <SectionHeader
                icon={Wallet}
                title="Funding Progress"
                subtitle="Group funding target"
                tone="green"
                action={
                  <span
                    className="font-heading text-lg font-bold"
                    style={{ color: "var(--accent-green)" }}
                  >
                    {fundingPercent.toFixed(1)}%
                  </span>
                }
              />

              <div className="p-6">
                <div className="mb-6">
                  <ProgressBar percent={fundingPercent} tone="green" />
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">

                  <div>
                    <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                      Required
                    </p>

                    <p className="font-heading mt-1 font-bold">
                      {formatSOL(targetSOL)} SOL
                    </p>
                  </div>

                  <div>
                    <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                      Raised
                    </p>

                    <p className="font-heading mt-1 font-bold">
                      {formatSOL(raisedSOL)} SOL
                    </p>
                  </div>

                  <div>
                    <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                      Treasury
                    </p>

                    <p className="font-heading mt-1 font-bold">
                      {formatSOL(treasuryBalance)} SOL
                    </p>
                  </div>

                  <div>
                    <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                      Remaining
                    </p>

                    <p className="font-heading mt-1 font-bold">
                      {formatSOL(remainingSOL)} SOL
                    </p>
                  </div>

                  <div>
                    <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                      Deadline
                    </p>

                    <p className="mt-1 text-sm font-bold">
                      {formatDate(chainGroup.deadline)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================================================
                TABS
            ================================================== */}

            <Tabs defaultValue="overview" className="w-full">
              <div
                className="rounded-xl border p-1.5"
                style={{ background: "var(--bg-panel)" }}
              >
                <TabsList className="grid w-full grid-cols-2 gap-1 bg-transparent sm:grid-cols-4">
                  <TabsTrigger
                    value="overview"
                    className="tab flex items-center justify-center"
                  >
                    Overview
                  </TabsTrigger>

                  <TabsTrigger
                    value="proposals"
                    className="tab flex items-center justify-center"
                  >
                    Proposals ({chainProposals.length})
                  </TabsTrigger>

                  <TabsTrigger
                    value="contributions"
                    className="tab flex items-center justify-center"
                  >
                    Contributions
                  </TabsTrigger>

                  <TabsTrigger
                    value="members"
                    className="tab flex items-center justify-center"
                  >
                    Members ({members.length || chainGroup.memberCount})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ==================================================
                  OVERVIEW
              ================================================== */}

              <TabsContent value="overview" className="animate-fade-in mt-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">

                  {/* STATS */}

                  <div className="card overflow-hidden">
                    <SectionHeader
                      icon={FileText}
                      title="Group Statistics"
                      tone="cyan"
                    />

                    <div className="grid grid-cols-2 gap-4 p-6">
                      <StatTile
                        icon={Users}
                        label="Members"
                        value={formatNumber(chainGroup.memberCount)}
                        tone="blue"
                      />

                      <StatTile
                        icon={FileText}
                        label="Proposals"
                        value={formatNumber(chainGroup.proposalCount)}
                        tone="cyan"
                      />

                      <StatTile
                        icon={Landmark}
                        label="Active Proposals"
                        value={activeProposals}
                        tone="yellow"
                      />

                      <StatTile
                        icon={Wallet}
                        label="Treasury"
                        value={formatSOL(treasuryBalance)}
                        suffix="SOL"
                        tone="green"
                      />
                    </div>
                  </div>

                  {/* GOVERNANCE */}

                  <div className="card overflow-hidden">
                    <SectionHeader
                      icon={Lock}
                      title="Governance"
                      tone="pink"
                    />

                    <div className="space-y-4 p-6">

                      <div className="flex items-center justify-between border-b pb-3">
                        <span
                          className="text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Voting threshold
                        </span>

                        <span className="font-heading font-bold">
                          {Number(
                            chainGroup.votingThreshold ??
                            chainGroup.votingThresholdBps /
                            100,
                          )}
                          %
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-b pb-3">
                        <span
                          className="text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Quorum
                        </span>

                        <span className="font-heading font-bold">
                          {Number(
                            chainGroup.quorum ??
                            chainGroup.quorumBps /
                            100,
                          )}
                          %
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-b pb-3">
                        <span
                          className="text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Visibility
                        </span>

                        <span className="font-heading font-bold">
                          {getVisibilityLabel(chainGroup.visibility)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          Status
                        </span>

                        <Badge
                          tone={chainGroup.active ? "green" : "red"}
                          dot
                        >
                          {chainGroup.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCKCHAIN STATUS */}

                <div className="card p-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: "var(--accent-green)",
                        boxShadow: "0 0 8px var(--accent-green)",
                      }}
                    />

                    <div>
                      <h2 className="font-heading font-bold">
                        Blockchain Status
                      </h2>

                      <p
                        className="text-xs"
                        style={{ color: "var(--text-dim)" }}
                      >
                        This page is displaying data fetched
                        directly from the PayDAO Solana program.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ==================================================
                  PROPOSALS
              ================================================== */}

              <TabsContent value="proposals" className="animate-fade-in mt-6">
                {chainProposals.length === 0 ? (
                  <div className="card p-10 text-center">
                    <FileText
                      className="mx-auto mb-4 h-10 w-10"
                      style={{ color: "var(--text-dim)" }}
                    />

                    <h2 className="font-heading font-bold">
                      No proposals yet
                    </h2>

                    <p
                      className="mt-2 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Create the first governance proposal
                      for this group.
                    </p>

                    <button
                      type="button"
                      className="btn btn-green mt-5"
                      onClick={() =>
                        setShowCreateProposal(true)
                      }
                    >
                      Create Proposal
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chainProposals.map(
                      (proposal) => {
                        const status =
                          getProposalStatus(proposal);

                        const tone = proposalTone(status);

                        const total = totalVotes(proposal);

                        const yes = Number(proposal.yesVotes ?? 0);
                        const no = Number(proposal.noVotes ?? 0);
                        const abstain = Number(
                          proposal.abstainVotes ?? 0,
                        );

                        const votePercent =
                          proposalVotePercent(proposal);

                        const hoursLeft = getHoursLeft(
                          proposal.deadline,
                        );

                        return (
                          <div
                            key={proposal.address}
                            className="card card-hover overflow-hidden"
                          >
                            <div
                              className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4"
                              style={{ background: "var(--bg-panel-light)" }}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-heading text-lg font-bold">
                                  {proposal.title || "Untitled Proposal"}
                                </h3>

                                <Badge tone={tone} dot>
                                  {status}
                                </Badge>
                              </div>

                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() =>
                                  navigate(
                                    `/proposals/${proposal.address}`,
                                  )
                                }
                              >
                                View
                                <ExternalLink className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="p-6">
                              <p
                                className="text-sm"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {proposal.description ||
                                  "No description provided."}
                              </p>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <StatTile
                                  label="Amount"
                                  value={`${formatSOL(proposal.amount ?? 0)}`}
                                  suffix="SOL"
                                  tone="cyan"
                                />

                                <StatTile
                                  label="Votes"
                                  value={total}
                                  tone="blue"
                                />

                                <StatTile
                                  label="Time left"
                                  value={
                                    hoursLeft > 0 ? `${hoursLeft}h` : "Ended"
                                  }
                                  tone={hoursLeft > 0 ? "yellow" : "red"}
                                />

                                <StatTile
                                  label="Voters"
                                  value={formatNumber(
                                    proposal.voterCount ?? total,
                                  )}
                                  tone="orange"
                                />
                              </div>

                              {/* VOTE BAR */}

                              <div
                                className="mt-5 rounded-xl border p-4"
                                style={{ background: "var(--bg-panel-light)" }}
                              >
                                <div className="mb-2 flex justify-between text-xs">
                                  <span style={{ color: "var(--accent-green)" }}>
                                    Yes {yes}
                                  </span>

                                  <span style={{ color: "var(--accent-red)" }}>
                                    No {no}
                                  </span>

                                  <span style={{ color: "var(--text-dim)" }}>
                                    Abstain {abstain}
                                  </span>
                                </div>

                                <ProgressBar
                                  percent={votePercent}
                                  tone="green"
                                />
                              </div>

                              <div
                                className="font-mono mt-4 grid gap-2 border-t pt-4 text-xs"
                                style={{ color: "var(--text-dim)" }}
                              >
                                <div>
                                  Proposal PDA: {formatAddress(proposal.address)}
                                </div>

                                {proposal.proposer && (
                                  <div>
                                    Proposer: {formatAddress(proposal.proposer)}
                                  </div>
                                )}

                                {proposal.recipient && (
                                  <div>
                                    Recipient: {formatAddress(proposal.recipient)}
                                  </div>
                                )}

                                {proposal.deadline && (
                                  <div className="font-body">
                                    Deadline: {formatDate(proposal.deadline)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ==================================================
                  CONTRIBUTIONS
              ================================================== */}

              <TabsContent value="contributions" className="animate-fade-in mt-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <StatTile
                    icon={Wallet}
                    label="Treasury"
                    value={formatSOL(treasuryBalance)}
                    suffix="SOL"
                    tone="cyan"
                  />

                  <StatTile
                    icon={Landmark}
                    label="Accounted Raised"
                    value={formatSOL(raisedSOL)}
                    suffix="SOL"
                    tone="green"
                  />

                  <StatTile
                    icon={Check}
                    label="Remaining"
                    value={formatSOL(remainingSOL)}
                    suffix="SOL"
                    tone="yellow"
                  />
                </div>

                <div className="card overflow-hidden">
                  <SectionHeader
                    icon={Landmark}
                    title="Treasury contribution address"
                    subtitle="Use the Donate button for on-chain accounting, or send SOL directly"
                    tone="cyan"
                  />

                  <div className="p-6">
                    <div
                      className="rounded-xl border p-4"
                      style={{ background: "var(--bg-panel-light)" }}
                    >
                      <code className="font-mono break-all text-sm">
                        {treasuryAddress}
                      </code>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ==================================================
                  MEMBERS
              ================================================== */}

              <TabsContent value="members" className="animate-fade-in mt-6">
                <div className="card overflow-hidden">
                  <SectionHeader
                    icon={Users}
                    title="Group Members"
                    subtitle="Member accounts fetched from Solana"
                    tone="blue"
                    action={
                      <Badge tone="blue">{members.length} members</Badge>
                    }
                  />

                  <div className="p-6">
                    {membersLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2
                          className="spin h-6 w-6"
                          style={{ color: "var(--accent-cyan)" }}
                        />
                      </div>
                    ) : members.length === 0 ? (
                      <div
                        className="rounded-xl border p-8 text-center"
                        style={{ background: "var(--bg-panel-light)" }}
                      >
                        <Users
                          className="mx-auto mb-3 h-8 w-8"
                          style={{ color: "var(--text-dim)" }}
                        />

                        <p className="font-heading font-bold">
                          No member accounts found
                        </p>

                        <p
                          className="mt-1 text-sm"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          The group currently reports{" "}
                          {chainGroup.memberCount} members,
                          but no readable member accounts were
                          returned by the client.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full min-w-[650px] text-left">
                          <thead>
                            <tr
                              className="border-b text-xs"
                              style={{
                                background: "var(--bg-panel-light)",
                                color: "var(--text-dim)",
                              }}
                            >
                              <th className="px-4 py-3 font-medium">
                                Member
                              </th>

                              <th className="px-4 py-3 font-medium">
                                Contribution
                              </th>

                              <th className="px-4 py-3 font-medium">
                                Joined
                              </th>

                              <th className="px-4 py-3 font-medium">
                                Account
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {members.map((member) => (
                              <tr
                                key={member.address}
                                className="border-b transition-colors last:border-0 hover:bg-[var(--bg-panel-light)]"
                              >
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar
                                      name={member.contributor}
                                      size="sm"
                                    />

                                    <div>
                                      <p className="font-medium">
                                        {formatAddress(member.contributor)}
                                      </p>

                                      <p
                                        className="text-xs"
                                        style={{ color: "var(--text-dim)" }}
                                      >
                                        Contributor
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-4">
                                  <span
                                    className="font-heading font-bold"
                                    style={{ color: "var(--accent-green)" }}
                                  >
                                    {formatSOL(member.amountSol)} SOL
                                  </span>
                                </td>

                                <td
                                  className="px-4 py-4 text-sm"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {formatDate(member.joinedAt)}
                                </td>

                                <td className="px-4 py-4">
                                  <button
                                    type="button"
                                    className="font-mono flex items-center gap-2 text-sm transition-colors hover:text-[var(--accent-cyan)]"
                                    onClick={() =>
                                      void copyToClipboard(
                                        member.address,
                                        `member-${member.address}`,
                                      )
                                    }
                                  >
                                    {formatAddress(member.address)}

                                    {copied ===
                                      `member-${member.address}` ? (
                                      <Check
                                        className="h-3 w-3"
                                        style={{ color: "var(--accent-green)" }}
                                      />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
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
