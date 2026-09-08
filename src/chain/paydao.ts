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
  "https://devnet.helius-rpc.com/?api-key=70641d42-a106-426c-8064-818bdc324253";

const COMMITMENT = "confirmed" as const;

const LAMPORTS_PER_SOL = 1_000_000_000;

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
}





export async function fetchGroupDetailOnChain(
  groupAddress: string,
): Promise<OnChainGroup> {
  /* ============================================================
   * VALIDATE ADDRESS
   * ========================================================== */

  if (!groupAddress?.trim()) {
    throw new Error("Group address is required.");
  }

  let groupPublicKey: PublicKey;

  try {
    groupPublicKey = new PublicKey(
      groupAddress.trim(),
    );
  } catch {
    throw new Error(
      `Invalid Solana group address: ${groupAddress}`,
    );
  }

  /* ============================================================
   * PROGRAM
   * ========================================================== */

  const program = getProgram();
  const connection =
    program.provider.connection;

  console.log("=================================");
  console.log("PAYDAO GROUP FETCH");
  console.log("RPC:", connection.rpcEndpoint);
  console.log(
    "Program:",
    PROGRAM_ID.toBase58(),
  );
  console.log(
    "Group:",
    groupPublicKey.toBase58(),
  );
  console.log("=================================");

  /* ============================================================
   * GET RAW ACCOUNT
   * ========================================================== */

  const accountInfo =
    await connection.getAccountInfo(
      groupPublicKey,
    );

  if (!accountInfo) {
    throw new Error(
      `Group account does not exist on this Solana network: ${groupPublicKey.toBase58()}`,
    );
  }

  console.log(
    "Account exists: YES",
  );

  console.log(
    "Account owner:",
    accountInfo.owner.toBase58(),
  );

  console.log(
    "Account data length:",
    accountInfo.data.length,
  );

  /* ============================================================
   * VERIFY OWNER
   * ========================================================== */

  if (
    !accountInfo.owner.equals(
      PROGRAM_ID,
    )
  ) {
    throw new Error(
      `Invalid group owner. Expected ${PROGRAM_ID.toBase58()}, got ${accountInfo.owner.toBase58()}`,
    );
  }

  /* ============================================================
   * VERIFY GROUP DISCRIMINATOR
   *
   * IDL:
   *
   * Group discriminator:
   * [209,249,208,63,182,89,186,254]
   * ========================================================== */

  const expectedDiscriminator =
    Uint8Array.from([
      209,
      249,
      208,
      63,
      182,
      89,
      186,
      254,
    ]);

  const actualDiscriminator =
    accountInfo.data.slice(
      0,
      8,
    );

  console.log(
    "Expected discriminator:",
    Array.from(
      expectedDiscriminator,
    ),
  );

  console.log(
    "Actual discriminator:",
    Array.from(
      actualDiscriminator,
    ),
  );

  const discriminatorMatches =
    expectedDiscriminator.every(
      (value, index) =>
        value ===
        actualDiscriminator[index],
    );

  console.log(
    "Discriminator matches:",
    discriminatorMatches,
  );

  if (!discriminatorMatches) {
    throw new Error(
      "The account exists and belongs to PayDAO, but it is NOT a Group account according to the current IDL. Your deployed account and IDL/program version do not match.",
    );
  }

  /* ============================================================
   * FETCH WITH ANCHOR
   * ========================================================== */

  let data: any;

  try {
    const groupAccount =
      (program.account as any).group;

    if (!groupAccount) {
      throw new Error(
        `Anchor does not expose "group". Available accounts: ${Object.keys(
          program.account,
        ).join(", ")}`,
      );
    }

    data =
      await groupAccount.fetch(
        groupPublicKey,
      );

    console.log(
      "Anchor Group account:",
      data,
    );
  } catch (error: any) {
    console.error(
      "Anchor Group fetch failed:",
      error,
    );

    throw new Error(
      `Failed to decode Group account: ${
        error?.message ??
        String(error)
      }`,
    );
  }

  /* ============================================================
   * VALUES
   * ========================================================== */

  const targetLamports =
    toStringValue(
      data.targetLamports ??
        data.target_lamports ??
        0,
    );

  const raisedLamports =
    toStringValue(
      data.currentLamports ??
        data.current_lamports ??
        0,
    );

  const reservedLamports =
    toStringValue(
      data.reservedLamports ??
        data.reserved_lamports ??
        0,
    );

  const votingThresholdBps =
    toNumber(
      data.votingThresholdBps ??
        data.voting_threshold_bps ??
        0,
    );

  const quorumBps =
    toNumber(
      data.quorumBps ??
        data.quorum_bps ??
        0,
    );

  const visibility =
    toNumber(
      data.visibility,
    ) === 1
      ? "private"
      : "public";

  /* ============================================================
   * GROUP KEY
   * ========================================================== */

  let groupKey:
    | string
    | undefined;

  const rawGroupKey =
    data.groupKey ??
    data.group_key;

  if (rawGroupKey) {
    const bytes =
      Array.from(
        rawGroupKey as Uint8Array,
      );

    groupKey =
      bytes
        .map(
          (byte: number) =>
            byte
              .toString(16)
              .padStart(2, "0"),
        )
        .join("");
  }

  /* ============================================================
   * TREASURY
   * ========================================================== */

  const [treasury] =
    deriveTreasuryPda(
      groupPublicKey,
    );

  /* ============================================================
   * PROPOSALS
   * ========================================================== */

  const proposals =
    await fetchGroupProposals(
      groupPublicKey.toBase58(),
    );

  /* ============================================================
   * RETURN
   * ========================================================== */

  return {
    address:
      groupPublicKey.toBase58(),

    treasuryAddress:
      treasury.toBase58(),

    name:
      String(
        data.name ?? "",
      ),

    description:
      String(
        data.description ?? "",
      ),

    creator:
      getPublicKeyString(
        data.creator,
      ),

    targetLamports,

    targetSol:
      lamportsToSol(
        targetLamports,
      ),

    raisedLamports,

    raisedSol:
      lamportsToSol(
        raisedLamports,
      ),

    reservedLamports,

    reservedSol:
      lamportsToSol(
        reservedLamports,
      ),

 deadline: toStringValue(data.deadline),

    votingThresholdBps,

    votingThreshold:
      votingThresholdBps / 100,

    quorumBps,

    quorum:
      quorumBps / 100,

    visibility,

    groupKey,

    memberCount:
      toNumber(
        data.memberCount ??
          data.member_count ??
          0,
      ),

    proposalCount:
      toNumber(
        data.proposalCount ??
          data.proposal_count ??
          0,
      ),

    active:
      Boolean(
        data.active,
      ),

realtimeNonce: toStringValue(
  data.realtimeNonce ??
    data.realtime_nonce ??
    0,
),

    proposals,
  };
}






/* ============================================================
 * PRIVATE VOTE
 * ========================================================== */

export type PrivateVote =
  | "yes"
  | "no"
  | "abstain";

/* ============================================================
 * ON-CHAIN PROPOSAL
 * ========================================================== */

export interface OnChainProposal {
  address: string;

  id?: number | string;

  title?: string;
  description?: string;

  amount?: number;
  amountLamports?: string;

  proposer?: string;
  recipient?: string;

  yesVotes?: number;
  noVotes?: number;
  abstainVotes?: number;
  voterCount?: number;

  status?: string;

  createdAt?: number;
  deadline?: number;

  executed?: boolean;
}

/* ============================================================
 * ON-CHAIN GROUP
 * ========================================================== */

export interface OnChainGroup {
  address: string;
  treasuryAddress: string;

  name: string;
  description: string;
  creator: string;

  targetLamports: string;
  targetSol: number;

  raisedLamports: string;
  raisedSol: number;

  reservedLamports: string;
  reservedSol: number;

  deadline: string;

  votingThresholdBps: number;
  votingThreshold: number;

  quorumBps: number;
  quorum: number;

  visibility: "public" | "private";

  groupKey?: string;

  memberCount: number;
  proposalCount: number;

  active: boolean;

  realtimeNonce: string;

  proposals: OnChainProposal[];
}

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
    connect: injected.connect,
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
 * ========================================================== */

export function getProgram(): Program {
  const connection =
    createConnection();

  const readOnlyWallet = {
    publicKey: PublicKey.default,

    signTransaction: async (
      _transaction: Transaction,
    ) => {
      throw new Error(
        "Read-only wallet cannot sign transactions.",
      );
    },

    signAllTransactions: async (
      _transactions: Transaction[],
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
  /* ----------------------------------------------------------
   * CURRENCY
   * -------------------------------------------------------- */

  if (input.currency !== "SOL") {
    throw new Error(
      "The current on-chain program supports SOL groups only.",
    );
  }

  /* ----------------------------------------------------------
   * NAME
   * -------------------------------------------------------- */

  const name =
    input.name.trim();

  if (!name) {
    throw new Error(
      "Group name is required.",
    );
  }

  if (name.length > 64) {
    throw new Error(
      "Group name cannot be longer than 64 characters.",
    );
  }

  /* ----------------------------------------------------------
   * DESCRIPTION
   * -------------------------------------------------------- */

  const description =
    input.description.trim() ||
    "A collaborative funding pool.";

  /*
   * Rust allows 512 bytes.
   */
  if (description.length > 512) {
    throw new Error(
      "Group description cannot be longer than 512 characters.",
    );
  }

  /* ----------------------------------------------------------
   * TARGET
   * -------------------------------------------------------- */

  if (
    !Number.isFinite(
      input.requiredAmount,
    ) ||
    input.requiredAmount <= 0
  ) {
    throw new Error(
      "Required funding must be greater than zero.",
    );
  }

  const targetLamportsNumber =
    Math.round(
      input.requiredAmount *
        LAMPORTS_PER_SOL,
    );

  if (
    !Number.isSafeInteger(
      targetLamportsNumber,
    )
  ) {
    throw new Error(
      "Required funding amount is too large.",
    );
  }

  if (targetLamportsNumber <= 0) {
    throw new Error(
      "Required funding is too small. Enter a larger SOL amount.",
    );
  }

  const targetLamports =
    new BN(
      targetLamportsNumber,
    );

  /* ----------------------------------------------------------
   * VOTING THRESHOLD
   *
   * Rust:
   *
   * 1..=10000 BPS
   *
   * UI:
   *
   * 1..=100 %
   * -------------------------------------------------------- */

  if (
    !Number.isFinite(
      input.votingThreshold,
    ) ||
    input.votingThreshold < 1 ||
    input.votingThreshold > 100
  ) {
    throw new Error(
      "Voting threshold must be between 1 and 100.",
    );
  }

  const votingThresholdBps =
    Math.round(
      input.votingThreshold * 100,
    );

  /* ----------------------------------------------------------
   * WALLET
   * -------------------------------------------------------- */

  const {
    publicKey,
    program,
  } = await connectedProgram();

  /* ----------------------------------------------------------
   * GROUP KEY
   *
   * Rust:
   *
   * [u8; 16]
   * -------------------------------------------------------- */

  const groupKey =
    crypto.getRandomValues(
      new Uint8Array(16),
    );

  /* ----------------------------------------------------------
   * GROUP PDA
   *
   * ["group", creator, group_key]
   * -------------------------------------------------------- */

  const [group] =
    deriveGroupPda(
      publicKey,
      groupKey,
    );

  /* ----------------------------------------------------------
   * TREASURY PDA
   *
   * ["treasury", group]
   * -------------------------------------------------------- */

  const [treasury] =
    deriveTreasuryPda(
      group,
    );

  /* ----------------------------------------------------------
   * DEADLINE
   * -------------------------------------------------------- */

  let deadline = 0;

  if (input.deadline) {
    const parsedDate =
      new Date(
        input.deadline,
      );

    if (
      Number.isNaN(
        parsedDate.getTime(),
      )
    ) {
      throw new Error(
        "Invalid group deadline.",
      );
    }

    deadline =
      Math.floor(
        parsedDate.getTime() / 1000,
      );

    const now =
      Math.floor(
        Date.now() / 1000,
      );

    if (deadline <= now) {
      throw new Error(
        "Group deadline must be in the future.",
      );
    }
  }

  /* ----------------------------------------------------------
   * VISIBILITY
   *
   * Rust:
   *
   * public  = 0
   * private = 1
   * -------------------------------------------------------- */

  const visibility =
    input.visibility === "private"
      ? 1
      : 0;

  /* ----------------------------------------------------------
   * DEBUG
   * -------------------------------------------------------- */

  console.log(
    "=================================",
  );

  console.log(
    "CREATE GROUP",
  );

  console.log(
    "Creator:",
    publicKey.toBase58(),
  );

  console.log(
    "Name:",
    name,
  );

  console.log(
    "Description:",
    description,
  );

  console.log(
    "Target SOL:",
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

  console.log(
    "=================================",
  );

  /* ----------------------------------------------------------
   * INITIALIZE
   * -------------------------------------------------------- */

  try {
    const signature =
      await program.methods
        .initializeGroup(
          name,
          description,
          visibility,
          Array.from(
            groupKey,
          ),
          targetLamports,
          new BN(
            deadline,
          ),
          votingThresholdBps,
          publicKey,
        )
        .accounts({
          group,
          treasury,
          creator:
            publicKey,
          systemProgram:
            SystemProgram.programId,
        })
        .rpc({
          commitment:
            COMMITMENT,
        });

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
  // if (currency !== "SOL") {
  //   throw new Error(
  //     "Only SOL contributions are enabled.",
  //   );
  // }

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
  } =
    await connectedProgram();

  let group: PublicKey;

  try {
    group =
      new PublicKey(
        groupAddress,
      );
  } catch {
    throw new Error(
      "Invalid Solana group address.",
    );
  }

  const [treasury] =
    deriveTreasuryPda(
      group,
    );

  const [member] =
    deriveMemberPda(
      group,
      publicKey,
    );

  const lamportsNumber =
    Math.round(
      amount *
        LAMPORTS_PER_SOL,
    );

  if (
    !Number.isSafeInteger(
      lamportsNumber,
    ) ||
    lamportsNumber <= 0
  ) {
    throw new Error(
      "Invalid contribution amount.",
    );
  }

  const lamports =
    new BN(
      lamportsNumber,
    );

  return program.methods
    .contribute(
      lamports,
    )
    .accounts({
      group,
      treasury,
      member,
      contributor:
        publicKey,
      systemProgram:
        SystemProgram.programId,
    })
    .rpc({
      commitment:
        COMMITMENT,
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

  const title =
    input.title.trim();

  if (!title) {
    throw new Error(
      "Proposal title is required.",
    );
  }

  if (title.length > 64) {
    throw new Error(
      "Proposal title cannot be longer than 64 characters.",
    );
  }

  const description =
    input.description.trim();

  if (description.length > 512) {
    throw new Error(
      "Proposal description cannot be longer than 512 characters.",
    );
  }

  if (
    !Number.isFinite(
      input.amount,
    ) ||
    input.amount <= 0
  ) {
    throw new Error(
      "Proposal amount must be greater than zero.",
    );
  }

  if (
    !Number.isFinite(
      input.duration,
    ) ||
    input.duration <= 0
  ) {
    throw new Error(
      "Proposal voting duration must be greater than zero.",
    );
  }

  const {
    publicKey,
    program,
  } =
    await connectedProgram();

  /* ----------------------------------------------------------
   * GROUP
   * -------------------------------------------------------- */

  let group: PublicKey;

  try {
    group =
      new PublicKey(
        input.groupId,
      );
  } catch {
    throw new Error(
      "Invalid Solana group address.",
    );
  }

  /* ----------------------------------------------------------
   * FETCH GROUP
   * -------------------------------------------------------- */

  const groupAccount =
    await (
      program.account as any
    ).group.fetch(
      group,
    );

  /* ----------------------------------------------------------
   * PROPOSAL INDEX
   * -------------------------------------------------------- */

  const proposalIndex =
    new BN(
      groupAccount.proposalCount ??
        groupAccount.proposal_count ??
        0,
    );

  /* ----------------------------------------------------------
   * PROPOSAL PDA
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

  if (
    recipient.equals(
      PublicKey.default,
    )
  ) {
    throw new Error(
      "Invalid recipient address.",
    );
  }

  /* ----------------------------------------------------------
   * DURATION
   *
   * input.duration = hours
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
   * AMOUNT
   * -------------------------------------------------------- */

  const amountLamportsNumber =
    Math.round(
      input.amount *
        LAMPORTS_PER_SOL,
    );

  if (
    !Number.isSafeInteger(
      amountLamportsNumber,
    ) ||
    amountLamportsNumber <= 0
  ) {
    throw new Error(
      "Invalid proposal amount.",
    );
  }

  const amountLamports =
    new BN(
      amountLamportsNumber,
    );

  /* ----------------------------------------------------------
   * CREATE PROPOSAL
   * -------------------------------------------------------- */

  const signature =
    await program.methods
      .createProposal(
        title,
        description,
        amountLamports,
        recipient,
        new BN(
          votingDeadline,
        ),
      )
      .accounts({
        group,
        proposal,
        creator:
          publicKey,
        systemProgram:
          SystemProgram.programId,
      })
      .rpc({
        commitment:
          COMMITMENT,
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
  } =
    await connectedProgram();

  let group: PublicKey;

  let proposal: PublicKey;

  try {
    group =
      new PublicKey(
        input.groupId,
      );

    proposal =
      new PublicKey(
        input.proposalAddress,
      );
  } catch {
    throw new Error(
      "Invalid group or proposal address.",
    );
  }

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
   * -------------------------------------------------------- */

  const [member] =
    deriveMemberPda(
      group,
      publicKey,
    );

  /* ----------------------------------------------------------
   * VOTE RECEIPT PDA
   * -------------------------------------------------------- */

  const [voteReceipt] =
    deriveVoteReceiptPda(
      proposal,
      publicKey,
    );

  /* ----------------------------------------------------------
   * TREASURY PDA
   * -------------------------------------------------------- */

  const [treasury] =
    deriveTreasuryPda(
      group,
    );

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
      voter:
        publicKey,
      systemProgram:
        SystemProgram.programId,
    })
    .rpc({
      commitment:
        COMMITMENT,
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

  let group: PublicKey;

  try {
    group =
      new PublicKey(
        groupAddress,
      );
  } catch {
    throw new Error(
      "Invalid Solana group address.",
    );
  }

  return (
    program.account as any
  ).group.fetch(
    group,
  );
}

/* ============================================================
 * FETCH GROUP DETAIL
 *
 * Includes:
 *
 * - Group
 * - Treasury PDA
 * - Proposals
 *
 * Wallet NOT required.
 * ========================================================== */





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

  let proposal: PublicKey;

  try {
    proposal =
      new PublicKey(
        proposalAddress,
      );
  } catch {
    throw new Error(
      "Invalid Solana proposal address.",
    );
  }

  return (
    program.account as any
  ).proposal.fetch(
    proposal,
  );
}

/* ============================================================
 * FETCH ALL PROPOSALS
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
): Promise<OnChainProposal[]> {
  const program =
    getProgram();

  let group: PublicKey;

  try {
    group =
      new PublicKey(
        groupAddress,
      );
  } catch {
    throw new Error(
      "Invalid Solana group address.",
    );
  }

  const results =
    await (
      program.account as any
    ).proposal.all([
      {
        memcmp: {
          /*
           * Anchor account discriminator
           * occupies first 8 bytes.
           *
           * Proposal.group is the first
           * field after discriminator.
           */
          offset: 8,
          bytes:
            group.toBase58(),
        },
      },
    ]);

  return results.map(
    (item: any) =>
      mapProposal(
        item.publicKey,
        item.account,
      ),
  );
}

/* ============================================================
 * TREASURY BALANCE
 * ========================================================== */

export async function getTreasuryBalance(
  groupAddress: string,
): Promise<number> {
  const connection =
    createConnection();

  let group: PublicKey;

  try {
    group =
      new PublicKey(
        groupAddress,
      );
  } catch {
    throw new Error(
      "Invalid Solana group address.",
    );
  }

  const [treasury] =
    deriveTreasuryPda(
      group,
    );

  const lamports =
    await connection.getBalance(
      treasury,
      COMMITMENT,
    );

  return (
    lamports /
    LAMPORTS_PER_SOL
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
    try {
      publicKey =
        new PublicKey(
          walletAddress,
        );
    } catch {
      throw new Error(
        "Invalid Solana wallet address.",
      );
    }
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
    LAMPORTS_PER_SOL
  );
}

/* ============================================================
 * PDA HELPERS
 * ========================================================== */

/* ------------------------------------------------------------
 * GROUP PDA
 *
 * Rust:
 *
 * ["group", creator, group_key]
 * ---------------------------------------------------------- */

export function deriveGroupPda(
  creator: PublicKey,
  groupKey: Uint8Array,
): [PublicKey, number] {
  if (groupKey.length !== 16) {
    throw new Error(
      "Group key must contain exactly 16 bytes.",
    );
  }

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
 * Rust:
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
 * Rust:
 *
 * ["member", group, contributor]
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
 * Rust:
 *
 * ["proposal", group, proposal_count]
 *
 * proposal_count = u64 LE
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
 * Rust:
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
    } =
      await wallet.connect();

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

/* ============================================================
 * INTERNAL HELPERS
 * ========================================================== */

/* ------------------------------------------------------------
 * TO NUMBER
 * ---------------------------------------------------------- */

function toNumber(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error(
        `Value is outside JavaScript safe integer range: ${value}`,
      );
    }

    return value;
  }

  if (typeof value === "bigint") {
    const num = Number(value);

    if (!Number.isSafeInteger(num)) {
      throw new Error(
        "Value exceeds JavaScript safe integer range.",
      );
    }

    return num;
  }

  // Anchor BN
  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value
  ) {
    const stringValue = String(
      (value as { toString: () => string }).toString(),
    );

    const num = Number(stringValue);

    if (!Number.isSafeInteger(num)) {
      throw new Error(
        `Value exceeds JavaScript safe integer range: ${stringValue}`,
      );
    }

    return num;
  }

  const num = Number(value);

  if (!Number.isSafeInteger(num)) {
    throw new Error(
      `Invalid or unsafe numeric value: ${String(value)}`,
    );
  }

  return num;
}

/* ------------------------------------------------------------
 * TO STRING
 * ---------------------------------------------------------- */

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

/* ------------------------------------------------------------
 * LAMPORTS -> SOL
 * ---------------------------------------------------------- */

function lamportsToSol(
  lamports: string,
): number {
  return (
    Number(lamports) /
    LAMPORTS_PER_SOL
  );
}

/* ------------------------------------------------------------
 * PUBLIC KEY -> STRING
 * ---------------------------------------------------------- */

function getPublicKeyString(
  value: unknown,
): string {
  if (
    value instanceof PublicKey
  ) {
    return value.toBase58();
  }

  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value);
}

/* ------------------------------------------------------------
 * PROPOSAL STATUS
 *
 * Rust:
 *
 * Voting   = 0
 * Passed   = 1
 * Rejected = 2
 * Executed = 3
 * ---------------------------------------------------------- */

function getProposalStatus(
  value: unknown,
): string {
  const status =
    toNumber(value);

  switch (status) {
    case 0:
      return "Voting";

    case 1:
      return "Passed";

    case 2:
      return "Rejected";

    case 3:
      return "Executed";

    default:
      return "Unknown";
  }
}

/* ------------------------------------------------------------
 * GROUP KEY -> HEX
 * ---------------------------------------------------------- */

function groupKeyToHex(
  value: unknown,
): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return Array.from(
      value as Uint8Array,
    )
      .map(
        (byte: number) =>
          byte
            .toString(16)
            .padStart(
              2,
              "0",
            ),
      )
      .join("");
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------
 * MAP PROPOSAL
 * ---------------------------------------------------------- */

function mapProposal(
  publicKey: PublicKey,
  data: any,
): OnChainProposal {
  const amountLamports =
    toStringValue(
      data.amountLamports ??
        data.amount_lamports ??
        0,
    );

  const statusNumber =
    toNumber(
      data.status,
    );

  return {
    address:
      publicKey.toBase58(),

    id:
      data.id !== undefined
        ? toNumber(data.id)
        : undefined,

    title:
      String(
        data.title ?? "",
      ),

    description:
      String(
        data.description ?? "",
      ),

    amountLamports,

    amount:
      lamportsToSol(
        amountLamports,
      ),

    proposer:
      getPublicKeyString(
        data.creator,
      ),

    recipient:
      getPublicKeyString(
        data.recipient,
      ),

    yesVotes:
      toNumber(
        data.yes,
      ),

    noVotes:
      toNumber(
        data.no,
      ),

    abstainVotes:
      toNumber(
        data.abstain,
      ),

    voterCount:
      toNumber(
        data.voterCount ??
          data.voter_count ??
          0,
      ),

    status:
      getProposalStatus(
        statusNumber,
      ),

    deadline:
      toNumber(
        data.votingDeadline ??
          data.voting_deadline ??
          0,
      ),

    executed:
      statusNumber === 3,
  };
}


/* ============================================================
 * FETCH GROUP MEMBERS
 * ========================================================== */

export interface OnChainMember {
  address: string;
  group: string;
  contributor: string;
  amountLamports: string;
  amountSol: number;
  joinedAt: string;
  raw: unknown;
}

export async function fetchGroupMembersOnChain(
  groupAddress: string,
): Promise<OnChainMember[]> {
  const group = new PublicKey(groupAddress);
  const program = getProgram();

  const memberAccount = (program.account as any).member;

  if (!memberAccount) {
    console.warn(
      'Anchor does not expose "member" account.',
    );

    return [];
  }

  const accounts = await memberAccount.all();

  const result: OnChainMember[] = [];

  for (const item of accounts) {
    const data = item.account as any;

    const memberGroup =
      data.group ??
      data.groupAddress ??
      data.group_address;

    if (!memberGroup) continue;

    const memberGroupAddress =
      getPublicKeyString(memberGroup);

    if (
      memberGroupAddress !==
      group.toBase58()
    ) {
      continue;
    }

    const contributor =
      getPublicKeyString(
        data.contributor ??
          data.member ??
          data.owner,
      );

    const amountLamports =
      toStringValue(
        data.amountContributed ??
          data.amount_contributed ??
          data.contributedLamports ??
          data.contributed_lamports ??
          data.amount ??
          0,
      );

    const joinedAt =
      toStringValue(
        data.joinedAt ??
          data.joined_at ??
          0,
      );

    result.push({
      address:
        item.publicKey.toBase58(),

      group:
        memberGroupAddress,

      contributor,

      amountLamports,

      amountSol:
        lamportsToSol(
          amountLamports,
        ),

      joinedAt,

      raw: data,
    });
  }

  return result;
}
