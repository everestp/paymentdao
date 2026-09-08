import { PixelCard } from "@/components/retro/PixelCard";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Vote,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

export function LoginPage() {
  const navigate = useNavigate();

  const {
    connected,
    connecting,
    publicKey,
  } = useWallet();

  const [error, setError] = useState("");

  /*
   * ----------------------------------------------------------
   * REDIRECT AFTER WALLET CONNECTION
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (connected && publicKey) {
      navigate("/onboarding", {
        replace: true,
      });
    }
  }, [connected, publicKey, navigate]);

  /*
   * ----------------------------------------------------------
   * FEATURES
   * ----------------------------------------------------------
   */

  const features = [
    {
      icon: Wallet,
      title: "Collaborative Funding",
      desc: "Pool funds toward shared goals and milestones",
      color: "#00d4e6",
    },
    {
      icon: Vote,
      title: "Private Voting",
      desc: "Vote on proposals without revealing your identity",
      color: "#00e676",
    },
    {
      icon: Zap,
      title: "Instant Contributions",
      desc: "Send and receive contributions in real-time",
      color: "#ffd600",
    },
  ];

  return (
    <div className="min-h-screen bg-bgdark grid-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* ======================================================
          BACKGROUND ANIMATION
      ====================================================== */}

      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 rounded-2xl border border-bdlight/30"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
        {/* ====================================================
            LEFT SIDE
        ==================================================== */}

        <div className="hidden lg:flex flex-col gap-6">
          <motion.div
            initial={{
              opacity: 0,
              x: -20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              duration: 0.5,
            }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 flex items-center justify-center bg-cyan text-bgdark font-heading font-bold text-xl rounded-xl"
                style={{
                  boxShadow:
                    "0 0 20px rgba(0,212,230,0.4)",
                }}
              >
                P
              </div>

              <div>
                <div className="font-heading font-semibold text-lg text-txprim">
                  PayDAO
                </div>

                <div className="text-xs text-txdim font-mono">
                  v2.0 Demo Environment
                </div>
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-heading font-semibold text-txprim mb-4 leading-tight">
              Money,
              <br />
              <span className="text-cyan">
                decided
              </span>{" "}
              together.
            </h1>

            <p className="text-sm text-txsec max-w-md mb-6">
              Create collaborative funding pools,
              contribute to shared goals, vote on
              proposals, and watch your community grow
              — without the spreadsheet chaos.
            </p>
          </motion.div>

          {/* Features */}
          <div className="grid gap-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  key={feature.title}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.4,
                    delay: 0.2 + i * 0.1,
                  }}
                >
                  <PixelCard className="flex items-center gap-4 p-4">
                    <div
                      className="w-10 h-10 flex items-center justify-center shrink-0 rounded-lg"
                      style={{
                        background: `${feature.color}15`,
                        border: `1px solid ${feature.color}40`,
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{
                          color: feature.color,
                        }}
                      />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-txprim mb-0.5">
                        {feature.title}
                      </div>

                      <div className="text-xs text-txsec">
                        {feature.desc}
                      </div>
                    </div>
                  </PixelCard>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ====================================================
            RIGHT SIDE
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            x: 20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.5,
          }}
        >
          <PixelCard className="p-6 md:p-8">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 flex items-center justify-center bg-cyan text-bgdark font-heading font-bold rounded-lg"
                style={{
                  boxShadow:
                    "0 0 16px rgba(0,212,230,0.4)",
                }}
              >
                P
              </div>

              <div>
                <div className="font-heading font-semibold text-txprim">
                  PayDAO
                </div>

                <div className="text-xs text-txdim">
                  Demo Environment
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-heading font-semibold text-txprim mb-1">
                Connect Wallet
              </h2>

              <p className="text-sm text-txsec">
                Your Solana wallet is your identity.
              </p>
            </div>

            {/* =================================================
                WALLET NOTICE
            ================================================= */}

            <div
              className="card p-4 mb-6 bg-bgdark"
              style={{
                borderColor:
                  "rgba(0,212,230,0.3)",
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background:
                      "rgba(0,212,230,0.1)",
                    border:
                      "1px solid rgba(0,212,230,0.3)",
                  }}
                >
                  <Wallet className="w-4 h-4 text-cyan" />
                </div>

                <div>
                  <div className="text-xs font-semibold text-cyan uppercase tracking-wide mb-1">
                    Wallet Authentication
                  </div>

                  <p className="text-xs text-txsec leading-relaxed">
                    Connect your Solana wallet to access
                    PayDAO. No email or password is
                    required.
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                WALLET ADAPTER BUTTON
            ================================================= */}

            <div className="wallet-connect-wrapper">
              <WalletMultiButton
                style={{
                  width: "100%",
                  height: "48px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              />
            </div>

            {/* =================================================
                CONNECTING
            ================================================= */}

            {connecting && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-cyan border-t-transparent rounded-full spin" />

                <span className="text-xs text-txsec">
                  Connecting wallet...
                </span>
              </div>
            )}

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div
                className="card p-3 mt-4 bg-red/10"
                style={{
                  borderColor:
                    "rgba(255,56,96,0.3)",
                }}
              >
                <p className="text-sm text-red">
                  {error}
                </p>
              </div>
            )}

            {/* =================================================
                CONNECTED WALLET
            ================================================= */}

            {connected && publicKey && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: 5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="mt-5"
              >
                <div className="card bg-bgdark p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-txdim uppercase tracking-wide">
                      Connected
                    </span>

                    <span className="text-xs text-green font-mono">
                      ● ONLINE
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-mono text-txsec break-all">
                    {publicKey.toBase58()}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/onboarding")
                  }
                  className="w-full mt-3 flex items-center justify-center gap-2 text-sm text-cyan hover:text-cyan/80 transition-colors"
                >
                  Continue to PayDAO
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* =================================================
                FOOTER
            ================================================= */}

            <p className="text-sm text-txsec text-center mt-6">
              New to PayDAO? Connect a Solana wallet to
              get started.
            </p>

            <div className="mt-4 pt-4 border-t border-bdlight">
              <p className="text-[11px] text-txdim text-center leading-relaxed">
                PayDAO uses your wallet address as your
                identity. Your private keys never leave
                your wallet.
              </p>
            </div>
          </PixelCard>
        </motion.div>
      </div>
    </div>
  );
}
