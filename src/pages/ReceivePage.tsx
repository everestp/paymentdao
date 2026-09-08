import { useState } from 'react';
import { Copy, Check, Share2, QrCode } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { PixelCard, PixelButton, SectionHeader, StatusBadge } from '@/components/retro';

export function ReceivePage() {
  const { createPaymentRequest, user } = useApp();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USDC' | 'SOL' | 'PAY'>('USDC');
  const [from, setFrom] = useState('');
  const [description, setDescription] = useState('');
  const [expiration, setExpiration] = useState('24 hours');
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !from) return;
    createPaymentRequest({ amount: parseFloat(amount), currency, from, description, expiration });
    setGenerated(true);
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(`https://paydao.app/pay/${user.walletAddress}?amount=${amount}&currency=${currency}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => { setGenerated(false); setAmount(''); setFrom(''); setDescription(''); };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SectionHeader title="Request payment" subtitle="Generate a payment request to share with others" />

      <div className="grid md:grid-cols-2 gap-6">
        <PixelCard className="p-6">
          {!generated ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Amount</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="250" className="input" required />
                </div>
                <div>
                  <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value as 'USDC' | 'SOL' | 'PAY')} className="input"><option value="USDC">USDC</option><option value="SOL">SOL</option><option value="PAY">PAY</option></select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">From</label>
                <input type="text" value={from} onChange={e => setFrom(e.target.value)} placeholder="@alex or wallet address" className="input" required />
              </div>
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Server contribution" className="input" />
              </div>
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Expiration</label>
                <select value={expiration} onChange={e => setExpiration(e.target.value)} className="input"><option>12 hours</option><option>24 hours</option><option>48 hours</option><option>72 hours</option><option>7 days</option></select>
              </div>
              <PixelButton type="submit" variant="green" size="lg" className="w-full" disabled={!amount || !from}>Generate Request</PixelButton>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="text-xs text-green uppercase tracking-wide mb-2 font-semibold">Request Generated</div>
                <div className="text-2xl font-heading font-semibold text-cyan mb-1 font-mono">{amount} {currency}</div>
                <div className="text-sm text-txsec">from {from}</div>
              </div>
              <div className="card bg-bgdark p-4 space-y-2">
                <Row label="Amount" value={`${amount} ${currency}`} />
                <Row label="From" value={from} />
                {description && <Row label="Description" value={description} />}
                <Row label="Expires" value={expiration} />
                <Row label="Status" value="Pending" />
              </div>
              <div className="flex gap-3">
                <PixelButton variant="ghost" className="flex-1" onClick={copyLink}>{copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy Link</>}</PixelButton>
                <PixelButton variant="primary" className="flex-1" onClick={() => {}}><Share2 className="w-4 h-4" /> Share</PixelButton>
              </div>
              <PixelButton variant="ghost" size="sm" className="w-full" onClick={reset}>Create New Request</PixelButton>
            </div>
          )}
        </PixelCard>

        <PixelCard className="p-6 flex flex-col items-center justify-center">
          <div className="text-xs text-txdim uppercase tracking-wide mb-4">PayDAO Request</div>
          <div className="relative w-48 h-48 bg-txprim p-3 mb-4 rounded-xl">
            <div className="w-full h-full grid grid-cols-8 gap-0.5">
              {Array.from({ length: 64 }).map((_, i) => {
                const corner = (i < 3 || i % 8 < 3 || i % 8 > 4 || i > 5 * 8) && Math.random() > 0.4;
                return <div key={i} className={corner ? 'bg-bgdark' : 'bg-txprim'} />;
              })}
            </div>
            <div className="absolute top-2 left-2 w-8 h-8 border-4 border-bgdark rounded-md" />
            <div className="absolute top-2 right-2 w-8 h-8 border-4 border-bgdark rounded-md" />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-4 border-bgdark rounded-md" />
          </div>
          <div className="text-center">
            <div className="text-lg font-heading font-semibold text-cyan mb-1 font-mono">{amount ? `${amount} ${currency}` : '$250 USDC'}</div>
            <div className="text-xs text-txsec mb-3">Scan to pay</div>
            <StatusBadge variant="info">{user.walletAddress}</StatusBadge>
          </div>
          <div className="mt-4 card bg-bgdark p-3 w-full">
            <div className="flex items-center gap-2"><QrCode className="w-3.5 h-3.5 text-txdim" /><span className="font-mono text-xs text-txdim truncate">paydao.app/pay/{user.walletAddress}</span></div>
          </div>
        </PixelCard>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-txsec">{label}</span>
      <span className="text-xs font-mono text-txprim truncate ml-2">{value}</span>
    </div>
  );
}
