import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { adminConsolePath } from "../lib/adminPaths.js";

export default function AdminRoute({ children }) {
  try {
    const { isAuthenticated, role, loading } = useAuth();

    if (loading) {
      return <div className="p-8 text-sm text-cf-muted">Verifying admin session...</div>;
    }

    if (!isAuthenticated) {
      return <Navigate to={adminConsolePath("/login")} replace />;
    }
    if (role !== "admin") {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  } catch (error) {
    console.error("AdminRoute error:", error);
    return <div className="p-8 text-sm text-red-500">Admin authentication error. Please try refreshing the page.</div>;
  }
}
