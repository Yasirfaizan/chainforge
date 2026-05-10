import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { adminConsolePath } from "../../lib/adminPaths.js";
import { adminSignupInitiate, adminSignupVerify } from "../../lib/api.js";

export default function AdminSignup() {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    adminCode: "",
  });

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submitSignup = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.adminCode)
      return showToast("Please fill all required fields", "error");
    if (form.password !== form.confirmPassword)
      return showToast("Passwords do not match", "error");
    setLoading(true);
    try {
      await adminSignupInitiate({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        adminCode: form.adminCode.trim(),
      });
      setStep(2);
      showToast("Verification code sent to your email", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Signup failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) return showToast("Enter 6-digit code", "error");
    setLoading(true);
    try {
      const data = await adminSignupVerify({
        email: form.email.trim().toLowerCase(),
        code: otpCode,
      });
      await loginAdmin(data.token, data.user);
      navigate(adminConsolePath("/dashboard/overview"));
    } catch (err) {
      showToast(
        err.response?.data?.error || "Verification failed",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto mt-12 w-full max-w-lg px-6">
      <div className="rounded-xl border border-cf-border bg-cf-card p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-cf-text">Admin Signup</h1>
        {step === 1 && (
          <form className="mt-5 space-y-3" onSubmit={submitSignup}>
            <input
              className="w-full rounded-lg border border-cf-border bg-cf-input px-3 py-2 text-sm"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-cf-border bg-cf-input px-3 py-2 text-sm"
              placeholder="Work email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
            />
            <input
              type="password"
              className="w-full rounded-lg border border-cf-border bg-cf-input px-3 py-2 text-sm"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
            />
            <input
              type="password"
              className="w-full rounded-lg border border-cf-border bg-cf-input px-3 py-2 text-sm"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={(e) => setField("confirmPassword", e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-cf-border bg-cf-input px-3 py-2 font-mono text-sm"
              placeholder="Admin code"
              value={form.adminCode}
              onChange={(e) => setField("adminCode", e.target.value)}
            />
            <button
              disabled={loading}
              className="w-full rounded-lg bg-red-600 py-2 text-sm font-semibold text-white"
            >
              {loading ? "Creating..." : "Create account"}
            </button>
          </form>
        )}
        {step === 2 && (
          <form className="mt-5 space-y-4" onSubmit={verifyOtp}>
            <p className="text-sm text-cf-muted">
              Enter the 6-digit code sent to your email.
            </p>
            <p className="text-xs font-bold text-red-500 bg-red-500/10 py-1 rounded-lg text-center">
              Hackathon Bypass: Use code 000000
            </p>
            <input
              className="w-full rounded-lg border border-cf-border bg-cf-input px-3 py-2 text-center font-mono text-lg tracking-[0.3em]"
              placeholder="000000"
              value={otpCode}
              onChange={(e) =>
                setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
            <button
              disabled={loading}
              className="w-full rounded-lg bg-red-600 py-2 text-sm font-semibold text-white"
            >
              {loading ? "Verifying..." : "Verify and activate"}
            </button>
          </form>
        )}
        <p className="mt-4 text-sm text-cf-muted">
          Have access already?{" "}
          <Link className="text-red-500" to={adminConsolePath("/login")}>
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
