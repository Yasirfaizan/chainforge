import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { adminConsolePath } from "../lib/adminPaths.js";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, role, loading } = useAuth();
  
  if (loading) {
    return <div className="p-8 text-sm text-cf-muted">Verifying session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (role === "admin") {
    return <Navigate to={adminConsolePath("/dashboard/overview")} replace />;
  }
  return children;
}
