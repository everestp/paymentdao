import { useState } from 'react';
import { Search, Copy, Check, X, ArrowUpRight, ArrowDownLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { PixelCard, StatusBadge, SectionHeader, StatCard, PixelButton } from '@/components/retro';
import type { Transaction, TxType } from '@/types';

const typeIcons: Record<TxType, typeof ArrowUpRight> = {
  sent: ArrowUpRight, received: ArrowDownLeft, contribution: ArrowDownLeft, withdrawal: ArrowUpRight, swap: ArrowUpRight,
};

export function TransactionsPage() {
  const { transactions, stats } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);

  const filtered = transactions.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.shortId.toLowerCase().includes(q) && !t.from.toLowerCase().includes(q) && !t.to.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const copyId = (id: string) => { navigator.clipboard?.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="space-y-6">
      <SectionHeader title="Transactions" subtitle="Blockchain-style transaction explorer" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Volume" value={`$${(stats.totalTransactions * 250).toLocaleString()}`} color="#00d4e6" />
        <StatCard label="Successful" value={String(stats.totalTransactions - stats.failedTx)} color="#00e676" />
        <StatCard label="Pending" value={String(stats.pendingTx)} color="#ffd600" />
        <StatCard label="Failed" value={String(stats.failedTx)} color="#ff3860" />
      </div>

      <PixelCard className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txdim" />
            <input type="text" placeholder="Search by tx ID, sender, or recipient..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="all">All Status</option><option value="confirmed">Confirmed</option><option value="pending">Pending</option><option value="failed">Failed</option>
          </select>
        </div>
      </PixelCard>

      <PixelCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bdlight">
                <th className="text-xs text-txdim uppercase tracking-wide text-left p-3">Tx ID</th>
                <th className="text-xs text-txdim uppercase tracking-wide text-left p-3">Type</th>
                <th className="text-xs text-txdim uppercase tracking-wide text-left p-3 hidden md:table-cell">From</th>
                <th className="text-xs text-txdim uppercase tracking-wide text-left p-3 hidden md:table-cell">To</th>
                <th className="text-xs text-txdim uppercase tracking-wide text-right p-3">Amount</th>
                <th className="text-xs text-txdim uppercase tracking-wide text-left p-3 hidden lg:table-cell">Network</th>
                <th className="text-xs text-txdim uppercase tracking-wide text-left p-3">Status</th>
                <th className="text-xs text-txdim uppercase tracking-wide text-left p-3 hidden sm:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 25).map(tx => {
                const Icon = typeIcons[tx.type] || ArrowUpRight;
                return (
                  <tr key={tx.id} onClick={() => setSelected(tx)} className="border-b border-bdlight/50 hover:bg-bgpanel2 transition-colors cursor-pointer">
                    <td className="p-3"><div className="flex items-center gap-2"><span className="font-mono text-xs text-cyan">{tx.shortId}</span><button onClick={(e) => { e.stopPropagation(); copyId(tx.id); }} className="text-txdim hover:text-cyan">{copied ? <Check className="w-3 h-3 text-green" /> : <Copy className="w-3 h-3" />}</button></div></td>
                    <td className="p-3"><div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5 text-txsec" /><span className="text-xs text-txprim capitalize">{tx.type}</span></div></td>
                    <td className="p-3 hidden md:table-cell font-mono text-xs text-txsec">{tx.from}</td>
                    <td className="p-3 hidden md:table-cell font-mono text-xs text-txsec">{tx.to}</td>
                    <td className="p-3 text-right font-mono text-xs text-txprim font-bold">{tx.amount} {tx.currency}</td>
                    <td className="p-3 hidden lg:table-cell font-mono text-xs text-txsec">{tx.network}</td>
                    <td className="p-3"><StatusBadge variant={tx.status === 'confirmed' ? 'success' : tx.status === 'pending' ? 'pending' : 'rejected'}>{tx.status}</StatusBadge></td>
                    <td className="p-3 hidden sm:table-cell font-mono text-xs text-txdim">{tx.timestamp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </PixelCard>

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/70 z-50" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-bgpanel border-l border-bdlight z-50 overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-bgpanel border-b border-bdlight p-4 flex items-center justify-between">
              <h3 className="text-sm font-heading font-semibold text-txprim uppercase tracking-wide">Transaction Details</h3>
              <button onClick={() => setSelected(null)} className="text-txdim hover:text-txprim"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-center py-4">
                <StatusBadge variant={selected.status === 'confirmed' ? 'success' : selected.status === 'pending' ? 'pending' : 'rejected'}>{selected.status}</StatusBadge>
                <div className="text-2xl font-heading font-semibold text-cyan mt-3 mb-1 font-mono">{selected.amount} {selected.currency}</div>
                <div className="text-sm text-txsec capitalize">{selected.type}</div>
              </div>
              <div className="card bg-bgdark p-4 space-y-3">
                <DetailRow label="Transaction ID" value={selected.shortId} copyable onCopy={() => copyId(selected.id)} />
                <DetailRow label="Block" value={selected.block.toLocaleString()} />
                <DetailRow label="From" value={selected.from} />
                <DetailRow label="To" value={selected.to} />
                <DetailRow label="Amount" value={`${selected.amount} ${selected.currency}`} />
                <DetailRow label="Network Fee" value={`$${selected.fee.toFixed(2)}`} />
                <DetailRow label="Network" value={selected.network} />
                <DetailRow label="Timestamp" value={selected.timestamp} />
                <div className="h-px bg-bdlight" />
                <div><div className="text-xs text-txdim uppercase tracking-wide mb-1">Signature</div><div className="font-mono text-xs text-txsec break-all">{selected.signature}</div></div>
              </div>
              <div className="card bg-bgdark p-4">
                <div className="text-xs text-txdim uppercase tracking-wide mb-3">Block Confirmation</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green" /><span className="text-xs text-txsec">Confirmed in block {selected.block.toLocaleString()}</span></div>
                  <div className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green" /><span className="text-xs text-txsec">32 confirmations</span></div>
                  <div className="flex items-center gap-2">{selected.status === 'confirmed' ? <Check className="w-3.5 h-3.5 text-green" /> : <Loader2 className="w-3.5 h-3.5 text-yellow spin" />}<span className="text-xs text-txsec">{selected.status === 'confirmed' ? 'Finalized on Solana Demo' : 'Awaiting confirmation'}</span></div>
                </div>
              </div>
              <PixelButton variant="primary" className="w-full" onClick={() => navigator.clipboard?.writeText(selected.id)}><Copy className="w-4 h-4" /> Copy Transaction ID</PixelButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value, copyable, onCopy }: { label: string; value: string; copyable?: boolean; onCopy?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-txsec shrink-0">{label}</span>
      <div className="flex items-center gap-1 min-w-0"><span className="font-mono text-xs text-txprim truncate">{value}</span>{copyable && <button onClick={onCopy} className="text-txdim hover:text-cyan shrink-0"><Copy className="w-3 h-3" /></button>}</div>
    </div>
  );
}
