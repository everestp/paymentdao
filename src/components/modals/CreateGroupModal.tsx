import { PixelButton } from '@/components/retro/PixelButton';
import { PixelModal } from '@/components/retro/PixelModal';
import type { Currency } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Target, Users } from 'lucide-react';
import { useState } from 'react';

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description: string;
    requiredAmount: number;
    currency: Currency;
    deadline?: string;
    visibility: 'public' | 'private';
    votingThreshold: number;
  }) => Promise<void>;
}

const INITIAL_FORM = {
  name: '',
  description: '',
  requiredAmount: '',
  currency: 'SOL' as Currency,
  deadline: '',
  visibility: 'public' as 'public' | 'private',
  votingThreshold: '60',
};

export function CreateGroupModal({
  open,
  onClose,
  onCreate,
}: CreateGroupModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const handleSubmit = async () => {
    const requiredAmount = Number(form.requiredAmount);
    const votingThreshold = Number(form.votingThreshold);

    if (!form.name.trim()) {
      setError('Group name is required.');
      return;
    }

    if (!Number.isFinite(requiredAmount) || requiredAmount <= 0) {
      setError('Required funding must be greater than 0 SOL.');
      return;
    }

    if (
      !Number.isFinite(votingThreshold) ||
      votingThreshold < 1 ||
      votingThreshold > 100
    ) {
      setError('Voting threshold must be between 1% and 100%.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onCreate({
        name: form.name.trim(),
        description:
          form.description.trim() || 'A collaborative funding pool.',
        requiredAmount,
        currency: 'SOL',
        deadline: form.deadline || undefined,
        visibility: form.visibility,
        votingThreshold,
      });

      setSuccess(true);
      setForm(INITIAL_FORM);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to create group.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;

    setError(null);
    setSuccess(false);
    setForm(INITIAL_FORM);
    onClose();
  };

  return (
    <PixelModal
      open={open}
      onClose={handleClose}
      title="Create Group"
      description="Start a new collaborative funding pool"
    >
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-14 h-14 mx-auto flex items-center justify-center bg-green/15 border border-green rounded-full mb-4"
              style={{
                boxShadow: '0 0 20px rgba(0,230,118,0.3)',
              }}
            >
              <Check className="w-7 h-7 text-green" />
            </motion.div>

            <h3 className="text-base font-heading font-semibold text-green mb-1">
              Group created
            </h3>

            <p className="text-sm text-txsec">
              Your funding pool is ready for contributions
            </p>

            <PixelButton
              variant="primary"
              className="mt-6 w-full"
              onClick={handleClose}
            >
              Continue
            </PixelButton>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Group Name */}
            <div>
              <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">
                Group Name
              </label>

              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="input"
                placeholder="Build Our DAO"
                maxLength={64}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">
                Description
              </label>

              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                  })
                }
                className="input min-h-[60px] resize-none"
                placeholder="Describe your funding goal..."
                maxLength={256}
              />
            </div>

            {/* Funding */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">
                  Required Funding
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.requiredAmount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requiredAmount: e.target.value,
                    })
                  }
                  className="input"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">
                  Currency
                </label>

                <input
                  type="text"
                  value="SOL"
                  className="input"
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Deadline + Visibility */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">
                  Deadline (optional)
                </label>

                <input
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      deadline: e.target.value,
                    })
                  }
                  className="input"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">
                  Visibility
                </label>

                <select
                  value={form.visibility}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      visibility: e.target.value as 'public' | 'private',
                    })
                  }
                  className="input"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            {/* Voting Threshold */}
            <div>
              <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">
                Voting Threshold (%)
              </label>

              <input
                type="number"
                min="1"
                max="100"
                value={form.votingThreshold}
                onChange={(e) =>
                  setForm({
                    ...form,
                    votingThreshold: e.target.value,
                  })
                }
                className="input"
                placeholder="60"
              />
            </div>

            {/* Info */}
            <div className="card bg-bgdark p-3 flex items-start gap-2">
              <Target className="w-4 h-4 text-cyan shrink-0 mt-0.5" />

              <p className="text-xs text-txsec">
                Anyone can contribute to this group. The creator does not have
                admin-only control — the group operates collaboratively.
              </p>
            </div>

            {/* Error */}
            {error && (
              <p role="alert" className="text-xs text-red">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <PixelButton
                variant="ghost"
                className="flex-1"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </PixelButton>

              <PixelButton
                variant="primary"
                className="flex-1"
                onClick={handleSubmit}
                disabled={
                  loading ||
                  !form.name.trim() ||
                  !form.requiredAmount
                }
              >
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Create Group
                  </>
                )}
              </PixelButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PixelModal>
  );
}
