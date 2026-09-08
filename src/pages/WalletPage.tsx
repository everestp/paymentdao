import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Wallet as WalletIcon,
  Activity,
  Coins,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { PublicKey } from "@solana/web3.js";

import {
  PixelCard,
  PixelButton,
  StatusBadge,
  SectionHeader,
} from "@/components/retro";

/* ============================================================
 * TYPES
 * ========================================================== */

type TokenAsset = {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  rawBalance: string;
};

type RecentTransaction = {
  signature: string;
  slot: number;
  blockTime: number | null;
  status: "confirmed" | "failed";
  fee: number;
};

/* ============================================================
 * HELPERS
 * ========================================================== */

function shortenAddress(address: string, chars = 6) {
  if (!address) return "—";

  if (address.length <= chars * 2 + 3) {
    return address;
  }

  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function formatNumber(value: number, decimals = 4) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatSOL(lamports: number) {
  return formatNumber(lamports / 1_000_000_000, 9);
}

function formatDate(timestamp: number | null) {
  if (!timestamp) {
    return "Unknown";
  }

  return new Date(timestamp * 1000).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getExplorerAddress(address: string) {
  return `https://explorer.solana.com/address/${address}`;
}

function getExplorerTransaction(signature: string) {
  return `https://explorer.solana.com/tx/${signature}`;
}

function getTokenSymbol(
  mint: string,
): {
  symbol: string;
  name: string;
} {
  /*
   * Known/common tokens can be labeled here.
   *
   * Unknown SPL tokens are displayed using their mint address.
   */
  const knownTokens: Record<
    string,
    {
      symbol: string;
      name: string;
    }
  > = {
    // Add your project's PAY mint here when available.
    //
    // "YOUR_PAY_MINT": {
    //   symbol: "PAY",
    //   name: "PayDAO",
    // },
  };

  return (
    knownTokens[mint] ?? {
      symbol: shortenAddress(mint, 4),
      name: "SPL Token",
    }
  );
}

/* ============================================================
 * WALLET PAGE
 * ========================================================== */

export function WalletPage() {
  const navigate = useNavigate();

  const { connection } = useConnection();

  const {
    publicKey,
    connected,
    connecting,
    disconnect,
  } = useWallet();

  const [solBalance, setSolBalance] = useState<number>(0);

  const [tokenAssets, setTokenAssets] = useState<TokenAsset[]>([]);

  const [transactions, setTransactions] = useState<
    RecentTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  const walletAddress = publicKey?.toBase58() ?? "";

  /* ============================================================
   * FETCH WALLET DATA
   * ========================================================== */

  const loadWallet = useCallback(
    async (manualRefresh = false) => {
      if (!publicKey) {
        setSolBalance(0);
        setTokenAssets([]);
        setTransactions([]);
        setLoading(false);
        return;
      }

      try {
        if (manualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        /* ======================================================
         * SOL BALANCE
         * ==================================================== */

        const balance =
          await connection.getBalance(publicKey, "confirmed");

        setSolBalance(balance);

        /* ======================================================
         * SPL TOKEN ACCOUNTS
         * ==================================================== */

        const tokenAccounts =
          await connection.getParsedTokenAccountsByOwner(
            publicKey,
            {
              programId: new PublicKey(
                "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
              ),
            },
            "confirmed",
          );

        const parsedTokens: TokenAsset[] = [];

        for (const account of tokenAccounts.value) {
          const info =
            account.account.data.parsed.info;

          const tokenAmount =
            info.tokenAmount;

          const rawAmount =
            tokenAmount.amount as string;

          const decimals =
            tokenAmount.decimals as number;

          const balance =
            Number(tokenAmount.uiAmount ?? 0);

          /*
           * Don't display empty token accounts.
           */
          if (balance === 0) {
            continue;
          }

          const mint =
            info.mint as string;

          const metadata =
            getTokenSymbol(mint);

          parsedTokens.push({
            mint,
            symbol: metadata.symbol,
            name: metadata.name,
            balance,
            decimals,
            rawBalance: rawAmount,
          });
        }

        /*
         * Largest balances first.
         */
        parsedTokens.sort(
          (a, b) => b.balance - a.balance,
        );

        setTokenAssets(parsedTokens);

        /* ======================================================
         * RECENT TRANSACTIONS
         * ==================================================== */

        const signatures =
          await connection.getSignaturesForAddress(
            publicKey,
            {
              limit: 15,
            },
            "confirmed",
          );

        const recentTransactions: RecentTransaction[] =
          signatures.map((item) => ({
            signature: item.signature,
            slot: item.slot,
            blockTime: item.blockTime,
            status:
              item.err === null
                ? "confirmed"
                : "failed",
            fee: 0,
          }));

        /*
         * Fetch transaction fees separately.
         *
         * We don't fail the entire wallet page if an old
         * transaction is unavailable.
         */
        const transactionsWithFees =
          await Promise.all(
            recentTransactions.map(async (tx) => {
              try {
                const transaction =
                  await connection.getParsedTransaction(
                    tx.signature,
                    {
                      commitment: "confirmed",
                      maxSupportedTransactionVersion: 0,
                    },
                  );

                return {
                  ...tx,
                  fee:
                    transaction?.meta?.fee ?? 0,
                };
              } catch {
                return tx;
              }
            }),
          );

        setTransactions(
          transactionsWithFees,
        );
      } catch (err) {
        console.error(
          "Failed to load wallet:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load wallet data.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [connection, publicKey],
  );

  /* ============================================================
   * LOAD ON CONNECT
   * ========================================================== */

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  /* ============================================================
   * COPY ADDRESS
   * ========================================================== */

  const copyAddress = async () => {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(
        walletAddress,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // Clipboard may be unavailable in some browsers.
    }
  };

  /* ============================================================
   * PORTFOLIO STATS
   * ========================================================== */

  const tokenAccountCount =
    tokenAssets.length;

  const totalTokenAccounts =
    useMemo(() => {
      return tokenAssets.length;
    }, [tokenAssets]);

  const totalAssets =
    1 + tokenAssets.length;

  /* ============================================================
   * NOT CONNECTED
   * ========================================================== */

  if (!connected || !publicKey) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Wallet"
          subtitle="Connect your Solana wallet to view your on-chain assets"
        />

        <PixelCard>
          <div className="min-h-[360px] flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-2xl border-2 border-cyan/30 bg-cyan/10 flex items-center justify-center mb-6">
              <WalletIcon className="w-10 h-10 text-cyan" />
            </div>

            <h2 className="font-heading text-xl font-bold text-txprim uppercase mb-2">
              Wallet Not Connected
            </h2>

            <p className="text-sm text-txsec max-w-md mb-6">
              Connect your Solana wallet to view your
              SOL balance, SPL tokens, wallet activity,
              token accounts, and transaction history.
            </p>

            {connecting ? (
              <PixelButton
                variant="primary"
                disabled
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </PixelButton>
            ) : (
              <div className="text-xs font-mono text-txdim">
                Use the wallet connector in the
                navigation bar.
              </div>
            )}
          </div>
        </PixelCard>
      </div>
    );
  }

  /* ============================================================
   * MAIN
   * ========================================================== */

  return (
    <div className="space-y-6 pb-8">
      {/* ========================================================
          HEADER
      ======================================================== */}

      <SectionHeader
        title="Wallet"
        subtitle="Live on-chain wallet overview"
        action={
          <div className="flex gap-2">
            <PixelButton
              variant="primary"
              size="sm"
              onClick={() =>
                navigate("/send")
              }
            >
              <ArrowUpRight className="w-4 h-4" />
              Send
            </PixelButton>

            <PixelButton
              variant="green"
              size="sm"
              onClick={() =>
                navigate("/receive")
              }
            >
              <ArrowDownLeft className="w-4 h-4" />
              Receive
            </PixelButton>

            <PixelButton
              size="sm"
              onClick={() =>
                void loadWallet(true)
              }
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing
                    ? "animate-spin"
                    : ""
                  }`}
              />
              Refresh
            </PixelButton>
          </div>
        }
      />

      {/* ========================================================
          ERROR
      ======================================================== */}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red/30 bg-red/5">
          <AlertCircle className="w-5 h-5 text-red shrink-0" />

          <div>
            <div className="text-sm font-bold text-red">
              Failed to load wallet data
            </div>

            <div className="text-xs text-txsec mt-1">
              {error}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          WALLET HERO
      ======================================================== */}

      <PixelCard>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl border border-cyan/30 bg-cyan/10 flex items-center justify-center">
                <WalletIcon className="w-5 h-5 text-cyan" />
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-txdim">
                  Connected Wallet
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-txprim font-bold">
                    {shortenAddress(
                      walletAddress,
                      8,
                    )}
                  </span>

                  <StatusBadge variant="success">
                    Connected
                  </StatusBadge>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-xs text-txdim uppercase tracking-wide mb-2">
                SOL Balance
              </div>

              <div className="flex items-end gap-3">
                <span className="text-4xl font-heading font-bold text-cyan font-mono">
                  {loading
                    ? "..."
                    : formatSOL(
                      solBalance,
                    )}
                </span>

                <span className="text-sm text-txsec font-mono mb-1">
                  SOL
                </span>
              </div>

              <div className="text-xs text-txdim font-mono mt-2">
                {solBalance.toLocaleString(
                  "en-US",
                )} lamports
              </div>
            </div>
          </div>

          {/* Address block */}

          <div className="lg:w-[430px]">
            <div className="card bg-bgdark p-4 rounded-xl">
              <div className="text-xs text-txdim uppercase tracking-wide mb-2">
                Wallet Address
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-txprim break-all">
                    {walletAddress}
                  </div>
                </div>

                <button
                  onClick={copyAddress}
                  className="w-9 h-9 shrink-0 flex items-center justify-center border border-bdlight rounded-lg hover:border-cyan hover:text-cyan transition-colors"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>

                <a
                  href={getExplorerAddress(
                    walletAddress,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="w-9 h-9 shrink-0 flex items-center justify-center border border-bdlight rounded-lg hover:border-cyan hover:text-cyan transition-colors"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="card bg-bgdark p-3">
                <div className="text-[10px] text-txdim uppercase">
                  Network
                </div>

                <div className="text-xs text-green font-mono mt-1">
                  Solana
                </div>
              </div>

              <div className="card bg-bgdark p-3">
                <div className="text-[10px] text-txdim uppercase">
                  Assets
                </div>

                <div className="text-xs text-txprim font-mono mt-1">
                  {totalAssets}
                </div>
              </div>

              <div className="card bg-bgdark p-3">
                <div className="text-[10px] text-txdim uppercase">
                  Activity
                </div>

                <div className="text-xs text-txprim font-mono mt-1">
                  {transactions.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PixelCard>

      {/* ========================================================
          QUICK ACTIONS
      ======================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PixelButton
          variant="primary"
          onClick={() =>
            navigate("/send")
          }
        >
          <ArrowUpRight className="w-4 h-4" />
          Send
        </PixelButton>

        <PixelButton
          variant="green"
          onClick={() =>
            navigate("/receive")
          }
        >
          <ArrowDownLeft className="w-4 h-4" />
          Receive
        </PixelButton>

        <PixelButton
          onClick={() =>
            void loadWallet(true)
          }
        >
          <RefreshCw className="w-4 h-4" />
          Sync
        </PixelButton>

        <PixelButton
          onClick={() =>
            window.open(
              getExplorerAddress(
                walletAddress,
              ),
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          <ExternalLink className="w-4 h-4" />
          Explorer
        </PixelButton>
      </div>

      {/* ========================================================
          WALLET STATS
      ======================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <PixelCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-cyan" />
            </div>

            <div>
              <div className="text-xs text-txdim uppercase">
                SOL
              </div>

              <div className="font-mono text-sm font-bold text-txprim">
                {formatSOL(solBalance)}
              </div>
            </div>
          </div>
        </PixelCard>

        <PixelCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-green" />
            </div>

            <div>
              <div className="text-xs text-txdim uppercase">
                SPL Tokens
              </div>

              <div className="font-mono text-sm font-bold text-txprim">
                {tokenAccountCount}
              </div>
            </div>
          </div>
        </PixelCard>

        <PixelCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow/10 border border-yellow/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-yellow" />
            </div>

            <div>
              <div className="text-xs text-txdim uppercase">
                Transactions
              </div>

              <div className="font-mono text-sm font-bold text-txprim">
                {transactions.length}
              </div>
            </div>
          </div>
        </PixelCard>

        <PixelCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-purple" />
            </div>

            <div>
              <div className="text-xs text-txdim uppercase">
                Status
              </div>

              <div className="font-mono text-sm font-bold text-green">
                Active
              </div>
            </div>
          </div>
        </PixelCard>
      </div>

      {/* ========================================================
          ASSETS
      ======================================================== */}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-heading font-semibold text-txprim uppercase tracking-wide">
            Assets
          </h3>

          <span className="text-xs font-mono text-txdim">
            {tokenAssets.length + 1} assets
          </span>
        </div>

        <div className="space-y-3">
          {/* SOL */}

          <PixelCard hover>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-cyan/10 border-2 border-cyan text-cyan font-heading text-xl font-bold">
                ◎
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-txprim">
                    SOL
                  </span>

                  <span className="text-xs text-txdim font-mono">
                    Solana
                  </span>
                </div>

                <div className="text-xs text-txsec font-mono mt-1">
                  Native SOL balance
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-sm font-bold text-txprim">
                  {formatSOL(
                    solBalance,
                  )}{" "}
                  SOL
                </div>

                <div className="text-xs text-txdim font-mono">
                  {solBalance.toLocaleString(
                    "en-US",
                  )} lamports
                </div>
              </div>
            </div>
          </PixelCard>

          {/* SPL TOKENS */}

          {tokenAssets.map((asset) => (
            <PixelCard
              key={asset.mint}
              hover
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl bg-bgpanel2 border-2 border-bdlight font-heading font-bold text-lg text-cyan">
                  $
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-txprim">
                      {asset.symbol}
                    </span>

                    <span className="text-xs text-txdim font-mono">
                      {asset.name}
                    </span>
                  </div>

                  <div className="font-mono text-[11px] text-txdim truncate mt-1">
                    Mint: {asset.mint}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-sm font-bold text-txprim">
                    {formatNumber(
                      asset.balance,
                      Math.min(
                        asset.decimals,
                        6,
                      ),
                    )}
                  </div>

                  <div className="font-mono text-xs text-txdim">
                    {asset.decimals} decimals
                  </div>
                </div>

                <a
                  href={getExplorerAddress(
                    asset.mint,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 shrink-0 flex items-center justify-center border border-bdlight rounded-lg hover:border-cyan hover:text-cyan transition-colors"
                  title="View token mint"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </PixelCard>
          ))}

          {!loading &&
            tokenAssets.length === 0 && (
              <PixelCard>
                <div className="py-10 text-center">
                  <Coins className="w-8 h-8 mx-auto text-txdim mb-3" />

                  <div className="text-sm text-txsec">
                    No SPL tokens found
                  </div>

                  <div className="text-xs text-txdim mt-1">
                    This wallet currently has no
                    non-zero SPL token balances.
                  </div>
                </div>
              </PixelCard>
            )}
        </div>
      </div>

      {/* ========================================================
          WALLET INFORMATION
      ======================================================== */}

      <PixelCard>
        <div className="flex items-center gap-2 mb-5">
          <ShieldCheck className="w-4 h-4 text-cyan" />

          <h3 className="text-sm font-heading font-semibold text-txprim uppercase tracking-wide">
            Wallet Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoRow
            label="Public Address"
            value={shortenAddress(
              walletAddress,
              12,
            )}
            mono
          />

          <InfoRow
            label="SOL Balance"
            value={`${formatSOL(
              solBalance,
            )} SOL`}
            mono
          />

          <InfoRow
            label="Lamports"
            value={solBalance.toLocaleString(
              "en-US",
            )}
            mono
          />

          <InfoRow
            label="SPL Token Accounts"
            value={String(
              totalTokenAccounts,
            )}
            mono
          />

          <InfoRow
            label="Network"
            value="Solana"
          />

          <InfoRow
            label="Commitment"
            value="Confirmed"
          />
        </div>
      </PixelCard>

      {/* ========================================================
          RECENT TRANSACTIONS
      ======================================================== */}

      <PixelCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-heading font-semibold text-txprim uppercase tracking-wide">
              Recent Activity
            </h3>

            <p className="text-xs text-txdim mt-1">
              Latest transactions involving this wallet
            </p>
          </div>

          <PixelButton
            variant="ghost"
            size="sm"
            onClick={() =>
              navigate("/transactions")
            }
          >
            View all
          </PixelButton>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-cyan animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <Activity className="w-8 h-8 mx-auto text-txdim mb-3" />

            <div className="text-sm text-txsec">
              No recent transactions
            </div>

            <div className="text-xs text-txdim mt-1">
              Transactions involving this wallet
              will appear here.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions
              .slice(0, 10)
              .map((tx) => (
                <a
                  key={tx.signature}
                  href={getExplorerTransaction(
                    tx.signature,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-bdlight hover:bg-bgpanel2 transition-colors"
                >
                  <div className="w-9 h-9 shrink-0 flex items-center justify-center border border-bdlight rounded-lg">
                    {tx.status ===
                      "confirmed" ? (
                      <Check className="w-4 h-4 text-green" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-txprim truncate">
                      {tx.signature}
                    </div>

                    <div className="font-mono text-[11px] text-txdim mt-1">
                      {formatDate(
                        tx.blockTime,
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:block text-right mr-2">
                    <div className="text-[10px] uppercase text-txdim">
                      Fee
                    </div>

                    <div className="font-mono text-xs text-txsec">
                      {formatSOL(
                        tx.fee,
                      )}{" "}
                      SOL
                    </div>
                  </div>

                  <StatusBadge
                    variant={
                      tx.status ===
                        "confirmed"
                        ? "success"
                        : "rejected"
                    }
                  >
                    {tx.status}
                  </StatusBadge>

                  <ExternalLink className="w-3.5 h-3.5 text-txdim shrink-0" />
                </a>
              ))}
          </div>
        )}
      </PixelCard>

      {/* ========================================================
          DANGER / DISCONNECT
      ======================================================== */}

      <PixelCard>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-heading font-semibold text-txprim uppercase">
              Connected Wallet
            </div>

            <div className="text-xs text-txdim font-mono mt-1">
              {shortenAddress(
                walletAddress,
                8,
              )}
            </div>
          </div>

          <PixelButton
            onClick={() => {
              void disconnect();
            }}
          >
            Disconnect Wallet
          </PixelButton>
        </div>
      </PixelCard>
    </div>
  );
}

/* ============================================================
 * INFO ROW
 * ========================================================== */

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-bgdark border border-bdlight">
      <span className="text-xs text-txdim uppercase tracking-wide">
        {label}
      </span>

      <span
        className={`text-xs text-txprim text-right ${mono ? "font-mono" : ""
          }`}
      >
        {value}
      </span>
    </div>
  );
}
