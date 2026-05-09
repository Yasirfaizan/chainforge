import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ClientNavbar from "./components/ClientNavbar.jsx";
import AdminNavbar from "./components/AdminNavbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import PageTransition from "./components/PageTransition.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import Landing from "./pages/LandingV2.jsx";
import Docs from "./pages/Docs.jsx";
import NotFound from "./pages/NotFound.jsx";
import ClientLogin from "./pages/client/ClientLogin.jsx";
import ClientSignup from "./pages/client/ClientSignup.jsx";
import ClientDashboard from "./pages/client/ClientDashboardV2.jsx";
import ClientTransactions from "./pages/client/ClientTransactions.jsx";
import ClientWallets from "./pages/client/ClientWallets.jsx";
import AuthCallback from "./pages/client/AuthCallback.jsx";
import { ADMIN_CONSOLE_PREFIX, adminConsolePath } from "./lib/adminPaths.js";
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.jsx"));
const AdminSignup = lazy(() => import("./pages/admin/AdminSignup.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview.jsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.jsx"));
const AdminTransactions = lazy(
  () => import("./pages/admin/AdminTransactions.jsx"),
);
const AdminAPIKeys = lazy(() => import("./pages/admin/AdminAPIKeys.jsx"));
const AdminChainStats = lazy(() => import("./pages/admin/AdminChainStats.jsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.jsx"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog.jsx"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling.jsx"));

function Layout({ children, showNav = true, navType }) {
  const { role, isAuthenticated } = useAuth();
  
  // Determine navType based on auth state if not explicitly provided
  const effectiveNavType = navType || (isAuthenticated ? (role === "admin" ? "admin" : "client") : "public");

  const navByType = {
    public: Navbar,
    client: ClientNavbar,
    admin: AdminNavbar,
  };
  const ActiveNavbar = navByType[effectiveNavType] || Navbar;

  return (
    <>
      {showNav && <ActiveNavbar />}
      <PageTransition>{children}</PageTransition>
    </>
  );
}

export default function App() {
  return (
    <Suspense
      fallback={<div className="p-8 text-sm text-cf-muted">Loading…</div>}
    >
      <Routes>
        <Route
          path="/"
          element={
            <Layout navType="public">
              <Landing />
            </Layout>
          }
        />
        <Route
          path="/docs"
          element={
            <Layout>
              <Docs />
            </Layout>
          }
        />
        <Route
          path="/login"
          element={
            <Layout>
              <ClientLogin />
            </Layout>
          }
        />
        <Route
          path="/signup"
          element={
            <Layout>
              <ClientSignup />
            </Layout>
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout navType="client">
                <ErrorBoundary
                  fallback={
                    <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-cf-border bg-cf-card p-6 text-center text-cf-text">
                      <h2 className="text-xl font-semibold">Dashboard temporarily unavailable</h2>
                      <p className="mt-2 text-sm text-cf-muted">
                        We are fixing an issue on the client dashboard. Please try again later.
                      </p>
                    </div>
                  }
                >
                  <ClientDashboard />
                </ErrorBoundary>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Layout navType="client">
                <ClientTransactions />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallets"
          element={
            <ProtectedRoute>
              <Layout navType="client">
                <ClientWallets />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Admin Routes */}
        <Route
          path="/admin/login"
          element={
            <Layout showNav={false}>
              <AdminLogin />
            </Layout>
          }
        />
        <Route
          path="/admin/signup"
          element={
            <Layout showNav={false}>
              <AdminSignup />
            </Layout>
          }
        />
        <Route
          path="/admin/dashboard/*"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        {/* Redirects for legacy/security paths if any */}
        <Route path="/client/login" element={<Navigate to="/login" replace />} />
        <Route path="/client/signup" element={<Navigate to="/signup" replace />} />
        <Route path="/client/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
