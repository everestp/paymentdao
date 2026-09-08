import { PixelButton } from '@/components/retro/PixelButton';
import { PixelModal } from '@/components/retro/PixelModal';
import type { Currency, GroupData } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownLeft, Check, Target } from 'lucide-react';
import { useState } from 'react';

interface DonateModalProps {
  open: boolean;
  onClose: () => void;
  group: GroupData;
  onContribute: (groupId: string, amount: number, currency: Currency) => Promise<void>;
}

export function DonateModal({ open, onClose, group, onContribute }: DonateModalProps) {
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>(group.currency || 'USDC');

  const pct = Math.min(100, (group.currentBalance / group.requiredAmount) * 100);
  const remaining = Math.max(0, group.requiredAmount - group.currentBalance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    setError(null);
    try {
      await onContribute(group.id, parseFloat(amount), currency);
      setStep('success');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Contribution failed.');
      setStep('form');
    }
  };

  const reset = () => { setStep('form'); setAmount(''); onClose(); };

  return (
    <PixelModal open={open} onClose={reset} title={`Contribute to ${group.name}`} description="Your contribution is anonymous">
      <AnimatePresence mode="wait">
        {step === 'form' && (
          <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-4">
            {/* Funding summary */}
            <div className="card bg-bgdark p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-txdim uppercase tracking-wide">Current Balance</span>
                <span className="text-sm font-mono text-txprim">${group.currentBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-txdim uppercase tracking-wide">Required</span>
                <span className="text-sm font-mono text-txprim">${group.requiredAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-txdim uppercase tracking-wide">Remaining</span>
                <span className="text-sm font-mono text-yellow">${remaining.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="progress-bar mb-1"><div className="progress-bar-fill" style={{ width: `${pct}%`, background: '#00d4e6' }} /></div>
              <div className="text-xs text-cyan text-right">{pct.toFixed(1)}% funded</div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Amount</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input" placeholder="100" required />
              </div>
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className="input">
                  <option value="USDC">USDC</option>
                  <option value="SOL">SOL</option>
                  <option value="PAY">PAY</option>
                </select>
              </div>
            </div>

            <div className="card bg-bgdark p-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan shrink-0" />
              <p className="text-xs text-txsec">Your contribution will be shown as "Anonymous contributor". Your wallet address will not be displayed publicly.</p>
            </div>
            {error && <p role="alert" className="text-xs text-red">{error}</p>}

            <div className="flex gap-3">
              <PixelButton variant="ghost" className="flex-1" onClick={onClose}>Cancel</PixelButton>
              <PixelButton variant="green" className="flex-1" type="submit"><ArrowDownLeft className="w-4 h-4" /> Confirm Contribution</PixelButton>
            </div>
          </motion.form>
        )}

        {step === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
            <div className="inline-block w-12 h-12 border-4 border-bdlight border-t-green rounded-full spin mb-4" />
            <h3 className="text-sm font-semibold text-txprim mb-1">Processing contribution...</h3>
            <p className="text-xs text-txsec">Confirming on Solana Demo network</p>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-14 h-14 mx-auto flex items-center justify-center bg-green/15 border border-green rounded-full mb-4" style={{ boxShadow: '0 0 20px rgba(0,230,118,0.3)' }}>
              <Check className="w-7 h-7 text-green" />
            </motion.div>
            <h3 className="text-base font-heading font-semibold text-green mb-1">Contribution confirmed</h3>
            <p className="text-sm text-txsec mb-4">{amount} {currency} contributed to {group.name}</p>
            <PixelButton variant="primary" onClick={reset}>Done</PixelButton>
          </motion.div>
        )}
      </AnimatePresence>
    </PixelModal>
  );
}
