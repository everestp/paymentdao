import {
  NetworkBadge,
  PixelAvatar,
} from "@/components/retro";

import { cn } from "@/lib/utils";
import { useApp } from "@/store/AppContext";

import {
  useWallet,
} from "@solana/wallet-adapter-react";

import {
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";

import {
  Bell,
  CheckCheck,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  UserCircle,
  Zap,
  Wallet,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

/* ============================================================
 * WALLET ADDRESS FORMATTER
 * ========================================================== */

function formatWalletAddress(
  value: unknown,
): string {
  if (!value) {
    return "Not connected";
  }

  if (typeof value === "string") {
    if (value.length <= 12) {
      return value;
    }

    return `${value.slice(
      0,
      4,
    )}...${value.slice(-4)}`;
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
    const address = (
      value as {
        toBase58: () => string;
      }
    ).toBase58();

    if (address.length <= 12) {
      return address;
    }

    return `${address.slice(
      0,
      4,
    )}...${address.slice(-4)}`;
  }

  try {
    const stringValue = String(value);

    if (stringValue.length <= 12) {
      return stringValue;
    }

    return `${stringValue.slice(
      0,
      4,
    )}...${stringValue.slice(-4)}`;
  } catch {
    return "Not connected";
  }
}

/* ============================================================
 * TOPBAR
 * ========================================================== */

export function Topbar({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const {
    user,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    logout,
  } = useApp();

  /*
   * ==========================================================
   * SOLANA WALLET ADAPTER
   * ========================================================
   */

  const {
    connected,
    connecting,
    publicKey,
    disconnect,
  } = useWallet();

  const navigate = useNavigate();

  /* ==========================================================
   * STATE
   * ======================================================== */

  const [
    searchOpen,
    setSearchOpen,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    notifOpen,
    setNotifOpen,
  ] = useState(false);

  const [
    userMenuOpen,
    setUserMenuOpen,
  ] = useState(false);

  /* ==========================================================
   * REFS
   * ======================================================== */

  const notifRef =
    useRef<HTMLDivElement>(null);

  const userRef =
    useRef<HTMLDivElement>(null);

  /* ==========================================================
   * WALLET
   * ======================================================== */

  const walletAddress =
    publicKey?.toBase58() ?? "";

  const walletDisplay =
    connected && publicKey
      ? formatWalletAddress(
        publicKey,
      )
      : "Not connected";

  /* ==========================================================
   * NOTIFICATIONS
   * ======================================================== */

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read,
    ).length;

  /* ==========================================================
   * CLOSE MENUS
   * ======================================================== */

  useEffect(() => {
    function handleClick(
      event: MouseEvent,
    ) {
      const target =
        event.target as Node;

      if (
        notifRef.current &&
        !notifRef.current.contains(
          target,
        )
      ) {
        setNotifOpen(false);
      }

      if (
        userRef.current &&
        !userRef.current.contains(
          target,
        )
      ) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClick,
      );
    };
  }, []);

  /* ==========================================================
   * SEARCH RESULTS
   * ======================================================== */

  const searchResults =
    searchQuery.length > 1
      ? [
        {
          label: "Dashboard",
          path: "/dashboard",
        },
        {
          label: "Groups",
          path: "/groups",
        },
        {
          label: "Send Money",
          path: "/send",
        },
        {
          label: "Proposals",
          path: "/proposals",
        },
        {
          label: "Transactions",
          path: "/transactions",
        },
        {
          label: "Wallet",
          path: "/wallet",
        },
      ].filter((result) =>
        result.label
          .toLowerCase()
          .includes(
            searchQuery.toLowerCase(),
          ),
      )
      : [];

  /* ==========================================================
   * NAVIGATION
   * ======================================================== */

  const handleNavigation = (
    path: string,
  ) => {
    navigate(path);

    setSearchOpen(false);
    setSearchQuery("");
    setNotifOpen(false);
    setUserMenuOpen(false);
  };

  /* ==========================================================
   * SIGN OUT
   * ======================================================== */

  const handleLogout = async () => {
    setUserMenuOpen(false);

    try {
      /*
       * Disconnect Solana Wallet Adapter.
       */
      if (connected) {
        await disconnect();
      }
    } catch (error) {
      console.error(
        "Failed to disconnect wallet:",
        error,
      );
    }

    /*
     * Keep your existing app cleanup
     * if AppContext still has it.
     */
    try {
      logout();
    } catch (error) {
      console.error(
        "App logout failed:",
        error,
      );
    }

    navigate("/login", {
      replace: true,
    });
  };

  /* ==========================================================
   * RENDER
   * ======================================================== */

  return (
    <header className="sticky top-0 z-40 bg-bgpanel border-b border-bdlight">
      <div className="flex items-center gap-3 px-4 lg:px-6 h-16">

        {/* ==================================================
            MOBILE MENU
        ================================================== */}

        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden text-txsec hover:text-txprim p-1"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* ==================================================
            SEARCH
        ================================================== */}

        <div className="hidden md:flex relative flex-1 max-w-md">
          <div className="relative w-full">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txdim" />

            <input
              type="text"
              placeholder="Search PayDAO..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(
                  event.target.value,
                );
                setSearchOpen(true);
              }}
              onFocus={() =>
                setSearchOpen(true)
              }
              onBlur={() =>
                setTimeout(
                  () =>
                    setSearchOpen(
                      false,
                    ),
                  200,
                )
              }
              className="input pl-10"
              aria-label="Search PayDAO"
            />
          </div>

          {/* Search Results */}

          {searchOpen &&
            searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full card bg-bgpanel z-50 p-1">

                {searchResults.map(
                  (result) => (
                    <button
                      key={result.path}
                      type="button"
                      onClick={() =>
                        handleNavigation(
                          result.path,
                        )
                      }
                      className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg hover:bg-bgpanel2 transition-colors text-left"
                    >
                      <span className="text-sm text-txprim">
                        {result.label}
                      </span>
                    </button>
                  ),
                )}
              </div>
            )}
        </div>

        {/* ==================================================
            MOBILE SPACER
        ================================================== */}

        <div className="flex-1 md:hidden" />

        {/* ==================================================
            NETWORK
        ================================================== */}

        <div className="hidden xl:block">
          <NetworkBadge live />
        </div>

        {/* ==================================================
            WALLET CONNECT
        ================================================== */}

        <div className="hidden sm:block">
          <WalletMultiButton />
        </div>

        {/* ==================================================
            NOTIFICATIONS
        ================================================== */}

        <div
          ref={notifRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() => {
              setNotifOpen(
                (current) =>
                  !current,
              );

              setUserMenuOpen(false);
            }}
            className="relative p-2 text-txsec hover:text-txprim transition-colors border border-bdlight rounded-lg hover:border-bdbright"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red text-white text-xs font-bold flex items-center justify-center rounded-full">
                {unreadCount > 9
                  ? "9+"
                  : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 card bg-bgpanel z-50 max-h-96 overflow-y-auto p-0">

              <div className="flex items-center justify-between p-3 border-b border-bdlight sticky top-0 bg-bgpanel">

                <span className="text-sm font-semibold text-txprim">
                  Notifications
                </span>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={
                      markAllNotificationsRead
                    }
                    className="flex items-center gap-1 text-cyan hover:text-cyan/80"
                  >
                    <CheckCheck className="w-3 h-3" />

                    <span className="text-xs">
                      Mark all
                    </span>
                  </button>
                )}
              </div>

              {notifications.length ===
                0 ? (
                <div className="p-6 text-center">

                  <Bell className="w-5 h-5 text-txdim mx-auto mb-2" />

                  <p className="text-sm text-txsec">
                    No notifications
                  </p>

                </div>
              ) : (
                notifications
                  .slice(0, 8)
                  .map(
                    (
                      notification,
                    ) => (
                      <button
                        key={
                          notification.id
                        }
                        type="button"
                        onClick={() =>
                          markNotificationRead(
                            notification.id,
                          )
                        }
                        className={cn(
                          "w-full text-left p-3 border-b border-bdlight/50 hover:bg-bgpanel2 transition-colors",
                          !notification.read &&
                          "bg-cyan/5",
                        )}
                      >
                        <div className="flex items-start gap-2">

                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-cyan mt-1.5 shrink-0 blink" />
                          )}

                          <div
                            className={cn(
                              "flex-1 min-w-0",
                              notification.read &&
                              "ml-4",
                            )}
                          >
                            <p className="text-sm text-txprim font-medium truncate">
                              {
                                notification.title
                              }
                            </p>

                            <p className="text-xs text-txsec truncate">
                              {
                                notification.message
                              }
                            </p>

                            <p className="text-xs text-txdim mt-1">
                              {
                                notification.timeAgo
                              }
                            </p>
                          </div>
                        </div>
                      </button>
                    ),
                  )
              )}
            </div>
          )}
        </div>

        {/* ==================================================
            USER MENU
        ================================================== */}

        <div
          ref={userRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() => {
              setUserMenuOpen(
                (current) =>
                  !current,
              );

              setNotifOpen(false);
            }}
            className="flex items-center gap-2 p-1 pr-2 border border-bdlight rounded-lg hover:border-bdbright transition-colors"
            aria-label="User menu"
          >

            <PixelAvatar
              name={
                user?.name ||
                (connected
                  ? "Wallet"
                  : "Guest")
              }
              color={
                user?.avatarColor ||
                "#00d4e6"
              }
              size="sm"
            />

            <div className="hidden sm:block text-left">

              <div className="text-sm text-txprim font-medium">
                {user?.name ||
                  (connected
                    ? "Wallet"
                    : "Guest")}
              </div>

              <div className="text-xs text-txdim font-mono">
                {walletDisplay}
              </div>

            </div>

            <ChevronDown className="w-3 h-3 text-txdim hidden sm:block" />
          </button>

          {/* ==================================================
              USER DROPDOWN
          ================================================== */}

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 card bg-bgpanel z-50 p-1">

              {/* Account Header */}

              <div className="p-3 border-b border-bdlight">

                <div className="flex items-center gap-2 mb-2">

                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      connected
                        ? "bg-green"
                        : "bg-txdim",
                    )}
                  />

                  <span
                    className={cn(
                      "text-xs uppercase tracking-wide font-semibold",
                      connected
                        ? "text-green"
                        : "text-txdim",
                    )}
                  >
                    {connected
                      ? "Wallet connected"
                      : "Wallet disconnected"}
                  </span>

                </div>

                <div className="text-sm text-txprim font-medium">
                  {user?.name ||
                    (connected
                      ? "Solana Wallet"
                      : "Guest")}
                </div>

                <div className="text-xs text-txdim font-mono mt-1 break-all">
                  {walletDisplay}
                </div>

                {connected &&
                  publicKey && (
                    <div className="text-[10px] text-txdim mt-2">
                      Solana Devnet
                    </div>
                  )}
              </div>

              {/* Connect Wallet */}

              {!connected && (
                <div className="p-2 border-b border-bdlight">
                  <div className="flex items-center gap-2 mb-2 px-2">

                    <Wallet className="w-4 h-4 text-cyan" />

                    <span className="text-xs text-txsec">
                      Connect your wallet
                    </span>

                  </div>

                  <WalletMultiButton
                    style={{
                      width: "100%",
                      justifyContent:
                        "center",
                    }}
                  />
                </div>
              )}

              {/* Profile */}

              <button
                type="button"
                onClick={() =>
                  handleNavigation(
                    "/settings",
                  )
                }
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-bgpanel2 transition-colors text-left"
              >
                <UserCircle className="w-4 h-4 text-txsec" />

                <span className="text-sm text-txsec">
                  Profile & Settings
                </span>
              </button>

              {/* Wallet */}

              <button
                type="button"
                onClick={() =>
                  handleNavigation(
                    "/wallet",
                  )
                }
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-bgpanel2 transition-colors text-left"
              >
                <Zap className="w-4 h-4 text-yellow" />

                <span className="text-sm text-txsec">
                  My Wallet
                </span>
              </button>

              {/* Disconnect */}

              {connected && (
                <div className="border-t border-bdlight mt-1 pt-1">

                  <button
                    type="button"
                    onClick={
                      handleLogout
                    }
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg hover:bg-red/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red" />

                    <span className="text-sm text-red">
                      Disconnect Wallet
                    </span>
                  </button>

                </div>
              )}
            </div>
          )}
        </div>

        {/* ==================================================
            MOBILE WALLET
        ================================================== */}

        <div className="sm:hidden">
          {connecting ? (
            <div className="p-2 border border-bdlight rounded-lg">
              <Wallet className="w-4 h-4 text-cyan animate-pulse" />
            </div>
          ) : (
            <WalletMultiButton
              style={{
                minWidth: "42px",
                width: "42px",
                height: "42px",
                padding: 0,
                justifyContent: "center",
              }}
            />
          )}
        </div>

      </div>
    </header>
  );
}
