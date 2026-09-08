import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AppProvider, useApp } from '@/store/AppContext';
import { AppShell } from '@/components/layout/AppShell';
import { ToastContainer } from '@/components/retro/Toast';
import { LoginPage } from '@/pages/LoginPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { WalletPage } from '@/pages/WalletPage';
import { SendPage } from '@/pages/SendPage';
import { ReceivePage } from '@/pages/ReceivePage';
import { PaymentsPage } from '@/pages/PaymentsPage';
import { GroupsPage } from '@/pages/GroupsPage';
import { GroupDetailPage } from '@/pages/GroupDetailPage';
import { ProposalsPage } from '@/pages/ProposalsPage';
import { ProposalDetailPage } from '@/pages/ProposalDetailPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { MembersPage } from '@/pages/MembersPage';
import { ActivityPage } from '@/pages/ActivityPage';
import { SettingsPage } from '@/pages/SettingsPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function ProtectedRoutes() {
  // const { isLoggedIn, hasOnboarded } = useApp();
  const location = useLocation();



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
  const { isLoggedIn, hasOnboarded } = useApp();

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to={hasOnboarded ? '/dashboard' : '/onboarding'} replace /> : <LoginPage />} />
      <Route path="/onboarding" element={isLoggedIn ? <OnboardingPage /> : <Navigate to="/login" replace />} />
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
