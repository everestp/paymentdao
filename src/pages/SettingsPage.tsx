import { useState } from 'react';
import { User, Shield, Bell, Wallet, Settings as SettingsIcon, Zap, Check, Copy } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { PixelCard, PixelButton, StatusBadge, SectionHeader } from '@/components/retro';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function SettingsPage() {
  const { user } = useApp();
  const [tab, setTab] = useState('profile');
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState({ proposals: true, payments: true, groups: true, members: false });

  const copyWallet = () => { navigator.clipboard?.writeText(user.walletAddress); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <SectionHeader title="Settings" subtitle="Manage your account and preferences" />

      <PixelCard className="border-yellow/30 bg-yellow/5">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow" />
          <div>
            <div className="text-sm font-semibold text-yellow uppercase tracking-wide">Demo Mode</div>
            <div className="text-xs text-txsec mt-1">All data is simulated. No real transactions are processed.</div>
          </div>
        </div>
      </PixelCard>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex w-full bg-bgpanel border border-bdlight p-1 rounded-xl h-auto overflow-x-auto">
          {[
            { key: 'profile', label: 'Profile', icon: User },
            { key: 'security', label: 'Security', icon: Shield },
            { key: 'notifications', label: 'Alerts', icon: Bell },
            { key: 'wallet', label: 'Wallet', icon: Wallet },
            { key: 'preferences', label: 'Prefs', icon: SettingsIcon },
          ].map(t => (
            <TabsTrigger key={t.key} value={t.key} className="tab flex-1 capitalize flex items-center gap-1"><t.icon className="w-3.5 h-3.5" /> {t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <PixelCard>
            <h3 className="text-sm font-heading font-semibold text-txprim uppercase tracking-wide mb-4">Profile Information</h3>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 flex items-center justify-center font-heading font-bold text-xl rounded-2xl" style={{ background: `${user.avatarColor}20`, border: `2px solid ${user.avatarColor}`, color: user.avatarColor }}>EP</div>
              <div>
                <div className="text-lg font-heading font-semibold text-txprim">{user.name}</div>
                <div className="text-sm text-txsec">{user.username}</div>
              </div>
            </div>
            <div className="space-y-4">
              <Field label="Display Name" value={user.name} />
              <Field label="Username" value={user.username} />
              <Field label="Email" value={user.email} />
            </div>
            <div className="mt-4"><PixelButton variant="primary" size="sm">Save Changes</PixelButton></div>
          </PixelCard>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <PixelCard>
            <h3 className="text-sm font-heading font-semibold text-txprim uppercase tracking-wide mb-4">Security</h3>
            <div className="space-y-3">
              <SettingRow label="Authentication" value="Demo authentication" badge="Active" badgeVariant="success" />
              <SettingRow label="Session" value="Active" badge="Online" badgeVariant="success" />
              <SettingRow label="Two-Factor Auth" value="Disabled" badge="Off" badgeVariant="default" />
              <SettingRow label="Login Alerts" value="Enabled" badge="On" badgeVariant="info" />
            </div>
          </PixelCard>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <PixelCard>
            <h3 className="text-sm font-heading font-semibold text-txprim uppercase tracking-wide mb-4">Notification Preferences</h3>
            <div className="space-y-3">
              {[
                { key: 'proposals', label: 'Proposal updates', desc: 'New proposals and voting reminders' },
                { key: 'payments', label: 'Payment notifications', desc: 'Sent and received payments' },
                { key: 'groups', label: 'Group alerts', desc: 'Contributions and funding milestones' },
                { key: 'members', label: 'Member activity', desc: 'New members and role changes' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 border border-bdlight rounded-lg">
                  <div>
                    <div className="text-sm text-txprim">{item.label}</div>
                    <div className="text-xs text-txdim">{item.desc}</div>
                  </div>
                  <button onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))} className="w-12 h-6 rounded-full flex items-center transition-all" style={{ background: notifications[item.key as keyof typeof notifications] ? '#00e676' : '#252836' }}>
                    <span className="w-4 h-4 bg-bgdark rounded-full transition-all" style={{ marginLeft: notifications[item.key as keyof typeof notifications] ? '22px' : '2px' }} />
                  </button>
                </div>
              ))}
            </div>
          </PixelCard>
        </TabsContent>

        <TabsContent value="wallet" className="mt-4 space-y-4">
          <PixelCard>
            <h3 className="text-sm font-heading font-semibold text-txprim uppercase tracking-wide mb-4">Connected Wallet</h3>
            <div className="space-y-3">
              <div className="card bg-bgdark p-4 rounded-lg">
                <div className="text-xs text-txdim uppercase tracking-wide mb-2">Wallet Address</div>
                <div className="flex items-center gap-2"><span className="font-mono text-sm text-cyan">{user.walletAddress}</span><button onClick={copyWallet} className="text-txdim hover:text-cyan">{copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}</button></div>
              </div>
              <SettingRow label="Network" value="Solana Demo Network" badge="Connected" badgeVariant="success" />
              <SettingRow label="Balance" value={`$${user.personalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} badge="USD" badgeVariant="info" />
            </div>
          </PixelCard>
        </TabsContent>

        <TabsContent value="preferences" className="mt-4 space-y-4">
          <PixelCard>
            <h3 className="text-sm font-heading font-semibold text-txprim uppercase tracking-wide mb-4">Preferences</h3>
            <div className="space-y-3">
              <SettingRow label="Currency" value="USD" badge="Default" badgeVariant="info" />
              <SettingRow label="Language" value="English" badge="EN" badgeVariant="info" />
              <SettingRow label="Timezone" value="UTC" badge="Default" badgeVariant="info" />
              <SettingRow label="Theme" value="Dark Fintech" badge="Active" badgeVariant="success" />
            </div>
          </PixelCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">{label}</label>
      <input type="text" defaultValue={value} className="input" />
    </div>
  );
}

function SettingRow({ label, value, badge, badgeVariant }: { label: string; value: string; badge: string; badgeVariant: 'success' | 'info' | 'default' }) {
  return (
    <div className="flex items-center justify-between p-3 border border-bdlight rounded-lg">
      <div><div className="text-sm text-txprim">{label}</div><div className="text-xs text-txdim">{value}</div></div>
      <StatusBadge variant={badgeVariant}>{badge}</StatusBadge>
    </div>
  );
}
