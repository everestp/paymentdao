
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  connectWallet,
  contributeOnChain,
  createGroupOnChain,
  createProposalOnChain,
  fetchGroupDetailOnChain,
  getConnectedWallet,
  voteOnProposalOnChain,
  type PrivateVote,
} from "@/chain/paydao";

import type { Currency } from "@/types";

import {
  mockData,
  type GroupData,
  type Member,
  type Notification,
  type Proposal,
  type WalletAsset,
} from "@/data/mockData";

/* ============================================================
 * TYPES
 * ========================================================== */

export interface AppUser {
  id?: string;
  name?: string;
  email?: string;
  avatarColor?: string;
}

export interface CreateGroupInput {
  name: string;
  description: string;
  requiredAmount: number;
  currency: Currency;
  deadline?: string;
  visibility: "public" | "private";
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

interface AppContextValue {
  /* ==========================================================
   * USER
   * ======================================================== */

  user: AppUser | null;

  /* ==========================================================
   * WALLET
   * ======================================================== */

  walletAddress: string | null;

  walletConnected: boolean;

  /*
   * Alias for existing App.tsx code.
   */
  isWalletConnected: boolean;

  connect: () => Promise<string>;

  disconnect: () => Promise<void>;

  /* ==========================================================
   * DATA
   * ======================================================== */

  groups: GroupData[];

  proposals: Proposal[];

  members: Member[];

  walletAssets: WalletAsset[];

  notifications: Notification[];

  /* ==========================================================
   * GROUP
   * ======================================================== */

  createGroup: (
    input: CreateGroupInput,
  ) => Promise<string>;

  getGroupFromChain: (
    groupId: string,
  ) => Promise<Awaited<
    ReturnType<typeof fetchGroupDetailOnChain>
  >>;

  refreshGroupFromChain: (
    groupId: string,
  ) => Promise<Awaited<
    ReturnType<typeof fetchGroupDetailOnChain>
  >>;

  /* ==========================================================
   * CONTRIBUTION
   * ======================================================== */

  contribute: (
    groupId: string,
    amount: number,
    currency?: Currency,
  ) => Promise<string>;

  /* ==========================================================
   * PROPOSAL
   * ======================================================== */

  createProposal: (
    input: CreateProposalInput,
  ) => Promise<string>;

  voteOnProposal: (
    groupId: string,
    proposalAddress: string,
    vote: PrivateVote,
  ) => Promise<string>;

  /* ==========================================================
   * NOTIFICATIONS
   * ======================================================== */

  markNotificationRead: (
    notificationId: string,
  ) => void;

  markAllNotificationsRead: () => void;

  /* ==========================================================
   * AUTH
   * ======================================================== */

  logout: () => void;
}

/* ============================================================
 * CONTEXT
 * ========================================================== */

const AppContext =
  createContext<AppContextValue | undefined>(
    undefined,
  );

/* ============================================================
 * STORAGE KEYS
 * ========================================================== */

const STORAGE_KEYS = {
  groups: "paydao_groups",
  proposals: "paydao_proposals",
  notifications: "paydao_notifications",
};

/* ============================================================
 * HELPERS
 * ========================================================== */

/**
 * Safely convert Solana PublicKey / BN / other values
 * into a normal JavaScript string.
 *
 * NEVER store PublicKey objects in React state that may
 * eventually be rendered.
 */
function publicKeyToString(
  value: unknown,
): string {
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
    typeof (
      value as {
        toBase58?: unknown;
      }
    ).toBase58 === "function"
  ) {
    return (
      value as {
        toBase58: () => string;
      }
    ).toBase58();
  }

  return String(value);
}

/* ============================================================
 * LOCAL STORAGE
 * ========================================================== */

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
  } catch (error) {
    console.warn(
      `Failed to load ${ key } from localStorage: `,
      error,
    );

    return fallback;
  }
}

function saveStorage<T>(
  key: string,
  value: T,
): void {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value),
    );
  } catch (error) {
    console.warn(
      `Failed to save ${ key } to localStorage: `,
      error,
    );
  }
}

/* ============================================================
 * PROVIDER
 * ========================================================== */

export function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  /* ==========================================================
   * USER
   * ======================================================== */

  const [user, setUser] =
    useState<AppUser | null>(null);

  /* ==========================================================
   * WALLET
   * ======================================================== */

  const [walletAddress, setWalletAddress] =
    useState<string | null>(null);

  const [walletConnected, setWalletConnected] =
    useState(false);

  /* ==========================================================
   * GROUPS
   *
   * Local state is only a UI/cache layer.
   *
   * Blockchain is the source of truth.
   * ======================================================== */

  const [groups, setGroups] =
    useState<GroupData[]>(
      () =>
        loadStorage<GroupData[]>(
          STORAGE_KEYS.groups,
          mockData.groups ?? [],
        ),
    );

  /* ==========================================================
   * PROPOSALS
   * ======================================================== */

  const [proposals, setProposals] =
    useState<Proposal[]>(
      () =>
        loadStorage<Proposal[]>(
          STORAGE_KEYS.proposals,
          mockData.proposals ?? [],
        ),
    );

  /* ==========================================================
   * MEMBERS
   * ======================================================== */

  const [members] =
    useState<Member[]>(
      mockData.members ?? [],
    );

  /* ==========================================================
   * WALLET ASSETS
   * ======================================================== */

  const [walletAssets] =
    useState<WalletAsset[]>(
      mockData.walletAssets ?? [],
    );

  /* ==========================================================
   * NOTIFICATIONS
   * ======================================================== */

  const [notifications, setNotifications] =
    useState<Notification[]>(
      () =>
        loadStorage<Notification[]>(
          STORAGE_KEYS.notifications,
          mockData.notifications ?? [],
        ),
    );

  /* ==========================================================
   * PERSIST CACHE
   * ======================================================== */

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
      STORAGE_KEYS.notifications,
      notifications,
    );
  }, [notifications]);

  /* ==========================================================
   * INITIAL WALLET CHECK
   * ======================================================== */

  useEffect(() => {
    let mounted = true;

    async function checkWallet() {
      try {
        /*
         * getConnectedWallet() returns PublicKey.
         */
        const publicKey =
          await getConnectedWallet();

        if (!mounted) {
          return;
        }

        const address =
          publicKeyToString(publicKey);

        if (address) {
          /*
           * IMPORTANT:
           *
           * React state contains STRING only.
           * Never store PublicKey here.
           */
          setWalletAddress(address);

          setWalletConnected(true);

          setUser({
            name: "Wallet",
            avatarColor: "#00d4e6",
          });
        }
      } catch {
        if (!mounted) {
          return;
        }

        /*
         * No connected wallet is normal.
         */
        setWalletAddress(null);
        setWalletConnected(false);
      }
    }

    void checkWallet();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
   * CONNECT WALLET
   * ======================================================== */

  const connect =
    useCallback(
      async (): Promise<string> => {
        /*
         * connectWallet() returns BrowserWallet,
         * not PublicKey.
         */
        const wallet =
          await connectWallet();

        /*
         * BrowserWallet.publicKey is PublicKey.
         */
        const publicKey =
          wallet.publicKey;

        if (!publicKey) {
          throw new Error(
            "Wallet connected but no public key was returned.",
          );
        }

        /*
         * Convert PublicKey -> string.
         */
        const address =
          publicKeyToString(
            publicKey,
          );

        if (!address) {
          throw new Error(
            "Unable to determine wallet address.",
          );
        }

        setWalletAddress(address);

        setWalletConnected(true);

        setUser({
          name: "Wallet",
          avatarColor: "#00d4e6",
        });

        return address;
      },
      [],
    );

  /* ==========================================================
   * DISCONNECT
   * ======================================================== */

  const disconnect =
    useCallback(
      async (): Promise<void> => {
        /*
         * Your current paydao.ts does not expose a
         * disconnectWallet() function.
         *
         * Therefore we clear the application's wallet
         * state here.
         *
         * If you later add wallet.disconnect(),
         * call it here as well.
         */

        setWalletAddress(null);
        setWalletConnected(false);
        setUser(null);
      },
      [],
    );

  /* ==========================================================
   * GET GROUP FROM CHAIN
   * ======================================================== */

  const getGroupFromChain =
    useCallback(
      async (groupId: string) => {
        if (!groupId?.trim()) {
          throw new Error(
            "Group address is required.",
          );
        }

        return fetchGroupDetailOnChain(
          groupId,
        );
      },
      [],
    );

  /* ==========================================================
   * REFRESH GROUP
   * ======================================================== */

  const refreshGroupFromChain =
    useCallback(
      async (groupId: string) => {
        /*
         * Directly fetch the blockchain.
         *
         * No localStorage dependency.
         */
        return fetchGroupDetailOnChain(
          groupId,
        );
      },
      [],
    );

  /* ==========================================================
   * CREATE GROUP
   * ======================================================== */

  const createGroup =
    useCallback(
      async (
        input: CreateGroupInput,
      ): Promise<string> => {
        if (!walletConnected) {
          throw new Error(
            "Please connect your wallet first.",
          );
        }

        /* ------------------------------------------------------
         * VALIDATION
         * ---------------------------------------------------- */

        if (!input.name?.trim()) {
          throw new Error(
            "Group name is required.",
          );
        }

        if (!input.description?.trim()) {
          throw new Error(
            "Group description is required.",
          );
        }

        if (input.currency !== "SOL") {
          throw new Error(
            "The current on-chain program supports SOL groups only.",
          );
        }

        /* ------------------------------------------------------
         * CREATE ON CHAIN
         * ---------------------------------------------------- */

        const result =
          await createGroupOnChain({
            name: input.name,
            description:
              input.description,
            requiredAmount:
              input.requiredAmount,
            currency:
              input.currency,
            deadline:
              input.deadline,
            visibility:
              input.visibility,
            votingThreshold:
              input.votingThreshold,
          });

        /*
         * createGroupOnChain already returns string.
         */
        const groupAddress =
          publicKeyToString(
            result.groupAddress,
          );

        if (!groupAddress) {
          throw new Error(
            "Group was created but no group address was returned.",
          );
        }

        /* ------------------------------------------------------
         * LOCAL CACHE
         * ---------------------------------------------------- */

        const localGroup =
          {
            id: groupAddress,

            name:
              input.name,

            description:
              input.description,

            creator:
              walletAddress ?? "",

            targetAmount:
              input.requiredAmount,

            currency:
              input.currency,

            visibility:
              input.visibility,

            deadline:
              input.deadline,
          } as unknown as GroupData;

        setGroups((current) => {
          /*
           * Prevent duplicate local cache entries.
           */
          const alreadyExists =
            current.some(
              (group) =>
                String(
                  (
                    group as unknown as {
                      id?: unknown;
                    }
                  ).id ?? "",
                ) === groupAddress,
            );

          if (alreadyExists) {
            return current;
          }

          return [
            localGroup,
            ...current,
          ];
        });

        return groupAddress;
      },
      [
        walletConnected,
        walletAddress,
      ],
    );

  /* ==========================================================
   * CONTRIBUTE
   * ======================================================== */

  const contribute =
    useCallback(
      async (
        groupId: string,
        amount: number,
        currency: Currency = "SOL" as Currency,
      ): Promise<string> => {
        if (!walletConnected) {
          throw new Error(
            "Please connect your wallet first.",
          );
        }

        if (!groupId?.trim()) {
          throw new Error(
            "Group address is required.",
          );
        }

        if (
          !Number.isFinite(amount) ||
          amount <= 0
        ) {
          throw new Error(
            "Contribution amount must be greater than zero.",
          );
        }

        /*
         * IMPORTANT:
         *
         * We verify against blockchain.
         *
         * We do NOT require the group to exist
         * in localStorage.
         */
        await fetchGroupDetailOnChain(
          groupId,
        );

        /*
         * Your REAL paydao.ts signature:
         *
         * contributeOnChain(
         *   groupAddress,
         *   amount,
         *   currency
         * )
         */
        const signature =
          await contributeOnChain(
            groupId,
            amount,
            currency,
          );

        return signature;
      },
      [walletConnected],
    );

  /* ==========================================================
   * CREATE PROPOSAL
   * ======================================================== */

  const createProposal =
    useCallback(
      async (
        input: CreateProposalInput,
      ): Promise<string> => {
        if (!walletConnected) {
          throw new Error(
            "Please connect your wallet first.",
          );
        }

        if (!input.groupId?.trim()) {
          throw new Error(
            "Group address is required.",
          );
        }

        if (!input.title?.trim()) {
          throw new Error(
            "Proposal title is required.",
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

        if (!input.recipient?.trim()) {
          throw new Error(
            "Proposal recipient is required.",
          );
        }

        /*
         * Make sure the group exists on-chain.
         */
        await fetchGroupDetailOnChain(
          input.groupId,
        );

        /*
         * Your REAL paydao.ts signature:
         *
         * createProposalOnChain({
         *   groupId,
         *   title,
         *   description,
         *   amount,
         *   currency,
         *   recipient,
         *   duration
         * })
         */
        const result =
          await createProposalOnChain({
            groupId:
              input.groupId,

            title:
              input.title,

            description:
              input.description,

            amount:
              input.amount,

            currency:
              input.currency,

            recipient:
              input.recipient,

            duration:
              input.duration,
          });

        const proposalAddress =
          publicKeyToString(
            result.proposalAddress,
          );

        /*
         * Cache proposal locally.
         */
        const localProposal =
          {
            id:
              result.proposalId,

            chainAddress:
              proposalAddress,

            groupId:
              input.groupId,

            title:
              input.title,

            description:
              input.description,

            amount:
              input.amount,

            recipient:
              input.recipient,
          } as unknown as Proposal;

        setProposals((current) => [
          localProposal,
          ...current,
        ]);

        /*
         * Return proposal PDA, NOT transaction
         * signature.
         *
         * This is more useful for navigation.
         */
        return proposalAddress;
      },
      [walletConnected],
    );

  /* ==========================================================
   * VOTE ON PROPOSAL
   * ======================================================== */

  const voteOnProposal =
    useCallback(
      async (
        groupId: string,
        proposalAddress: string,
        vote: PrivateVote,
      ): Promise<string> => {
        if (!walletConnected) {
          throw new Error(
            "Please connect your wallet first.",
          );
        }

        if (!groupId?.trim()) {
          throw new Error(
            "Group address is required.",
          );
        }

        if (!proposalAddress?.trim()) {
          throw new Error(
            "Proposal address is required.",
          );
        }

        if (
          vote !== "yes" &&
          vote !== "no" &&
          vote !== "abstain"
        ) {
          throw new Error(
            "Invalid vote.",
          );
        }

        /*
         * Your REAL paydao.ts signature:
         *
         * voteOnProposalOnChain({
         *   groupId,
         *   proposalAddress,
         *   vote
         * })
         */
        return voteOnProposalOnChain({
          groupId,

          proposalAddress,

          vote,
        });
      },
      [walletConnected],
    );

  /* ==========================================================
   * MARK NOTIFICATION READ
   * ======================================================== */

  const markNotificationRead =
    useCallback(
      (notificationId: string) => {
        setNotifications((current) =>
          current.map(
            (notification) =>
              notification.id ===
              notificationId
                ? {
                    ...notification,
                    read: true,
                  }
                : notification,
          ),
        );
      },
      [],
    );

  /* ==========================================================
   * MARK ALL NOTIFICATIONS READ
   * ======================================================== */

  const markAllNotificationsRead =
    useCallback(() => {
      setNotifications((current) =>
        current.map(
          (notification) => ({
            ...notification,
            read: true,
          }),
        ),
      );
    }, []);

  /* ==========================================================
   * LOGOUT
   * ======================================================== */

  const logout =
    useCallback(() => {
      setWalletAddress(null);

      setWalletConnected(false);

      setUser(null);
    }, []);
  

  /* ==========================================================
   * CONTEXT VALUE
   * ======================================================== */

  const value =
    useMemo<AppContextValue>(
      () => ({
        /* User */
        user,

        /* Wallet */
        walletAddress,

        walletConnected,

        /*
         * Keep compatibility with App.tsx.
         */
        isWalletConnected:
          walletConnected,

        connect,

        disconnect,

        /* Data */
        groups,

        proposals,

        members,

        walletAssets,

        notifications,

        /* Group */
        createGroup,

        getGroupFromChain,

        refreshGroupFromChain,

        /* Contribution */
        contribute,

        /* Proposal */
        createProposal,

        voteOnProposal,

        /* Notifications */
        markNotificationRead,

        markAllNotificationsRead,

        /* Auth */
        logout,
      }),
      [
        user,

        walletAddress,

        walletConnected,

        connect,

        disconnect,

        groups,

        proposals,

        members,

        walletAssets,

        notifications,

        createGroup,

        getGroupFromChain,

        refreshGroupFromChain,

        contribute,

        createProposal,

        voteOnProposal,

        markNotificationRead,

        markAllNotificationsRead,

        logout,
      ],
    );

  /* ==========================================================
   * PROVIDER
   * ======================================================== */

  return (
    <AppContext.Provider
      value={value}
    >
      {children}
    </AppContext.Provider>
  );
}
export function useApp(): AppContextValue {
  const context =
    useContext(AppContext);

  if (!context) {
    throw new Error(
      "useApp must be used inside AppProvider",
    );
  }

  return context;
}
