import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Users, Vote, ArrowRight, Check } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { PixelButton } from '@/components/retro/PixelButton';

const steps = [
  { icon: Wallet, title: 'Welcome to PayDAO', description: 'A collaborative funding and governance platform. Create funding pools, contribute to shared goals, and vote privately on proposals.', color: '#00d4e6' },
  { icon: Users, title: 'Create or join a group', description: 'Start a new funding group or join an existing one. Set funding targets and invite your community to contribute.', color: '#00e676' },
  { icon: Vote, title: 'Propose and vote privately', description: 'Any member can create proposals. Vote privately — only aggregate results are shown, never individual identities.', color: '#ffd600' },
  { icon: Check, title: 'Automatic execution', description: 'When a proposal passes, the action executes automatically. No admin approval needed. The protocol handles it.', color: '#ff2e9a' },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const current = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else { completeOnboarding(); navigate('/dashboard'); }
  };

  return (
    <div className="min-h-screen bg-bgdark grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="h-2 rounded-full transition-all" style={{
              width: i === step ? '32px' : '12px',
              background: i <= step ? current.color : '#252836',
              boxShadow: i === step ? `0 0 8px ${current.color}` : 'none',
            }} />
          ))}
        </div>

        <div className="card p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 opacity-5 rounded-full" style={{ background: current.color }} />
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              <div className="w-16 h-16 flex items-center justify-center mb-6 mx-auto rounded-2xl" style={{ background: `${current.color}15`, border: `1px solid ${current.color}40`, boxShadow: `0 0 20px ${current.color}30` }}>
                <current.icon className="w-8 h-8" style={{ color: current.color }} />
              </div>
              <div className="text-center">
                <div className="text-xs font-medium text-txdim uppercase tracking-wide mb-3">Step {step + 1} of {steps.length}</div>
                <h2 className="text-xl font-heading font-semibold text-txprim mb-4">{current.title}</h2>
                <p className="text-sm text-txsec leading-relaxed max-w-sm mx-auto">{current.description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="flex items-center justify-between mt-8 gap-3">
            <button onClick={() => { completeOnboarding(); navigate('/dashboard'); }} className="text-sm text-txdim hover:text-txsec">Skip setup</button>
            <PixelButton onClick={handleNext} variant="primary" size="lg">
              {step === steps.length - 1 ? 'Enter PayDAO' : 'Continue'} <ArrowRight className="w-4 h-4" />
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  );
}
