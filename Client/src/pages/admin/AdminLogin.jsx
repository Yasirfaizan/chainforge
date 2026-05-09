import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { adminConsolePath } from "../../lib/adminPaths.js";
import { adminLoginInitiate, adminLoginVerify } from "../../lib/api.js";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    totpCode: "",
  });
  const [totp, setTotp] = useState(["", "", "", "", "", "", ""]);
  const [totp2FA, setTotp2FA] = useState("");
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const inputsRef = useRef([]);

  const setField = (name, value) =>
    setFormData((p) => ({ ...p, [name]: value }));

  const submitStep1 = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      return showToast("Fill email and password", "error");
    }
    setLoading(true);
    try {
      await adminLoginInitiate({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      setStep(2);
    } catch (err) {
      showToast(err.response?.data?.error || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const onTotpChange = (idx, raw) => {
    const v = raw.replace(/\D/g, "").slice(0, 1);
    const next = [...totp];
    next[idx] = v;
    setTotp(next);
    if (v && idx < 5) inputsRef.current[idx + 1]?.focus();
    if (next.every(Boolean)) setField("totpCode", next.join(""));
  };

  const submitStep2 = async (e) => {
    e.preventDefault();
    const code = totp.join("");
    if (code.length !== 6 && !requiresTOTP) return showToast("Enter full 6-digit code", "error");
    if (requiresTOTP && totp2FA.length !== 6) return showToast("Enter full 6-digit TOTP code", "error");
    setLoading(true);
    try {
      const data = await adminLoginVerify({
        email: formData.email.trim().toLowerCase(),
        code: requiresTOTP ? undefined : code,
        totpCode: requiresTOTP ? totp2FA : undefined,
      });
      await loginAdmin(data.token, data.user);
      setStep(3);
      setTimeout(() => navigate(adminConsolePath("/dashboard/overview")), 600);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.requiresTOTP) {
        setRequiresTOTP(true);
        showToast(errorData?.message || "TOTP code required", "error");
      } else {
        showToast(errorData?.error || "Verification failed", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    try {
      await adminLoginInitiate({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      showToast("New code sent", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to resend code", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto mt-16 w-full max-w-md px-6">
      <div className="rounded-xl border border-cf-border bg-cf-card p-6 shadow-xl">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-cf-muted">
          Secure admin access
        </p>
        <h1 className="mt-2 text-2xl font-bold text-cf-text">Admin Login</h1>
        {step === 1 && (
          <form className="mt-5 space-y-3" onSubmit={submitStep1}>
            <input
              className="w-full rounded-lg border border-cf-border bg-cf-input px-3 py-2 text-sm"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setField("email", e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-cf-border bg-cf-input px-3 py-2 text-sm"
              placeholder="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setField("password", e.target.value)}
            />
            <button
              disabled={loading}
              className="w-full rounded-lg bg-red-600 py-2 text-sm font-semibold text-white"
            >
              {loading ? "Sending code..." : "Continue"}
            </button>
          </form>
        )}
        {step === 2 && (
          <form className="mt-5 space-y-4" onSubmit={submitStep2}>
            <p className="text-sm text-cf-muted">
              {requiresTOTP 
                ? "Enter your 6-digit authenticator app code."
                : "Enter the 6-digit code sent to your email."
              }
            </p>
            
            {/* Email OTP Input */}
            {!requiresTOTP && (
              <div className="flex justify-between gap-2">
                {totp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputsRef.current[i] = el)}
                    value={d}
                    onChange={(e) => onTotpChange(i, e.target.value)}
                    className="h-12 w-10 rounded-lg border border-cf-border bg-cf-input text-center text-lg"
                    inputMode="numeric"
                    maxLength={1}
                  />
                ))}
              </div>
            )}

            {/* TOTP Input */}
            {requiresTOTP && (
              <input
                value={totp2FA}
                onChange={(e) => setTotp2FA(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-lg border border-cf-border bg-cf-input px-4 py-3 text-center text-lg font-mono"
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
              />
            )}

            <button
              type="button"
              onClick={resendCode}
              disabled={loading}
              className="w-full rounded-lg border border-cf-border bg-cf-input py-2 text-xs font-semibold text-cf-text"
            >
              {loading ? "Resending..." : "Resend code"}
            </button>
            <button
              disabled={loading}
              className="w-full rounded-lg bg-red-600 py-2 text-sm font-semibold text-white"
            >
              {loading ? "Verifying..." : "Sign in"}
            </button>
          </form>
        )}
        {step === 3 && (
          <p className="mt-5 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
            Authentication successful. Redirecting…
          </p>
        )}
        <p className="mt-4 text-sm text-cf-muted">
          Need access?{" "}
          <Link className="text-red-500" to={adminConsolePath("/signup")}>
            Create admin account
          </Link>
        </p>
      </div>
    </main>
  );
}
