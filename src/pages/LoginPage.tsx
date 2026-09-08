import { PixelButton } from '@/components/retro/PixelButton';
import { PixelCard } from '@/components/retro/PixelCard';
import { useApp } from '@/store/AppContext';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Vote, Wallet, Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();
  const { connectWallet, walletLoading } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await connectWallet();
      navigate('/onboarding');
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Wallet connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await connectWallet();
      navigate('/onboarding');
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Wallet connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => undefined;

  return (
    <div className="min-h-screen bg-bgdark grid-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} className="absolute w-32 h-32 rounded-2xl border border-bdlight/30"
            style={{ left: `${10 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [0, -20, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }} />
        ))}
      </div>

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
        <div className="hidden lg:flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 flex items-center justify-center bg-cyan text-bgdark font-heading font-bold text-xl rounded-xl" style={{ boxShadow: '0 0 20px rgba(0,212,230,0.4)' }}>P</div>
              <div>
                <div className="font-heading font-semibold text-lg text-txprim">PayDAO</div>
                <div className="text-xs text-txdim font-mono">v2.0 Demo Environment</div>
              </div>
            </div>
            <h1 className="text-3xl font-heading font-semibold text-txprim mb-4 leading-tight">
              Money,<br /><span className="text-cyan">decided</span> together.
            </h1>
            <p className="text-sm text-txsec max-w-md mb-6">
              Create collaborative funding pools, contribute to shared goals, vote privately on proposals, and watch your community grow — without the spreadsheet chaos.
            </p>
          </motion.div>

          <div className="grid gap-3">
            {[
              { icon: Wallet, title: 'Collaborative Funding', desc: 'Pool funds toward shared goals and milestones', color: '#00d4e6' },
              { icon: Vote, title: 'Private Voting', desc: 'Vote on proposals without revealing your identity', color: '#00e676' },
              { icon: Zap, title: 'Instant Contributions', desc: 'Send and receive contributions in real-time', color: '#ffd600' },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}>
                <PixelCard className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 flex items-center justify-center shrink-0 rounded-lg" style={{ background: `${f.color}15`, border: `1px solid ${f.color}40` }}>
                    <f.icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-txprim mb-0.5">{f.title}</div>
                    <div className="text-xs text-txsec">{f.desc}</div>
                  </div>
                </PixelCard>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <PixelCard className="p-6 md:p-8">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-10 h-10 flex items-center justify-center bg-cyan text-bgdark font-heading font-bold rounded-lg" style={{ boxShadow: '0 0 16px rgba(0,212,230,0.4)' }}>P</div>
              <div>
                <div className="font-heading font-semibold text-txprim">PayDAO</div>
                <div className="text-xs text-txdim">Demo Environment</div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-heading font-semibold text-txprim mb-1">Sign In</h2>
              <p className="text-sm text-txsec">Enter your credentials to access PayDAO</p>
            </div>

            <div className="card p-3 mb-5 bg-bgdark" style={{ borderColor: 'rgba(255,214,0,0.3)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-yellow uppercase tracking-wide">Demo Environment</span>
              </div>
              <div className="text-xs text-txsec">Connect a Solana wallet to use PayDAO. Your wallet is your identity.</div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="demo@paydao.app" className="input" autoComplete="email" />
              </div>
              <div>
                <label className="text-xs font-medium text-txsec uppercase tracking-wide block mb-2">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="input pr-10" autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-txdim hover:text-txprim">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button type="button" onClick={() => setRemember(!remember)} className="w-4 h-4 border border-bdlight rounded flex items-center justify-center" style={{ background: remember ? '#00d4e6' : 'transparent' }}>
                    {remember && <span className="text-bgdark text-xs">✓</span>}
                  </button>
                  <span className="text-sm text-txsec">Remember me</span>
                </label>
                <button type="button" className="text-sm text-cyan hover:text-cyan/80">Forgot password?</button>
              </div>

              {error && <div className="card p-3 bg-red/10" style={{ borderColor: 'rgba(255,56,96,0.3)' }}><p className="text-sm text-red">{error}</p></div>}

              <PixelButton type="submit" variant="primary" size="lg" className="w-full" disabled={loading || walletLoading}>
                {loading || walletLoading ? <><span className="inline-block w-4 h-4 border-2 border-bgdark border-t-transparent rounded-full spin" /> Connecting...</> : <>Connect Wallet <ArrowRight className="w-4 h-4" /></>}
              </PixelButton>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-bdlight" />
              <span className="text-xs text-txdim">Or</span>
              <div className="flex-1 h-px bg-bdlight" />
            </div>

            <PixelButton onClick={handleDemoLogin} variant="green" size="lg" className="w-full" disabled={loading || walletLoading}>
              {loading || walletLoading ? 'Connecting...' : 'Connect Solana Wallet'}
            </PixelButton>

            <p className="text-sm text-txsec text-center mt-5">
              New to PayDAO? Connect a wallet to get started.
            </p>
          </PixelCard>
        </motion.div>
      </div>
    </div>
  );
}
