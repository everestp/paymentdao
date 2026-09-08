export type ProposalStatus = 'draft' | 'voting' | 'passed' | 'rejected' | 'executed' | 'expired';
export type VoteType = 'yes' | 'no' | 'abstain';
export type TxStatus = 'confirmed' | 'pending' | 'failed';
export type TxType = 'sent' | 'received' | 'contribution' | 'withdrawal' | 'swap';
export type PaymentStatus = 'completed' | 'pending' | 'approved' | 'rejected';
export type MemberRole = 'creator' | 'member';
export type MemberStatus = 'active' | 'inactive';
export type Currency = 'USDC' | 'SOL' | 'PAY';
export type GroupVisibility = 'public' | 'private';

export interface Member {
  id: string;
  name: string;
  username: string;
  email: string;
  role: MemberRole;
  votingPower: number;
  joined: string;
  status: MemberStatus;
  avatarColor: string;
  walletAddress: string;
}

export interface Contribution {
  id: string;
  groupId: string;
  amount: number;
  currency: Currency;
  createdAt: string;
  anonymousId: string;
}

export interface Proposal {
  id: number;
  groupId: string;
  title: string;
  description: string;
  amount: number;
  currency: Currency;
  recipient: string;
  status: ProposalStatus;
  votes: { yes: number; no: number; abstain: number };
  totalMembers: number;
  quorum: number;
  deadline: string;
  hoursLeft: number;
  userVote?: VoteType;
  createdAt: string;
}

export interface GroupData {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAvatarColor: string;
  requiredAmount: number;
  currentBalance: number;
  currency: Currency;
  deadline?: string;
  visibility: GroupVisibility;
  members: string[];
  memberCount: number;
  activeProposals: number;
  contributions: Contribution[];
  governance: 'democratic' | 'weighted' | 'council';
  votingThreshold: number;
  createdAt: string;
}

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
  block: number;
  signature: string;
}

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
}

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
  anonymous?: boolean;
}

export interface PaymentRequest {
  id: string;
  amount: number;
  currency: Currency;
  from: string;
  description: string;
  expiration: string;
  status: 'pending' | 'paid' | 'expired';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'proposal' | 'payment' | 'group' | 'member' | 'mention';
  read: boolean;
  timestamp: string;
  timeAgo: string;
}

export interface WalletAsset {
  symbol: Currency;
  name: string;
  balance: number;
  usdValue: number;
  change24h: number;
  color: string;
  sparkline: number[];
}

export interface LiveUpdate {
  id: string;
  message: string;
  timestamp: number;
}
