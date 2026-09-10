import { PixelButton } from "@/components/retro/PixelButton";
import { PixelModal } from "@/components/retro/PixelModal";
import type { Currency, GroupData } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  Check,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";

interface DonateModalProps {
  open: boolean;
  onClose: () => void;
  group: GroupData;
  onContribute: (
    groupId: string,
    amount: number,
    currency: Currency,
  ) => Promise<void>;
}

export function DonateModal({
  open,
  onClose,
  group,
  onContribute,
}: DonateModalProps) {
  const [step, setStep] = useState<
    "form" | "processing" | "success"
  >("form");

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  // PayDAO currently supports SOL on-chain
  const [currency, setCurrency] =
    useState<Currency>("SOL");

  /*
   * ----------------------------------------------------------
   * CALCULATE FUNDING
   * ----------------------------------------------------------
   */

  const currentBalance = Number(
    group.currentBalance ?? 0,
  );

  const requiredAmount = Number(
    group.requiredAmount ?? 0,
  );

  const pct =
    requiredAmount > 0
      ? Math.min(
        100,
        (currentBalance / requiredAmount) * 100,
      )
      : 0;

  const remaining = Math.max(
    0,
    requiredAmount - currentBalance,
  );

  /*
   * ----------------------------------------------------------
   * RESET WHEN MODAL OPENS
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (open) {
      setStep("form");
      setAmount("");
      setError(null);
      setCurrency("SOL");
    }
  }, [open, group.id]);

  /*
   * ----------------------------------------------------------
   * SUBMIT CONTRIBUTION
   * ----------------------------------------------------------
   */

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (step === "processing") {
      return;
    }

    setError(null);

    const trimmedAmount = amount.trim();

    /*
     * Validate amount
     */
    if (!trimmedAmount) {
      setError("Please enter a contribution amount.");
      return;
    }

    const parsedAmount = Number(trimmedAmount);

    if (!Number.isFinite(parsedAmount)) {
      setError("Please enter a valid amount.");
      return;
    }

    if (parsedAmount <= 0) {
      setError(
        "Contribution amount must be greater than 0.",
      );
      return;
    }

    /*
     * PayDAO currently supports SOL only
     */
    if (currency !== "SOL") {
      setError(
        "The current PayDAO program supports SOL contributions only.",
      );
      return;
    }

    /*
     * Don't let a contribution overshoot what's still needed
     */
    if (requiredAmount > 0 && parsedAmount > remaining) {
      setError(
        `This group only needs ${remaining.toLocaleString("en-US", {
          maximumFractionDigits: 4,
        })} more SOL. Please enter an amount at or below that.`,
      );
      return;
    }

    try {
      setStep("processing");

      await onContribute(
        group.id,
        parsedAmount,
        currency,
      );

      setStep("success");
    } catch (submitError) {
      console.error(
        "Contribution failed:",
        submitError,
      );

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Contribution failed. Please try again.",
      );

      setStep("form");
    }
  };

  /*
   * ----------------------------------------------------------
   * CLOSE / RESET
   * ----------------------------------------------------------
   */

  const reset = () => {
    setStep("form");
    setAmount("");
    setError(null);
    setCurrency("SOL");
    onClose();
  };

  /*
   * ----------------------------------------------------------
   * QUICK AMOUNTS
   * ----------------------------------------------------------
   */

  const quickAmounts = [0.1, 0.5, 1, 2];

  return (
    <PixelModal
      open={open}
      onClose={reset}
      title={`Contribute to ${group.name}`}
      description="Your contribution will be recorded on-chain"
    >
      <AnimatePresence mode="wait">
        {/* ====================================================
            FORM
        ==================================================== */}

        {step === "form" && (
          <motion.form
            key="form"
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -10,
            }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* =================================================
                FUNDING SUMMARY
            ================================================= */}

            <div className="card bg-bgdark p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-txdim uppercase tracking-wide">
                  Current Balance
                </span>

                <span className="text-sm font-mono text-txprim">
                  {currentBalance.toLocaleString(
                    "en-US",
                    {
                      maximumFractionDigits: 4,
                    },
                  )}{" "}
                  SOL
                </span>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-txdim uppercase tracking-wide">
                  Required
                </span>

                <span className="text-sm font-mono text-txprim">
                  {requiredAmount.toLocaleString(
                    "en-US",
                    {
                      maximumFractionDigits: 4,
                    },
                  )}{" "}
                  SOL
                </span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-txdim uppercase tracking-wide">
                  Remaining
                </span>

                <span className="text-sm font-mono text-yellow">
                  {remaining.toLocaleString(
                    "en-US",
                    {
                      maximumFractionDigits: 4,
                    },
                  )}{" "}
                  SOL
                </span>
              </div>

              {/* Progress */}
              <div className="progress-bar mb-1">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${pct}%`,
                    background: "#00d4e6",
                  }}
                />
              </div>

              <div className="text-xs text-cyan text-right">
                {pct.toFixed(1)}% funded
              </div>
            </div>

            {/* =================================================
                AMOUNT + CURRENCY
            ================================================= */}

            <div className="grid grid-cols-3 gap-3">
              {/* Amount */}
              <div className="col-span-2">
                <label
                  htmlFor="donation-amount"
                  className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2"
                >
                  Amount
                </label>

                <input
                  id="donation-amount"
                  type="number"
                  min="0.000001"
                  max={remaining > 0 ? remaining : undefined}
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  className="input"
                  placeholder="0.5"
                  disabled={step === "processing"}
                  required
                />
              </div>

              {/* Currency */}
              <div>
                <label
                  htmlFor="donation-currency"
                  className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2"
                >
                  Currency
                </label>

                <select
                  id="donation-currency"
                  value={currency}
                  onChange={(e) => {
                    setCurrency(
                      e.target.value as Currency,
                    );
                    setError(null);
                  }}
                  className="input"
                  disabled={step === "processing"}
                >
                  <option value="SOL">SOL</option>
                </select>
              </div>
            </div>

            {/* =================================================
                QUICK AMOUNTS
            ================================================= */}

            <div>
              <p className="text-xs text-txdim uppercase tracking-wide mb-2">
                Quick amount
              </p>

              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    onClick={() => {
                      setAmount(
                        quickAmount.toString(),
                      );
                      setError(null);
                    }}
                    disabled={
                      step === "processing"
                    }
                    className="border border-bdlight bg-bgdark px-2 py-2 text-xs font-mono text-txsec hover:text-cyan hover:border-cyan transition-colors"
                  >
                    {quickAmount} SOL
                  </button>
                ))}
              </div>
            </div>

            {/* =================================================
                ANONYMOUS NOTICE
            ================================================= */}

            <div className="card bg-bgdark p-3 flex items-start gap-2">
              <Target className="w-4 h-4 text-cyan shrink-0 mt-0.5" />

              <p className="text-xs text-txsec">
                Your contribution will be associated with
                your wallet on-chain. The application can
                display you as an anonymous contributor,
                but blockchain transactions themselves are
                publicly verifiable.
              </p>
            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div
                role="alert"
                className="border border-red/40 bg-red/10 p-3"
              >
                <p className="text-xs text-red">
                  {error}
                </p>
              </div>
            )}

            {/* =================================================
                ACTIONS
            ================================================= */}

            <div className="flex gap-3">
              <PixelButton
                variant="ghost"
                className="flex-1"
                type="button"
                onClick={reset}
                disabled={step === "processing"}
              >
                Cancel
              </PixelButton>

              <PixelButton
                variant="green"
                className="flex-1"
                type="submit"
                disabled={step === "processing"}
              >
                <ArrowDownLeft className="w-4 h-4" />

                Confirm Contribution
              </PixelButton>
            </div>
          </motion.form>
        )}

        {/* ====================================================
            PROCESSING
        ==================================================== */}

        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            className="text-center py-8"
          >
            <div className="inline-block w-12 h-12 border-4 border-bdlight border-t-green rounded-full spin mb-4" />

            <h3 className="text-sm font-semibold text-txprim mb-1">
              Processing contribution...
            </h3>

            <p className="text-xs text-txsec">
              Please approve the transaction in your
              wallet.
            </p>

            <p className="text-xs text-txdim mt-2">
              Confirming on Solana Devnet
            </p>
          </motion.div>
        )}

        {/* ====================================================
            SUCCESS
        ==================================================== */}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            className="text-center py-8"
          >
            <motion.div
              initial={{
                scale: 0,
              }}
              animate={{
                scale: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 200,
              }}
              className="w-14 h-14 mx-auto flex items-center justify-center bg-green/15 border border-green rounded-full mb-4"
              style={{
                boxShadow:
                  "0 0 20px rgba(0,230,118,0.3)",
              }}
            >
              <Check className="w-7 h-7 text-green" />
            </motion.div>

            <h3 className="text-base font-heading font-semibold text-green mb-1">
              Contribution confirmed
            </h3>

            <p className="text-sm text-txsec mb-2">
              {amount} {currency} contributed to{" "}
              {group.name}
            </p>

            <p className="text-xs text-txdim mb-5">
              Your transaction has been confirmed on
              Solana Devnet.
            </p>

            <PixelButton
              variant="primary"
              onClick={reset}
            >
              Done
            </PixelButton>
          </motion.div>
        )}
      </AnimatePresence>
    </PixelModal>
  );
}
