import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import api from "../../lib/api.js";
import WalletModalV2 from "../../components/WalletModalV2.jsx";

// Verification code input component
function VerificationInput({ onSubmit, onResend, email, loading, timeLeft }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const inputs = React.useRef([]);

  const handleChange = (index, value) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-submit when all filled
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

    // Focus last filled input or submit if full
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
          Enter the 6-digit code sent to
          <br />
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

      {error && <p className="text-red-500 text-xs text-center">{error}</p>}

      <div className="text-center space-y-3">
        <p className="text-sm text-on-surface-variant">
          Code expires in{" "}
          <span
            className={
              timeLeft < 60
                ? "text-red-500 font-medium"
                : "text-primary font-medium"
            }
          >
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

// Forgot password flow component
function ForgotPasswordFlow({ onBack }) {
  const [step, setStep] = useState("email"); // email, verify, reset
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
  const { showToast } = useToast();

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await api.post("/api/client/forgot-password", { email });
      showToast("Reset code sent to your email", "success");
      setStep("verify");
      setTimeLeft(900);
    } catch (err) {
      showToast(
        err.response?.data?.error || "Failed to send reset code",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (fullCode) => {
    setLoading(true);
    try {
      const response = await api.post("/api/client/forgot-password/verify", {
        email,
        code: fullCode,
      });
      setResetToken(response.data.resetToken);
      setCode(fullCode);
      setStep("reset");
      showToast("Code verified", "success");
    } catch (err) {
      showToast(err.response?.data?.error || "Invalid code", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/client/reset-password", {
        email,
        resetToken,
        newPassword,
      });
      showToast("Password reset successfully!", "success");
      onBack();
    } catch (err) {
      showToast(
        err.response?.data?.error || "Failed to reset password",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  if (step === "email") {
    return (
      <form onSubmit={handleRequestReset} className="space-y-4">
        <p className="text-on-surface-variant text-sm text-center">
          Enter your email to receive a password reset code
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full bg-surface-container-lowest text-on-surface px-4 py-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none border border-outline-variant/20"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary-container to-secondary-container text-white py-4 rounded-xl font-bold tracking-tight shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send Reset Code"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full text-on-surface-variant hover:text-on-surface py-2 text-sm"
        >
          ← Back to login
        </button>
      </form>
    );
  }

  if (step === "verify") {
    return (
      <div className="space-y-4">
        <p className="text-on-surface-variant text-sm text-center">
          Enter the 6-digit code sent to {email}
        </p>
        <VerificationInput
          onSubmit={handleVerifyCode}
          onResend={handleRequestReset}
          email={email}
          loading={loading}
          timeLeft={timeLeft}
        />
        <button
          type="button"
          onClick={onBack}
          className="w-full text-on-surface-variant hover:text-on-surface py-2 text-sm"
        >
          ← Back to login
        </button>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <form onSubmit={handleResetPassword} className="space-y-4">
        <p className="text-on-surface-variant text-sm text-center">
          Create a new password
        </p>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min 8 characters)"
          className="w-full bg-surface-container-lowest text-on-surface px-4 py-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none border border-outline-variant/20"
          required
          minLength={8}
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="w-full bg-surface-container-lowest text-on-surface px-4 py-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none border border-outline-variant/20"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary-container to-secondary-container text-white py-4 rounded-xl font-bold tracking-tight shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-60"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    );
  }
}

export default function ClientLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Email verification flow states
  const [showVerification, setShowVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
  const [walletOpen, setWalletOpen] = useState(false);

  const navigate = useNavigate();
  const { loginClient } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (showVerification && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [showVerification, timeLeft]);

  const validateEmailLogin = () => {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = "Email required";
    if (!email.match(/^[\w\-.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      nextErrors.email = "Valid email required";
    }
    if (!password || password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Step 1: Initiate login - send verification code
  const handleEmailLoginInitiate = async (e) => {
    e.preventDefault();
    if (!validateEmailLogin()) return;
    setLoading(true);
    try {
      const response = await api.post("/api/client/login/initiate", {
        email: email.trim().toLowerCase(),
        password,
      });

      showToast(response.data.message, "success");
      setShowVerification(true);
      setTimeLeft(900); // Reset timer to 15 minutes
    } catch (err) {
      const message = err.response?.data?.error || "Login failed";
      showToast(message, "error");

      if (err.response?.data?.needsVerification) {
        // User needs to verify email first
        showToast("Please verify your email before logging in", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code and complete login
  const handleVerificationSubmit = async (code) => {
    setLoading(true);
    try {
      const response = await api.post("/api/client/login/verify", {
        email: email.trim().toLowerCase(),
        code,
      });

      await loginClient(response.data.token, response.data.user);
      showToast("Welcome back!", "success");
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
      // Re-initiate login to send new code
      const response = await api.post("/api/client/login/initiate", {
        email: email.trim().toLowerCase(),
        password,
      });

      showToast("New code sent!", "success");
      setTimeLeft(900);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to resend code", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 dot-grid pointer-events-none"></div>

      <main className="relative z-10 w-full max-w-[480px] px-6 mx-auto mt-20 mb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-10 shadow-xl bg-surface-container border border-outline-variant/20 dark:bg-surface-container/60 dark:backdrop-blur-xl"
        >
          <header className="flex flex-col items-center mb-10 text-center">
            <motion.div
              className="mb-6"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
            >
              <span className="text-2xl font-extrabold tracking-tighter text-on-surface">
                ⛓️ ChainForge
              </span>
            </motion.div>
            <h1 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">
              {showForgotPassword
                ? "Reset Password"
                : showVerification
                  ? "Verify Email"
                  : "Welcome back, builder."}
            </h1>
            <p className="text-on-surface-variant text-sm">
              {showForgotPassword
                ? "Enter your email to reset your password"
                : showVerification
                  ? "Enter the 6-digit code sent to your email"
                  : "Secure entry to the ChainForge ecosystem."}
            </p>
          </header>

          <AnimatePresence mode="wait">
            {showForgotPassword ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ForgotPasswordFlow
                  onBack={() => setShowForgotPassword(false)}
                />
              </motion.div>
            ) : showVerification ? (
              <motion.div
                key="verification"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="relative z-30"
              >
                <VerificationInput
                  onSubmit={handleVerificationSubmit}
                  onResend={handleResendCode}
                  email={email}
                  loading={loading}
                  timeLeft={timeLeft}
                />
                <button
                  type="button"
                  onClick={() => setShowVerification(false)}
                  className="w-full text-on-surface-variant hover:text-on-surface py-2 text-sm mt-4"
                >
                  ← Back to login
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex p-1 bg-surface-container-low rounded-xl mb-8 border border-outline-variant/20 relative z-30">
                  <div className="w-full py-2 text-sm font-medium rounded-lg bg-surface-container-highest text-on-surface shadow-sm text-center">
                    Email Login
                  </div>
                </div>
                <form
                  onSubmit={handleEmailLoginInitiate}
                  className="space-y-6 relative z-30"
                >
                  <div className="space-y-2">
                    <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant px-1">
                      Email
                    </label>
                    <input
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) {
                          setErrors((prev) => ({ ...prev, email: "" }));
                        }
                      }}
                      className="w-full bg-surface-container-lowest text-on-surface px-4 py-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-outline border border-outline-variant/20"
                      placeholder="you@email.com"
                      type="email"
                      disabled={loading}
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant px-1">
                      Password
                    </label>
                    <input
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors((prev) => ({ ...prev, password: "" }));
                        }
                      }}
                      className="w-full bg-surface-container-lowest text-on-surface px-4 py-4 rounded-xl focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-outline border border-outline-variant/20"
                      placeholder="••••••••"
                      type="password"
                      disabled={loading}
                    />
                    {errors.password && (
                      <p className="text-red-500 text-xs">{errors.password}</p>
                    )}
                  </div>

                  {/* Forgot Password Link */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowVerification(false);
                        setShowForgotPassword(true);
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-primary-container to-secondary-container text-white py-4 rounded-xl font-bold tracking-tight shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60"
                  >
                    {loading ? "Sending code..." : "Continue"}
                  </button>
                  <div className="relative my-2">
                    <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-surface-container px-2 text-xs text-cf-muted">
                      or
                    </span>
                  </div>
                  <GoogleLogin
                    onSuccess={async (credentialResponse) => {
                      try {
                        const res = await api.post(
                          "/api/auth/google/verify-idtoken",
                          { idToken: credentialResponse.credential },
                        );
                        await loginClient(res.data.token, res.data.user);
                        navigate("/dashboard");
                      } catch {
                        showToast("Google login failed", "error");
                      }
                    }}
                    onError={() =>
                      showToast("Google sign-in cancelled", "error")
                    }
                  />
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/auth/github`;
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
                </form>

                <div className="mt-8 pt-8 border-t border-outline-variant/20 text-center">
                  <p className="text-on-surface-variant text-sm">
                    Don't have an account?
                    <Link
                      className="text-primary font-bold hover:underline ml-1"
                      to="/signup"
                    >
                      Sign up
                    </Link>
                    {" · "}
                    <button
                      type="button"
                      onClick={() => {
                        setShowVerification(false);
                        setShowForgotPassword(true);
                      }}
                      className="text-primary font-bold hover:underline ml-1"
                    >
                      Forgot password
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <WalletModalV2
          open={walletOpen}
          onClose={() => setWalletOpen(false)}
          onConnected={async ({ token, user }) => {
            await loginClient(token, user);
            navigate("/dashboard");
          }}
          mode="auth"
        />
      </main>
    </>
  );
}
