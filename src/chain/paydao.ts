
import type { Currency } from "@/types";

import {
  AnchorProvider,
  BN,
  Program,
  type Wallet,
} from "@coral-xyz/anchor";

import {
  Connection,
  PublicKey,
  SystemProgram,
  type Transaction,
} from "@solana/web3.js";

import paydaoIdl from "@/idl/paydao_proof.json";

/* ============================================================
 * CONFIG
 * ========================================================== */

export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PAYDAO_PROGRAM_ID ||
    "Eo8z84VpZvhf86i6c9yzmrfMcjSGwT6hhYfjhK6HugvG",
);

export const SOLANA_RPC =
  import.meta.env.VITE_SOLANA_RPC ||
  "https://api.devnet.solana.com";

const COMMITMENT = "confirmed" as const;

/* ============================================================
 * PDA SEEDS
 * ========================================================== */

const GROUP_SEED = Buffer.from("group");
const TREASURY_SEED = Buffer.from("treasury");
const MEMBER_SEED = Buffer.from("member");
const PROPOSAL_SEED = Buffer.from("proposal");
const VOTE_SEED = Buffer.from("vote");

/* ============================================================
 * WALLET TYPES
 * ========================================================== */

export type BrowserWallet = {
  publicKey?: PublicKey;

  connect: () => Promise<{
    publicKey: PublicKey;
  }>;

  signTransaction: (
    transaction: Transaction,
  ) => Promise<Transaction>;

  signAllTransactions: (
    transactions: Transaction[],
  ) => Promise<Transaction[]>;
};

type InjectedWallet = Wallet & {
  connect: () => Promise<{
    publicKey: PublicKey;
  }>;
};

/* ============================================================
 * WINDOW SOLANA WALLET
 * ========================================================== */

declare global {
  interface Window {
    solana?: BrowserWallet;
  }
}

/* ============================================================
 * CREATE GROUP TYPES
 * ========================================================== */

export interface CreateGroupChainInput {
  name: string;
  description: string;
  requiredAmount: number;
  currency: Currency;
  deadline?: string;
  visibility: "public" | "private";
  votingThreshold: number;
}

export interface CreateGroupChainResult {
  groupAddress: string;
  treasuryAddress: string;
  signature: string;
  groupKey: Uint8Array;
}/* ============================================================
 * PRIVATE VOTE
 * ========================================================== */

export type PrivateVote =
  | "yes"
  | "no"
  | "abstain";

/* ============================================================
 * CONNECTION
 * ========================================================== */

function createConnection(): Connection {
  return new Connection(
    SOLANA_RPC,
    COMMITMENT,
  );
}

/* ============================================================
 * WALLET
 * ========================================================== */

function walletFromBrowser(): InjectedWallet {
  const injected = window.solana;

  if (!injected) {
    throw new Error(
      "A Solana wallet extension is required. Install or unlock Phantom, Backpack, Solflare, or another Solana wallet.",
    );
  }

  if (!injected.publicKey) {
    throw new Error(
      "Connect your Solana wallet first.",
    );
  }

  return {
    publicKey: injected.publicKey,

    signTransaction:
      injected.signTransaction,

    signAllTransactions:
      injected.signAllTransactions,

    connect:
      injected.connect,
  } as InjectedWallet;
}

/* ============================================================
 * CREATE ANCHOR PROGRAM
 * ========================================================== */

function createProgram(
  wallet: InjectedWallet,
): Program {
  const connection =
    createConnection();

  const provider =
    new AnchorProvider(
      connection,
      wallet,
      {
        commitment: COMMITMENT,
      },
    );

  return new Program(
    paydaoIdl as any,
    provider,
  );
}

/* ============================================================
 * READ-ONLY PROGRAM
 *
 * Useful for:
 * - Groups page
 * - Proposal page
 * - Public treasury balance
 * - Public group data
 *
 * No wallet connection required.
 * ========================================================== */

export function getProgram(): Program {
  const connection =
    createConnection();

  /*
   * Read-only wallet object.
   *
   * AnchorProvider requires a wallet,
   * but read operations don't actually
   * require signing.
   */
  const readOnlyWallet = {
    publicKey: PublicKey.default,

    signTransaction: async (
      transaction: Transaction,
    ) => {
      throw new Error(
        "Read-only wallet cannot sign transactions.",
      );
    },

    signAllTransactions: async (
      transactions: Transaction[],
    ) => {
      throw new Error(
        "Read-only wallet cannot sign transactions.",
      );
    },
  } as unknown as Wallet;

  const provider =
    new AnchorProvider(
      connection,
      readOnlyWallet,
      {
        commitment: COMMITMENT,
      },
    );

  return new Program(
    paydaoIdl as any,
    provider,
  );
}

/* ============================================================
 * CONNECTED PROGRAM
 *
 * USE THIS FOR TRANSACTIONS:
 *
 * const {
 *   program,
 *   publicKey,
 * } = await connectedProgram();
 * ========================================================== */

export async function connectedProgram(): Promise<{
  wallet: InjectedWallet;
  publicKey: PublicKey;
  program: Program;
}> {
  const injected = window.solana;

  if (!injected) {
    throw new Error(
      "No Solana wallet found. Install Phantom, Backpack, or Solflare.",
    );
  }

  /*
   * Connect if wallet isn't connected yet.
   */
  if (!injected.publicKey) {
    const response =
      await injected.connect();

    if (!response?.publicKey) {
      throw new Error(
        "Wallet connection was cancelled.",
      );
    }
  }

  const wallet =
    walletFromBrowser();

  const publicKey =
    wallet.publicKey!;

  const program =
    createProgram(wallet);

  return {
    wallet,
    publicKey,
    program,
  };
}

/* ============================================================
 * CREATE GROUP
 * ========================================================== */

export async function createGroupOnChain(
  input: CreateGroupChainInput,
): Promise<CreateGroupChainResult> {
  /* ==========================================================
   * VALIDATE CURRENCY
   * ======================================================== */

  if (input.currency !== "SOL") {
    throw new Error(
      "The current on-chain program supports SOL groups only.",
    );
  }

  /* ==========================================================
   * VALIDATE GROUP NAME
   * ======================================================== */

  const name = input.name.trim();

  if (!name) {
    throw new Error("Group name is required.");
  }

  if (name.length > 64) {
    throw new Error(
      "Group name cannot be longer than 64 characters.",
    );
  }

  /* ==========================================================
   * VALIDATE DESCRIPTION
   * ======================================================== */

  const description =
    input.description.trim() ||
    "A collaborative funding pool.";

  if (description.length > 256) {
    throw new Error(
      "Group description cannot be longer than 256 characters.",
    );
  }

  /* ==========================================================
   * VALIDATE TARGET
   * ======================================================== */

  if (
    !Number.isFinite(input.requiredAmount) ||
    input.requiredAmount <= 0
  ) {
    throw new Error(
      "Required funding must be greater than zero.",
    );
  }

  /*
   * Convert SOL to lamports.
   *
   * 1 SOL = 1,000,000,000 lamports
   */
  const targetLamportsNumber = Math.round(
    input.requiredAmount * 1_000_000_000,
  );

  if (!Number.isSafeInteger(targetLamportsNumber)) {
    throw new Error(
      "Required funding amount is too large.",
    );
  }

  if (targetLamportsNumber <= 0) {
    throw new Error(
      "Required funding is too small. Enter a larger SOL amount.",
    );
  }

  const targetLamports = new BN(
    targetLamportsNumber,
  );

  /* ==========================================================
   * VALIDATE VOTING THRESHOLD
   * ======================================================== */

  if (
    !Number.isFinite(input.votingThreshold) ||
    input.votingThreshold < 1 ||
    input.votingThreshold > 100
  ) {
    throw new Error(
      "Voting threshold must be between 1 and 100.",
    );
  }

  /*
   * Convert percentage to basis points.
   *
   * 60% = 6000 BPS
   * 75% = 7500 BPS
   * 100% = 10000 BPS
   */
  const votingThresholdBps = Math.round(
    input.votingThreshold * 100,
  );

  /* ==========================================================
   * CONNECT WALLET + PROGRAM
   * ======================================================== */

  const {
    publicKey,
    program,
  } = await connectedProgram();

  /* ==========================================================
   * GENERATE RANDOM GROUP KEY
   *
   * Rust:
   *
   * ["group", creator, group_key]
   *
   * group_key = [u8; 16]
   * ======================================================== */

  const groupKey = crypto.getRandomValues(
    new Uint8Array(16),
  );

  /* ==========================================================
   * DERIVE GROUP PDA
   * ======================================================== */

  const [group] = deriveGroupPda(
    publicKey,
    groupKey,
  );

  /* ==========================================================
   * DERIVE TREASURY PDA
   *
   * Rust:
   *
   * ["treasury", group]
   * ======================================================== */

  const [treasury] = deriveTreasuryPda(
    group,
  );

  /* ==========================================================
   * DEADLINE
   * ======================================================== */

  let deadline = 0;

  if (input.deadline) {
    const parsedDate = new Date(
      input.deadline,
    );

    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error(
        "Invalid group deadline.",
      );
    }

    deadline = Math.floor(
      parsedDate.getTime() / 1000,
    );

    const now = Math.floor(
      Date.now() / 1000,
    );

    if (deadline <= now) {
      throw new Error(
        "Group deadline must be in the future.",
      );
    }
  }

  /* ==========================================================
   * VISIBILITY
   *
   * Rust:
   *
   * public  = 0
   * private = 1
   * ======================================================== */

  const visibility =
    input.visibility === "private"
      ? 1
      : 0;

  /* ==========================================================
   * DEBUG
   * ======================================================== */

  console.log("=================================");
  console.log("CREATE GROUP");
  console.log("=================================");
  console.log("Creator:", publicKey.toBase58());
  console.log("Name:", name);
  console.log("Description:", description);
  console.log(
    "Required SOL:",
    input.requiredAmount,
  );
  console.log(
    "Target lamports:",
    targetLamports.toString(),
  );
  console.log(
    "Visibility:",
    visibility,
  );
  console.log(
    "Voting threshold:",
    input.votingThreshold,
  );
  console.log(
    "Voting threshold BPS:",
    votingThresholdBps,
  );
  console.log(
    "Deadline:",
    deadline,
  );
  console.log(
    "Group PDA:",
    group.toBase58(),
  );
  console.log(
    "Treasury PDA:",
    treasury.toBase58(),
  );
  console.log("=================================");

  /* ==========================================================
   * INITIALIZE GROUP
   *
   * Rust:
   *
   * initialize_group(
   *     name,
   *     description,
   *     visibility,
   *     group_key,
   *     target_lamports,
   *     deadline,
   *     voting_threshold_bps,
   *     privacy_authority,
   * )
   * ======================================================== */

  try {
    const signature =
      await program.methods
        .initializeGroup(
          name,
          description,
          visibility,
          Array.from(groupKey),
          targetLamports,
          new BN(deadline),
          votingThresholdBps,
          publicKey,
        )
        .accounts({
          group,
          treasury,
          creator: publicKey,
          systemProgram:
            SystemProgram.programId,
        })
        .rpc({
          commitment: COMMITMENT,
        });

    /* ========================================================
     * SUCCESS
     * ====================================================== */

    console.log(
      "Group created successfully:",
      signature,
    );

    return {
      groupAddress:
        group.toBase58(),

      treasuryAddress:
        treasury.toBase58(),

      signature,

      groupKey,
    };
  } catch (error) {
    console.error(
      "Failed to create group:",
      error,
    );

    /*
     * Preserve the original Anchor error.
     * This makes the actual on-chain error visible
     * in the UI instead of hiding it.
     */
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "Failed to create group on Solana.",
    );
  }
}

/* ============================================================
 * CONTRIBUTE
 * ========================================================== */

export async function contributeOnChain(
  groupAddress: string,
  amount: number,
  currency: Currency,
): Promise<string> {

  if (currency !== "SOL") {
    throw new Error(
      "Only SOL contributions are enabled.",
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Contribution must be greater than zero.",
    );
  }

  const {
    publicKey,
    program,
  } = await connectedProgram();

  const group =
    new PublicKey(
      groupAddress,
    );

  const [treasury] =
    deriveTreasuryPda(group);

  const [member] =
    deriveMemberPda(
      group,
      publicKey,
    );

  const lamports =
    new BN(
      Math.round(
        amount *
          1_000_000_000,
      ),
    );

  return program.methods
    .contribute(lamports)
    .accounts({
      group,
      treasury,
      member,
      contributor: publicKey,
      systemProgram:
        SystemProgram.programId,
    })
    .rpc({
      commitment: COMMITMENT,
    });
}

/* ============================================================
 * CREATE PROPOSAL
 * ========================================================== */

export async function createProposalOnChain(
  input: {
    groupId: string;
    title: string;
    description: string;
    amount: number;
    currency: Currency;
    recipient: string;
    duration: number;
  },
): Promise<{
  signature: string;
  proposalAddress: string;
  proposalId: number;
}> {

  if (input.currency !== "SOL") {
    throw new Error(
      "Only SOL proposals are enabled.",
    );
  }

  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0
  ) {
    throw new Error(
      "Proposal amount must be greater than zero.",
    );
  }

  if (
    !Number.isFinite(input.duration) ||
    input.duration <= 0
  ) {
    throw new Error(
      "Proposal voting duration must be greater than zero.",
    );
  }

  const {
    publicKey,
    program,
  } = await connectedProgram();

  const group =
    new PublicKey(
      input.groupId,
    );

  /* ----------------------------------------------------------
   * FETCH GROUP
   * -------------------------------------------------------- */

  const groupAccount =
    await (
      program.account as any
    ).group.fetch(group);

  /* ----------------------------------------------------------
   * PROPOSAL INDEX
   * -------------------------------------------------------- */

  const proposalIndex =
    new BN(
      groupAccount.proposalCount,
    );

  /* ----------------------------------------------------------
   * PROPOSAL PDA
   *
   * ["proposal", group, index]
   * -------------------------------------------------------- */

  const [proposal] =
    deriveProposalPda(
      group,
      proposalIndex,
    );

  /* ----------------------------------------------------------
   * RECIPIENT
   * -------------------------------------------------------- */

  let recipient: PublicKey;

  try {
    recipient =
      new PublicKey(
        input.recipient,
      );
  } catch {
    throw new Error(
      "Invalid Solana recipient address.",
    );
  }

  /* ----------------------------------------------------------
   * VOTING DEADLINE
   *
   * duration = hours
   * -------------------------------------------------------- */

  const durationSeconds =
    Math.max(
      1,
      Math.floor(
        input.duration,
      ),
    ) * 3600;

  const votingDeadline =
    Math.floor(
      Date.now() / 1000,
    ) + durationSeconds;

  /* ----------------------------------------------------------
   * SOL -> LAMPORTS
   * -------------------------------------------------------- */

  const amountLamports =
    new BN(
      Math.round(
        input.amount *
          1_000_000_000,
      ),
    );

  /* ----------------------------------------------------------
   * CREATE PROPOSAL
   *
   * Anyone can create.
   * No member account required.
   * -------------------------------------------------------- */

  const signature =
    await program.methods
      .createProposal(
        input.title,
        input.description,
        amountLamports,
        recipient,
        new BN(
          votingDeadline,
        ),
      )
      .accounts({
        group,
        proposal,
        creator: publicKey,
        systemProgram:
          SystemProgram.programId,
      })
      .rpc({
        commitment: COMMITMENT,
      });

  return {
    signature,

    proposalAddress:
      proposal.toBase58(),

    proposalId:
      proposalIndex.toNumber(),
  };
}

/* ============================================================
 * PRIVATE VOTE
 * ========================================================== */

export async function voteOnProposalOnChain(
  input: {
    groupId: string;
    proposalAddress: string;
    vote: PrivateVote;
  },
): Promise<string> {

  const {
    publicKey,
    program,
  } = await connectedProgram();

  const group =
    new PublicKey(
      input.groupId,
    );

  const proposal =
    new PublicKey(
      input.proposalAddress,
    );

  /* ----------------------------------------------------------
   * VOTE VALUE
   *
   * YES     = 0
   * NO      = 1
   * ABSTAIN = 2
   * -------------------------------------------------------- */

  const voteValue =
    input.vote === "yes"
      ? 0
      : input.vote === "no"
        ? 1
        : 2;

  /* ----------------------------------------------------------
   * MEMBER PDA
   *
   * ["member", group, voter]
   * -------------------------------------------------------- */

  const [member] =
    deriveMemberPda(
      group,
      publicKey,
    );

  /* ----------------------------------------------------------
   * VOTE RECEIPT PDA
   *
   * ["vote", proposal, voter]
   *
   * NOTE:
   * This prevents double voting.
   * It does NOT provide true voter anonymity
   * on ordinary Solana.
   * -------------------------------------------------------- */

  const [voteReceipt] =
    deriveVoteReceiptPda(
      proposal,
      publicKey,
    );

  /* ----------------------------------------------------------
   * TREASURY
   * -------------------------------------------------------- */

  const [treasury] =
    deriveTreasuryPda(group);

  /* ----------------------------------------------------------
   * FETCH PROPOSAL
   * -------------------------------------------------------- */

  const proposalAccount =
    await (
      program.account as any
    ).proposal.fetch(
      proposal,
    );

  const recipient =
    new PublicKey(
      proposalAccount.recipient,
    );

  /* ----------------------------------------------------------
   * CAST VOTE
   * -------------------------------------------------------- */

  return program.methods
    .castPrivateVote(
      voteValue,
    )
    .accounts({
      group,
      proposal,
      member,
      voteReceipt,
      treasury,
      recipient,
      voter: publicKey,
      systemProgram:
        SystemProgram.programId,
    })
    .rpc({
      commitment: COMMITMENT,
    });
}

/* ============================================================
 * FETCH GROUP
 *
 * Wallet NOT required.
 * ========================================================== */

export async function fetchGroup(
  groupAddress: string,
): Promise<any> {

  const program =
    getProgram();

  const group =
    new PublicKey(
      groupAddress,
    );

  return (
    program.account as any
  ).group.fetch(group);
}

/* ============================================================
 * FETCH ALL GROUPS
 *
 * Wallet NOT required.
 * ========================================================== */

export async function fetchAllGroups(): Promise<any[]> {
  const program =
    getProgram();

  return (
    program.account as any
  ).group.all();
}

/* ============================================================
 * FETCH PROPOSAL
 *
 * Wallet NOT required.
 * ========================================================== */

export async function fetchProposal(
  proposalAddress: string,
): Promise<any> {

  const program =
    getProgram();

  const proposal =
    new PublicKey(
      proposalAddress,
    );

  return (
    program.account as any
  ).proposal.fetch(
    proposal,
  );
}

/* ============================================================
 * FETCH ALL PROPOSALS
 *
 * Wallet NOT required.
 * ========================================================== */

export async function fetchAllProposals(): Promise<any[]> {
  const program =
    getProgram();

  return (
    program.account as any
  ).proposal.all();
}

/* ============================================================
 * FETCH GROUP PROPOSALS
 * ========================================================== */

export async function fetchGroupProposals(
  groupAddress: string,
): Promise<any[]> {

  const program =
    getProgram();

  const group =
    new PublicKey(
      groupAddress,
    );

  return (
    program.account as any
  ).proposal.all([
    {
      memcmp: {
        offset: 8,
        bytes: group.toBase58(),
      },
    },
  ]);
}

/* ============================================================
 * TREASURY BALANCE
 * ========================================================== */

export async function getTreasuryBalance(
  groupAddress: string,
): Promise<number> {

  const connection =
    createConnection();

  const group =
    new PublicKey(
      groupAddress,
    );

  const [treasury] =
    deriveTreasuryPda(group);

  const lamports =
    await connection.getBalance(
      treasury,
      COMMITMENT,
    );

  return (
    lamports /
    1_000_000_000
  );
}

/* ============================================================
 * WALLET BALANCE
 * ========================================================== */

export async function getWalletBalance(
  walletAddress?: string,
): Promise<number> {

  const connection =
    createConnection();

  let publicKey: PublicKey;

  if (walletAddress) {
    publicKey =
      new PublicKey(
        walletAddress,
      );
  } else {
    publicKey =
      await getConnectedWallet();
  }

  const lamports =
    await connection.getBalance(
      publicKey,
      COMMITMENT,
    );

  return (
    lamports /
    1_000_000_000
  );
}

/* ============================================================
 * PDA HELPERS
 * ========================================================== */

/* ------------------------------------------------------------
 * GROUP PDA
 *
 * ["group", creator, groupKey]
 * ---------------------------------------------------------- */

export function deriveGroupPda(
  creator: PublicKey,
  groupKey: Uint8Array,
): [PublicKey, number] {

  return PublicKey.findProgramAddressSync(
    [
      GROUP_SEED,
      creator.toBuffer(),
      Buffer.from(groupKey),
    ],
    PROGRAM_ID,
  );
}

/* ------------------------------------------------------------
 * TREASURY PDA
 *
 * ["treasury", group]
 * ---------------------------------------------------------- */

export function deriveTreasuryPda(
  group: PublicKey,
): [PublicKey, number] {

  return PublicKey.findProgramAddressSync(
    [
      TREASURY_SEED,
      group.toBuffer(),
    ],
    PROGRAM_ID,
  );
}

/* ------------------------------------------------------------
 * MEMBER PDA
 *
 * ["member", group, member]
 * ---------------------------------------------------------- */

export function deriveMemberPda(
  group: PublicKey,
  member: PublicKey,
): [PublicKey, number] {

  return PublicKey.findProgramAddressSync(
    [
      MEMBER_SEED,
      group.toBuffer(),
      member.toBuffer(),
    ],
    PROGRAM_ID,
  );
}

/* ------------------------------------------------------------
 * PROPOSAL PDA
 *
 * ["proposal", group, proposalIndex]
 * ---------------------------------------------------------- */

export function deriveProposalPda(
  group: PublicKey,
  proposalIndex: BN,
): [PublicKey, number] {

  return PublicKey.findProgramAddressSync(
    [
      PROPOSAL_SEED,
      group.toBuffer(),
      proposalIndex.toArrayLike(
        Buffer,
        "le",
        8,
      ),
    ],
    PROGRAM_ID,
  );
}

/* ------------------------------------------------------------
 * VOTE RECEIPT PDA
 *
 * ["vote", proposal, voter]
 * ---------------------------------------------------------- */

export function deriveVoteReceiptPda(
  proposal: PublicKey,
  voter: PublicKey,
): [PublicKey, number] {

  return PublicKey.findProgramAddressSync(
    [
      VOTE_SEED,
      proposal.toBuffer(),
      voter.toBuffer(),
    ],
    PROGRAM_ID,
  );
}

/* ============================================================
 * CONNECT WALLET
 * ========================================================== */

export async function connectWallet(): Promise<BrowserWallet> {

  if (!window.solana) {
    throw new Error(
      "No Solana wallet found. Please install Phantom, Solflare, Backpack, or another Solana wallet.",
    );
  }

  try {
    const response =
      await window.solana.connect();

    if (!response?.publicKey) {
      throw new Error(
        "Wallet connection was cancelled.",
      );
    }

    return window.solana;

  } catch (error) {

    console.error(
      "Wallet connection error:",
      error,
    );

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "Failed to connect Solana wallet.",
    );
  }
}

/* ============================================================
 * GET CONNECTED WALLET
 * ========================================================== */

export async function getConnectedWallet(): Promise<PublicKey> {

  const wallet =
    window.solana;

  if (!wallet) {
    throw new Error(
      "No Solana wallet found.",
    );
  }

  if (!wallet.publicKey) {
    const {
      publicKey,
    } = await wallet.connect();

    return publicKey;
  }

  return wallet.publicKey;
}

/* ============================================================
 * CHECK GROUP EXISTS
 * ========================================================== */

export async function groupExists(
  groupAddress: string,
): Promise<boolean> {

  try {

    const connection =
      createConnection();

    const group =
      new PublicKey(
        groupAddress,
      );

    const account =
      await connection.getAccountInfo(
        group,
        COMMITMENT,
      );

    return account !== null;

  } catch {

    return false;
  }
}

/* ============================================================
 * CHECK PROPOSAL EXISTS
 * ========================================================== */

export async function proposalExists(
  proposalAddress: string,
): Promise<boolean> {

  try {

    const connection =
      createConnection();

    const proposal =
      new PublicKey(
        proposalAddress,
      );

    const account =
      await connection.getAccountInfo(
        proposal,
        COMMITMENT,
      );

    return account !== null;

  } catch {

    return false;
  }
}
