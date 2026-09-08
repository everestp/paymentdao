
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Users,
  Vote,
  Wallet,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";

import { useApp } from "@/store/AppContext";
import { PixelButton } from "@/components/retro/PixelButton";

/* ============================================================
 * ONBOARDING STEPS
 * ========================================================== */

const steps = [
  {
    icon: Wallet,
    title: "Welcome to PayDAO",
    description:
      "A collaborative funding and governance platform. Create funding pools, contribute to shared goals, and vote on proposals.",
    color: "#00d4e6",
  },
  {
    icon: Users,
    title: "Create or join a group",
    description:
      "Start a new funding group or join an existing one. Set funding targets and invite your community to contribute.",
    color: "#00e676",
  },
  {
    icon: Vote,
    title: "Propose and vote",
    description:
      "Members can create proposals and vote on how group funds should be used. Governance is handled by the protocol.",
    color: "#ffd600",
  },
  {
    icon: Check,
    title: "Automatic execution",
    description:
      "When a proposal satisfies the protocol rules, it can execute automatically. No centralized admin approval is required.",
    color: "#ff2e9a",
  },
];

/* ============================================================
 * HELPERS
 * ========================================================== */

function shortenAddress(address: string) {
  if (address.length <= 12) {
    return address;
  }

  return `${ address.slice(0, 4) }...${ address.slice(-4) } `;
}

/* ============================================================
 * PAGE
 * ========================================================== */

export function OnboardingPage() {
  const navigate = useNavigate();

  const { completeOnboarding } = useApp();

  const {
    connected,
    publicKey,
  } = useWallet();

  const [step, setStep] = useState(0);

  const current = steps[step];

  const walletAddress = publicKey?.toBase58();

  /* ==========================================================
   * FINISH ONBOARDING
   * ======================================================== */

  const finishOnboarding = () => {


    navigate("/dashboard");
  };

  /* ==========================================================
   * NEXT STEP
   * ======================================================== */

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((previous) => previous + 1);
      return;
    }

    finishOnboarding();
  };

  /* ==========================================================
   * SKIP
   * ======================================================== */

  const handleSkip = () => {
    finishOnboarding();
  };

  /* ==========================================================
   * SAFETY
   *
   * App.tsx already protects this route, but this prevents
   * rendering onboarding without wallet identity.
   * ======================================================== */

  if (!connected || !publicKey) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bgdark grid-bg flex items-center justify-center p-4 relative overflow-hidden">

      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="absolute inset-0 pointer-events-none overflow-hidden">

        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-bdlight/20"
            style={{
              width: `${ 100 + i * 70 } px`,
              height: `${ 100 + i * 70 } px`,
              left: `${ 5 + i * 20 }% `,
              top: `${ 10 + (i % 3) * 30 }% `,
            }}
            animate={{
              y: [0, -15, 0],
              opacity: [0.05, 0.15, 0.05],
            }}
            transition={{
              duration: 5 + i,
              repeat: Infinity,
              delay: i * 0.4,
            }}
          />
        ))}

      </div>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="relative w-full max-w-lg">

        {/* ====================================================
            BRAND
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: -10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="flex flex-col items-center mb-6"
        >

          {/* Logo */}

          <div
            className="w-11 h-11 flex items-center justify-center bg-cyan text-bgdark font-heading font-bold text-lg rounded-xl mb-3"
            style={{
              boxShadow:
                "0 0 20px rgba(0,212,230,0.35)",
            }}
          >
            P
          </div>

          <div className="font-heading font-semibold text-lg text-txprim">
            PayDAO
          </div>

          <div className="text-xs text-txdim font-mono">
            Quick setup
          </div>

        </motion.div>

        {/* ====================================================
            WALLET STATUS
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            y: -5,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mb-5"
        >

          <div className="card bg-bgdark p-3">

            <div className="flex items-center gap-3">

              {/* Icon */}

              <div
                className="w-9 h-9 flex items-center justify-center rounded-lg shrink-0"
                style={{
                  background:
                    "rgba(0,230,118,0.1)",
                  border:
                    "1px solid rgba(0,230,118,0.3)",
                }}
              >
                <ShieldCheck className="w-4 h-4 text-green" />
              </div>

              {/* Wallet */}

              <div className="min-w-0 flex-1">

                <div className="flex items-center justify-between gap-2">

                  <span className="text-xs text-green font-semibold uppercase tracking-wide">
                    Wallet Connected
                  </span>

                  <span className="text-[10px] text-txdim font-mono">
                    DEVNET
                  </span>

                </div>

                <div className="text-xs text-txsec font-mono mt-1 truncate">
                  {walletAddress
                    ? shortenAddress(walletAddress)
                    : ""}
                </div>

              </div>

              {/* Status */}

              <div className="w-2 h-2 rounded-full bg-green shrink-0" />

            </div>

          </div>

        </motion.div>

        {/* ====================================================
            PROGRESS
        ==================================================== */}

        <div className="flex items-center justify-center gap-2 mb-6">

          {steps.map((_, index) => (
            <motion.div
              key={index}
              animate={{
                width:
                  index === step
                    ? "32px"
                    : "12px",
              }}
              transition={{
                duration: 0.2,
              }}
              className="h-2 rounded-full"
              style={{
                background:
                  index <= step
                    ? current.color
                    : "#252836",

                boxShadow:
                  index === step
                    ? `0 0 8px ${ current.color } `
                    : "none",
              }}
            />
          ))}

        </div>

        {/* ====================================================
            CARD
        ==================================================== */}

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.97,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: 0.35,
          }}
          className="card p-8 md:p-12 relative overflow-hidden"
        >

          {/* ==================================================
              DECORATIVE GLOW
          ================================================== */}

          <div
            className="absolute top-0 right-0 w-40 h-40 opacity-5 rounded-full pointer-events-none"
            style={{
              background: current.color,
            }}
          />

          <div
            className="absolute bottom-0 left-0 w-32 h-32 opacity-[0.03] rounded-full pointer-events-none"
            style={{
              background: current.color,
            }}
          />

          {/* ==================================================
              STEP CONTENT
          ================================================== */}

          <AnimatePresence mode="wait">

            <motion.div
              key={step}
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              exit={{
                opacity: 0,
                x: -20,
              }}
              transition={{
                duration: 0.3,
              }}
            >

              {/* Icon */}

              <div
                className="w-16 h-16 flex items-center justify-center mb-6 mx-auto rounded-2xl"
                style={{
                  background: `${ current.color } 15`,
                  border: `1px solid ${ current.color } 40`,
                  boxShadow: `0 0 20px ${ current.color } 30`,
                }}
              >

                <current.icon
                  className="w-8 h-8"
                  style={{
                    color: current.color,
                  }}
                />

              </div>

              {/* Text */}

              <div className="text-center">

                <div className="text-xs font-medium text-txdim uppercase tracking-wide mb-3">
                  Step {step + 1} of {steps.length}
                </div>

                <h2 className="text-xl font-heading font-semibold text-txprim mb-4">
                  {current.title}
                </h2>

                <p className="text-sm text-txsec leading-relaxed max-w-sm mx-auto">
                  {current.description}
                </p>

              </div>

            </motion.div>

          </AnimatePresence>

          {/* ==================================================
              WALLET IDENTITY
          ================================================== */}

          <div className="mt-8 p-3 bg-bgdark border border-bdlight rounded-lg">

            <div className="flex items-center gap-2">

              <Wallet className="w-4 h-4 text-cyan shrink-0" />

              <div className="flex-1 min-w-0">

                <div className="text-[10px] text-txdim uppercase tracking-wide">
                  Your PayDAO identity
                </div>

                <div className="text-xs text-txsec font-mono truncate mt-0.5">
                  {walletAddress}
                </div>

              </div>

            </div>

          </div>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="flex items-center justify-between mt-8 gap-3">

            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-txdim hover:text-txsec transition-colors"
            >
              Skip setup
            </button>

            <PixelButton
              onClick={handleNext}
              variant="primary"
              size="lg"
            >
              {step === steps.length - 1
                ? "Enter PayDAO"
                : "Continue"}

              <ArrowRight className="w-4 h-4" />

            </PixelButton>

          </div>

        </motion.div>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <p className="text-[11px] text-txdim text-center mt-5">
          Your wallet is your identity. Private keys
          never leave your wallet.
        </p>

      </div>

    </div>
  );
}
