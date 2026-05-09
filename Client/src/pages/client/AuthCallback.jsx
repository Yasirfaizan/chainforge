import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { fetchMe, setAuthHeader } from "../../lib/api.js";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginClient } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      const proceed = async () => {
        try {
          // Set header temporarily to fetch user info
          setAuthHeader(token);
          const userData = await fetchMe();
          
          await loginClient(token, userData); 
          showToast(`Welcome back, ${userData.name || "Developer"}!`, "success");
          navigate("/dashboard");
        } catch (err) {
          showToast("Authentication failed during profile fetch", "error");
          navigate("/login");
        }
      };
      proceed();
    } else {
      navigate("/login");
    }
  }, [searchParams, loginClient, navigate, showToast]);

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="mt-4 text-cf-muted">Completing authentication...</p>
      </div>
    </div>
  );
}
