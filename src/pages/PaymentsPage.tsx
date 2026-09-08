import { useState } from 'react';
import { Search, ArrowUpRight, ArrowDownLeft, Filter, Download } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { PixelCard, StatusBadge, SectionHeader, PixelButton, EmptyState } from '@/components/retro';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Payment, TxType } from '@/types';

const typeIcons: Record<string, typeof ArrowUpRight> = {
  sent: ArrowUpRight, received: ArrowDownLeft, contribution: ArrowDownLeft,
  pending: ArrowUpRight, deposit: ArrowDownLeft, withdrawal: ArrowUpRight, swap: ArrowUpRight,
};

export function PaymentsPage() {
  const { payments, paymentRequests } = useApp();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  const allPayments: Payment[] = [
    ...payments,
    ...paymentRequests.map(r => ({
      id: r.id, date: r.createdAt, type: 'received' as TxType, person: r.from,
      amount: r.amount, currency: r.currency, status: r.status === 'paid' ? 'completed' as const : r.status === 'expired' ? 'rejected' as const : 'pending' as const,
      txId: r.id, description: r.description,
    })),
  ];

  const filtered = allPayments.filter(p => {
    if (tab === 'sent' && p.type !== 'sent') return false;
    if (tab === 'received' && p.type !== 'received') return false;
    if (tab === 'pending' && p.status !== 'pending') return false;
    if (tab === 'requests' && !p.description) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (currencyFilter !== 'all' && p.currency !== currencyFilter) return false;
    if (search && !p.person.toLowerCase().includes(search.toLowerCase()) && !p.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <SectionHeader title="Payments" subtitle="Track and manage all your payments" action={<PixelButton variant="ghost" size="sm"><Download className="w-4 h-4" /> Export</PixelButton>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PixelCard className="p-4"><div className="text-xs text-txdim uppercase tracking-wide mb-1">Total Sent</div><div className="text-sm font-mono text-red">-$2,145.00</div></PixelCard>
        <PixelCard className="p-4"><div className="text-xs text-txdim uppercase tracking-wide mb-1">Total Received</div><div className="text-sm font-mono text-green">+$2,850.00</div></PixelCard>
        <PixelCard className="p-4"><div className="text-xs text-txdim uppercase tracking-wide mb-1">Pending</div><div className="text-sm font-mono text-yellow">2 requests</div></PixelCard>
        <PixelCard className="p-4"><div className="text-xs text-txdim uppercase tracking-wide mb-1">This Month</div><div className="text-sm font-mono text-cyan">$5,995.00</div></PixelCard>
      </div>

      <PixelCard className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txdim" />
            <input type="text" placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-10" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto">
            <option value="all">All Status</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
          </select>
          <select value={currencyFilter} onChange={e => setCurrencyFilter(e.target.value)} className="input w-auto">
            <option value="all">All Currencies</option><option value="USDC">USDC</option><option value="SOL">SOL</option><option value="PAY">PAY</option>
          </select>
        </div>
      </PixelCard>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full bg-bgpanel border border-bdlight p-1 rounded-xl h-auto">
          {['all', 'sent', 'received', 'pending', 'requests'].map(t => (
            <TabsTrigger key={t} value={t} className="tab flex-1 capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <PixelCard className="p-0 overflow-hidden">
            {filtered.length === 0 ? (
              <EmptyState icon={<Filter className="w-12 h-12" />} title="No payments found" description="Try adjusting your filters or search query" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-bdlight">
                      <th className="text-xs text-txdim uppercase tracking-wide text-left p-3">Date</th>
                      <th className="text-xs text-txdim uppercase tracking-wide text-left p-3">Type</th>
                      <th className="text-xs text-txdim uppercase tracking-wide text-left p-3">Person</th>
                      <th className="text-xs text-txdim uppercase tracking-wide text-right p-3">Amount</th>
                      <th className="text-xs text-txdim uppercase tracking-wide text-left p-3">Status</th>
                      <th className="text-xs text-txdim uppercase tracking-wide text-left p-3 hidden md:table-cell">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const Icon = typeIcons[p.type] || ArrowUpRight;
                      const isNegative = p.type === 'sent' || p.type === 'withdrawal';
                      return (
                        <tr key={p.id} className="border-b border-bdlight/50 hover:bg-bgpanel2 transition-colors cursor-pointer">
                          <td className="p-3 font-mono text-xs text-txsec">{p.date}</td>
                          <td className="p-3"><div className="flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${isNegative ? 'text-red' : 'text-green'}`} /><span className="text-xs text-txprim capitalize">{p.type}</span></div></td>
                          <td className="p-3"><div className="text-xs text-txprim">{p.person}</div>{p.description && <div className="text-xs text-txdim">{p.description}</div>}</td>
                          <td className="p-3 text-right"><span className={`font-mono text-xs font-bold ${isNegative ? 'text-red' : 'text-green'}`}>{isNegative ? '-' : '+'}{Math.abs(p.amount)} {p.currency}</span></td>
                          <td className="p-3"><StatusBadge variant={p.status === 'completed' ? 'success' : p.status === 'pending' ? 'pending' : p.status === 'approved' ? 'approved' : 'rejected'}>{p.status}</StatusBadge></td>
                          <td className="p-3 hidden md:table-cell"><span className="font-mono text-xs text-cyan">{p.txId}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PixelCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
