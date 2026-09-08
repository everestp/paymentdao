import {
  PixelButton,
  PixelCard,
  StatusBadge,
} from "@/components/retro";

import { ConfirmModal } from "@/components/retro/PixelModal";

import {
  fetchGroup,
  fetchProposal,
  getProposalVoteReceipt,
  voteOnProposalOnChain,
  type OnChainGroup,
  type OnChainProposal,
} from "@/chain/paydao";

import { motion } from "framer-motion";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  Minus,
  ThumbsDown,
  ThumbsUp,
  Wallet,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { useWallet } from "@solana/wallet-adapter-react";

/* ============================================================
 * TYPES
 * ========================================================== */

type VoteType =
  | "yes"
  | "no"
  | "abstain";

interface VoteReceipt {
  hasVoted: boolean;
  vote?: VoteType;
  address?: string;
}

/* ============================================================
 * GENERIC HELPERS
 * ========================================================== */

function toStringValue(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? String(value)
      : "";
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const obj =
      value as Record<string, unknown>;

    if (
      typeof obj.toString ===
      "function"
    ) {
      try {
        const result =
          obj.toString();

        if (
          result &&
          result !==
          "[object Object]"
        ) {
          return result;
        }
      } catch {
        // ignore
      }
    }
  }

  return String(value);
}

function toNumber(
  value: unknown,
): number {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  if (typeof value === "bigint") {
    const result =
      Number(value);

    return Number.isFinite(result)
      ? result
      : 0;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const obj =
      value as Record<string, unknown>;

    if (
      typeof obj.toNumber ===
      "function"
    ) {
      try {
        const result =
          Number(
            (
              obj.toNumber as () =>
                number
            )(),
          );

        return Number.isFinite(
          result,
        )
          ? result
          : 0;
      } catch {
        return 0;
      }
    }
  }

  const result =
    Number(
      toStringValue(value),
    );

  return Number.isFinite(result)
    ? result
    : 0;
}

/* ============================================================
 * ADDRESS
 *
 * Supports:
 * - string
 * - PublicKey
 * - BN-like objects
 * - nested address/publicKey/key/groupAddress objects
 * ========================================================== */

function getAddress(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const obj =
      value as Record<string, unknown>;

    if (
      typeof obj.toBase58 ===
      "function"
    ) {
      try {
        const address =
          (
            obj.toBase58 as () =>
              string
          )();

        if (address) {
          return address;
        }
      } catch {
        // continue
      }
    }

    /*
     * Handle nested structures.
     */
    const nestedKeys = [
      "address",
      "publicKey",
      "pubkey",
      "key",
      "group",
      "groupAddress",
      "groupPda",
      "proposal",
      "proposalAddress",
    ];

    for (const key of nestedKeys) {
      if (
        obj[key] !== undefined &&
        obj[key] !== null
      ) {
        const nested =
          getAddress(
            obj[key],
          );

        if (nested) {
          return nested;
        }
      }
    }

    /*
     * PublicKey / BN-like fallback.
     */
    if (
      typeof obj.toString ===
      "function"
    ) {
      try {
        const result =
          (
            obj.toString as () =>
              string
          )();

        if (
          result &&
          result !==
          "[object Object]"
        ) {
          return result;
        }
      } catch {
        // ignore
      }
    }
  }

  return "";
}

/* ============================================================
 * TIMESTAMP
 *
 * Internally we always use UNIX seconds.
 * ========================================================== */

function getTimestampSeconds(
  value: unknown,
): number {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  let timestamp = 0;

  if (typeof value === "number") {
    timestamp = value;
  } else if (
    typeof value === "bigint"
  ) {
    timestamp = Number(value);
  } else if (
    typeof value === "string"
  ) {
    timestamp = Number(value);
  } else if (
    typeof value === "object" &&
    value !== null
  ) {
    const obj =
      value as Record<string, unknown>;

    /*
     * Anchor BN.
     */
    if (
      typeof obj.toNumber ===
      "function"
    ) {
      try {
        timestamp = Number(
          (
            obj.toNumber as () =>
              number
          )(),
        );
      } catch {
        timestamp = 0;
      }
    }

    /*
     * BN/string fallback.
     */
    if (
      timestamp === 0 &&
      typeof obj.toString ===
      "function"
    ) {
      try {
        timestamp = Number(
          (
            obj.toString as () =>
              string
          )(),
        );
      } catch {
        timestamp = 0;
      }
    }
  }

  if (
    !Number.isFinite(timestamp) ||
    timestamp <= 0
  ) {
    return 0;
  }

  /*
   * If timestamp is milliseconds,
   * convert it to seconds.
   *
   * Normal Anchor i64 timestamps
   * are UNIX seconds.
   */
  if (
    timestamp >
    10_000_000_000
  ) {
    return Math.floor(
      timestamp / 1000,
    );
  }

  return Math.floor(timestamp);
}

function formatDate(
  value: unknown,
): string {
  const seconds =
    getTimestampSeconds(value);

  if (seconds <= 0) {
    return "Unknown";
  }

  const date =
    new Date(
      seconds * 1000,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleString();
}

/* ============================================================
 * TIME
 * ========================================================== */

function formatRemainingTime(
  seconds: number,
): string {
  if (seconds <= 0) {
    return "Time over";
  }

  const days =
    Math.floor(
      seconds / 86400,
    );

  const hours =
    Math.floor(
      (seconds % 86400) /
      3600,
    );

  const minutes =
    Math.floor(
      (seconds % 3600) /
      60,
    );

  const secs =
    seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
}

/* ============================================================
 * STATUS
 *
 * Handles:
 * - strings
 * - numbers
 * - Anchor enum objects
 * ========================================================== */

function normalizeStatus(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "unknown";
  }

  /*
   * Anchor enum can look like:
   *
   * { voting: {} }
   * { passed: {} }
   */
  if (
    typeof value === "object"
  ) {
    const obj =
      value as Record<
        string,
        unknown
      >;

    const keys =
      Object.keys(obj);

    if (keys.length > 0) {
      return normalizeStatus(
        keys[0],
      );
    }
  }

  const raw =
    toStringValue(value)
      .toLowerCase()
      .trim()
      .replace(
        /[\s-]+/g,
        "_",
      );

  /*
   * Numeric Anchor status.
   *
   * Assumes:
   * 0 = voting
   * 1 = passed
   * 2 = rejected
   * 3 = executed
   */
  if (
    raw === "0" ||
    raw === "voting"
  ) {
    return "voting";
  }

  if (
    raw === "1" ||
    raw === "passed" ||
    raw === "approved" ||
    raw === "succeeded"
  ) {
    return "passed";
  }

  if (
    raw === "2" ||
    raw === "rejected" ||
    raw === "failed" ||
    raw === "denied"
  ) {
    return "rejected";
  }

  if (
    raw === "3" ||
    raw === "executed" ||
    raw === "completed"
  ) {
    return "executed";
  }

  switch (raw) {
    case "active":
    case "open":
    case "voting_active":
    case "pending_vote":
    case "pending":
      return "voting";

    case "expired":
      return "expired";

    default:
      return raw || "unknown";
  }
}

/* ============================================================
 * AMOUNT
 * ========================================================== */

function lamportsToSol(
  value: unknown,
): number {
  const lamports =
    toNumber(value);

  if (
    !Number.isFinite(
      lamports,
    )
  ) {
    return 0;
  }

  return (
    lamports / 1_000_000_000
  );
}

function formatSol(
  value: number,
): string {
  if (
    !Number.isFinite(value)
  ) {
    return "0";
  }

  return value.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    },
  );
}

function getProposalAmountSol(
  proposal: OnChainProposal,
): number {
  const p =
    proposal as OnChainProposal &
    Record<string, unknown>;

  /*
   * Explicit SOL field.
   */
  if (
    p.amountSol !==
    undefined &&
    p.amountSol !== null
  ) {
    return toNumber(
      p.amountSol,
    );
  }

  /*
   * Explicit lamports field.
   */
  if (
    p.amountLamports !==
    undefined &&
    p.amountLamports !== null
  ) {
    return lamportsToSol(
      p.amountLamports,
    );
  }

  /*
   * Your current fetchProposal()
   * is expected to return amount
   * already in SOL.
   */
  return toNumber(
    p.amount ?? 0,
  );
}

/* ============================================================
 * VOTES
 * ========================================================== */

function getVotes(
  proposal: OnChainProposal,
) {
  const p =
    proposal as OnChainProposal &
    Record<string, unknown>;

  return {
    yes: Math.max(
      0,
      toNumber(
        p.yesVotes ??
        p.yes_votes ??
        p.yes ??
        0,
      ),
    ),

    no: Math.max(
      0,
      toNumber(
        p.noVotes ??
        p.no_votes ??
        p.no ??
        0,
      ),
    ),

    abstain: Math.max(
      0,
      toNumber(
        p.abstainVotes ??
        p.abstain_votes ??
        p.abstain ??
        0,
      ),
    ),
  };
}

/* ============================================================
 * VOTE NORMALIZATION
 * ========================================================== */

function normalizeVote(
  value: unknown,
): VoteType | undefined {
  if (
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  /*
   * Anchor enum:
   *
   * { yes: {} }
   * { no: {} }
   * { abstain: {} }
   */
  if (
    typeof value === "object"
  ) {
    const obj =
      value as Record<
        string,
        unknown
      >;

    const keys =
      Object.keys(obj);

    if (keys.length > 0) {
      return normalizeVote(
        keys[0],
      );
    }
  }

  const vote =
    toStringValue(value)
      .toLowerCase()
      .trim();

  if (
    vote === "yes" ||
    vote === "y" ||
    vote === "0"
  ) {
    return "yes";
  }

  if (
    vote === "no" ||
    vote === "n" ||
    vote === "1"
  ) {
    return "no";
  }

  if (
    vote === "abstain" ||
    vote === "abstained" ||
    vote === "2"
  ) {
    return "abstain";
  }

  return undefined;
}

function normalizeVoteReceipt(
  value: unknown,
): VoteReceipt {
  if (!value) {
    return {
      hasVoted: false,
    };
  }

  /*
   * Some implementations may simply
   * return true.
   */
  if (value === true) {
    return {
      hasVoted: true,
    };
  }

  if (
    typeof value !== "object"
  ) {
    return {
      hasVoted: false,
    };
  }

  const receipt =
    value as Record<
      string,
      unknown
    >;

  const vote =
    normalizeVote(
      receipt.vote ??
      receipt.choice ??
      receipt.voteType ??
      receipt.vote_type ??
      receipt.voteValue,
    );

  const address =
    getAddress(
      receipt.address ??
      receipt.publicKey ??
      receipt.pubkey,
    );

  return {
    hasVoted:
      Boolean(
        receipt.hasVoted ??
        receipt.has_voted ??
        receipt.voted ??
        receipt.exists ??
        vote,
      ),
    vote,
    address:
      address || undefined,
  };
}

/* ============================================================
 * ADDRESS SHORTENER
 * ========================================================== */

function shortenAddress(
  address: string,
): string {
  if (!address) {
    return "Unknown";
  }

  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(
    0,
    6,
  )}...${address.slice(-6)}`;
}

/* ============================================================
 * PAGE
 * ========================================================== */

export default function ProposalDetailPage() {
  const { id } =
    useParams<{
      id: string;
    }>();

  const navigate =
    useNavigate();

  const {
    connected,
    publicKey,
  } = useWallet();

  /* ==========================================================
   * STATE
   * ======================================================== */

  const [proposal, setProposal] =
    useState<OnChainProposal | null>(
      null,
    );

  const [group, setGroup] =
    useState<OnChainGroup | null>(
      null,
    );

  const [voteReceipt, setVoteReceipt] =
    useState<VoteReceipt>({
      hasVoted: false,
    });

  const [loading, setLoading] =
    useState(true);

  const [checkingVote, setCheckingVote] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [voteError, setVoteError] =
    useState<string | null>(null);

  const [voting, setVoting] =
    useState(false);

  const [voteModal, setVoteModal] =
    useState<{
      open: boolean;
      vote: VoteType | null;
    }>({
      open: false,
      vote: null,
    });

  /*
   * Keep exact current time.
   */
  const [now, setNow] =
    useState(() => Date.now());

  /* ==========================================================
   * LIVE CLOCK
   * ======================================================== */

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setNow(Date.now());
      }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /* ==========================================================
   * LOAD PROPOSAL
   * ======================================================== */

  const loadProposal =
    useCallback(async () => {
      if (!id) {
        setError(
          "Proposal address is missing.",
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result =
          await fetchProposal(id);

        if (!result) {
          throw new Error(
            "Proposal was not found on-chain.",
          );
        }

        if (!result.address) {
          throw new Error(
            "Proposal address is missing from on-chain data.",
          );
        }

        setProposal(result);

        /*
         * Be flexible about how
         * fetchProposal exposes group.
         */
        const raw =
          result as OnChainProposal &
          Record<string, unknown>;

        const groupAddress =
          getAddress(
            raw.group ??
            raw.groupAddress ??
            raw.group_address ??
            raw.groupPda ??
            raw.group_pda,
          );

        /*
         * Don't destroy the proposal page
         * just because group metadata is
         * unavailable.
         */
        if (!groupAddress) {
          console.warn(
            "Proposal has no group address.",
            result,
          );

          setGroup(null);

          return;
        }

        try {
          const groupResult =
            await fetchGroup(
              groupAddress,
            );

          if (groupResult) {
            setGroup(
              groupResult,
            );
          } else {
            setGroup(null);
          }
        } catch (groupError) {
          console.error(
            "Group loading failed:",
            groupError,
          );

          setGroup(null);
        }
      } catch (err) {
        console.error(
          "Proposal loading failed:",
          err,
        );

        setProposal(null);
        setGroup(null);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load proposal.",
        );
      } finally {
        setLoading(false);
      }
    }, [id]);

  useEffect(() => {
    void loadProposal();
  }, [loadProposal]);

  /* ==========================================================
   * CHECK USER VOTE
   * ======================================================== */

  const checkUserVote =
    useCallback(
      async (
        proposalAddress?: string,
      ) => {
        const address =
          proposalAddress ??
          proposal?.address;

        if (
          !address ||
          !publicKey ||
          !connected
        ) {
          setVoteReceipt({
            hasVoted: false,
          });

          return;
        }

        try {
          setCheckingVote(true);

          const receipt =
            await getProposalVoteReceipt(
              address,
              publicKey.toBase58(),
            );

          setVoteReceipt(
            normalizeVoteReceipt(
              receipt,
            ),
          );
        } catch (err) {
          console.error(
            "Vote receipt check failed:",
            err,
          );

          /*
           * Important:
           * RPC failure != user hasn't voted.
           *
           * Keep previous receipt rather
           * than falsely displaying "Vote now".
           */
          setVoteReceipt(
            (previous) =>
              previous,
          );
        } finally {
          setCheckingVote(false);
        }
      },
      [
        proposal?.address,
        publicKey,
        connected,
      ],
    );

  useEffect(() => {
    if (
      connected &&
      publicKey &&
      proposal?.address
    ) {
      void checkUserVote(
        proposal.address,
      );
    } else {
      setVoteReceipt({
        hasVoted: false,
      });
    }
  }, [
    connected,
    publicKey,
    proposal?.address,
    checkUserVote,
  ]);

  /* ==========================================================
   * DERIVED DATA
   * ======================================================== */

  const data = useMemo(() => {
    if (!proposal) {
      return null;
    }

    const raw =
      proposal as OnChainProposal &
      Record<string, unknown>;

    const votes =
      getVotes(proposal);

    const totalVotes =
      votes.yes +
      votes.no +
      votes.abstain;

    /*
     * Deadline.
     */
    const deadline =
      raw.deadline ??
      raw.votingDeadline ??
      raw.voting_deadline ??
      null;

    /*
     * ALWAYS normalize to seconds.
     */
    const deadlineSeconds =
      getTimestampSeconds(
        deadline,
      );

    const nowSeconds =
      Math.floor(now / 1000);

    const hasDeadline =
      deadlineSeconds > 0;

    /*
     * EXACT comparison.
     *
     * This is the important fix.
     */
    const deadlinePassed =
      hasDeadline &&
      nowSeconds >=
      deadlineSeconds;

    const secondsLeft =
      hasDeadline
        ? Math.max(
          0,
          deadlineSeconds -
          nowSeconds,
        )
        : 0;

    /*
     * Blockchain status.
     */
    const blockchainStatus =
      normalizeStatus(
        proposal.status,
      );

    /*
     * Voting is open only when
     * status is voting and deadline
     * hasn't passed.
     */
    const votingOpen =
      blockchainStatus ===
      "voting" &&
      !deadlinePassed;

    let status =
      blockchainStatus;

    if (
      deadlinePassed &&
      blockchainStatus ===
      "voting"
    ) {
      status = "expired";
    }

    /*
     * Group member count.
     */
    const memberCount =
      toNumber(
        group?.memberCount ??
        0,
      );

    /*
     * Percentages represent
     * distribution of votes cast.
     */
    const denominator =
      totalVotes;

    const percentage = (
      value: number,
    ) =>
      denominator > 0
        ? Math.min(
          100,
          Math.round(
            (value /
              denominator) *
            100,
          ),
        )
        : 0;

    /*
     * Addresses.
     */
    const proposer =
      getAddress(
        raw.proposer ??
        raw.creator ??
        raw.author,
      );

    const recipient =
      getAddress(
        raw.recipient ??
        raw.recipientWallet ??
        raw.recipient_wallet,
      );

    /*
     * Group address.
     */
    const groupAddress =
      getAddress(
        raw.group ??
        raw.groupAddress ??
        raw.group_address ??
        raw.groupPda ??
        raw.group_pda,
      );

    return {
      votes,

      totalVotes,

      memberCount,

      yesPct:
        percentage(
          votes.yes,
        ),

      noPct:
        percentage(
          votes.no,
        ),

      abstainPct:
        percentage(
          votes.abstain,
        ),

      deadline,

      deadlineSeconds,

      deadlinePassed,

      secondsLeft,

      votingOpen,

      status,

      proposer,

      recipient,

      groupAddress,

      amount:
        getProposalAmountSol(
          proposal,
        ),

      createdAt:
        raw.createdAt ??
        raw.created_at ??
        0,
    };
  }, [
    proposal,
    group,
    now,
  ]);

  /* ==========================================================
   * CREATOR
   *
   * Creator is NOT automatically blocked.
   *
   * Whether creator can vote is ultimately
   * decided by the Anchor program.
   * ======================================================== */

  const isProposer =
    Boolean(
      publicKey &&
      data?.proposer &&
      publicKey.toBase58() ===
      data.proposer,
    );

  /* ==========================================================
   * OPEN VOTE
   * ======================================================== */

  const openVoteModal =
    (vote: VoteType) => {
      setVoteError(null);

      if (!connected) {
        setVoteError(
          "Connect your Solana wallet before voting.",
        );

        return;
      }

      if (checkingVote) {
        return;
      }

      if (
        voteReceipt.hasVoted
      ) {
        setVoteError(
          `You already voted${voteReceipt.vote
            ? ` ${voteReceipt.vote.toUpperCase()}`
            : ""
          } on this proposal.`,
        );

        return;
      }

      if (!data?.votingOpen) {
        setVoteError(
          data?.deadlinePassed
            ? "The voting deadline has passed."
            : "This proposal is not accepting votes.",
        );

        return;
      }

      setVoteModal({
        open: true,
        vote,
      });
    };

  /* ==========================================================
   * CAST VOTE
   * ======================================================== */

  const handleVote =
    async () => {
      const selectedVote =
        voteModal.vote;

      if (
        !proposal ||
        !selectedVote
      ) {
        return;
      }

      setVoteError(null);

      if (
        !connected ||
        !publicKey
      ) {
        setVoteError(
          "Connect your Solana wallet before voting.",
        );

        return;
      }

      if (!proposal.address) {
        setVoteError(
          "Proposal address is missing.",
        );

        return;
      }

      const raw =
        proposal as OnChainProposal &
        Record<string, unknown>;

      const groupAddress =
        getAddress(
          raw.group ??
          raw.groupAddress ??
          raw.group_address ??
          raw.groupPda ??
          raw.group_pda ??
          group?.address,
        );

      if (!groupAddress) {
        setVoteError(
          "The proposal group address is missing.",
        );

        return;
      }

      /*
       * Prevent double voting.
       */
      if (
        voteReceipt.hasVoted
      ) {
        setVoteError(
          `You already voted${voteReceipt.vote
            ? ` ${voteReceipt.vote.toUpperCase()}`
            : ""
          } on this proposal.`,
        );

        setVoteModal({
          open: false,
          vote: null,
        });

        return;
      }

      /*
       * IMPORTANT:
       *
       * Check the exact deadline again
       * immediately before transaction.
       *
       * Do not rely only on React's
       * previously calculated `data`.
       */
      const currentNow =
        Date.now();

      const currentNowSeconds =
        Math.floor(
          currentNow / 1000,
        );

      const currentDeadlineSeconds =
        getTimestampSeconds(
          raw.deadline ??
          raw.votingDeadline ??
          raw.voting_deadline ??
          null,
        );

      if (
        currentDeadlineSeconds > 0 &&
        currentNowSeconds >=
        currentDeadlineSeconds
      ) {
        setVoteError(
          "The voting deadline has passed.",
        );

        setVoteModal({
          open: false,
          vote: null,
        });

        return;
      }

      /*
       * Also respect blockchain status.
       */
      const currentStatus =
        normalizeStatus(
          proposal.status,
        );

      if (
        currentStatus !==
        "voting"
      ) {
        setVoteError(
          "This proposal is not accepting votes.",
        );

        setVoteModal({
          open: false,
          vote: null,
        });

        return;
      }

      try {
        setVoting(true);

        /*
         * Send on-chain transaction.
         */
        await voteOnProposalOnChain({
          groupId:
            groupAddress,

          proposalAddress:
            proposal.address,

          vote:
            selectedVote,
        });

        /*
         * Immediately show voted state.
         */
        setVoteReceipt({
          hasVoted: true,
          vote: selectedVote,
        });

        setVoteModal({
          open: false,
          vote: null,
        });

        /*
         * Reload proposal.
         */
        await loadProposal();

        /*
         * IMPORTANT:
         *
         * Don't rely on React state having
         * updated after loadProposal().
         *
         * Use the known proposal PDA directly.
         */
        await checkUserVote(
          proposal.address,
        );
      } catch (err) {
        console.error(
          "Vote failed:",
          err,
        );

        /*
         * Transaction failure should not
         * permanently mark the user voted.
         */
        setVoteReceipt({
          hasVoted: false,
        });

        setVoteError(
          err instanceof Error
            ? err.message
            : "Vote transaction failed.",
        );
      } finally {
        setVoting(false);
      }
    };

  /* ==========================================================
   * STATUS VARIANT
   * ======================================================== */

  const statusVariant =
    data?.status === "voting"
      ? "pending"
      : data?.status ===
        "passed"
        ? "success"
        : data?.status ===
          "rejected"
          ? "rejected"
          : data?.status ===
            "executed"
            ? "approved"
            : data?.status ===
              "expired"
              ? "warning"
              : "default";

  /* ==========================================================
   * LOADING
   * ======================================================== */

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <PixelCard className="p-10 animate-pulse">
          <div className="h-4 w-32 bg-bgpanel2 rounded mb-4" />

          <div className="h-8 w-2/3 bg-bgpanel2 rounded mb-4" />

          <div className="h-4 w-1/3 bg-bgpanel2 rounded mb-8" />

          <div className="space-y-3">
            <div className="h-4 bg-bgpanel2 rounded" />

            <div className="h-4 w-5/6 bg-bgpanel2 rounded" />

            <div className="h-4 w-4/6 bg-bgpanel2 rounded" />
          </div>
        </PixelCard>
      </div>
    );
  }

  /* ==========================================================
   * ERROR
   * ======================================================== */

  if (
    error ||
    !proposal ||
    !data
  ) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-txdim" />

        <h2 className="text-xl font-heading font-semibold text-txprim mb-2">
          Unable to load proposal
        </h2>

        <p className="text-sm text-txdim mb-6 break-words">
          {error ||
            "Proposal was not found."}
        </p>

        <PixelButton
          variant="ghost"
          onClick={() =>
            navigate(
              "/proposals",
            )
          }
        >
          <ArrowLeft className="w-4 h-4" />

          Back to proposals
        </PixelButton>
      </div>
    );
  }

  /* ==========================================================
   * RENDER
   * ======================================================== */

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ======================================================
          BACK
      ====================================================== */}

      <button
        onClick={() =>
          navigate(
            group
              ? `/groups/${group.address}`
              : "/proposals",
          )
        }
        className="flex items-center gap-2 text-sm text-txdim hover:text-txprim transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />

        Back to{" "}
        {group?.name ||
          "proposals"}
      </button>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <PixelCard>
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs text-cyan font-medium mb-2">
              PAYDAO PROPOSAL
            </div>

            <h1 className="text-2xl md:text-3xl font-heading font-semibold text-txprim break-words">
              {proposal.title ||
                "Untitled Proposal"}
            </h1>

            {group && (
              <button
                onClick={() =>
                  navigate(
                    `/groups/${group.address}`,
                  )
                }
                className="mt-2 text-sm text-cyan hover:underline"
              >
                {group.name}
              </button>
            )}
          </div>

          <StatusBadge
            variant={
              statusVariant
            }
          >
            {data.status}
          </StatusBadge>
        </div>

        <div className="flex items-center gap-4 flex-wrap mt-5 text-xs text-txdim">
          <span>
            Created{" "}
            {formatDate(
              data.createdAt,
            )}
          </span>

          {data.votingOpen && (
            <span className="flex items-center gap-1 text-yellow font-mono">
              <Clock className="w-3.5 h-3.5" />

              {formatRemainingTime(
                data.secondsLeft,
              )}
            </span>
          )}

          {data.deadlinePassed && (
            <span className="flex items-center gap-1 text-red">
              <Clock className="w-3.5 h-3.5" />

              Voting ended
            </span>
          )}

          {isProposer && (
            <span className="text-cyan">
              You are the proposer
            </span>
          )}
        </div>
      </PixelCard>

      {/* ======================================================
          MAIN GRID
      ====================================================== */}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ====================================================
            LEFT
        ==================================================== */}

        <div className="lg:col-span-2 space-y-6">
          {/* ==================================================
              DESCRIPTION
          ================================================== */}

          <PixelCard>
            <h2 className="text-sm font-semibold text-txprim mb-4">
              Description
            </h2>

            <p className="text-sm text-txsec leading-7 whitespace-pre-wrap break-words">
              {proposal.description ||
                "No description provided."}
            </p>
          </PixelCard>

          {/* ==================================================
              DETAILS
          ================================================== */}

          <PixelCard>
            <h2 className="text-sm font-semibold text-txprim mb-4">
              Proposal Details
            </h2>

            <div className="space-y-3">
              <DetailRow
                label="Requested"
                value={`${formatSol(
                  data.amount,
                )} SOL`}
              />

              <DetailRow
                label="Proposer"
                value={shortenAddress(
                  data.proposer,
                )}
                title={
                  data.proposer
                }
              />

              <DetailRow
                label="Recipient"
                value={shortenAddress(
                  data.recipient,
                )}
                title={
                  data.recipient
                }
              />

              <DetailRow
                label="Deadline"
                value={formatDate(
                  data.deadline,
                )}
              />

              <DetailRow
                label="Proposal PDA"
                value={shortenAddress(
                  proposal.address,
                )}
                title={
                  proposal.address
                }
              />

              <DetailRow
                label="Group PDA"
                value={
                  data.groupAddress ||
                    group?.address
                    ? shortenAddress(
                      data.groupAddress ||
                      group?.address ||
                      "",
                    )
                    : "Unknown"
                }
                title={
                  data.groupAddress ||
                  group?.address
                }
              />
            </div>
          </PixelCard>

          {/* ==================================================
              VOTING RESULTS
          ================================================== */}

          <PixelCard>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-sm font-semibold text-txprim">
                Voting Results
              </h2>

              <StatusBadge variant="info">
                On-chain
              </StatusBadge>
            </div>

            <div className="space-y-5">
              <VoteBar
                label="YES"
                icon={ThumbsUp}
                count={
                  data.votes.yes
                }
                pct={
                  data.yesPct
                }
              />

              <VoteBar
                label="NO"
                icon={ThumbsDown}
                count={
                  data.votes.no
                }
                pct={
                  data.noPct
                }
              />

              <VoteBar
                label="ABSTAIN"
                icon={Minus}
                count={
                  data.votes.abstain
                }
                pct={
                  data.abstainPct
                }
              />
            </div>

            <div className="mt-6 pt-4 border-t border-bdlight flex justify-between">
              <span className="text-sm text-txdim">
                Total votes
              </span>

              <span className="font-mono text-sm text-txprim">
                {data.totalVotes}

                {data.memberCount >
                  0
                  ? ` / ${data.memberCount}`
                  : ""}
              </span>
            </div>

            {data.memberCount >
              0 && (
                <div className="mt-2 text-xs text-txdim text-right">
                  {data.totalVotes} of{" "}
                  {data.memberCount}{" "}
                  members have voted
                </div>
              )}
          </PixelCard>
        </div>

        {/* ====================================================
            RIGHT / VOTING
        ==================================================== */}

        <div>
          <PixelCard className="sticky top-20">
            <h2 className="text-sm font-semibold text-txprim">
              Your Vote
            </h2>

            <p className="text-xs text-txdim mt-1 mb-5">
              Your vote is recorded
              directly on Solana.
            </p>

            {/* =================================================
                CHECKING
            ================================================= */}

            {checkingVote ? (
              <div className="p-4 rounded-lg border border-bdlight text-center">
                <div className="text-xs text-txdim">
                  Checking your vote...
                </div>
              </div>
            ) : voteReceipt.hasVoted ? (
              /* =================================================
                 ALREADY VOTED
              ================================================= */

              <motion.div
                initial={{
                  opacity: 0,
                  y: 5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="p-4 rounded-lg border border-green/30 bg-green/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green" />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-green">
                      Already Voted
                    </div>

                    <div className="text-xs text-txsec mt-0.5">
                      Your vote:{" "}
                      <span className="font-semibold text-txprim">
                        {voteReceipt.vote?.toUpperCase() ||
                          "RECORDED"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-txdim">
                  Your vote has been
                  permanently recorded
                  on-chain.
                </div>
              </motion.div>
            ) : !connected ? (
              /* =================================================
                 WALLET REQUIRED
              ================================================= */

              <div className="p-4 rounded-lg border border-yellow/30 bg-yellow/10">
                <Wallet className="w-5 h-5 text-yellow mb-2" />

                <div className="text-sm font-semibold text-yellow">
                  Wallet required
                </div>

                <div className="text-xs text-txsec mt-1">
                  Connect your Solana
                  wallet to vote.
                </div>
              </div>
            ) : !data.votingOpen ? (
              /* =================================================
                 VOTING CLOSED
              ================================================= */

              <div className="p-4 rounded-lg border border-bdlight text-center">
                <Clock className="w-7 h-7 mx-auto mb-2 text-txdim" />

                <div className="text-sm font-semibold text-txprim">
                  Voting closed
                </div>

                <div className="text-xs text-txdim mt-1">
                  {data.deadlinePassed
                    ? "The voting deadline has passed."
                    : data.status ===
                      "passed"
                      ? "This proposal has already passed."
                      : data.status ===
                        "rejected"
                        ? "This proposal was rejected."
                        : data.status ===
                          "executed"
                          ? "This proposal has already been executed."
                          : "This proposal is not accepting votes."}
                </div>
              </div>
            ) : (
              /* =================================================
                 VOTING BUTTONS
              ================================================= */

              <div className="space-y-2">
                <PixelButton
                  variant="green"
                  className="w-full"
                  disabled={
                    voting ||
                    checkingVote
                  }
                  onClick={() =>
                    openVoteModal(
                      "yes",
                    )
                  }
                >
                  <ThumbsUp className="w-4 h-4" />

                  Vote YES
                </PixelButton>

                <PixelButton
                  variant="red"
                  className="w-full"
                  disabled={
                    voting ||
                    checkingVote
                  }
                  onClick={() =>
                    openVoteModal(
                      "no",
                    )
                  }
                >
                  <ThumbsDown className="w-4 h-4" />

                  Vote NO
                </PixelButton>

                <PixelButton
                  className="w-full"
                  disabled={
                    voting ||
                    checkingVote
                  }
                  onClick={() =>
                    openVoteModal(
                      "abstain",
                    )
                  }
                >
                  <Minus className="w-4 h-4" />

                  Abstain
                </PixelButton>
              </div>
            )}

            {/* =================================================
                VOTE ERROR
            ================================================= */}

            {voteError && (
              <div className="mt-4 p-3 rounded-lg border border-red/30 bg-red/10 text-xs text-red whitespace-pre-wrap break-words">
                {voteError}
              </div>
            )}

            {/* =================================================
                STATS
            ================================================= */}

            <div className="mt-6 pt-5 border-t border-bdlight space-y-3">
              <DetailRow
                label="Status"
                value={data.status}
              />

              <DetailRow
                label="Time"
                value={
                  data.votingOpen
                    ? formatRemainingTime(
                      data.secondsLeft,
                    )
                    : data.deadlinePassed
                      ? "Ended"
                      : "Closed"
                }
              />

              <DetailRow
                label="Total votes"
                value={String(
                  data.totalVotes,
                )}
              />

              {data.memberCount >
                0 && (
                  <DetailRow
                    label="Members"
                    value={String(
                      data.memberCount,
                    )}
                  />
                )}
            </div>
          </PixelCard>
        </div>
      </div>

      {/* ======================================================
          CONFIRM MODAL
      ====================================================== */}

      <ConfirmModal
        open={
          voteModal.open
        }
        onClose={() => {
          if (!voting) {
            setVoteModal({
              open: false,
              vote: null,
            });
          }
        }}
        onConfirm={
          handleVote
        }
        title={`Vote ${voteModal.vote?.toUpperCase() ||
          ""
          }?`}
        description="Your wallet will sign an on-chain voting transaction."
        confirmText={
          voting
            ? "Submitting..."
            : "Confirm Vote"
        }
        variant={
          voteModal.vote ===
            "yes"
            ? "green"
            : voteModal.vote ===
              "no"
              ? "red"
              : "primary"
        }
        loading={voting}
      >
        <div className="p-4 rounded-lg bg-bgdark border border-bdlight">
          <div className="text-sm text-txsec">
            You are voting{" "}
            <span className="font-semibold text-txprim">
              {voteModal.vote?.toUpperCase()}
            </span>
          </div>

          <div className="text-xs text-txdim mt-2">
            {proposal.title}
          </div>

          <div className="text-xs text-yellow mt-3">
            This action will be
            recorded on-chain and
            cannot be changed.
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}

/* ============================================================
 * VOTE BAR
 * ========================================================== */

function VoteBar({
  label,
  icon: Icon,
  count,
  pct,
}: {
  label: string;
  icon: typeof Check;
  count: number;
  pct: number;
}) {
  const value =
    Math.min(
      100,
      Math.max(
        0,
        pct,
      ),
    );

  const textClass =
    label === "YES"
      ? "text-green"
      : label === "NO"
        ? "text-red"
        : "text-txdim";

  const barClass =
    label === "YES"
      ? "bg-green"
      : label === "NO"
        ? "bg-red"
        : "bg-bdbright";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon
            className={`w-4 h-4 ${textClass}`}
          />

          <span
            className={`text-sm font-medium ${textClass}`}
          >
            {label}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-txdim">
            {count} votes
          </span>

          <span className="text-sm font-mono text-txprim">
            {value}%
          </span>
        </div>
      </div>

      <div className="h-3 rounded-full bg-bgpanel2 overflow-hidden">
        <motion.div
          initial={{
            width: 0,
          }}
          animate={{
            width: `${value}%`,
          }}
          transition={{
            duration: 0.5,
          }}
          className={`h-full rounded-full ${barClass}`}
        />
      </div>
    </div>
  );
}

/* ============================================================
 * DETAIL ROW
 * ========================================================== */

function DetailRow({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-txsec shrink-0">
        {label}
      </span>

      <span
        className="text-sm font-mono text-txprim text-right truncate max-w-[65%]"
        title={title}
      >
        {value}
      </span>
    </div>
  );
}
