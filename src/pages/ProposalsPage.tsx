import { CreateProposalModal } from "@/components/modals/CreateProposalModal";
import {
  PixelButton,
  PixelCard,
  SectionHeader,
  StatusBadge,
} from "@/components/retro";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  createProposalOnChain,
  fetchAllGroups,
  fetchAllProposals,
  type OnChainGroup,
  type OnChainProposal,
} from "@/chain/paydao";

import {
  Check,
  ChevronRight,
  Clock,
  FileText,
  Minus,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

/* ============================================================
 * HELPERS
 * ========================================================== */

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "0";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return value.toString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof (value as { toString?: unknown }).toString === "function"
  ) {
    return (value as { toString: () => string }).toString();
  }

  return String(value);
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "bigint") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  ) {
    const n = (value as { toNumber: () => number }).toNumber();

    return Number.isFinite(n) ? n : 0;
  }

  const n = Number(toStringValue(value));

  return Number.isFinite(n) ? n : 0;
}

function lamportsToSol(value: unknown): number {
  const lamports = toNumber(value);

  return lamports / 1_000_000_000;
}

function getAddress(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toBase58" in value &&
    typeof (value as { toBase58?: unknown }).toBase58 === "function"
  ) {
    return (value as { toBase58: () => string }).toBase58();
  }

  return toStringValue(value);
}

function normalizeStatus(value: unknown): string {
  const status = toStringValue(value)
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  switch (status) {
    case "active":
    case "open":
    case "voting":
    case "voting_active":
    case "pending_vote":
      return "voting";

    case "passed":
    case "approved":
    case "succeeded":
      return "passed";

    case "executed":
    case "completed":
      return "executed";

    case "rejected":
    case "failed":
    case "denied":
      return "rejected";

    case "expired":
      return "expired";

    default:
      return status || "unknown";
  }
}

function getProposalId(
  proposal: OnChainProposal | Record<string, unknown>,
): string {
  const p = proposal as Record<string, unknown>;

  return (
    getAddress(p.address) ||
    toStringValue(p.id) ||
    getAddress(p.publicKey) ||
    ""
  );
}

function getProposalGroupId(
  proposal: OnChainProposal | Record<string, unknown>,
): string {
  const p = proposal as Record<string, unknown>;

  return getAddress(
    p.groupId ??
    p.group ??
    p.groupAddress ??
    p.group_address,
  );
}

function getProposalTitle(
  proposal: OnChainProposal | Record<string, unknown>,
): string {
  const p = proposal as Record<string, unknown>;

  return toStringValue(
    p.title ??
    p.name ??
    "Untitled Proposal",
  );
}

function getProposalDescription(
  proposal: OnChainProposal | Record<string, unknown>,
): string {
  const p = proposal as Record<string, unknown>;

  return toStringValue(
    p.description ??
    p.details ??
    "",
  );
}

function getProposalAmount(
  proposal: OnChainProposal | Record<string, unknown>,
): number {
  const p = proposal as Record<string, unknown>;

  /*
   * Prefer already-converted SOL value.
   */

  if (
    p.amountSol !== undefined &&
    p.amountSol !== null
  ) {
    return toNumber(p.amountSol);
  }

  /*
   * Otherwise assume amount is lamports when
   * amountLamports is available.
   */

  if (
    p.amountLamports !== undefined &&
    p.amountLamports !== null
  ) {
    return lamportsToSol(p.amountLamports);
  }

  /*
   * If your mapper exposes amount directly as SOL,
   * use it.
   */

  return toNumber(p.amount);
}

function getVotes(
  proposal: OnChainProposal | Record<string, unknown>,
) {
  const p = proposal as Record<string, unknown>;

  return {
    yes: toNumber(
      p.yesVotes ??
      p.yes_votes ??
      p.votesYes ??
      0,
    ),

    no: toNumber(
      p.noVotes ??
      p.no_votes ??
      p.votesNo ??
      0,
    ),

    abstain: toNumber(
      p.abstainVotes ??
      p.abstain_votes ??
      p.votesAbstain ??
      0,
    ),
  };
}

function getDeadline(
  proposal: OnChainProposal | Record<string, unknown>,
): number {
  const p = proposal as Record<string, unknown>;

  return toNumber(
    p.deadline ??
    p.votingDeadline ??
    p.voting_deadline ??
    0,
  );
}

function getCreatedAt(
  proposal: OnChainProposal | Record<string, unknown>,
): number {
  const p = proposal as Record<string, unknown>;

  return toNumber(
    p.createdAt ??
    p.created_at ??
    0,
  );
}

function getHoursLeft(deadline: number): number {
  if (!deadline) {
    return 0;
  }

  /*
   * Solana timestamps are seconds.
   */

  const now = Math.floor(Date.now() / 1000);

  const secondsLeft = deadline - now;

  if (secondsLeft <= 0) {
    return 0;
  }

  return Math.ceil(secondsLeft / 3600);
}

function formatSol(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "0";
  }

  return amount.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

/* ============================================================
 * PAGE
 * ========================================================== */

export function ProposalsPage() {
  const navigate = useNavigate();

  const [proposals, setProposals] = useState<
    OnChainProposal[]
  >([]);

  const [groups, setGroups] = useState<
    OnChainGroup[]
  >([]);

  const [tab, setTab] = useState("active");

  const [showCreate, setShowCreate] =
    useState(false);

  const [isCreating, setIsCreating] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  /* ==========================================================
   * LOAD BLOCKCHAIN DATA
   * ======================================================== */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        onChainProposals,
        onChainGroups,
      ] = await Promise.all([
        fetchAllProposals(),
        fetchAllGroups(),
      ]);

      setProposals(
        Array.isArray(onChainProposals)
          ? onChainProposals
          : [],
      );

      setGroups(
        Array.isArray(onChainGroups)
          ? onChainGroups
          : [],
      );
    } catch (err) {
      console.error(
        "Failed to load proposals:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load proposals from the blockchain.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* ==========================================================
   * NORMALIZED PROPOSALS
   * ======================================================== */

  const normalizedProposals = useMemo(() => {
    return proposals.map((raw) => {
      const proposal =
        raw as OnChainProposal & Record<string, unknown>;

      const address =
        getAddress(proposal.address) ||
        getAddress(proposal.publicKey) ||
        toStringValue(proposal.id);

      const groupId = getProposalGroupId(proposal);

      /*
       * Find the actual group belonging to this proposal.
       */
      const matchedGroup = groups.find((group) => {
        const g = group as OnChainGroup & Record<string, unknown>;

        const groupAddress =
          getAddress(g.address) ||
          getAddress(g.publicKey) ||
          toStringValue(g.id);

        return groupAddress === groupId;
      });

      const group = matchedGroup as
        | (OnChainGroup & Record<string, unknown>)
        | undefined;

      /*
       * Proposal title.
       *
       * Support multiple possible field names because
       * Anchor account mappings can differ.
       */
      const title =
        toStringValue(
          proposal.title ??
          proposal.name ??
          proposal.proposalTitle ??
          proposal.proposal_name ??
          proposal.metadata?.title ??
          "",
        ).trim();

      /*
       * Group name.
       */
      const groupName =
        group
          ? toStringValue(
            group.name ??
            group.groupName ??
            group.title ??
            group.group_name ??
            group.metadata?.name ??
            "",
          ).trim()
          : "";

      return {
        raw: proposal,

        address,

        id: address,

        groupId,

        groupName:
          groupName ||
          (groupId
            ? `Group ${groupId.slice(0, 6)}…${groupId.slice(-4)}`
            : "No group"),

        title:
          title ||
          `Proposal ${address.slice(0, 6)}…${address.slice(-4)}`,

        description:
          getProposalDescription(proposal),

        amount:
          getProposalAmount(proposal),

        currency:
          toStringValue(
            proposal.currency ?? "SOL",
          ).toUpperCase(),

        status:
          normalizeStatus(proposal.status),

        votes:
          getVotes(proposal),

        memberCount:
          toNumber(
            group?.memberCount ??
            group?.membersCount ??
            group?.member_count ??
            0,
          ),

        deadline:
          getDeadline(proposal),

        createdAt:
          getCreatedAt(proposal),

        hoursLeft:
          getHoursLeft(
            getDeadline(proposal),
          ),

        executed:
          Boolean(proposal.executed),
      };
    });
  }, [proposals, groups]);
  /* ==========================================================
   * FILTER
   * ======================================================== */

  const filtered = useMemo(() => {
    return normalizedProposals.filter(
      (proposal) => {
        switch (tab) {
          case "active":
            return (
              proposal.status ===
              "voting" ||
              proposal.status === "active"
            );

          case "passed":
            return (
              proposal.status ===
              "passed" ||
              proposal.status ===
              "executed"
            );

          case "rejected":
            return (
              proposal.status ===
              "rejected" ||
              proposal.status ===
              "expired"
            );

          case "all":
          default:
            return true;
        }
      },
    );
  }, [
    normalizedProposals,
    tab,
  ]);

  /* ==========================================================
   * STATS
   * ======================================================== */

  const stats = useMemo(() => {
    let active = 0;
    let passed = 0;
    let rejected = 0;

    for (const proposal of normalizedProposals) {
      if (
        proposal.status ===
        "voting"
      ) {
        active++;
      }

      if (
        proposal.status === "passed" ||
        proposal.status === "executed"
      ) {
        passed++;
      }

      if (
        proposal.status ===
        "rejected" ||
        proposal.status === "expired"
      ) {
        rejected++;
      }
    }

    return {
      total: normalizedProposals.length,
      active,
      passed,
      rejected,
    };
  }, [normalizedProposals]);

  /* ==========================================================
   * CREATE PROPOSAL
   * ======================================================== */

  const handleCreateProposal =
    async (
      data: {
        groupId: string;
        title: string;
        description: string;
        amount: number;
        currency: "SOL";
        recipient: string;
        duration: number;
      },
    ) => {
      if (!data.groupId) {
        throw new Error(
          "Please select a group.",
        );
      }

      if (!data.title?.trim()) {
        throw new Error(
          "Proposal title is required.",
        );
      }

      if (!data.description?.trim()) {
        throw new Error(
          "Proposal description is required.",
        );
      }

      if (
        !Number.isFinite(data.amount) ||
        data.amount <= 0
      ) {
        throw new Error(
          "Proposal amount must be greater than 0.",
        );
      }

      if (!data.recipient?.trim()) {
        throw new Error(
          "Recipient wallet address is required.",
        );
      }

      if (
        !Number.isFinite(data.duration) ||
        data.duration <= 0
      ) {
        throw new Error(
          "Voting duration must be greater than 0.",
        );
      }

      if (data.currency !== "SOL") {
        throw new Error(
          "PayDAO currently supports SOL proposals only.",
        );
      }

      try {
        setIsCreating(true);

        /*
         * REAL BLOCKCHAIN TRANSACTION
         */

        await createProposalOnChain({
          groupId: data.groupId,
          title: data.title.trim(),
          description:
            data.description.trim(),
          amount: data.amount,
          currency: "SOL",
          recipient:
            data.recipient.trim(),
          duration: data.duration,
        });

        setShowCreate(false);

        /*
         * Reload directly from Solana.
         */

        await loadData();
      } finally {
        setIsCreating(false);
      }
    };

  /* ==========================================================
   * LOADING
   * ======================================================== */

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Proposals"
          subtitle="Loading governance proposals from Solana..."
        />

        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(
            (item) => (
              <PixelCard
                key={item}
                className="p-6 animate-pulse"
              >
                <div className="h-4 w-32 bg-bgpanel2 rounded mb-4" />

                <div className="h-5 w-2/3 bg-bgpanel2 rounded mb-3" />

                <div className="h-3 w-full bg-bgpanel2 rounded mb-2" />

                <div className="h-3 w-4/5 bg-bgpanel2 rounded" />
              </PixelCard>
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
        <SectionHeader
          title="Proposals"
          subtitle="Community governance"
        />

        <PixelCard className="p-10 text-center">
          <FileText className="w-8 h-8 mx-auto mb-3 text-red" />

          <div className="text-sm text-txprim font-medium">
            Failed to load proposals
          </div>

          <div className="text-xs text-txdim mt-2 max-w-xl mx-auto break-words">
            {error}
          </div>

          <PixelButton
            variant="primary"
            size="sm"
            className="mt-5"
            onClick={() => {
              void loadData();
            }}
          >
            Retry
          </PixelButton>
        </PixelCard>
      </div>
    );
  }

  /* ==========================================================
   * UI
   * ======================================================== */

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <SectionHeader
        title="Proposals"
        subtitle="Community governance — vote on proposals stored on-chain"
        action={
          <PixelButton
            variant="primary"
            size="sm"
            onClick={() =>
              setShowCreate(true)
            }
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
            {stats.total}
          </div>

          <div className="text-xs text-txdim uppercase tracking-wide mt-1">
            Total
          </div>
        </PixelCard>

        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-yellow">
            {stats.active}
          </div>

          <div className="text-xs text-txdim uppercase tracking-wide mt-1">
            Active
          </div>
        </PixelCard>

        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-green">
            {stats.passed}
          </div>

          <div className="text-xs text-txdim uppercase tracking-wide mt-1">
            Passed
          </div>
        </PixelCard>

        <PixelCard className="p-4 text-center">
          <div className="text-2xl font-heading font-semibold text-red">
            {stats.rejected}
          </div>

          <div className="text-xs text-txdim uppercase tracking-wide mt-1">
            Rejected
          </div>
        </PixelCard>
      </div>

      {/* TABS */}

      <Tabs
        value={tab}
        onValueChange={setTab}
      >
        <TabsList className="flex w-full bg-bgpanel border border-bdlight p-1 rounded-xl h-auto">
          {[
            "active",
            "passed",
            "rejected",
            "all",
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
                No{" "}
                {tab === "all"
                  ? ""
                  : `${tab} `}
                proposals
              </div>

              <div className="text-xs text-txdim mt-1">
                {tab === "active"
                  ? "Create a proposal to start a community vote."
                  : "There are no proposals in this category yet."}
              </div>

              {tab === "active" && (
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
              {filtered.map(
                (proposal) => (
                  <ProposalCard
                    key={
                      proposal.id
                    }
                    proposal={
                      proposal
                    }
                    onClick={() =>
                      navigate(
                        `/proposals/${proposal.address}`,
                      )
                    }
                  />
                ),
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* CREATE PROPOSAL */}

      <CreateProposalModal
        open={showCreate}
        onClose={() => {
          if (!isCreating) {
            setShowCreate(false);
          }
        }}
        groupId=""
        groupName=""
        onCreate={
          handleCreateProposal
        }
      />
    </div>
  );
}

/* ============================================================
 * PROPOSAL CARD
 * ========================================================== */

function ProposalCard({
  proposal: p,
  onClick,
}: {
  proposal: {
    id: string;
    groupId: string;
    groupName: string;
    title: string;
    description: string;
    amount: number;
    currency: string;
    status: string;
    votes: {
      yes: number;
      no: number;
      abstain: number;
    };
    memberCount: number;
    deadline: number;
    hoursLeft: number;
    executed: boolean;
  };
  onClick: () => void;
}) {
  const totalVotes =
    p.votes.yes +
    p.votes.no +
    p.votes.abstain;

  /*

  * Use members when available.
  * Otherwise use actual votes so the bar still works
  * for groups where memberCount isn't available.
    */
  const denominator =
    p.memberCount > 0
      ? p.memberCount
      : Math.max(totalVotes, 1);

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

  const statusVariant =
    p.status === "voting"
      ? "pending"
      : p.status === "passed"
        ? "success"
        : p.status === "executed"
          ? "approved"
          : p.status === "rejected"
            ? "rejected"
            : p.status === "expired"
              ? "warning"
              : "default";

  const statusLabel =
    p.status === "voting"
      ? "Voting"
      : p.status === "passed"
        ? "Passed"
        : p.status === "executed"
          ? "Executed"
          : p.status === "rejected"
            ? "Rejected"
            : p.status === "expired"
              ? "Expired"
              : p.status;

  return (<PixelCard
    hover
    onClick={onClick}
    className="group cursor-pointer p-4 flex flex-col min-h-[250px]"
  >
    {/* =====================================================
* TOP
* =================================================== */}

    ```
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {/* GROUP */}

        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] uppercase tracking-wider text-cyan font-medium truncate">
            {p.groupName}
          </span>

          <span className="text-[10px] text-txdim">
            •
          </span>

          <span className="text-[10px] text-txdim font-mono shrink-0">
            {p.id.slice(0, 6)}
          </span>
        </div>

        {/* TITLE */}

        <h3 className="text-sm font-semibold text-txprim leading-snug line-clamp-2 group-hover:text-cyan transition-colors">
          {p.title}
        </h3>
      </div>

      <StatusBadge
        variant={statusVariant}
        className="shrink-0 text-[10px]"
      >
        {statusLabel}
      </StatusBadge>
    </div>

    {/* =====================================================
   * DESCRIPTION
   * =================================================== */}

    <p className="text-[11px] text-txsec leading-relaxed mt-2 line-clamp-2">
      {p.description ||
        "No description provided for this proposal."}
    </p>

    {/* =====================================================
   * REQUESTED AMOUNT
   * =================================================== */}

    <div className="mt-3 flex items-center justify-between rounded-lg bg-bgdark border border-bdlight px-3 py-2">
      <div>
        <div className="text-[9px] uppercase tracking-wider text-txdim">
          Requested
        </div>

        <div className="text-sm font-mono font-semibold text-cyan mt-0.5">
          {formatSol(p.amount)} {p.currency}
        </div>
      </div>

      <div className="text-right">
        <div className="text-[9px] uppercase tracking-wider text-txdim">
          Participation
        </div>

        <div className="text-xs font-mono text-txprim mt-0.5">
          {totalVotes}
          {p.memberCount > 0
            ? ` / ${p.memberCount}`
            : ""}
        </div>
      </div>
    </div>

    {/* =====================================================
   * VOTES
   * =================================================== */}

    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-green">
            <ThumbsUp className="w-3 h-3" />
            {p.votes.yes}
          </span>

          <span className="flex items-center gap-1 text-red">
            <ThumbsDown className="w-3 h-3" />
            {p.votes.no}
          </span>

          <span className="flex items-center gap-1 text-txdim">
            <Minus className="w-3 h-3" />
            {p.votes.abstain}
          </span>
        </div>

        <span className="text-[10px] text-txdim">
          {totalVotes} voted
        </span>
      </div>

      {/* COMPACT VOTE BAR */}

      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-bgpanel2">
        {yesPct > 0 && (
          <div
            className="h-full bg-green transition-all"
            style={{
              width: `${yesPct}%`,
            }}
          />
        )}

        {noPct > 0 && (
          <div
            className="h-full bg-red transition-all"
            style={{
              width: `${noPct}%`,
            }}
          />
        )}

        {abstainPct > 0 && (
          <div
            className="h-full bg-bdbright transition-all"
            style={{
              width: `${abstainPct}%`,
            }}
          />
        )}
      </div>
    </div>

    {/* =====================================================
   * FOOTER
   * =================================================== */}

    <div className="mt-auto pt-3 flex items-center justify-between border-t border-bdlight">
      {/* TIME */}

      <div className="flex items-center gap-1.5">
        {p.status === "voting" && p.hoursLeft > 0 ? (
          <>
            <Clock className="w-3 h-3 text-yellow" />

            <span className="text-[10px] text-yellow">
              {p.hoursLeft < 24
                ? `${p.hoursLeft}h left`
                : `${Math.ceil(p.hoursLeft / 24)}d left`}
            </span>
          </>
        ) : p.status === "expired" ? (
          <>
            <Clock className="w-3 h-3 text-red" />

            <span className="text-[10px] text-red">
              Voting ended
            </span>
          </>
        ) : p.status === "executed" ? (
          <>
            <Check className="w-3 h-3 text-green" />

            <span className="text-[10px] text-green">
              Executed
            </span>
          </>
        ) : (
          <span className="text-[10px] text-txdim">
            {p.status === "passed"
              ? "Vote passed"
              : "Finalized"}
          </span>
        )}
      </div>

      {/* ACTION */}

      <div className="flex items-center gap-1 text-[10px] text-cyan font-medium group-hover:translate-x-0.5 transition-transform">
        {p.status === "voting"
          ? "Vote now"
          : "View proposal"}

        <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  </PixelCard>

);
}
