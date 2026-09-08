
import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

/* ============================================================
 * LAYOUT
 * ========================================================== */

import { AppShell } from "@/components/layout/AppShell";
import { ToastContainer } from "@/components/retro/Toast";

/* ============================================================
 * PAGES
 * ========================================================== */

import { ActivityPage } from "@/pages/ActivityPage";
import { DashboardPage } from "@/pages/DashboardPage";
import GroupDetailPage from "@/pages/GroupDetailPage";
import { GroupsPage } from "@/pages/GroupsPage";
import { LoginPage } from "@/pages/LoginPage";
import { MembersPage } from "@/pages/MembersPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { PaymentsPage } from "@/pages/PaymentsPage";
import ProposalDetailPage from "@/pages/ProposalDetailPage";
import { ProposalsPage } from "@/pages/ProposalsPage";
import { ReceivePage } from "@/pages/ReceivePage";
import { SendPage } from "@/pages/SendPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { WalletPage } from "@/pages/WalletPage";

/* ============================================================
 * APP CONTEXT
 * ========================================================== */

import {
  AppProvider,
  useApp,
} from "@/store/AppContext";
import { useWallet } from "@solana/wallet-adapter-react";

/* ============================================================
 * SCROLL TO TOP
 * ========================================================== */

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}

/* ============================================================
 * PROTECTED APPLICATION
 *
 * Everything here requires a connected wallet.
 * ========================================================== */

function ProtectedRoutes() {
  const { walletConnected } = useApp();
  const location = useLocation();

  /* ----------------------------------------------------------
   * WALLET NOT CONNECTED
   *
   * Send user back to homepage.
   * -------------------------------------------------------- */

  if (!walletConnected) {
    return (
      <Navigate
        to="/"
        state={{
          from: location,
        }}
        replace
      />
    );
  }

  /* ----------------------------------------------------------
   * WALLET CONNECTED
   * -------------------------------------------------------- */

  return (
    <AppShell>
      <Routes>

        {/* ====================================================
         * DASHBOARD
         * ================================================== */}

        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        {/* ====================================================
         * WALLET
         * ================================================== */}

        <Route
          path="/wallet"
          element={<WalletPage />}
        />

        {/* ====================================================
         * PAYMENTS
         * ================================================== */}

        <Route
          path="/payments"
          element={<PaymentsPage />}
        />

        {/* ====================================================
         * SEND
         * ================================================== */}

        <Route
          path="/send"
          element={<SendPage />}
        />

        {/* ====================================================
         * RECEIVE
         * ================================================== */}

        <Route
          path="/receive"
          element={<ReceivePage />}
        />

        {/* ====================================================
         * GROUPS
         * ================================================== */}

        <Route
          path="/groups"
          element={<GroupsPage />}
        />

        <Route
          path="/groups/:id"
          element={<GroupDetailPage />}
        />

        {/* ====================================================
         * PROPOSALS
         * ================================================== */}

        <Route
          path="/proposals"
          element={<ProposalsPage />}
        />

        <Route
          path="/proposals/:id"
          element={<ProposalDetailPage />}
        />

        {/* ====================================================
         * TRANSACTIONS
         * ================================================== */}

        <Route
          path="/transactions"
          element={<TransactionsPage />}
        />

        {/* ====================================================
         * MEMBERS
         * ================================================== */}

        <Route
          path="/members"
          element={<MembersPage />}
        />

        {/* ====================================================
         * ACTIVITY
         * ================================================== */}

        <Route
          path="/activity"
          element={<ActivityPage />}
        />

        {/* ====================================================
         * SETTINGS
         * ================================================== */}

        <Route
          path="/settings"
          element={<SettingsPage />}
        />

        {/* ====================================================
         * UNKNOWN PROTECTED ROUTE
         * ================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>
    </AppShell>
  );
}

/* ============================================================
 * APPLICATION ROUTES
 * ========================================================== */

function AppRoutes() {
  const { connected } = useWallet();

  return (
    <Routes>

      {/* ======================================================
       * HOMEPAGE
       *
       * /
       *
       * Disconnected → LoginPage
       * Connected → Dashboard
       * ==================================================== */}

      <Route
        path="/"
        element={
          connected ? (
            <Navigate
              to="/dashboard"
              replace
            />
          ) : (
            <LoginPage />
          )
        }
      />

      {/* ======================================================
       * ONBOARDING
       *
       * Wallet is required.
       * ==================================================== */}

      <Route
        path="/onboarding"
        element={
          connected ? (
            <OnboardingPage />
          ) : (
            <Navigate
              to="/"
              replace
            />
          )
        }
      />

      {/* ======================================================
       * PROTECTED APPLICATION
       * ==================================================== */}

      <Route
        path="/*"
        element={<ProtectedRoutes />}
      />

    </Routes>
  );
}

/* ============================================================
 * APP
 * ========================================================== */

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>

        {/* Scroll to top on route changes */}
        <ScrollToTop />

        {/* Application routes */}
        <AppRoutes />

        {/* Global Toasts */}
        <ToastContainer />

      </BrowserRouter>
    </AppProvider>
  );
}
