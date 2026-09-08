import { PixelButton } from '@/components/retro/PixelButton';
import { PixelModal } from '@/components/retro/PixelModal';
import type { Currency } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Target, Users } from 'lucide-react';
import { useState } from 'react';

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description: string; requiredAmount: number; currency: Currency; deadline?: string; visibility: 'public' | 'private'; votingThreshold: number }) => Promise<void>;
}

export function CreateGroupModal({ open, onClose, onCreate }: CreateGroupModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', requiredAmount: '', currency: 'USDC' as Currency,
    deadline: '', visibility: 'public' as 'public' | 'private', votingThreshold: '60',
  });

  const handleSubmit = async () => {
    if (!form.name || !form.requiredAmount) return;

    setLoading(true);
    setError(null);

    try {
      await onCreate({
        name: form.name,
        description: form.description || 'A collaborative funding pool.',
        requiredAmount: parseFloat(form.requiredAmount),
        currency: form.currency,
        deadline: form.deadline || undefined,
        visibility: form.visibility,
        votingThreshold: parseInt(form.votingThreshold, 10),
      });
      setSuccess(true);
      setForm({ name: '', description: '', requiredAmount: '', currency: 'USDC', deadline: '', visibility: 'public', votingThreshold: '60' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PixelModal open={open} onClose={onClose} title="Create Group" description="Start a new collaborative funding pool">
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-14 h-14 mx-auto flex items-center justify-center bg-green/15 border border-green rounded-full mb-4" style={{ boxShadow: '0 0 20px rgba(0,230,118,0.3)' }}>
              <Check className="w-7 h-7 text-green" />
            </motion.div>
            <h3 className="text-base font-heading font-semibold text-green mb-1">Group created</h3>
            <p className="text-sm text-txsec">Your funding pool is ready for contributions</p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Group Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input" placeholder="Build Our DAO" />
            </div>
            <div>
              <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input min-h-[60px] resize-none" placeholder="Describe your funding goal..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Required Funding</label>
                <input type="number" value={form.requiredAmount} onChange={e => setForm({ ...form, requiredAmount: e.target.value })} className="input" placeholder="10000" />
              </div>
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Currency</label>
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value as Currency })} className="input">
                  <option value="USDC">USDC</option>
                  <option value="SOL">SOL</option>
                  <option value="PAY">PAY</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Deadline (optional)</label>
                <input type="text" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="input" placeholder="Oct 15, 2026" />
              </div>
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Visibility</label>
                <select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value as 'public' | 'private' })} className="input">
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Voting Threshold (%)</label>
              <input type="number" value={form.votingThreshold} onChange={e => setForm({ ...form, votingThreshold: e.target.value })} className="input" placeholder="60" />
            </div>
            <div className="card bg-bgdark p-3 flex items-start gap-2">
              <Target className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
              <p className="text-xs text-txsec">Anyone can contribute to this group. The creator does not have admin-only control — the group operates collaboratively.</p>
            </div>
            {error && <p role="alert" className="text-xs text-red">{error}</p>}
            <div className="flex gap-3 pt-2">
              <PixelButton variant="ghost" className="flex-1" onClick={onClose}>Cancel</PixelButton>
              <PixelButton variant="primary" className="flex-1" onClick={handleSubmit} disabled={loading || !form.name || !form.requiredAmount}>
                {loading ? <><span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full spin" /> Creating...</> : <><Users className="w-4 h-4" /> Create Group</>}
              </PixelButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PixelModal>
  );
}
