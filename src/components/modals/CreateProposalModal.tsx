import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, FileText, Shield } from 'lucide-react';
import { PixelModal } from '@/components/retro/PixelModal';
import { PixelButton } from '@/components/retro/PixelButton';
import type { Currency } from '@/types';

interface CreateProposalModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onCreate: (data: { groupId: string; title: string; description: string; amount: number; currency: Currency; recipient: string; duration: number; quorum: number }) => void;
}

export function CreateProposalModal({ open, onClose, groupId, groupName, onCreate }: CreateProposalModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', amount: '', currency: 'USDC' as Currency,
    recipient: '', duration: '48', quorum: '50',
  });

  const handleSubmit = () => {
    if (!form.title || !form.amount) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        onCreate({
          groupId, title: form.title, description: form.description,
          amount: parseFloat(form.amount), currency: form.currency,
          recipient: form.recipient || 'Group Fund',
          duration: parseInt(form.duration), quorum: parseInt(form.quorum),
        });
        setSuccess(false);
        setForm({ title: '', description: '', amount: '', currency: 'USDC', recipient: '', duration: '48', quorum: '50' });
      }, 1200);
    }, 1500);
  };

  return (
    <PixelModal open={open} onClose={onClose} title="Create Proposal" description={groupName ? `For ${groupName}` : 'Submit a proposal for voting'}>
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-14 h-14 mx-auto flex items-center justify-center bg-green/15 border border-green rounded-full mb-4" style={{ boxShadow: '0 0 20px rgba(0,230,118,0.3)' }}>
              <Check className="w-7 h-7 text-green" />
            </motion.div>
            <h3 className="text-base font-heading font-semibold text-green mb-1">Proposal created</h3>
            <p className="text-sm text-txsec">Voting is now open — all votes are private</p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Proposal Title</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" placeholder="Purchase development servers" />
            </div>
            <div>
              <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input min-h-[80px] resize-none" placeholder="Describe your proposal..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Amount</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input" placeholder="2000" />
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
            <div>
              <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Recipient</label>
              <input type="text" value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} className="input" placeholder="Infrastructure Provider" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Voting Duration (hours)</label>
                <input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} className="input" placeholder="48" />
              </div>
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Quorum (%)</label>
                <input type="number" value={form.quorum} onChange={e => setForm({ ...form, quorum: e.target.value })} className="input" placeholder="50" />
              </div>
            </div>
            <div className="card bg-bgdark p-3 flex items-start gap-2">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#b14dff' }} />
              <p className="text-xs text-txsec">All votes are private. Individual votes are never publicly associated with a wallet or identity. Only aggregate results are shown.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <PixelButton variant="ghost" className="flex-1" onClick={onClose}>Cancel</PixelButton>
              <PixelButton variant="primary" className="flex-1" onClick={handleSubmit} disabled={loading || !form.title || !form.amount}>
                {loading ? <><span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full spin" /> Creating...</> : <><FileText className="w-4 h-4" /> Create Proposal</>}
              </PixelButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PixelModal>
  );
}
