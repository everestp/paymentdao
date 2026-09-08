import type {
  Member, Proposal, Transaction, Payment, ActivityEvent,
  PaymentRequest, AppNotification, GroupData, WalletAsset, Contribution, Currency,
} from '@/types';

const NAMES = [
  'Everest Paudel', 'Sarah Chen', 'Alex Morgan', 'Daniel Kim', 'Maya Patel',
  'Noah Williams', 'Sofia Garcia', 'Liam Johnson', 'Emma Wilson', 'Oliver Brown',
  'Ava Davis', 'Ethan Miller', 'Mia Anderson', 'Lucas Martinez', 'Charlotte Lee',
  'Henry Taylor', 'Amelia White', 'James Harris', 'Evelyn Clark', 'Benjamin Lewis',
  'Harper Robinson', 'Mason Walker', 'Ella Young', 'Logan Hall', 'Grace Allen',
  'Jacob King', 'Chloe Wright', 'Lily Scott', 'Jackson Green', 'Zoe Adams',
  'Aiden Baker', 'Nora Nelson', 'Carter Hill', 'Hazel Mitchell', 'Owen Perez',
  'Aria Roberts', 'Wyatt Turner', 'Layla Phillips', 'Jack Campbell', 'Scarlett Parker',
  'Levi Evans', 'Ruby Edwards',
];

const USERNAMES = NAMES.map((n, i) => n.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || `user${i}`);

const COLORS = ['#00d4e6', '#00e676', '#ff2e9a', '#ffd600', '#ff8c00', '#4d7cff', '#b14dff', '#ff3860'];

const WALLET_ADDRESSES = ['7xK9...92Lm', '8Qr2...A91P', '4Jd7...P91K', '5Yk8...Q2P', '9Hx2...Lm81', '3Rt6...N42W', '6Bn4...K18Z', '2Wp8...M73X'];

function randomTxId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function makeMembers(): Member[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  return NAMES.map((name, i) => ({
    id: `m-${i}`,
    name,
    username: `@${USERNAMES[i]}`,
    email: `${USERNAMES[i]}@paydao.app`,
    role: i === 0 ? 'creator' : 'member',
    votingPower: Math.random() * 5 + 0.5,
    joined: `${months[i % months.length]} 2026`,
    status: i < 38 ? 'active' : 'inactive',
    avatarColor: COLORS[i % COLORS.length],
    walletAddress: WALLET_ADDRESSES[i % WALLET_ADDRESSES.length],
  }));
}

function makeContributions(groupId: string, count: number, baseAmount: number): Contribution[] {
  const contributions: Contribution[] = [];
  const days = ['Sep 7', 'Sep 6', 'Sep 5', 'Sep 4', 'Sep 3', 'Sep 2', 'Sep 1', 'Aug 30', 'Aug 28', 'Aug 25'];
  for (let i = 0; i < count; i++) {
    contributions.push({
      id: `c-${groupId}-${i}`,
      groupId,
      amount: Math.floor(baseAmount / count * (0.5 + Math.random())),
      currency: 'USDC',
      createdAt: days[i % days.length],
      anonymousId: `Contributor #${Math.floor(Math.random() * 900) + 100}`,
    });
  }
  return contributions;
}

function makeGroups(): GroupData[] {
  const groups: Omit<GroupData, 'contributions'>[] = [
    { id: 'g1', name: 'Build Our Community DAO', description: 'Funding the initial development and launch of a community-governed DAO platform on Solana.', createdBy: 'Everest Paudel', createdAvatarColor: '#ffd600', requiredAmount: 10000, currentBalance: 6250, currency: 'USDC', deadline: 'Oct 15, 2026', visibility: 'public', members: NAMES.slice(0, 24).map((_, i) => `m-${i}`), memberCount: 24, activeProposals: 3, governance: 'democratic', votingThreshold: 60, createdAt: 'Jan 2026' },
    { id: 'g2', name: 'Open Source Dev Guild', description: 'A collaborative fund for sponsoring open-source contributors and maintaining critical infrastructure.', createdBy: 'Sarah Chen', createdAvatarColor: '#00d4e6', requiredAmount: 25000, currentBalance: 18420, currency: 'USDC', deadline: 'Nov 1, 2026', visibility: 'public', members: NAMES.slice(0, 18).map((_, i) => `m-${i}`), memberCount: 18, activeProposals: 2, governance: 'weighted', votingThreshold: 66, createdAt: 'Feb 2026' },
    { id: 'g3', name: 'Hackathon Prize Pool', description: 'Community-funded prize pool for the upcoming Solana Breakpoint hackathon.', createdBy: 'Alex Morgan', createdAvatarColor: '#00e676', requiredAmount: 5000, currentBalance: 2340, currency: 'USDC', deadline: 'Sep 30, 2026', visibility: 'public', members: NAMES.slice(0, 6).map((_, i) => `m-${i}`), memberCount: 6, activeProposals: 1, governance: 'democratic', votingThreshold: 50, createdAt: 'Mar 2026' },
    { id: 'g4', name: 'DeFi Education Fund', description: 'Funding educational content, workshops, and resources to onboard the next million users to DeFi.', createdBy: 'Maya Patel', createdAvatarColor: '#ff2e9a', requiredAmount: 15000, currentBalance: 4200, currency: 'USDC', visibility: 'public', members: NAMES.slice(0, 12).map((_, i) => `m-${i}`), memberCount: 12, activeProposals: 2, governance: 'democratic', votingThreshold: 50, createdAt: 'Apr 2026' },
    { id: 'g5', name: 'Protocol Security Audit', description: 'Crowdfunding a professional security audit for our community smart contracts before mainnet deployment.', createdBy: 'Daniel Kim', createdAvatarColor: '#4d7cff', requiredAmount: 20000, currentBalance: 15600, currency: 'USDC', deadline: 'Oct 30, 2026', visibility: 'public', members: NAMES.slice(0, 9).map((_, i) => `m-${i}`), memberCount: 9, activeProposals: 1, governance: 'council', votingThreshold: 75, createdAt: 'May 2026' },
  ];

  return groups.map(g => ({
    ...g,
    contributions: makeContributions(g.id, Math.floor(g.currentBalance / 500) + 2, g.currentBalance),
  }));
}

function makeProposals(): Proposal[] {
  const proposalsData: Omit<Proposal, 'id' | 'groupId' | 'status' | 'votes' | 'totalMembers' | 'quorum' | 'deadline' | 'hoursLeft' | 'userVote' | 'createdAt'>[] = [
    { title: 'Purchase development servers', description: 'Acquire dedicated development servers to support the DAO platform infrastructure. This will improve build times and enable CI/CD pipelines for the community.', amount: 2000, currency: 'USDC', recipient: 'Infrastructure Provider' },
    { title: 'Community marketing campaign', description: 'Launch a targeted marketing campaign to grow our community. Budget covers social media promotion, content creation, and community events over 3 months.', amount: 1500, currency: 'USDC', recipient: 'Marketing Team' },
    { title: 'Fund documentation overhaul', description: 'Comprehensive rewrite of all developer and user documentation. Includes tutorials, API reference, and integration guides.', amount: 800, currency: 'USDC', recipient: 'Documentation Team' },
    { title: 'Upgrade monitoring infrastructure', description: 'Upgrade our monitoring and alerting infrastructure to support the growing platform. Includes Datadog and Sentry licenses for 6 months.', amount: 1200, currency: 'USDC', recipient: 'DevOps' },
    { title: 'Sponsor hackathon prizes', description: 'Allocate funds from the prize pool to top 3 projects at the Solana Breakpoint hackathon.', amount: 3000, currency: 'USDC', recipient: 'Hackathon Winners' },
    { title: 'Hire community manager', description: 'Bring on a dedicated community manager to handle Discord, social media, and member onboarding for 6 months.', amount: 4500, currency: 'USDC', recipient: 'Community Manager' },
    { title: 'Security audit engagement', description: 'Engage a reputable security firm to audit our smart contracts before mainnet launch.', amount: 5000, currency: 'USDC', recipient: 'Audit Firm' },
    { title: 'Developer onboarding program', description: 'Fund a structured 4-week onboarding program for new developers joining the ecosystem.', amount: 1800, currency: 'USDC', recipient: 'Developer Program' },
    { title: 'Legal structure consultation', description: 'Engage legal counsel to explore DAO legal wrappers and regulatory compliance frameworks.', amount: 2500, currency: 'USDC', recipient: 'Legal Counsel' },
    { title: 'UI/UX redesign', description: 'Comprehensive redesign of the platform interface with focus on accessibility and mobile experience.', amount: 2200, currency: 'USDC', recipient: 'Design Team' },
  ];

  const groupIds = ['g1', 'g1', 'g1', 'g2', 'g3', 'g2', 'g5', 'g4', 'g5', 'g4'];
  const statuses: Proposal['status'][] = ['voting', 'voting', 'voting', 'voting', 'voting', 'passed', 'voting', 'voting', 'rejected', 'passed'];

  return proposalsData.map((p, i) => {
    const status = statuses[i] || 'voting';
    const totalMembers = 24;
    const yesVotes = status === 'passed' ? 18 + Math.floor(Math.random() * 4) : Math.floor(Math.random() * 15) + 5;
    const noVotes = status === 'rejected' ? 15 + Math.floor(Math.random() * 5) : Math.floor(Math.random() * 6);
    const abstainVotes = Math.floor(Math.random() * 4);
    return {
      ...p,
      id: i + 1,
      groupId: groupIds[i],
      status,
      votes: { yes: yesVotes, no: noVotes, abstain: abstainVotes },
      totalMembers,
      quorum: 50 + Math.floor(Math.random() * 20),
      deadline: `Sep ${8 + i % 10}, 2026`,
      hoursLeft: status === 'voting' ? [18, 36, 6, 24, 12][i % 5] : 0,
      createdAt: `Sep ${1 + i}, 2026`,
    };
  });
}

function makeTransactions(): Transaction[] {
  const txTypes: Transaction['type'][] = ['sent', 'received', 'contribution', 'withdrawal', 'swap'];
  const txStatuses: Transaction['status'][] = ['confirmed', 'confirmed', 'confirmed', 'confirmed', 'pending', 'failed'];
  const currencies: Transaction['currency'][] = ['USDC', 'SOL', 'PAY'];
  const txs: Transaction[] = [];

  for (let i = 0; i < 50; i++) {
    const type = txTypes[Math.floor(Math.random() * txTypes.length)];
    const fromIdx = Math.floor(Math.random() * NAMES.length);
    let toIdx = Math.floor(Math.random() * NAMES.length);
    while (toIdx === fromIdx) toIdx = Math.floor(Math.random() * NAMES.length);
    const amount = Math.floor(Math.random() * 5000) + 10;
    const currency = currencies[Math.floor(Math.random() * currencies.length)];
    const status = i < 46 ? 'confirmed' : i < 48 ? 'pending' : 'failed';
    const day = 7 - (i % 7);
    const hour = Math.floor(Math.random() * 24);
    const min = Math.floor(Math.random() * 60);
    const id = randomTxId();

    txs.push({
      id, shortId: `${id.slice(0, 4)}...${id.slice(4, 8)}`, type,
      from: type === 'contribution' ? 'Anonymous' : NAMES[fromIdx],
      to: type === 'contribution' ? 'Group Fund' : NAMES[toIdx],
      amount, currency, network: 'Solana Demo', status,
      timestamp: `Sep ${day}, 2026 ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
      fee: 0.02, block: 284000000 + i * 1234, signature: randomTxId() + randomTxId() + randomTxId(),
    });
  }
  return txs;
}

function makePayments(): Payment[] {
  return [
    { id: 'p1', date: 'Sep 7', type: 'sent', person: 'Alex Morgan', amount: -120, currency: 'USDC', status: 'completed', txId: '5Yk8...Q2P', description: 'January contribution' },
    { id: 'p2', date: 'Sep 7', type: 'received', person: 'Sarah Chen', amount: 500, currency: 'USDC', status: 'completed', txId: '9Hx2...Lm81', description: 'Group contribution' },
    { id: 'p3', date: 'Sep 6', type: 'contribution', person: 'Build Our DAO', amount: -500, currency: 'USDC', status: 'completed', txId: '4Jd7...P91K', description: 'Group contribution' },
    { id: 'p4', date: 'Sep 5', type: 'received', person: 'Community Grant', amount: 2000, currency: 'USDC', status: 'completed', txId: '3Rt6...N42W', description: 'Grant funding' },
    { id: 'p5', date: 'Sep 5', type: 'sent', person: 'Maya Patel', amount: -75, currency: 'USDC', status: 'completed', txId: '6Bn4...K18Z', description: 'Design work' },
    { id: 'p6', date: 'Sep 4', type: 'received', person: 'Noah Williams', amount: 250, currency: 'USDC', status: 'completed', txId: '2Wp8...M73X', description: 'Donation' },
    { id: 'p7', date: 'Sep 4', type: 'contribution', person: 'Dev Guild', amount: -300, currency: 'USDC', status: 'completed', txId: '8Vc3...R29Y', description: 'Group contribution' },
    { id: 'p8', date: 'Sep 3', type: 'sent', person: 'Sofia Garcia', amount: -300, currency: 'USDC', status: 'completed', txId: '1Tq5...L64B', description: 'Translation work' },
    { id: 'p9', date: 'Sep 3', type: 'received', person: 'Liam Johnson', amount: 100, currency: 'SOL', status: 'completed', txId: '7xK9...92Lm', description: 'Membership fee' },
    { id: 'p10', date: 'Sep 2', type: 'sent', person: 'Emma Wilson', amount: -450, currency: 'USDC', status: 'pending', txId: '4Jd7...P91K', description: 'Pending proposal' },
    { id: 'p11', date: 'Sep 2', type: 'received', person: 'Oliver Brown', amount: 80, currency: 'USDC', status: 'completed', txId: '5Yk8...Q2P', description: 'Contribution' },
    { id: 'p12', date: 'Sep 1', type: 'sent', person: 'Ava Davis', amount: -200, currency: 'USDC', status: 'completed', txId: '9Hx2...Lm81', description: 'Bug bounty' },
  ];
}

function makeActivity(): ActivityEvent[] {
  return [
    { id: 'a1', user: 'Anonymous', userColor: '#00d4e6', action: 'contributed', detail: '$500 USDC to Build Our DAO', timestamp: '2 min ago', timeAgo: '2 min ago', status: 'completed', icon: 'arrow-down', anonymous: true },
    { id: 'a2', user: 'Sarah Chen', userColor: '#ff2e9a', action: 'created proposal', detail: '#10 Purchase development servers', timestamp: '18 min ago', timeAgo: '18 min ago', status: 'info', icon: 'file-text' },
    { id: 'a3', user: 'Anonymous', userColor: '#00e676', action: 'voted on', detail: 'Proposal #10', timestamp: '1 hour ago', timeAgo: '1 hour ago', status: 'info', icon: 'vote', anonymous: true },
    { id: 'a4', user: 'Everest Paudel', userColor: '#ffd600', action: 'received', detail: '$250 from Noah Williams', timestamp: '3 hours ago', timeAgo: '3 hours ago', status: 'completed', icon: 'arrow-down' },
    { id: 'a5', user: 'Daniel Kim', userColor: '#4d7cff', action: 'joined', detail: 'Build Our Community DAO', timestamp: 'Yesterday', timeAgo: 'Yesterday', status: 'info', icon: 'user-plus' },
    { id: 'a6', user: 'Anonymous', userColor: '#ff8c00', action: 'contributed', detail: '$1,000 USDC to Dev Guild', timestamp: 'Yesterday', timeAgo: 'Yesterday', status: 'completed', icon: 'arrow-down', anonymous: true },
    { id: 'a7', user: 'Sofia Garcia', userColor: '#b14dff', action: 'created group', detail: 'DeFi Education Fund', timestamp: '2 days ago', timeAgo: '2 days ago', status: 'info', icon: 'users' },
    { id: 'a8', user: 'Anonymous', userColor: '#ff3860', action: 'voted on', detail: 'Proposal #8', timestamp: '2 days ago', timeAgo: '2 days ago', status: 'info', icon: 'vote', anonymous: true },
    { id: 'a9', user: 'Emma Wilson', userColor: '#00d4e6', action: 'contributed', detail: '1.5 SOL to Hackathon Prize Pool', timestamp: '2 days ago', timeAgo: '2 days ago', status: 'completed', icon: 'arrow-down' },
    { id: 'a10', user: 'Proposal #6', userColor: '#39ff14', action: 'passed and executed', detail: 'Hire community manager', timestamp: '3 days ago', timeAgo: '3 days ago', status: 'approved', icon: 'check' },
    { id: 'a11', user: 'Ava Davis', userColor: '#ffd600', action: 'created proposal', detail: '#9 Legal structure consultation', timestamp: '3 days ago', timeAgo: '3 days ago', status: 'info', icon: 'file-text' },
    { id: 'a12', user: 'Anonymous', userColor: '#ff2e9a', action: 'contributed', detail: '$750 USDC to Protocol Security Audit', timestamp: '4 days ago', timeAgo: '4 days ago', status: 'completed', icon: 'arrow-down', anonymous: true },
    { id: 'a13', user: 'Mia Anderson', userColor: '#4d7cff', action: 'created group', detail: 'Hackathon Prize Pool', timestamp: '5 days ago', timeAgo: '5 days ago', status: 'info', icon: 'users' },
    { id: 'a14', user: 'Anonymous', userColor: '#ff8c00', action: 'contributed', detail: '$250 USDC to Build Our DAO', timestamp: '5 days ago', timeAgo: '5 days ago', status: 'completed', icon: 'arrow-down', anonymous: true },
    { id: 'a15', user: 'Proposal #4', userColor: '#ff3860', action: 'was rejected', detail: 'Upgrade monitoring infrastructure', timestamp: '6 days ago', timeAgo: '6 days ago', status: 'rejected', icon: 'x' },
    { id: 'a16', user: 'Henry Taylor', userColor: '#00d4e6', action: 'sent', detail: '$180 to Alex Morgan', timestamp: '1 week ago', timeAgo: '1 week ago', status: 'completed', icon: 'arrow-up' },
    { id: 'a17', user: 'Anonymous', userColor: '#00e676', action: 'contributed', detail: '$500 PAY to Dev Guild', timestamp: '1 week ago', timeAgo: '1 week ago', status: 'completed', icon: 'arrow-down', anonymous: true },
    { id: 'a18', user: 'Benjamin Lewis', userColor: '#ff2e9a', action: 'joined', detail: 'Open Source Dev Guild', timestamp: '1 week ago', timeAgo: '1 week ago', status: 'info', icon: 'user-plus' },
    { id: 'a19', user: 'Proposal #3', userColor: '#39ff14', action: 'passed and executed', detail: 'Fund documentation overhaul', timestamp: '1 week ago', timeAgo: '1 week ago', status: 'approved', icon: 'check' },
    { id: 'a20', user: 'Amelia White', userColor: '#ffd600', action: 'created group', detail: 'DeFi Education Fund', timestamp: '1 week ago', timeAgo: '1 week ago', status: 'info', icon: 'users' },
  ];
}

function makePaymentRequests(): PaymentRequest[] {
  return [
    { id: 'r1', amount: 250, currency: 'USDC', from: '@alex', description: 'Server contribution', expiration: '24 hours', status: 'pending', createdAt: 'Sep 7' },
    { id: 'r2', amount: 500, currency: 'USDC', from: '@sarah', description: 'Design work payment', expiration: '48 hours', status: 'pending', createdAt: 'Sep 6' },
    { id: 'r3', amount: 1200, currency: 'USDC', from: '@daniel', description: 'Infrastructure bill', expiration: '12 hours', status: 'paid', createdAt: 'Sep 5' },
    { id: 'r4', amount: 75, currency: 'USDC', from: '@maya', description: 'Translation services', expiration: 'Expired', status: 'expired', createdAt: 'Sep 3' },
    { id: 'r5', amount: 2, currency: 'SOL', from: '@noah', description: 'Membership fee', expiration: '72 hours', status: 'pending', createdAt: 'Sep 2' },
    { id: 'r6', amount: 300, currency: 'USDC', from: '@sofia', description: 'Community grant', expiration: '48 hours', status: 'pending', createdAt: 'Sep 1' },
    { id: 'r7', amount: 150, currency: 'USDC', from: '@liam', description: 'Monthly hosting', expiration: 'Paid', status: 'paid', createdAt: 'Aug 30' },
    { id: 'r8', amount: 1000, currency: 'USDC', from: '@emma', description: 'Audit deposit', expiration: 'Expired', status: 'expired', createdAt: 'Aug 28' },
  ];
}

function makeNotifications(): AppNotification[] {
  return [
    { id: 'n1', title: 'Proposal #10 needs your vote', message: 'Voting ends in 18 hours', type: 'proposal', read: false, timestamp: '5 min ago', timeAgo: '5 min ago' },
    { id: 'n2', title: 'New contribution received', message: '$500 USDC contributed to Build Our DAO', type: 'group', read: false, timestamp: '1 hour ago', timeAgo: '1 hour ago' },
    { id: 'n3', title: 'Your contribution was confirmed', message: 'Transaction 5Yk8...Q2P confirmed', type: 'payment', read: false, timestamp: '2 hours ago', timeAgo: '2 hours ago' },
    { id: 'n4', title: 'New group created', message: 'Sofia created DeFi Education Fund', type: 'group', read: false, timestamp: '3 hours ago', timeAgo: '3 hours ago' },
    { id: 'n5', title: 'Daniel Kim joined Build Our DAO', message: 'New member joined the group', type: 'member', read: true, timestamp: 'Yesterday', timeAgo: 'Yesterday' },
    { id: 'n6', title: 'Proposal #6 passed', message: '18 YES, 4 NO, 3 Abstain - Auto-executed', type: 'proposal', read: true, timestamp: 'Yesterday', timeAgo: 'Yesterday' },
    { id: 'n7', title: 'Contribution confirmed', message: '1.5 SOL contributed to Hackathon Prize Pool', type: 'group', read: true, timestamp: '2 days ago', timeAgo: '2 days ago' },
    { id: 'n8', title: 'Proposal #3 executed', message: 'Payment sent to Documentation Team', type: 'proposal', read: true, timestamp: '3 days ago', timeAgo: '3 days ago' },
    { id: 'n9', title: 'New member activity', message: '3 new members joined your groups', type: 'member', read: true, timestamp: '5 days ago', timeAgo: '5 days ago' },
    { id: 'n10', title: 'Proposal #10 needs your vote', message: 'Purchase development servers - $2,000 USDC', type: 'proposal', read: true, timestamp: '1 week ago', timeAgo: '1 week ago' },
  ];
}

function makeWalletAssets(): WalletAsset[] {
  return [
    { symbol: 'USDC', name: 'USD Coin', balance: 5240.18, usdValue: 5240.18, change24h: 1.2, color: '#4d7cff', sparkline: [4900, 4950, 5010, 4980, 5100, 5150, 5200, 5240, 5210, 5240] },
    { symbol: 'SOL', name: 'Solana', balance: 12.5, usdValue: 2180, change24h: 4.8, color: '#00d4e6', sparkline: [190, 195, 192, 198, 205, 210, 208, 215, 218, 218] },
    { symbol: 'PAY', name: 'PayDAO Token', balance: 1000, usdValue: 1000, change24h: 12.4, color: '#00e676', sparkline: [0.8, 0.85, 0.82, 0.9, 0.95, 1.0, 0.98, 1.05, 1.1, 1.0] },
  ];
}

export const mockData = {
  members: makeMembers(),
  proposals: makeProposals(),
  transactions: makeTransactions(),
  payments: makePayments(),
  activity: makeActivity(),
  paymentRequests: makePaymentRequests(),
  notifications: makeNotifications(),
  groups: makeGroups(),
  walletAssets: makeWalletAssets(),
  currentUser: {
    name: 'Everest Paudel',
    username: '@everest',
    email: 'demo@paydao.app',
    walletAddress: '7xK9...92Lm',
    avatarColor: '#ffd600',
    personalBalance: 8420.18,
    available: 6890.20,
    pending: 1529.98,
  },
  stats: {
    totalGroups: 5,
    totalMembers: 42,
    activeProposals: 3,
    totalTransactions: 1284,
    monthlyVolume: 38420,
    totalFunded: 46810,
    pendingTx: 12,
    failedTx: 4,
    passedProposals: 18,
    rejectedProposals: 3,
  },
  fundingChart: Array.from({ length: 14 }, (_, i) => ({
    day: `Day ${i + 1}`,
    value: Math.floor(3000 + i * 230 + Math.random() * 200),
  })),
  groupActivityChart: Array.from({ length: 14 }, (_, i) => ({
    day: `Day ${i + 1}`,
    raised: Math.floor(200 + Math.random() * 400),
    target: 1000,
  })),
  paymentVolume: [
    { day: 'Mon', volume: 4200 }, { day: 'Tue', volume: 3800 }, { day: 'Wed', volume: 5100 },
    { day: 'Thu', volume: 4600 }, { day: 'Fri', volume: 6200 }, { day: 'Sat', volume: 3400 }, { day: 'Sun', volume: 2800 },
  ],
  genRandomTxId: () => randomTxId(),
};

export const DEMO_CREDENTIALS = { email: 'demo@paydao.app', password: 'PayDAO123!' };
