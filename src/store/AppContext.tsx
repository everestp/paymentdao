import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type {
  Proposal, Transaction, ActivityEvent, AppNotification,
  PaymentRequest, GroupData, WalletAsset, VoteType, Member, LiveUpdate, Payment, Contribution,
} from '@/types';
import { mockData } from '@/data/mockData';

interface ToastMsg {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info' | 'live';
}

interface AppState {
  isLoggedIn: boolean;
  hasOnboarded: boolean;
  login: () => void;
  logout: () => void;
  completeOnboarding: () => void;

  groups: GroupData[];
  proposals: Proposal[];
  transactions: Transaction[];
  activity: ActivityEvent[];
  notifications: AppNotification[];
  paymentRequests: PaymentRequest[];
  payments: Payment[];
  walletAssets: WalletAsset[];
  members: Member[];

  user: typeof mockData.currentUser;
  stats: typeof mockData.stats;

  contribute: (groupId: string, amount: number, currency: 'USDC' | 'SOL' | 'PAY') => void;
  voteOnProposal: (proposalId: number, vote: VoteType) => void;
  createProposal: (data: { groupId: string; title: string; description: string; amount: number; currency: 'USDC' | 'SOL' | 'PAY'; recipient: string; duration: number; quorum: number }) => void;
  sendPayment: (data: { recipient: string; amount: number; currency: 'USDC' | 'SOL' | 'PAY'; message: string }) => { txId: string };
  createPaymentRequest: (data: { amount: number; currency: 'USDC' | 'SOL' | 'PAY'; from: string; description: string; expiration: string }) => void;
  createGroup: (data: { name: string; description: string; requiredAmount: number; currency: 'USDC' | 'SOL' | 'PAY'; deadline?: string; visibility: 'public' | 'private'; votingThreshold: number }) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  toasts: ToastMsg[];
  addToast: (toast: Omit<ToastMsg, 'id'>) => void;
  removeToast: (id: string) => void;
  liveUpdates: LiveUpdate[];
}

const AppContext = createContext<AppState | undefined>(undefined);

function loadState<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return fallback;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('paydao_logged_in') === 'true');
  const [hasOnboarded, setHasOnboarded] = useState(() => localStorage.getItem('paydao_onboarded') === 'true');

  const [groups, setGroups] = useState<GroupData[]>(() => loadState('paydao_groups_v2', mockData.groups));
  const [proposals, setProposals] = useState<Proposal[]>(() => loadState('paydao_proposals_v2', mockData.proposals));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadState('paydao_transactions_v2', mockData.transactions));
  const [activity, setActivity] = useState<ActivityEvent[]>(() => loadState('paydao_activity_v2', mockData.activity));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadState('paydao_notifications_v2', mockData.notifications));
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>(() => loadState('paydao_requests_v2', mockData.paymentRequests));
  const [payments] = useState<Payment[]>(mockData.payments);
  const [walletAssets, setWalletAssets] = useState<WalletAsset[]>(() => loadState('paydao_wallet_v2', mockData.walletAssets));
  const [members] = useState<Member[]>(mockData.members);

  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [user, setUser] = useState(mockData.currentUser);
  const [stats, setStats] = useState(mockData.stats);

  useEffect(() => { localStorage.setItem('paydao_logged_in', String(isLoggedIn)); }, [isLoggedIn]);
  useEffect(() => { localStorage.setItem('paydao_onboarded', String(hasOnboarded)); }, [hasOnboarded]);
  useEffect(() => { localStorage.setItem('paydao_groups_v2', JSON.stringify(groups)); }, [groups]);
  useEffect(() => { localStorage.setItem('paydao_proposals_v2', JSON.stringify(proposals)); }, [proposals]);
  useEffect(() => { localStorage.setItem('paydao_transactions_v2', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('paydao_activity_v2', JSON.stringify(activity)); }, [activity]);
  useEffect(() => { localStorage.setItem('paydao_notifications_v2', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('paydao_requests_v2', JSON.stringify(paymentRequests)); }, [paymentRequests]);
  useEffect(() => { localStorage.setItem('paydao_wallet_v2', JSON.stringify(walletAssets)); }, [walletAssets]);

  const addToast = useCallback((toast: Omit<ToastMsg, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const login = useCallback(() => {
    setIsLoggedIn(true);
    addToast({ title: 'Welcome to PayDAO', description: 'Logged in as demo@paydao.app', variant: 'success' });
  }, [addToast]);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    localStorage.removeItem('paydao_logged_in');
  }, []);

  const completeOnboarding = useCallback(() => setHasOnboarded(true), []);

  const contribute = useCallback((groupId: string, amount: number, currency: 'USDC' | 'SOL' | 'PAY') => {
    const newContribution: Contribution = {
      id: `c-${Date.now()}`,
      groupId,
      amount,
      currency,
      createdAt: 'Sep 7',
      anonymousId: `Contributor #${Math.floor(Math.random() * 900) + 100}`,
    };

    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        currentBalance: g.currentBalance + amount,
        contributions: [newContribution, ...g.contributions],
      };
    }));

    const group = groups.find(g => g.id === groupId);
    const groupName = group?.name || 'Group';

    const txId = mockData.genRandomTxId();
    const newTx: Transaction = {
      id: txId, shortId: `${txId.slice(0, 4)}...${txId.slice(4, 8)}`,
      type: 'contribution', from: 'Anonymous', to: groupName,
      amount, currency, network: 'Solana Demo', status: 'confirmed',
      timestamp: `Sep 7, 2026 ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
      fee: 0.02, block: 284000000 + Math.floor(Math.random() * 100000),
      signature: mockData.genRandomTxId() + mockData.genRandomTxId(),
    };
    setTransactions(prev => [newTx, ...prev]);

    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`,
      user: 'Anonymous', userColor: '#00d4e6',
      action: 'contributed', detail: `$${amount} ${currency} to ${groupName}`,
      timestamp: 'Just now', timeAgo: 'Just now', status: 'completed',
      icon: 'arrow-down', anonymous: true,
    };
    setActivity(prev => [newActivity, ...prev]);

    setUser(prev => ({ ...prev, personalBalance: prev.personalBalance - amount }));

    addToast({ title: 'Contribution confirmed', description: `$${amount} ${currency} contributed to ${groupName}`, variant: 'success' });
  }, [groups, addToast]);

  const voteOnProposal = useCallback((proposalId: number, vote: VoteType) => {
    setProposals(prev => prev.map(p => {
      if (p.id !== proposalId || p.userVote) return p;
      const newVotes = { ...p.votes };
      newVotes[vote] = newVotes[vote] + 1;
      return { ...p, votes: newVotes, userVote: vote };
    }));

    addToast({ title: 'Vote recorded privately', description: 'Your vote has been recorded. Individual votes are never publicly associated with a wallet or identity.', variant: 'success' });
  }, [addToast]);

  const createProposal = useCallback((data: { groupId: string; title: string; description: string; amount: number; currency: 'USDC' | 'SOL' | 'PAY'; recipient: string; duration: number; quorum: number }) => {
    const newId = Math.max(...proposals.map(p => p.id)) + 1;
    const newProposal: Proposal = {
      id: newId, groupId: data.groupId,
      title: data.title, description: data.description,
      amount: data.amount, currency: data.currency, recipient: data.recipient,
      status: 'voting', votes: { yes: 0, no: 0, abstain: 0 },
      totalMembers: 24, quorum: data.quorum,
      deadline: `Sep ${8 + newId}, 2026`, hoursLeft: data.duration,
      createdAt: 'Sep 7, 2026',
    };
    setProposals(prev => [newProposal, ...prev]);
    setGroups(prev => prev.map(g => g.id === data.groupId ? { ...g, activeProposals: g.activeProposals + 1 } : g));
    setStats(prev => ({ ...prev, activeProposals: prev.activeProposals + 1 }));

    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`, user: user.name, userColor: user.avatarColor,
      action: 'created proposal', detail: `#${newId} ${data.title}`,
      timestamp: 'Just now', timeAgo: 'Just now', status: 'info', icon: 'file-text',
    };
    setActivity(prev => [newActivity, ...prev]);

    setNotifications(prev => [
      { id: `n-${Date.now()}`, title: `Proposal #${newId} created`, message: 'Your proposal is now open for private voting', type: 'proposal', read: false, timestamp: 'Just now', timeAgo: 'Just now' },
      ...prev,
    ]);

    addToast({ title: 'Proposal created', description: `Proposal #${newId} is now open for voting`, variant: 'success' });
  }, [proposals, user, addToast]);

  const sendPayment = useCallback((data: { recipient: string; amount: number; currency: 'USDC' | 'SOL' | 'PAY'; message: string }) => {
    const txId = mockData.genRandomTxId();
    const newTx: Transaction = {
      id: txId, shortId: `${txId.slice(0, 4)}...${txId.slice(4, 8)}`,
      type: 'sent', from: user.name, to: data.recipient,
      amount: data.amount, currency: data.currency, network: 'Solana Demo', status: 'confirmed',
      timestamp: `Sep 7, 2026 ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
      fee: 0.02, block: 284000000 + Math.floor(Math.random() * 100000),
      signature: mockData.genRandomTxId() + mockData.genRandomTxId() + mockData.genRandomTxId(),
    };
    setTransactions(prev => [newTx, ...prev]);

    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`, user: user.name, userColor: user.avatarColor,
      action: 'sent', detail: `$${data.amount} ${data.currency} to ${data.recipient}`,
      timestamp: 'Just now', timeAgo: 'Just now', status: 'completed', icon: 'arrow-up',
    };
    setActivity(prev => [newActivity, ...prev]);
    setStats(prev => ({ ...prev, totalTransactions: prev.totalTransactions + 1 }));
    setUser(prev => ({ ...prev, personalBalance: prev.personalBalance - data.amount }));

    addToast({ title: 'Payment sent successfully', description: `$${data.amount} ${data.currency} to ${data.recipient}`, variant: 'success' });
    return { txId };
  }, [user, addToast]);

  const createPaymentRequest = useCallback((data: { amount: number; currency: 'USDC' | 'SOL' | 'PAY'; from: string; description: string; expiration: string }) => {
    const newReq: PaymentRequest = {
      id: `r-${Date.now()}`, amount: data.amount, currency: data.currency,
      from: data.from, description: data.description, expiration: data.expiration,
      status: 'pending', createdAt: 'Sep 7',
    };
    setPaymentRequests(prev => [newReq, ...prev]);
    addToast({ title: 'Payment request generated', description: `$${data.amount} ${data.currency} from ${data.from}`, variant: 'success' });
  }, [addToast]);

  const createGroup = useCallback((data: { name: string; description: string; requiredAmount: number; currency: 'USDC' | 'SOL' | 'PAY'; deadline?: string; visibility: 'public' | 'private'; votingThreshold: number }) => {
    const newGroup: GroupData = {
      id: `g-${Date.now()}`,
      name: data.name, description: data.description,
      createdBy: user.name, createdAvatarColor: user.avatarColor,
      requiredAmount: data.requiredAmount, currentBalance: 0,
      currency: data.currency, deadline: data.deadline,
      visibility: data.visibility,
      members: ['m-0'], memberCount: 1,
      activeProposals: 0, contributions: [],
      governance: 'democratic', votingThreshold: data.votingThreshold,
      createdAt: 'Sep 2026',
    };
    setGroups(prev => [newGroup, ...prev]);
    setStats(prev => ({ ...prev, totalGroups: prev.totalGroups + 1 }));

    const newActivity: ActivityEvent = {
      id: `act-${Date.now()}`, user: user.name, userColor: user.avatarColor,
      action: 'created group', detail: data.name,
      timestamp: 'Just now', timeAgo: 'Just now', status: 'info', icon: 'users',
    };
    setActivity(prev => [newActivity, ...prev]);

    addToast({ title: 'Group created successfully', description: data.name, variant: 'success' });
  }, [user, addToast]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    addToast({ title: 'All notifications marked as read', variant: 'info' });
  }, [addToast]);

  // Real-time simulation
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      const events = [
        { user: 'Anonymous', action: 'contributed', detail: `$${Math.floor(Math.random() * 500) + 50} USDC to Build Our DAO`, icon: 'arrow-down', anonymous: true },
        { user: 'Anonymous', action: 'voted on', detail: `Proposal #${Math.floor(Math.random() * 10) + 1}`, icon: 'vote', anonymous: true },
        { user: 'Anonymous', action: 'contributed', detail: `$${Math.floor(Math.random() * 300) + 20} to Dev Guild`, icon: 'arrow-down', anonymous: true },
      ];
      const event = events[Math.floor(Math.random() * events.length)];
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      const newActivity: ActivityEvent = {
        id: `live-${Date.now()}`,
        user: event.user, userColor: color,
        action: event.action, detail: event.detail,
        timestamp: 'Just now', timeAgo: 'Just now',
        status: 'info', icon: event.icon, anonymous: event.anonymous,
      };

      setActivity(prev => [newActivity, ...prev.slice(0, 49)]);
      setLiveUpdates(prev => [{ id: `live-${Date.now()}`, message: `${event.user} ${event.action} ${event.detail}`, timestamp: Date.now() }, ...prev.slice(0, 9)]);
      addToast({ title: 'Live update', description: `${event.user} ${event.action} ${event.detail}`, variant: 'live' });
    }, 12000);

    return () => clearInterval(interval);
  }, [isLoggedIn, addToast]);

  return (
    <AppContext.Provider value={{
      isLoggedIn, hasOnboarded, login, logout, completeOnboarding,
      groups, proposals, transactions, activity, notifications, paymentRequests, payments, walletAssets, members,
      user, stats,
      contribute, voteOnProposal, createProposal, sendPayment, createPaymentRequest, createGroup,
      markNotificationRead, markAllNotificationsRead,
      toasts, addToast, removeToast, liveUpdates,
    }}>
      {children}
    </AppContext.Provider>
  );
}

const COLORS = ['#00d4e6', '#00e676', '#ff2e9a', '#ffd600', '#ff8c00', '#4d7cff'];

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
