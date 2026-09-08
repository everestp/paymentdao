
import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { ToastContainer } from "@/components/retro/Toast";

import { ActivityPage } from "@/pages/ActivityPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { GroupDetailPage } from "@/pages/GroupDetailPage";
import { GroupsPage } from "@/pages/GroupsPage";
import { LoginPage } from "@/pages/LoginPage";
import { MembersPage } from "@/pages/MembersPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { PaymentsPage } from "@/pages/PaymentsPage";
import { ProposalDetailPage } from "@/pages/ProposalDetailPage";
import { ProposalsPage } from "@/pages/ProposalsPage";
import { ReceivePage } from "@/pages/ReceivePage";
import { SendPage } from "@/pages/SendPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { WalletPage } from "@/pages/WalletPage";

import { AppProvider, useApp } from "@/store/AppContext";

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
 * ========================================================== */

function ProtectedRoutes() {
  const {
    walletConnected,
    user,
  } = useApp();

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

  /*
   * If you don't currently have an onboarding system in
   * AppContext, don't block the application here.
   *
   * You can add hasOnboarded later.
   */

  return (
    <AppShell>
      <Routes>
        {/* ----------------------------------------------------
         * DASHBOARD
         * -------------------------------------------------- */}

        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        {/* ----------------------------------------------------
         * WALLET
         * -------------------------------------------------- */}

        <Route
          path="/wallet"
          element={<WalletPage />}
        />

        {/* ----------------------------------------------------
         * PAYMENTS
         * -------------------------------------------------- */}

        <Route
          path="/payments"
          element={<PaymentsPage />}
        />

        {/* ----------------------------------------------------
         * SEND / RECEIVE
         * -------------------------------------------------- */}

        <Route
          path="/send"
          element={<SendPage />}
        />

        <Route
          path="/receive"
          element={<ReceivePage />}
        />

        {/* ----------------------------------------------------
         * GROUPS
         * -------------------------------------------------- */}

        <Route
          path="/groups"
          element={<GroupsPage />}
        />

        <Route
          path="/groups/:id"
          element={<GroupDetailPage />}
        />

        {/* ----------------------------------------------------
         * PROPOSALS
         * -------------------------------------------------- */}

        <Route
          path="/proposals"
          element={<ProposalsPage />}
        />

        <Route
          path="/proposals/:id"
          element={<ProposalDetailPage />}
        />

        {/* ----------------------------------------------------
         * TRANSACTIONS
         * -------------------------------------------------- */}

        <Route
          path="/transactions"
          element={<TransactionsPage />}
        />

        {/* ----------------------------------------------------
         * MEMBERS
         * -------------------------------------------------- */}

        <Route
          path="/members"
          element={<MembersPage />}
        />

        {/* ----------------------------------------------------
         * ACTIVITY
         * -------------------------------------------------- */}

        <Route
          path="/activity"
          element={<ActivityPage />}
        />

        {/* ----------------------------------------------------
         * SETTINGS
         * -------------------------------------------------- */}

        <Route
          path="/settings"
          element={<SettingsPage />}
        />

        {/* ----------------------------------------------------
         * FALLBACK
         * -------------------------------------------------- */}

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
 * PUBLIC / APP ROUTES
 * ========================================================== */

function AppRoutes() {
  const {
    walletConnected,
  } = useApp();

  return (
    <Routes>
      {/* ------------------------------------------------------
       * LOGIN
       * ---------------------------------------------------- */}

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

      {/* ------------------------------------------------------
       * ONBOARDING
       *
       * Currently available but not forced.
       * ---------------------------------------------------- */}

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

      {/* ------------------------------------------------------
       * PROTECTED APPLICATION
       * ---------------------------------------------------- */}

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
        <ScrollToTop />

        <AppRoutes />

        <ToastContainer />
      </BrowserRouter>
    </AppProvider>
  );
}
