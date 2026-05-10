import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import { zxcvbn } from "@zxcvbn-ts/core";
import confetti from "canvas-confetti";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import api from "../../lib/api.js";
import WalletModalV2 from "../../components/WalletModalV2.jsx";

// Verification code input component
function VerificationInput({ onSubmit, onResend, email, loading, timeLeft }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const inputs = React.useRef([]);

  const handleChange = (index, value) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    if (index === 5 && value) {
      const fullCode = [...newCode.slice(0, 5), value].join("");
      if (fullCode.length === 6) {
        onSubmit(fullCode);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim().slice(0, 6);
    if (!/^\d+$/.test(pasteData)) return;

    const newCode = [...code];
    const digits = pasteData.split("");
    digits.forEach((char, i) => {
      newCode[i] = char;
    });
    setCode(newCode);

    if (pasteData.length === 6) {
      onSubmit(pasteData);
    } else {
      inputs.current[pasteData.length]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-on-surface-variant text-sm mb-4">
          Enter the 6-digit code sent to<br />
          <span className="text-on-surface font-medium">{email}</span>
        </p>
        <p className="text-primary font-bold text-xs mt-2 bg-primary/10 py-1 rounded-full">
          Hackathon Bypass: Use code 000000
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {code.map((digit, index) => (
          <motion.input
            key={index}
            ref={(el) => (inputs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={loading}
            className="w-12 h-14 text-center text-2xl font-bold bg-surface-container-lowest text-on-surface rounded-xl border-2 border-outline-variant/30 focus:border-primary focus:outline-none transition-all disabled:opacity-50"
            whileFocus={{ scale: 1.05 }}
          />
        ))}
      </div>

      <div className="text-center space-y-3">
        <p className="text-sm text-on-surface-variant">
          Code expires in{" "}
          <span className={timeLeft < 60 ? "text-red-500 font-medium" : "text-primary font-medium"}>
            {formatTime(timeLeft)}
          </span>
        </p>

        <button
          type="button"
          onClick={onResend}
          disabled={loading || timeLeft > 0}
          className="text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline"
        >
          Resend code
        </button>
      </div>
    </div>
  );
}

export default function ClientSignup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    walletName: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Verification flow states
  const [showVerification, setShowVerification] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
  const [walletOpen, setWalletOpen] = useState(false);
  const strength = zxcvbn(formData.password || "").score;

  const navigate = useNavigate();
  const { loginClient } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (showVerification && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [showVerification, timeLeft]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.name.trim()) nextErrors.name = "Name is required";
    if (!formData.email.match(/^[\w\-.]+@([\w-]+\.)+[\w-]{2,4}$/))
      nextErrors.email = "Valid email is required";
    if (formData.password.length < 8)
      nextErrors.password = "Password must be at least 8 characters";
    if (formData.password !== formData.confirmPassword)
      nextErrors.confirmPassword = "Passwords do not match";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Step 1: Initiate signup - send verification code
  const handleInitiateSignup = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };
      await api.post("/api/client/signup/initiate", payload);

      showToast("Verification code sent to your email!", "success");
      setShowVerification(true);
      setTimeLeft(900);
    } catch (err) {
      const serverMessage = err.response?.data?.error;
      const message = serverMessage || "Signup failed. Please try again.";
      showToast(message, "error");
      if (err.response?.status === 409) {
        setErrors({ email: "Email already registered" });
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code and complete signup
  const handleVerificationSubmit = async (code) => {
    setLoading(true);
    try {
      const response = await api.post("/api/client/signup/verify", {
        email: formData.email.trim().toLowerCase(),
        code,
      });

      loginClient(response.data.token, response.data.user);
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.62 } });
      showToast("Account created successfully!", "success");
      navigate("/dashboard");
    } catch (err) {
      const message = err.response?.data?.error || "Verification failed";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };
      await api.post("/api/client/signup/initiate", payload);

      showToast("New code sent!", "success");
      setTimeLeft(900);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to resend code", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
      <div className="absolute inset-0 dot-grid pointer-events-none"></div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface mb-4">
            {showVerification ? "Verify your email" : "Start building for free."}
          </h1>
          <p className="text-on-surface-variant font-medium tracking-tight">
            {showVerification
              ? "Enter the 6-digit code we sent to your email"
              : "Join the ChainForge ecosystem — the Firebase of Web3."}
          </p>
        </div>

        {!showVerification && (
          <div className="bg-surface-container-high p-1 rounded-2xl border border-outline-variant/20 mb-8 flex">
            <div className="flex-1 py-3 text-sm font-bold tracking-tight rounded-xl bg-surface-container text-primary transition-all duration-300 shadow-lg flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">mail</span>
              Email Sign Up
            </div>
          </div>
        )}

        <div className="bg-surface-container rounded-3xl p-8 shadow-xl relative overflow-hidden border border-outline-variant/20">
          <AnimatePresence mode="wait">
            {showVerification ? (
              <motion.div
                key="verification"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <VerificationInput
                  onSubmit={handleVerificationSubmit}
                  onResend={handleResendCode}
                  email={formData.email}
                  loading={loading}
                  timeLeft={timeLeft}
                />
                <button
                  type="button"
                  onClick={() => setShowVerification(false)}
                  className="w-full text-on-surface-variant hover:text-on-surface py-2 text-sm"
                >
                  ← Back to signup
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="signup"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleInitiateSignup}
                className="space-y-6"
              >
                {/* FIX: Restored missing Name field */}
                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant px-1">
                    Full Name
                  </label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full bg-surface-container-lowest text-on-surface px-4 py-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-outline transition-all border ${
                      errors.name ? "border-red-500" : "border-outline-variant/20"
                    }`}
                    placeholder="Alex Johnson"
                    type="text"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant px-1">
                    Email
                  </label>
                  <input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full bg-surface-container-lowest text-on-surface px-4 py-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-outline transition-all border ${
                      errors.email ? "border-red-500" : "border-outline-variant/20"
                    }`}
                    placeholder="alex@chainforge.io"
                    type="email"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant px-1">
                      Password
                    </label>
                    <input
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full bg-surface-container-lowest text-on-surface px-4 py-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-outline transition-all border ${
                        errors.password ? "border-red-500" : "border-outline-variant/20"
                      }`}
                      placeholder="••••••••"
                      type="password"
                    />
                    {errors.password && (
                      <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                    )}
                    <div className="h-1.5 rounded-full bg-cf-input">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-400 transition-all"
                        style={{ width: `${(strength + 1) * 20}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant px-1">
                      Confirm
                    </label>
                    <input
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full bg-surface-container-lowest text-on-surface px-4 py-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-outline transition-all border ${
                        errors.confirmPassword ? "border-red-500" : "border-outline-variant/20"
                      }`}
                      placeholder="••••••••"
                      type="password"
                    />
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary-container to-secondary-container text-white py-4 rounded-xl font-bold tracking-tight shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending code..." : "Create Free Account"}
                </button>

                <div className="relative my-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-surface-container px-2 text-xs text-cf-muted">
                    or
                  </span>
                </div>

                <div className="space-y-2">
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      try {
                        const res = await api.post("/api/auth/google/verify-idtoken", {
                          idToken: credentialResponse.credential,
                        });
                        await loginClient(res.data.token, res.data.user);
                        navigate("/dashboard");
                      } catch {
                        showToast("Google signup failed", "error");
                      }
                    }}
                    onError={() => showToast("Google sign-in cancelled", "error")}
                  />
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `${
                          import.meta.env.VITE_API_URL || "http://localhost:5001"
                        }/api/auth/github`;
                      }}
                      className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/30 py-3 text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      GitHub
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletOpen(true)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/30 py-3 text-sm font-medium text-on-surface hover:bg-surface-container-high transition-colors"
                    >
                      <span>👛</span>
                      Wallet
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {!showVerification && (
            <div className="mt-8 pt-8 border-t border-outline-variant/20 text-center">
              <p className="text-on-surface-variant text-sm">
                Already have an account?
                <Link
                  className="text-primary font-bold hover:underline ml-1"
                  to="/login"
                >
                  Log in
                </Link>
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* FIX: Removed stray/duplicate AnimatePresence, kept WalletModal */}
      <WalletModalV2
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
      />
    </main>
  );
}