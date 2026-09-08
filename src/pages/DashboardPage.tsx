import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, FileText, Users, Radio, TrendingUp, ChevronRight, Zap, Target, Check, ThumbsUp, ThumbsDown, Minus, ArrowRight, Plus } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { useApp } from '@/store/AppContext';
import { PixelCard, StatCard, StatusBadge, PixelButton, SectionHeader, NetworkBadge } from '@/components/retro';
import { mockData } from '@/data/mockData';

const iconMap: Record<string, typeof ArrowUpRight> = {
  'arrow-up': ArrowUpRight, 'arrow-down': ArrowDownLeft, 'file-text': FileText,
  'check': Check, 'thumbs-up': ThumbsUp, 'thumbs-down': ThumbsDown, 'minus': Minus,
  'user-plus': Users, 'users': Users, 'vote': FileText,
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, stats, groups, proposals, activity, liveUpdates } = useApp();
  const activeProposals = proposals.filter(p => p.status === 'voting').slice(0, 2);
  const recentActivity = activity.slice(0, 5);
  const totalFunded = groups.reduce((s, g) => s + g.currentBalance, 0);
  const totalTarget = groups.reduce((s, g) => s + g.requiredAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-semibold text-txprim mb-1">
            Good evening, <span className="text-cyan">Everest</span>
          </h1>
          <p className="text-sm text-txsec">Here's what's happening across your PayDAO workspace.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PixelButton variant="primary" size="sm" onClick={() => navigate('/send')}><ArrowUpRight className="w-4 h-4" /> Send Money</PixelButton>
          <PixelButton variant="green" size="sm" onClick={() => navigate('/receive')}><ArrowDownLeft className="w-4 h-4" /> Request</PixelButton>
          <PixelButton size="sm" onClick={() => navigate('/proposals')}><FileText className="w-4 h-4" /> Proposal</PixelButton>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <NetworkBadge live />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green/30 bg-green/5">
          <Radio className="w-3 h-3 text-green" />
          <span className="text-xs font-medium text-green">Live Demo Network</span>
        </div>
        {liveUpdates.length > 0 && <span className="text-xs text-txdim truncate max-w-xs">Latest: {liveUpdates[0].message}</span>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Funded" value={`$${totalFunded.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} icon={<Target className="w-4 h-4" />} color="#00d4e6" trend={`of $${totalTarget.toLocaleString()} target`} trendUp />
        <StatCard label="Active Groups" value={String(stats.totalGroups)} icon={<Users className="w-4 h-4" />} color="#00e676" trend="2 near goal" trendUp />
        <StatCard label="Active Proposals" value={String(stats.activeProposals)} icon={<FileText className="w-4 h-4" />} color="#ffd600" trend="2 ending soon" trendUp />
        <StatCard label="Monthly Volume" value={`$${stats.monthlyVolume.toLocaleString()}`} icon={<TrendingUp className="w-4 h-4" />} color="#ff2e9a" trend="+12.4%" trendUp />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <PixelCard className="lg:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs font-medium text-txdim uppercase tracking-wide mb-2">Total Funding Progress</div>
              <div className="text-3xl font-heading font-semibold text-cyan mb-1">
                ${totalFunded.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge variant="success">+${stats.monthlyVolume.toLocaleString()} this month</StatusBadge>
                <span className="text-xs text-green">+10.8%</span>
              </div>
            </div>
            <PixelButton variant="ghost" size="sm" onClick={() => navigate('/groups')}>View Groups <ChevronRight className="w-4 h-4" /></PixelButton>
          </div>
          <div className="h-48 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockData.fundingChart}>
                <defs><linearGradient id="colorFunding" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00d4e6" stopOpacity={0.3} /><stop offset="100%" stopColor="#00d4e6" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="day" stroke="#6b7180" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7180" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#12141b', border: '1px solid #3a3f55', borderRadius: '12px', fontFamily: 'Inter', fontSize: '13px' }} formatter={(v: number) => [`$${v.toLocaleString()}`, 'Funded']} />
                <Area type="monotone" dataKey="value" stroke="#00d4e6" strokeWidth={2} fill="url(#colorFunding)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-bdlight">
            <div><div className="text-xs text-txdim uppercase tracking-wide mb-1">Wallet Balance</div><div className="text-sm font-mono text-txprim">${user.personalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
            <div><div className="text-xs text-txdim uppercase tracking-wide mb-1">Available</div><div className="text-sm font-mono text-green">${user.available.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
            <div><div className="text-xs text-txdim uppercase tracking-wide mb-1">Pending</div><div className="text-sm font-mono text-yellow">${user.pending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
          </div>
        </PixelCard>

        <PixelCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-txprim">Funding Distribution</h3>
          </div>
          <div className="relative h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={groups} dataKey="currentBalance" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={2}>
                  {groups.map((_, i) => <Cell key={i} fill={['#00d4e6', '#00e676', '#ff2e9a', '#ffd600', '#4d7cff'][i % 5]} stroke="#12141b" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#12141b', border: '1px solid #3a3f55', borderRadius: '12px', fontFamily: 'Inter', fontSize: '13px' }} formatter={(v: number) => [`$${v.toLocaleString()}`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-xs text-txdim uppercase tracking-wide">Total</div>
              <div className="text-sm font-mono text-txprim">${(totalFunded/1000).toFixed(1)}k</div>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            {groups.slice(0, 4).map((g, i) => (
              <div key={g.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ['#00d4e6', '#00e676', '#ff2e9a', '#ffd600'][i % 4] }} />
                  <span className="text-xs text-txsec truncate">{g.name}</span>
                </div>
                <span className="text-xs font-mono text-txprim">${g.currentBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        </PixelCard>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Send', icon: ArrowUpRight, path: '/send', color: '#00d4e6' },
          { label: 'Request', icon: ArrowDownLeft, path: '/receive', color: '#00e676' },
          { label: 'Proposal', icon: FileText, path: '/proposals', color: '#ffd600' },
          { label: 'Group', icon: Users, path: '/groups', color: '#ff2e9a' },
          { label: 'Wallet', icon: Zap, path: '/wallet', color: '#ff8c00' },
          { label: 'Activity', icon: Radio, path: '/activity', color: '#4d7cff' },
        ].map(a => (
          <button key={a.label} onClick={() => navigate(a.path)} className="card p-4 flex flex-col items-center gap-2 card-hover transition-all">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: `${a.color}15`, border: `1px solid ${a.color}40` }}>
              <a.icon className="w-4 h-4" style={{ color: a.color }} />
            </div>
            <span className="text-xs text-txsec font-medium">{a.label}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PixelCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-txprim">Pending Proposals</h3>
            <PixelButton variant="ghost" size="sm" onClick={() => navigate('/proposals')}>View all <ChevronRight className="w-4 h-4" /></PixelButton>
          </div>
          <div className="space-y-3">
            {activeProposals.map(p => {
              const group = groups.find(g => g.id === p.groupId);
              return (
                <div key={p.id} className="card bg-bgdark p-4 cursor-pointer card-hover transition-all" onClick={() => navigate(`/proposals/${p.id}`)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-cyan font-medium mb-1">PROPOSAL #{p.id}</div>
                      <div className="text-sm text-txprim font-medium truncate">{p.title}</div>
                      {group && <div className="text-xs text-txdim mt-0.5">{group.name}</div>}
                    </div>
                    <StatusBadge variant="pending" className="ml-2 shrink-0">Voting</StatusBadge>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green">YES: {p.votes.yes}</span>
                      <span className="text-red">NO: {p.votes.no}</span>
                      <span className="text-txdim">ABS: {p.votes.abstain}</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-bgpanel2">
                      <div className="h-full bg-green" style={{ width: `${(p.votes.yes / p.totalMembers) * 100}%` }} />
                      <div className="h-full bg-red" style={{ width: `${(p.votes.no / p.totalMembers) * 100}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-txdim">
                      <span>{p.hoursLeft}h left</span>
                      <StatusBadge variant="privacy">Private voting</StatusBadge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </PixelCard>

        <PixelCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-txprim">Recent Activity</h3>
            <PixelButton variant="ghost" size="sm" onClick={() => navigate('/activity')}>View all <ChevronRight className="w-4 h-4" /></PixelButton>
          </div>
          <div className="space-y-1">
            {recentActivity.map((event, i) => {
              const Icon = iconMap[event.icon] || FileText;
              return (
                <motion.div key={event.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-bgpanel2 transition-colors">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-lg" style={{ background: `${event.userColor}15`, border: `1px solid ${event.userColor}40` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: event.userColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-txprim">
                      <span style={{ color: event.userColor }} className="font-medium">{event.user}</span> {event.action} <span className="text-txsec">{event.detail}</span>
                    </p>
                  </div>
                  <span className="text-xs text-txdim shrink-0">{event.timeAgo}</span>
                </motion.div>
              );
            })}
          </div>
        </PixelCard>
      </div>

      <PixelCard className="border-green/30">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-green blink" />
          <span className="text-xs font-semibold text-green uppercase tracking-wide">Live Demo</span>
        </div>
        <h3 className="text-base font-heading font-semibold text-txprim mb-2">Real-time coordination</h3>
        <p className="text-sm text-txsec mb-4">
          PayDAO is designed for real-time collaborative funding using MagicBlock Ephemeral Rollups, with final settlement on Solana.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            {[
              { label: 'User', color: '#00d4e6' },
              { label: 'PayDAO', color: '#00e676' },
              { label: 'MagicBlock Ephemeral Rollup', color: '#ffd600' },
              { label: 'Solana', color: '#ff2e9a' },
            ].map((node, i, arr) => (
              <div key={node.label}>
                <div className="card bg-bgdark p-2.5 flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: node.color }} />
                  <span className="text-sm text-txprim">{node.label}</span>
                </div>
                {i < arr.length - 1 && <div className="flex justify-center py-1"><span className="text-txdim text-sm">↓</span></div>}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              { icon: Zap, title: 'Low-latency voting', desc: 'Vote counts update instantly' },
              { icon: TrendingUp, title: 'Real-time funding state', desc: 'Watch contributions arrive live' },
              { icon: Users, title: 'Collaborative funding', desc: 'Multiple contributors, one goal' },
            ].map(f => (
              <div key={f.title} className="card bg-bgdark p-3 flex items-start gap-3">
                <f.icon className="w-4 h-4 text-green mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm text-txprim font-medium">{f.title}</div>
                  <div className="text-xs text-txsec">{f.desc}</div>
                </div>
              </div>
            ))}
            <div className="card bg-bgdark p-3" style={{ borderColor: 'rgba(255,214,0,0.3)' }}>
              <p className="text-xs text-yellow">This is a frontend demo. No real blockchain transactions are executed.</p>
            </div>
          </div>
        </div>
      </PixelCard>
    </div>
  );
}
