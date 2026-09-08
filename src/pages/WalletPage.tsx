import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Copy, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { useApp } from '@/store/AppContext';
import { PixelCard, PixelButton, StatusBadge, SectionHeader } from '@/components/retro';
import { useState } from 'react';

const assetIcons: Record<string, string> = { USDC: '$', SOL: '◎', PAY: 'P' };

export function WalletPage() {
  const navigate = useNavigate();
  const { user, walletAssets, transactions } = useApp();
  const [copied, setCopied] = useState(false);

  const totalUsd = walletAssets.reduce((sum, a) => sum + a.usdValue, 0);

  const copyAddress = () => {
    navigator.clipboard?.writeText(user.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Wallet"
        subtitle="Your personal wallet balances and assets"
        action={
          <div className="flex gap-2">
            <PixelButton variant="primary" size="sm" onClick={() => navigate('/send')}><ArrowUpRight className="w-4 h-4" /> Send</PixelButton>
            <PixelButton variant="green" size="sm" onClick={() => navigate('/receive')}><ArrowDownLeft className="w-4 h-4" /> Receive</PixelButton>
          </div>
        }
      />

      <PixelCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-txdim uppercase tracking-wide mb-2">Total Balance (USD)</div>
            <div className="text-3xl font-heading font-semibold text-cyan mb-2 font-mono">
              ${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge variant="success">+5.2%</StatusBadge>
              <span className="text-xs text-txsec">24h change</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="card bg-bgdark p-3 flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-cyan/10 border border-cyan/30 rounded-lg">
                <span className="text-sm text-cyan font-heading font-bold">P</span>
              </div>
              <div>
                <div className="text-xs text-txdim uppercase tracking-wide">Wallet Address</div>
                <button onClick={copyAddress} className="flex items-center gap-1 font-mono text-sm text-txprim hover:text-cyan transition-colors">
                  {user.walletAddress}
                  {copied ? <Check className="w-3 h-3 text-green" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="card bg-bgdark p-3">
                <div className="text-xs text-txdim uppercase tracking-wide mb-1">Available</div>
                <div className="text-sm font-mono text-green">${user.available.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="card bg-bgdark p-3">
                <div className="text-xs text-txdim uppercase tracking-wide mb-1">Pending</div>
                <div className="text-sm font-mono text-yellow">${user.pending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>
        </div>
      </PixelCard>

      <div className="grid grid-cols-3 gap-3">
        <PixelButton variant="primary" onClick={() => navigate('/send')}><ArrowUpRight className="w-4 h-4" /> Send</PixelButton>
        <PixelButton variant="green" onClick={() => navigate('/receive')}><ArrowDownLeft className="w-4 h-4" /> Receive</PixelButton>
        <PixelButton onClick={() => {}}><RefreshCw className="w-4 h-4" /> Swap</PixelButton>
      </div>

      <div>
        <h3 className="text-sm font-heading font-semibold text-txprim uppercase tracking-wide mb-4">Assets</h3>
        <div className="space-y-3">
          {walletAssets.map(asset => {
            const sparkData = asset.sparkline.map((v, i) => ({ i, v }));
            const isUp = asset.change24h >= 0;
            return (
              <PixelCard key={asset.symbol} hover>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center font-heading font-bold text-lg shrink-0 rounded-xl" style={{ background: `${asset.color}20`, border: `2px solid ${asset.color}`, color: asset.color }}>
                    {assetIcons[asset.symbol]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-txprim font-bold">{asset.symbol}</span>
                      <span className="font-mono text-xs text-txdim">{asset.name}</span>
                    </div>
                    <div className="font-mono text-xs text-txsec">
                      {asset.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {asset.symbol}
                    </div>
                  </div>
                  <div className="hidden sm:block w-24 h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparkData}>
                        <Line type="monotone" dataKey="v" stroke={isUp ? '#00e676' : '#ff3860'} strokeWidth={2} dot={false} />
                        <Tooltip contentStyle={{ background: '#12141b', border: '1px solid #3a3f55', borderRadius: '12px', fontFamily: 'Inter', fontSize: '13px' }} formatter={(v: number) => [`$${v}`, '']} labelFormatter={() => ''} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm text-txprim font-bold">${asset.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <div className={`font-mono text-xs flex items-center justify-end gap-1 ${isUp ? 'text-green' : 'text-red'}`}>
                      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isUp ? '+' : ''}{asset.change24h}%
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => navigate('/send')} className="w-8 h-8 flex items-center justify-center border border-bdlight rounded-lg hover:border-cyan hover:text-cyan transition-colors" title="Send">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => navigate('/receive')} className="w-8 h-8 flex items-center justify-center border border-bdlight rounded-lg hover:border-green hover:text-green transition-colors" title="Receive">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </PixelCard>
            );
          })}
        </div>
      </div>

      <PixelCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-heading font-semibold text-txprim uppercase tracking-wide">Recent Transactions</h3>
          <PixelButton variant="ghost" size="sm" onClick={() => navigate('/transactions')}>View all</PixelButton>
        </div>
        <div className="space-y-2">
          {transactions.slice(0, 5).map(tx => (
            <div key={tx.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-bgpanel2 transition-colors cursor-pointer" onClick={() => navigate('/transactions')}>
              <div className="w-8 h-8 flex items-center justify-center border border-bdlight rounded-lg">
                {tx.type === 'sent' || tx.type === 'withdrawal' ? <ArrowUpRight className="w-3.5 h-3.5 text-red" /> : <ArrowDownLeft className="w-3.5 h-3.5 text-green" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-txprim truncate">{tx.type === 'sent' ? `Sent to ${tx.to}` : `Received from ${tx.from}`}</div>
                <div className="font-mono text-xs text-txdim">{tx.timestamp}</div>
              </div>
              <div className="text-right">
                <div className={`font-mono text-xs font-bold ${tx.type === 'sent' || tx.type === 'withdrawal' ? 'text-red' : 'text-green'}`}>
                  {tx.type === 'sent' || tx.type === 'withdrawal' ? '-' : '+'}${tx.amount} {tx.currency}
                </div>
                <StatusBadge variant={tx.status === 'confirmed' ? 'success' : tx.status === 'pending' ? 'pending' : 'rejected'}>{tx.status}</StatusBadge>
              </div>
            </div>
          ))}
        </div>
      </PixelCard>
    </div>
  );
}
