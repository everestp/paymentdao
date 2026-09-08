import {
  connectWallet,
  contributeOnChain,
  createGroupOnChain,
  createProposalOnChain,
  getConnectedWallet,
  voteOnProposalOnChain,
} from '@/chain/paydao';

import { mockData } from '@/data/mockData';

import type {
  ActivityEvent,
  AppNotification,
  Contribution,
  Currency,
  GroupData,
  Member,
  Payment,
  PaymentRequest,
  Proposal,
  Transaction,
  VoteType,
  WalletAsset,
} from '@/types';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { PublicKey } from '@solana/web3.js';

/* =========================================================
   TOAST TYPES
========================================================= */

export type ToastVariant =
  | 'success'
  | 'error'
  | 'info'
  | 'live';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

/* =========================================================
   INPUT TYPES
========================================================= */

export interface CreateGroupInput {
  name: string;
  description: string;
  requiredAmount: number;
  currency: Currency;
  deadline?: string;
  visibility: 'public' | 'private';
  governance: 'democratic' | 'weighted' | 'council';
  votingThreshold: number;
}

export interface CreateProposalInput {
  groupId: string;
  title: string;
  description: string;
  amount: number;
  currency: Currency;
  recipient: string;
  duration: number;
}

/* =========================================================
   WALLET USER
========================================================= */

export interface WalletUser {
  walletAddress: string;
  shortAddress: string;
  name: string;
  avatarColor: string;
}

/* =========================================================
   APP STATE
========================================================= */

export interface AppState {
  hasOnboarded: boolean;
  completeOnboarding: () => void;
  groups: GroupData[];
  proposals: Proposal[];
  contributions: Contribution[];
  transactions: Transaction[];
  activity: ActivityEvent[];
  notifications: AppNotification[];
  payments: Payment[];
  paymentRequests: PaymentRequest[];
  members: Member[];
  walletAssets: WalletAsset[];

  /*
   * Wallet identity
   */
  user: WalletUser | null;
  walletAddress: string | null;
  isWalletConnected: boolean;
  walletLoading: boolean;

  connectWallet: () => Promise<PublicKey>;
  disconnectWallet: () => void;
  logout: () => void;

  /*
   * Toast
   */
  toasts: Toast[];

  addToast: (toast: {
    title: string;
    description?: string;
    variant?: ToastVariant;
  }) => void;

  removeToast: (id: string) => void;

  /*
   * PayDAO
   */
  contribute: (
    groupId: string,
    amount: number,
    currency?: Currency,
  ) => Promise<void>;

  voteOnProposal: (
    proposalId: number,
    vote: VoteType,
  ) => Promise<void>;

  createProposal: (
    data: CreateProposalInput,
  ) => Promise<Proposal>;

  createGroup: (
    data: CreateGroupInput,
  ) => Promise<GroupData>;

  /*
   * Existing app functionality
   */
  sendPayment: (
    payment: Payment,
  ) => Promise<void>;

  createPaymentRequest: (
    request: PaymentRequest,
  ) => Promise<void>;
}

/* =========================================================
   CONTEXT
========================================================= */

const AppContext =
  createContext<AppState | undefined>(undefined);

/* =========================================================
   LOCAL STORAGE
========================================================= */

const STORAGE_KEYS = {
  groups: 'paydao_groups_v2',
  proposals: 'paydao_proposals_v2',
  contributions: 'paydao_contributions_v2',
  transactions: 'paydao_transactions_v2',
  activity: 'paydao_activity_v2',
  notifications: 'paydao_notifications_v2',
  payments: 'paydao_payments_v2',
  paymentRequests: 'paydao_payment_requests_v2',
};

/* =========================================================
   STORAGE HELPERS
========================================================= */

function loadStorage<T>(
  key: string,
  fallback: T,
): T {
  try {
    const stored =
      localStorage.getItem(key);

    if (!stored) {
      return fallback;
    }

    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function saveStorage<T>(
  key: string,
  value: T,
) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value),
    );
  } catch {
    // Ignore storage errors.
  }
}

/* =========================================================
   WALLET HELPERS
========================================================= */

function createWalletUser(
  address: string,
): WalletUser {
  return {
    walletAddress: address,
    shortAddress: `${address.slice(
      0,
      4,
    )}...${address.slice(-4)}`,
    name: `${address.slice(
      0,
      4,
    )}...${address.slice(-4)}`,
    avatarColor: '#00d4e6',
  };
}

/* =========================================================
   PROVIDER
========================================================= */

export function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  /* =======================================================
     DATA STATE
  ======================================================= */

  const [groups, setGroups] =
    useState<GroupData[]>(
      () =>
        loadStorage(
          STORAGE_KEYS.groups,
          mockData.groups ?? [],
        ),
    );

  const [proposals, setProposals] =
    useState<Proposal[]>(
      () =>
        loadStorage(
          STORAGE_KEYS.proposals,
          mockData.proposals ?? [],
        ),
    );

  const [
    contributions,
    setContributions,
  ] =
    useState<Contribution[]>(
      () =>
        loadStorage(
          STORAGE_KEYS.contributions,
          mockData.contributions ?? [],
        ),
    );

  const [
    transactions,
    setTransactions,
  ] =
    useState<Transaction[]>(
      () =>
        loadStorage(
          STORAGE_KEYS.transactions,
          mockData.transactions ?? [],
        ),
    );

  const [activity, setActivity] =
    useState<ActivityEvent[]>(
      () =>
        loadStorage(
          STORAGE_KEYS.activity,
          mockData.activity ?? [],
        ),
    );

  const [
    notifications,
    setNotifications,
  ] =
    useState<AppNotification[]>(
      () =>
        loadStorage(
          STORAGE_KEYS.notifications,
          mockData.notifications ?? [],
        ),
    );

  const [payments, setPayments] =
    useState<Payment[]>(
      () =>
        loadStorage(
          STORAGE_KEYS.payments,
          mockData.payments ?? [],
        ),
    );

  const [
    paymentRequests,
    setPaymentRequests,
  ] =
    useState<PaymentRequest[]>(
      () =>
        loadStorage(
          STORAGE_KEYS.paymentRequests,
          mockData.paymentRequests ?? [],
        ),
    );

  /*
   * These are still mock/static for now.
   */
  const [members] =
    useState<Member[]>(
      mockData.members ?? [],
    );

  const [walletAssets] =
    useState<WalletAsset[]>(
      mockData.walletAssets ?? [],
    );

  /* =======================================================
     WALLET STATE
  ======================================================= */

  const [
    walletAddress,
    setWalletAddress,
  ] =
    useState<string | null>(null);

  const [
    walletLoading,
    setWalletLoading,
  ] =
    useState(false);

  const [hasOnboarded, setHasOnboarded] = useState(
    () => localStorage.getItem('paydao_onboarded') === 'true',
  );

  /*
   * Wallet is the identity.
   */
  const user =
    walletAddress
      ? createWalletUser(walletAddress)
      : null;

  const isWalletConnected =
    !!walletAddress;

  /* =======================================================
     TOASTS
  ======================================================= */

  const [toasts, setToasts] =
    useState<Toast[]>([]);

  /* =======================================================
     RESTORE CONNECTED WALLET
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const restoreWallet = async () => {
      try {
        const wallet =
          await getConnectedWallet();

        if (
          mounted &&
          wallet?.publicKey
        ) {
          setWalletAddress(
            wallet.publicKey.toBase58(),
          );
        }
      } catch {
        /*
         * Wallet not connected.
         */
      }
    };

    restoreWallet();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     WALLET CONNECT
  ======================================================= */

  const handleConnectWallet =
    useCallback(async (): Promise<PublicKey> => {
      setWalletLoading(true);

      try {
        const wallet =
          await connectWallet();

        if (!wallet?.publicKey) {
          throw new Error(
            'Wallet connection failed.',
          );
        }

        const address =
          wallet.publicKey.toBase58();

        setWalletAddress(address);

        return wallet.publicKey;
      } finally {
        setWalletLoading(false);
      }
    }, []);

  /* =======================================================
     WALLET DISCONNECT
  ======================================================= */

  const handleDisconnectWallet =
    useCallback(() => {
      setWalletAddress(null);
    }, []);

  const completeOnboarding = useCallback(() => {
    setHasOnboarded(true);
    localStorage.setItem('paydao_onboarded', 'true');
  }, []);

  const logout = useCallback(() => {
    setWalletAddress(null);
    setHasOnboarded(false);
    localStorage.removeItem('paydao_onboarded');
  }, []);

  /* =======================================================
     PERSIST STATE
  ======================================================= */

  useEffect(() => {
    saveStorage(
      STORAGE_KEYS.groups,
      groups,
    );
  }, [groups]);

  useEffect(() => {
    saveStorage(
      STORAGE_KEYS.proposals,
      proposals,
    );
  }, [proposals]);

  useEffect(() => {
    saveStorage(
      STORAGE_KEYS.contributions,
      contributions,
    );
  }, [contributions]);

  useEffect(() => {
    saveStorage(
      STORAGE_KEYS.transactions,
      transactions,
    );
  }, [transactions]);

  useEffect(() => {
    saveStorage(
      STORAGE_KEYS.activity,
      activity,
    );
  }, [activity]);

  useEffect(() => {
    saveStorage(
      STORAGE_KEYS.notifications,
      notifications,
    );
  }, [notifications]);

  useEffect(() => {
    saveStorage(
      STORAGE_KEYS.payments,
      payments,
    );
  }, [payments]);

  useEffect(() => {
    saveStorage(
      STORAGE_KEYS.paymentRequests,
      paymentRequests,
    );
  }, [paymentRequests]);

  /* =======================================================
     TOAST
  ======================================================= */

  const addToast =
    useCallback(
      ({
        title,
        description,
        variant = 'info',
      }: {
        title: string;
        description?: string;
        variant?: ToastVariant;
      }) => {
        const id =
          `toast-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

        const toast: Toast = {
          id,
          title,
          description,
          variant,
        };

        setToasts(
          previous => [
            ...previous,
            toast,
          ],
        );

        window.setTimeout(() => {
          setToasts(
            previous =>
              previous.filter(
                item =>
                  item.id !== id,
              ),
          );
        }, 5000);
      },
      [],
    );

  const removeToast =
    useCallback(
      (id: string) => {
        setToasts(
          previous =>
            previous.filter(
              toast =>
                toast.id !== id,
            ),
        );
      },
      [],
    );

  /* =======================================================
     CONTRIBUTE
  ======================================================= */

  const contribute =
    useCallback(
      async (
        groupId: string,
        amount: number,
        currency: Currency = 'SOL',
      ) => {
        if (!walletAddress) {
          throw new Error(
            'Connect your wallet first.',
          );
        }

        if (amount <= 0) {
          throw new Error(
            'Contribution amount must be greater than zero.',
          );
        }

        if (currency !== 'SOL') {
          throw new Error(
            'Only SOL contributions are currently supported on-chain.',
          );
        }

        const group =
          groups.find(
            item =>
              item.id === groupId,
          );

        if (!group) {
          throw new Error(
            'Group not found.',
          );
        }

        const signature =
          await contributeOnChain(
            group.id,
            amount,
            currency,
          );

        /* -----------------------------------------------
           Contribution
        ------------------------------------------------ */

        const contribution:
          Contribution = {
          id:
            `contribution-${Date.now()}`,

          groupId:
            group.id,

          amount,

          currency,

          createdAt:
            new Date().toISOString(),

          anonymousId:
            `anon-${Date.now()}`,
        };

        setContributions(
          previous => [
            contribution,
            ...previous,
          ],
        );

        /* -----------------------------------------------
           Group balance
        ------------------------------------------------ */

        setGroups(
          previous =>
            previous.map(item => {
              if (
                item.id !==
                group.id
              ) {
                return item;
              }

              return {
                ...item,

                currentBalance:
                  item.currentBalance +
                  amount,

                contributions: [
                  contribution,
                  ...item.contributions,
                ],
              };
            }),
        );

        /* -----------------------------------------------
           Transaction
        ------------------------------------------------ */

        const transaction:
          Transaction = {
          id:
            `tx-${Date.now()}`,

          shortId:
            signature.slice(0, 8),

          type:
            'contribution',

          from:
            'Anonymous',

          to:
            group.id,

          amount,

          currency,

          network:
            'Solana Devnet',

          status:
            'confirmed',

          timestamp:
            new Date().toISOString(),

          fee:
            0,

          block:
            0,

          signature,
        };

        setTransactions(
          previous => [
            transaction,
            ...previous,
          ],
        );

        /* -----------------------------------------------
           Activity
        ------------------------------------------------ */

        const event:
          ActivityEvent = {
          id:
            `activity-${Date.now()}`,

          user:
            'Anonymous',

          userColor:
            '#00d4e6',

          action:
            'contributed',

          detail:
            `${amount} ${currency}`,

          timestamp:
            'Just now',

          timeAgo:
            'Just now',

          status:
            'completed',

          icon:
            'wallet',

          anonymous:
            true,
        };

        setActivity(
          previous => [
            event,
            ...previous,
          ],
        );

        /* -----------------------------------------------
           Notification
        ------------------------------------------------ */

        setNotifications(
          previous => [
            {
              id:
                `notification-${Date.now()}`,

              title:
                'Contribution successful',

              message:
                `${amount} ${currency} was contributed to ${group.name}.`,

              type:
                'group',

              read:
                false,

              timestamp:
                'Just now',

              timeAgo:
                'Just now',
            },

            ...previous,
          ],
        );

        addToast({
          title:
            'Contribution successful',

          description:
            `${amount} SOL contributed to ${group.name}.`,

          variant:
            'success',
        });
      },
      [
        groups,
        walletAddress,
        addToast,
      ],
    );

  /* =======================================================
     PRIVATE VOTE
  ======================================================= */

  const voteOnProposal =
    useCallback(
      async (
        proposalId: number,
        vote: VoteType,
      ) => {
        if (!walletAddress) {
          throw new Error(
            'Connect your wallet first.',
          );
        }

        const proposal =
          proposals.find(
            item =>
              item.id ===
              proposalId,
          );

        if (!proposal) {
          throw new Error(
            'Proposal not found.',
          );
        }

        if (
          proposal.status !==
          'voting'
        ) {
          throw new Error(
            'This proposal is no longer accepting votes.',
          );
        }

        if (
          !proposal.chainAddress
        ) {
          throw new Error(
            'This proposal has no on-chain address.',
          );
        }

        /*
         * Individual vote is intentionally
         * NOT stored in local state.
         */

        const signature =
          await voteOnProposalOnChain({
            groupId:
              proposal.groupId,

            proposalAddress:
              proposal.chainAddress,

            vote,
          });

        /* -----------------------------------------------
           Private activity
        ------------------------------------------------ */

        setActivity(
          previous => [
            {
              id:
                `vote-${Date.now()}`,

              user:
                'Anonymous',

              userColor:
                '#00d4e6',

              action:
                'voted privately',

              detail:
                proposal.title,

              timestamp:
                'Just now',

              timeAgo:
                'Just now',

              status:
                'completed',

              icon:
                'check-circle',

              anonymous:
                true,
            },

            ...previous,
          ],
        );

        /* -----------------------------------------------
           Transaction
        ------------------------------------------------ */

        setTransactions(
          previous => [
            {
              id:
                `vote-tx-${Date.now()}`,

              shortId:
                signature.slice(0, 8),

              type:
                'sent',

              from:
                'Anonymous',

              to:
                proposal.chainAddress,

              amount:
                0,

              currency:
                'SOL',

              network:
                'Solana Devnet',

              status:
                'confirmed',

              timestamp:
                new Date().toISOString(),

              fee:
                0,

              block:
                0,

              signature,
            },

            ...previous,
          ],
        );

        /* -----------------------------------------------
           Notification
        ------------------------------------------------ */

        setNotifications(
          previous => [
            {
              id:
                `notification-${Date.now()}`,

              title:
                'Private vote submitted',

              message:
                'Your vote was submitted successfully. Your individual choice is not displayed.',

              type:
                'proposal',

              read:
                false,

              timestamp:
                'Just now',

              timeAgo:
                'Just now',
            },

            ...previous,
          ],
        );

        addToast({
          title:
            'Private vote submitted',

          description:
            'Your vote was submitted successfully.',

          variant:
            'success',
        });
      },
      [
        proposals,
        walletAddress,
        addToast,
      ],
    );

  /* =======================================================
     CREATE PROPOSAL
  ======================================================= */

  const createProposal =
    useCallback(
      async (
        data: CreateProposalInput,
      ): Promise<Proposal> => {
        if (!walletAddress) {
          throw new Error(
            'Connect your wallet first.',
          );
        }

        if (
          !data.title.trim()
        ) {
          throw new Error(
            'Proposal title is required.',
          );
        }

        if (
          !data.description.trim()
        ) {
          throw new Error(
            'Proposal description is required.',
          );
        }

        if (
          data.amount <= 0
        ) {
          throw new Error(
            'Proposal amount must be greater than zero.',
          );
        }

        if (
          data.duration <= 0
        ) {
          throw new Error(
            'Voting duration must be greater than zero.',
          );
        }

        if (
          data.currency !== 'SOL'
        ) {
          throw new Error(
            'Only SOL proposals are currently supported on-chain.',
          );
        }

        const group =
          groups.find(
            item =>
              item.id ===
              data.groupId,
          );

        if (!group) {
          throw new Error(
            'Group not found.',
          );
        }

        /* -----------------------------------------------
           On-chain proposal
        ------------------------------------------------ */

        const chainResult =
          await createProposalOnChain({
            groupId:
              group.id,

            title:
              data.title,

            description:
              data.description,

            amount:
              data.amount,

            currency:
              data.currency,

            recipient:
              data.recipient,

            duration:
              data.duration,
          });

        /* -----------------------------------------------
           Local proposal ID
        ------------------------------------------------ */

        const newId =
          proposals.length === 0
            ? 1
            : Math.max(
              ...proposals.map(
                item =>
                  item.id,
              ),
            ) + 1;

        const deadline =
          new Date(
            Date.now() +
            data.duration *
            60 *
            60 *
            1000,
          ).toISOString();

        /* -----------------------------------------------
           Proposal
        ------------------------------------------------ */

        const newProposal:
          Proposal = {
          id:
            newId,

          groupId:
            group.id,

          chainAddress:
            chainResult.proposalAddress,

          title:
            data.title,

          description:
            data.description,

          amount:
            data.amount,

          currency:
            data.currency,

          recipient:
            data.recipient,

          status:
            'voting',

          votes: {
            yes: 0,
            no: 0,
            abstain: 0,
          },

          totalMembers:
            group.memberCount,

          quorum:
            group.votingThreshold,

          deadline,

          hoursLeft:
            data.duration,

          createdAt:
            new Date().toISOString(),
        };

        setProposals(
          previous => [
            newProposal,
            ...previous,
          ],
        );

        /* -----------------------------------------------
           Update group
        ------------------------------------------------ */

        setGroups(
          previous =>
            previous.map(item => {
              if (
                item.id !==
                group.id
              ) {
                return item;
              }

              return {
                ...item,

                activeProposals:
                  item.activeProposals +
                  1,
              };
            }),
        );

        /* -----------------------------------------------
           Activity
        ------------------------------------------------ */

        setActivity(
          previous => [
            {
              id:
                `proposal-${Date.now()}`,

              user:
                user?.name ??
                'User',

              userColor:
                '#00d4e6',

              action:
                'created proposal',

              detail:
                data.title,

              timestamp:
                'Just now',

              timeAgo:
                'Just now',

              status:
                'completed',

              icon:
                'file-text',

              anonymous:
                false,
            },

            ...previous,
          ],
        );

        /* -----------------------------------------------
           Notification
        ------------------------------------------------ */

        setNotifications(
          previous => [
            {
              id:
                `notification-${Date.now()}`,

              title:
                'Proposal created',

              message:
                `"${data.title}" is now open for voting.`,

              type:
                'proposal',

              read:
                false,

              timestamp:
                'Just now',

              timeAgo:
                'Just now',
            },

            ...previous,
          ],
        );

        /* -----------------------------------------------
           Toast
        ------------------------------------------------ */

        addToast({
          title:
            'Proposal created',

          description:
            'Your proposal is now open for voting.',

          variant:
            'success',
        });

        return newProposal;
      },
      [
        groups,
        proposals,
        user,
        walletAddress,
        addToast,
      ],
    );

  /* =======================================================
     CREATE GROUP
  ======================================================= */

  const createGroup =
    useCallback(
      async (
        data: CreateGroupInput,
      ): Promise<GroupData> => {
        if (!walletAddress) {
          throw new Error(
            'Connect your wallet first.',
          );
        }

        if (
          !data.name.trim()
        ) {
          throw new Error(
            'Group name is required.',
          );
        }

        if (
          !data.description.trim()
        ) {
          throw new Error(
            'Group description is required.',
          );
        }

        if (
          data.requiredAmount <= 0
        ) {
          throw new Error(
            'Required amount must be greater than zero.',
          );
        }

        if (
          data.votingThreshold < 1 ||
          data.votingThreshold > 100
        ) {
          throw new Error(
            'Voting threshold must be between 1 and 100.',
          );
        }

        if (
          data.currency !== 'SOL'
        ) {
          throw new Error(
            'Only SOL groups are currently supported on-chain.',
          );
        }

        /* -----------------------------------------------
           Create on-chain
        ------------------------------------------------ */

        const chainResult = await createGroupOnChain({
          name: data.name,
          description: data.description,
          requiredAmount: data.requiredAmount,
          currency: data.currency,
          visibility: data.visibility,
          votingThreshold: data.votingThreshold,
          deadline: data.deadline,
        });
        /*
         * PDA is the real group ID.
         */

        const groupId =
          chainResult.groupAddress;

        /* -----------------------------------------------
           Local group
        ------------------------------------------------ */

        const newGroup:
          GroupData = {
          id:
            groupId,

          name:
            data.name,

          description:
            data.description,

          createdBy:
            user?.name ??
            'Anonymous',

          createdAvatarColor:
            '#00d4e6',

          requiredAmount:
            data.requiredAmount,

          currentBalance:
            0,

          currency:
            data.currency,

          deadline:
            data.deadline,

          visibility:
            data.visibility,

          members: [
            user?.name ??
            'Anonymous',
          ],

          memberCount:
            1,

          activeProposals:
            0,

          contributions:
            [],

          governance:
            data.governance,

          votingThreshold:
            data.votingThreshold,

          createdAt:
            new Date().toISOString(),
        };

        setGroups(
          previous => [
            newGroup,
            ...previous,
          ],
        );

        /* -----------------------------------------------
           Activity
        ------------------------------------------------ */

        setActivity(
          previous => [
            {
              id:
                `group-${Date.now()}`,

              user:
                user?.name ??
                'Anonymous',

              userColor:
                '#00d4e6',

              action:
                'created a group',

              detail:
                data.name,

              timestamp:
                'Just now',

              timeAgo:
                'Just now',

              status:
                'completed',

              icon:
                'users',

              anonymous:
                false,
            },

            ...previous,
          ],
        );

        /* -----------------------------------------------
           Notification
        ------------------------------------------------ */

        setNotifications(
          previous => [
            {
              id:
                `notification-${Date.now()}`,

              title:
                'Group created',

              message:
                `${data.name} was created successfully.`,

              type:
                'group',

              read:
                false,

              timestamp:
                'Just now',

              timeAgo:
                'Just now',
            },

            ...previous,
          ],
        );

        /* -----------------------------------------------
           Toast
        ------------------------------------------------ */

        addToast({
          title:
            'Group created',

          description:
            'Your PayDAO group is now live on-chain.',

          variant:
            'success',
        });

        return newGroup;
      },
      [
        user,
        walletAddress,
        addToast,
      ],
    );

  /* =======================================================
     SEND PAYMENT
  ======================================================= */

  const sendPayment =
    useCallback(
      async (
        payment: Payment,
      ) => {
        if (!walletAddress) {
          throw new Error(
            'Connect your wallet first.',
          );
        }

        setPayments(
          previous => [
            payment,
            ...previous,
          ],
        );

        setActivity(
          previous => [
            {
              id:
                `payment-${Date.now()}`,

              user:
                user?.name ??
                'Anonymous',

              userColor:
                '#00d4e6',

              action:
                'sent payment',

              detail:
                `${payment.amount} ${payment.currency}`,

              timestamp:
                'Just now',

              timeAgo:
                'Just now',

              status:
                payment.status,

              icon:
                'send',

              anonymous:
                false,
            },

            ...previous,
          ],
        );
      },
      [
        user,
        walletAddress,
      ],
    );

  /* =======================================================
     CREATE PAYMENT REQUEST
  ======================================================= */

  const createPaymentRequest =
    useCallback(
      async (
        request: PaymentRequest,
      ) => {
        if (!walletAddress) {
          throw new Error(
            'Connect your wallet first.',
          );
        }

        setPaymentRequests(
          previous => [
            request,
            ...previous,
          ],
        );
      },
      [walletAddress],
    );

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value: AppState = {
    hasOnboarded,
    completeOnboarding,
    groups,
    proposals,
    contributions,
    transactions,
    activity,
    notifications,
    payments,
    paymentRequests,
    members,
    walletAssets,

    /*
     * Wallet identity
     */
    user,
    walletAddress,
    isWalletConnected,
    walletLoading,

    connectWallet:
      handleConnectWallet,

    disconnectWallet:
      handleDisconnectWallet,

    logout,

    /*
     * Toast
     */
    toasts,
    addToast,
    removeToast,

    /*
     * PayDAO
     */
    contribute,
    voteOnProposal,
    createProposal,
    createGroup,

    /*
     * Existing functionality
     */
    sendPayment,
    createPaymentRequest,
  };

  return (
    <AppContext.Provider
      value={value}
    >
      {children}
    </AppContext.Provider>
  );
}

/* =========================================================
   USE APP
========================================================= */

export function useApp(): AppState {
  const context =
    useContext(AppContext);

  if (!context) {
    throw new Error(
      'useApp must be used inside AppProvider',
    );
  }

  return context;
}
