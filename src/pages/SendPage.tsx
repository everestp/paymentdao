import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Check, Copy } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { PixelCard, PixelButton, SectionHeader, StatusBadge } from '@/components/retro';

type Step = 'form' | 'confirm' | 'processing' | 'success';

export function SendPage() {
  const navigate = useNavigate();
  const { sendPayment, user, groups } = useApp();
  const [step, setStep] = useState<Step>('form');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USDC' | 'SOL' | 'PAY'>('USDC');
  const [message, setMessage] = useState('');
  const [source, setSource] = useState('Personal Wallet');
  const [txId, setTxId] = useState('');

  const fee = 0.02;
  const total = (parseFloat(amount) || 0) + fee;

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!recipient || !amount) return; setStep('confirm'); };

  const handleConfirm = () => {
    setStep('processing');
    setTimeout(() => {
      const result = sendPayment({ recipient, amount: parseFloat(amount), currency, message });
      setTxId(result.txId.slice(0, 4) + '...' + result.txId.slice(4, 8));
      setStep('success');
    }, 2500);
  };

  const reset = () => { setStep('form'); setRecipient(''); setAmount(''); setMessage(''); setTxId(''); };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SectionHeader title="Send money" subtitle="Transfer funds to a wallet address or PayDAO user" />

      <PixelCard className="p-6">
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.form key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Recipient</label>
                <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="@alex or wallet address" className="input" required />
                <p className="text-xs text-txdim mt-1">Enter a PayDAO username or wallet address</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Amount</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100" className="input" step="0.01" required />
                </div>
                <div>
                  <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value as 'USDC' | 'SOL' | 'PAY')} className="input"><option value="USDC">USDC</option><option value="SOL">SOL</option><option value="PAY">PAY</option></select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Message (optional)</label>
                <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="January contribution" className="input" />
              </div>
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Payment Source</label>
                <select value={source} onChange={e => setSource(e.target.value)} className="input">
                  <option>Personal Wallet</option>
                  {groups.map(g => <option key={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="card bg-bgdark p-4 space-y-2">
                <div className="flex items-center justify-between"><span className="text-xs text-txsec">Network Fee</span><span className="text-xs font-mono text-txprim">${fee.toFixed(2)}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-txsec">Total</span><span className="text-sm font-mono text-cyan">${total.toFixed(2)}</span></div>
              </div>
              <PixelButton type="submit" variant="primary" size="lg" className="w-full" disabled={!recipient || !amount}>Review Payment <ArrowUpRight className="w-4 h-4" /></PixelButton>
            </motion.form>
          )}

          {step === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="text-center mb-6">
                <div className="text-xs text-txdim uppercase tracking-wide mb-2">Confirm Payment</div>
                <div className="text-2xl font-heading font-semibold text-cyan mb-1 font-mono">{amount} {currency}</div>
                <div className="text-sm text-txsec">to {recipient}</div>
              </div>
              <div className="card bg-bgdark p-4 space-y-3">
                <Row label="Recipient" value={recipient} />
                <Row label="Network" value="Solana Demo Network" />
                <Row label="Amount" value={`${amount} ${currency}`} />
                <Row label="Fee" value={`$${fee.toFixed(2)}`} />
                <div className="h-px bg-bdlight" />
                <Row label="Total" value={`$${total.toFixed(2)}`} highlight />
                {message && <Row label="Message" value={message} />}
              </div>
              <div className="flex gap-3">
                <PixelButton variant="ghost" className="flex-1" onClick={() => setStep('form')}>Back</PixelButton>
                <PixelButton variant="primary" className="flex-1" onClick={handleConfirm}>Confirm Payment</PixelButton>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-bdlight border-t-cyan rounded-full spin mb-6" />
              <h3 className="text-sm font-heading font-semibold text-txprim mb-2">Processing payment...</h3>
              <p className="text-sm text-txsec mb-4">Confirming on Solana Demo Network</p>
              <div className="flex items-center justify-center gap-2"><span className="w-2 h-2 bg-cyan rounded-full blink" /><span className="text-xs text-txdim">This may take a few seconds</span></div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-16 h-16 mx-auto flex items-center justify-center bg-green/15 border border-green rounded-full mb-4" style={{ boxShadow: '0 0 20px rgba(0,230,118,0.4)' }}>
                <Check className="w-8 h-8 text-green" />
              </motion.div>
              <h3 className="text-base font-heading font-semibold text-green mb-2">Payment sent successfully</h3>
              <p className="text-sm text-txsec mb-6">{amount} {currency} sent to {recipient}</p>
              <div className="card bg-bgdark p-4 mb-6">
                <div className="text-xs text-txdim uppercase tracking-wide mb-2">Transaction ID</div>
                <div className="flex items-center justify-center gap-2"><span className="font-mono text-sm text-cyan">{txId}</span><button onClick={() => navigator.clipboard?.writeText(txId)} className="text-txdim hover:text-cyan"><Copy className="w-3.5 h-3.5" /></button></div>
                <div className="mt-3"><StatusBadge variant="success">Confirmed</StatusBadge></div>
              </div>
              <div className="flex gap-3">
                <PixelButton variant="ghost" className="flex-1" onClick={reset}>Send Another</PixelButton>
                <PixelButton variant="primary" className="flex-1" onClick={() => navigate('/transactions')}>View Transaction</PixelButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PixelCard>

      <PixelCard className="p-4">
        <div className="flex items-center justify-between">
          <div><div className="text-xs text-txdim uppercase tracking-wide mb-1">Your Balance</div><div className="text-lg font-mono text-txprim">${user.personalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
          <div className="text-right"><div className="text-xs text-txdim uppercase tracking-wide mb-1">Network</div><div className="text-sm font-mono text-cyan">Solana Demo</div></div>
        </div>
      </PixelCard>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-txsec">{label}</span>
      <span className={`text-xs font-mono ${highlight ? 'text-cyan font-semibold' : 'text-txprim'}`}>{value}</span>
    </div>
  );
}
