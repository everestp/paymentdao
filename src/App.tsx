import { AppShell } from '@/components/layout/AppShell';
import { ToastContainer } from '@/components/retro/Toast';
import { ActivityPage } from '@/pages/ActivityPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { GroupDetailPage } from '@/pages/GroupDetailPage';
import { GroupsPage } from '@/pages/GroupsPage';
import { LoginPage } from '@/pages/LoginPage';
import { MembersPage } from '@/pages/MembersPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { ProposalDetailPage } from '@/pages/ProposalDetailPage';
import { ProposalsPage } from '@/pages/ProposalsPage';
import { ReceivePage } from '@/pages/ReceivePage';
import { SendPage } from '@/pages/SendPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { WalletPage } from '@/pages/WalletPage';
import { AppProvider, useApp } from '@/store/AppContext';
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function ProtectedRoutes() {
  const { isWalletConnected, hasOnboarded } = useApp();
  const location = useLocation();

  if (!isWalletConnected) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasOnboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/send" element={<SendPage />} />
        <Route path="/receive" element={<ReceivePage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/:id" element={<GroupDetailPage />} />
        <Route path="/proposals" element={<ProposalsPage />} />
        <Route path="/proposals/:id" element={<ProposalDetailPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}

function AppRoutes() {
  const { isWalletConnected, hasOnboarded } = useApp();

  return (
    <Routes>
      <Route path="/login" element={isWalletConnected ? <Navigate to={hasOnboarded ? '/dashboard' : '/onboarding'} replace /> : <LoginPage />} />
      <Route path="/onboarding" element={isWalletConnected ? <OnboardingPage /> : <Navigate to="/login" replace />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}
