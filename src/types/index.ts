// ============================================================
// PAYDAO TYPES
// ============================================================

export type ProposalStatus =
  | 'voting'
  | 'passed'
  | 'rejected'
  | 'executed';

export type VoteType = 'yes' | 'no' | 'abstain';

export type Currency = 'SOL';

export type GroupVisibility = 'public' | 'private';

export type GovernanceType = 'democratic';

export type MemberRole = 'creator' | 'member';

export type MemberStatus = 'active' | 'inactive';

export type TxStatus =
  | 'confirmed'
  | 'pending'
  | 'failed';

export type TxType =
  | 'sent'
  | 'received'
  | 'contribution';

export type PaymentStatus =
  | 'completed'
  | 'pending'
  | 'approved'
  | 'rejected';


// ============================================================
// MEMBER
// ============================================================

export interface Member {
  id: string;

  // Wallet address
  walletAddress: string;

  // UI-only identity fields
  name: string;
  username?: string;
  email?: string;
  avatarColor: string;

  role: MemberRole;
  status: MemberStatus;

  votingPower: number;

  joined: string;
}


// ============================================================
// CONTRIBUTION
// ============================================================

export interface Contribution {
  id: string;

  groupId: string;

  // SOL amount
  amount: number;

  currency: Currency;

  // Wallet that contributed
  contributor?: string;

  /**
   * Public contribution.
   *
   * Unlike voting, contributions are intentionally
   * visible on-chain.
   */
  walletAddress: string;

  createdAt: string;

  /**
   * Optional UI identifier if you want to hide
   * the display identity while keeping the wallet
   * address available for transaction verification.
   */
  anonymousId?: string;

  signature?: string;
}


// ============================================================
// PROPOSAL
// ============================================================

export interface ProposalVotes {
  yes: number;
  no: number;
  abstain: number;
}

export interface Proposal {
  /**
   * On-chain proposal index.
   */
  id: number;

  groupId: string;

  title: string;

  description: string;

  // SOL amount requested
  amount: number;

  currency: Currency;

  // Destination wallet
  recipient: string;

  status: ProposalStatus;

  votes: ProposalVotes;

  /**
   * Number of members at the time/currently.
   */
  totalMembers: number;

  /**
   * Quorum percentage.
   * Example: 50 = 50%
   */
  quorum: number;

  /**
   * Voting threshold percentage.
   * Example: 60 = 60%
   */
  votingThreshold: number;

  deadline: string;

  hoursLeft: number;

  /**
   * Local UI state.
   *
   * The actual vote is private on the MagicBlock
   * private/TEE execution layer.
   */
  userVote?: VoteType;

  createdAt: string;

  /**
   * Wallet that created the proposal.
   *
   * Proposal creation is permissionless.
   */
  creator: string;

  /**
   * Whether the proposal payment has already
   * been automatically executed.
   */
  executed: boolean;

  /**
   * Transaction signature of automatic execution.
   */
  executionSignature?: string;

  /**
   * On-chain PDA address.
   */
  address?: string;
}


// ============================================================
// GROUP
// ============================================================

export interface GroupData {
  /**
   * Group PDA address.
   */
  id: string;

  name: string;

  description: string;

  /**
   * Wallet that created the group.
   */
  createdBy: string;

  createdAvatarColor: string;

  /**
   * Funding target in SOL.
   */
  requiredAmount: number;

  /**
   * Current treasury balance in SOL.
   */
  currentBalance: number;

  currency: Currency;

  deadline?: string;

  visibility: GroupVisibility;

  /**
   * Member wallet addresses.
   */
  members: string[];

  memberCount: number;

  /**
   * Number of proposals currently active.
   */
  activeProposals: number;

  contributions: Contribution[];

  governance: GovernanceType;

  /**
   * Proposal approval threshold.
   * Example: 60 = 60%.
   */
  votingThreshold: number;

  /**
   * Quorum requirement.
   * Example: 50 = 50%.
   */
  quorum: number;

  createdAt: string;

  /**
   * Treasury PDA.
   */
  treasuryAddress?: string;

  /**
   * Number of proposals created by this group.
   */
  proposalCount: number;

  /**
   * Amount already reserved by active proposals.
   *
   * This is important because the new program prevents
   * multiple proposals from spending the same treasury funds.
   */
  reservedAmount: number;

  /**
   * Whether group is currently active.
   */
  active: boolean;

  /**
   * MagicBlock delegation state.
   */
  delegated?: boolean;
}


// ============================================================
// TRANSACTION
// ============================================================

export interface Transaction {
  id: string;

  shortId: string;

  type: TxType;

  from: string;

  to: string;

  amount: number;

  currency: Currency;

  network: string;

  status: TxStatus;

  timestamp: string;

  fee: number;

  block?: number;

  signature: string;

  /**
   * Optional relation to a PayDAO group/proposal.
   */
  groupId?: string;

  proposalId?: number;
}


// ============================================================
// PAYMENT
// ============================================================

export interface Payment {
  id: string;

  date: string;

  type: TxType;

  person: string;

  amount: number;

  currency: Currency;

  status: PaymentStatus;

  txId: string;

  description?: string;

  groupId?: string;

  proposalId?: number;
}


// ============================================================
// ACTIVITY
// ============================================================

export interface ActivityEvent {
  id: string;

  user: string;

  userColor: string;

  action: string;

  detail: string;

  timestamp: string;

  timeAgo: string;

  status: PaymentStatus | 'info';

  icon: string;

  /**
   * Used when displaying an anonymized identity.
   */
  anonymous?: boolean;

  groupId?: string;

  proposalId?: number;

  transactionSignature?: string;
}


// ============================================================
// PAYMENT REQUEST
// ============================================================

export interface PaymentRequest {
  id: string;

  amount: number;

  currency: Currency;

  from: string;

  description: string;

  expiration: string;

  status:
    | 'pending'
    | 'paid'
    | 'expired';

  createdAt: string;

  txId?: string;
}


// ============================================================
// NOTIFICATIONS
// ============================================================

export interface AppNotification {
  id: string;

  title: string;

  message: string;

  type:
    | 'proposal'
    | 'payment'
    | 'group'
    | 'member'
    | 'mention';

  read: boolean;

  timestamp: string;

  timeAgo: string;

  groupId?: string;

  proposalId?: number;
}


// ============================================================
// WALLET
// ============================================================

export interface WalletAsset {
  symbol: Currency;

  name: string;

  /**
   * SOL balance.
   */
  balance: number;

  usdValue: number;

  change24h: number;

  color: string;

  sparkline: number[];
}


// ============================================================
// LIVE UPDATE
// ============================================================

export interface LiveUpdate {
  id: string;

  message: string;

  timestamp: number;

  groupId?: string;

  proposalId?: number;

  signature?: string;
}


// ============================================================
// WALLET USER
// ============================================================

export interface WalletUser {
  walletAddress: string;

  shortAddress: string;

  name: string;

  avatarColor: string;
}


// ============================================================
// ON-CHAIN GROUP STATE
// ============================================================

export interface OnChainGroup {
  address: string;

  creator: string;

  name: string;

  description: string;

  groupKey: string;

  targetLamports: number;

  currentLamports: number;

  reservedLamports: number;

  memberCount: number;

  proposalCount: number;

  quorumBps: number;

  votingThresholdBps: number;

  votingDeadline: number;

  privacyAuthority: string;

  active: boolean;
}


// ============================================================
// ON-CHAIN MEMBER STATE
// ============================================================

export interface OnChainMember {
  address: string;

  group: string;

  wallet: string;

  joinedAt: number;

  contributionLamports: number;

  voteCount: number;

  active: boolean;
}


// ============================================================
// ON-CHAIN PROPOSAL STATE
// ============================================================

export interface OnChainProposal {
  address: string;

  group: string;

  index: number;

  creator: string;

  title: string;

  description: string;

  amountLamports: number;

  recipient: string;

  createdAt: number;

  votingDeadline: number;

  yesVotes: number;

  noVotes: number;

  abstainVotes: number;

  status: ProposalStatus;

  executed: boolean;
}


// ============================================================
// PRIVATE VOTE STATE
// ============================================================

export interface PrivateVote {
  proposalId: number;

  vote: VoteType;

  /**
   * Local-only/UI value.
   *
   * Do NOT expose voter identity alongside this
   * when rendering the public proposal page.
   */
  submittedAt: string;

  signature?: string;
}


// ============================================================
// MAGICBLOCK STATE
// ============================================================

export type DelegationStatus =
  | 'not_delegated'
  | 'delegating'
  | 'delegated'
  | 'committing'
  | 'undelegating';

export interface MagicBlockState {
  groupAddress: string;

  status: DelegationStatus;

  delegatedAccounts: string[];

  validator?: string;

  lastCommitSignature?: string;

  lastCommitAt?: string;
}
