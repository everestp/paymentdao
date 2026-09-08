
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
import  ProposalDetailPage  from "@/pages/ProposalDetailPage";
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
 * PROTECTED ROUTES
 *
 * Everything inside this component requires
 * a connected Solana wallet.
 * ========================================================== */

function ProtectedRoutes() {
  const { walletConnected } = useApp();

  const location = useLocation();

  /* ----------------------------------------------------------
   * WALLET NOT CONNECTED
   * -------------------------------------------------------- */

  if (!walletConnected) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
        }}
        replace
      />
    );
  }

  /* ----------------------------------------------------------
   * PROTECTED APPLICATION
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

        {/* ----------------------------------------------------
         * PROPOSAL DETAIL
         *
         * Example:
         *
         * /proposals/7xKX...
         *
         * :id contains the proposal PDA.
         * -------------------------------------------------- */}

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
         * PROTECTED FALLBACK
         *
         * Any unknown protected URL goes to dashboard.
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
 * PUBLIC / APPLICATION ROUTES
 * ========================================================== */

function AppRoutes() {
  const { walletConnected } = useApp();

  return (
    <Routes>

      {/* ======================================================
       * LOGIN
       * ==================================================== */}

      <Route
        path="/login"
        element={
          walletConnected ? (
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
       * Wallet must be connected.
       *
       * Currently NOT forced automatically.
       * ==================================================== */}

      <Route
        path="/onboarding"
        element={
          walletConnected ? (
            <OnboardingPage />
          ) : (
            <Navigate
              to="/login"
              replace
            />
          )
        }
      />

      {/* ======================================================
       * PROTECTED APPLICATION
       *
       * All remaining routes are handled by
       * ProtectedRoutes.
       * ==================================================== */}

      <Route
        path="/*"
        element={<ProtectedRoutes />}
      />

      {/* ======================================================
       * GLOBAL FALLBACK
       * ==================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to={
              walletConnected
                ? "/dashboard"
                : "/login"
            }
            replace
          />
        }
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

        {/* ----------------------------------------------------
         * RESET SCROLL ON ROUTE CHANGE
         * -------------------------------------------------- */}

        <ScrollToTop />

        {/* ----------------------------------------------------
         * APPLICATION ROUTES
         * -------------------------------------------------- */}

        <AppRoutes />

        {/* ----------------------------------------------------
         * GLOBAL TOASTS
         * -------------------------------------------------- */}

        <ToastContainer />

      </BrowserRouter>
    </AppProvider>
  );
}
