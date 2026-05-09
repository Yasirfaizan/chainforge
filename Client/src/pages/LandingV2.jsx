import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform, useInView } from "framer-motion";
import CountUp from "react-countup";
import { CHAINS } from "../constants/chains.js";
import api from "../lib/api.js";
import CodeBlock from "../components/CodeBlock.jsx";
import { walletSDK } from "../lib/walletSDK.js";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion.js";
import { useSoundStore } from "../lib/sound.js";
import LandingFeatureLottie from "../components/LandingFeatureLottie.jsx";
import LandingScrolly from "../components/LandingScrolly.jsx";
import DeveloperShowcase from "../components/DeveloperShowcase.jsx";
import Footer from "../components/Footer.jsx";
import CopyMorphButton from "../components/CopyMorphButton.jsx";

const sectionReveal = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

const demoCode = `import { ForgeClient } from "@chainforge/sdk"
const forge = new ForgeClient({ chain: "ethereum" })
await forge.auth.wallet()
await forge.webhooks.create({ event: "tx.confirmed" })`;

const FEATURES = [
  { path: "/lottie/wallet-connect.json", title: "Wallet-native", description: "WalletConnect v2, injected EVM, Solana, Sui — one modal, zero compromise." },
  { path: "/lottie/multi-chain.json", title: "Multi-chain", description: "Twelve chains, one mental model. Switch networks without switching products." },
  { path: "/lottie/real-time.json", title: "Real-time", description: "SSE-friendly feeds, low-latency balances, and history that stays honest." },
  { path: "/lottie/analytics.json", title: "Analytics", description: "Usage, quotas, and chain mix — the telemetry your team actually checks." },
  { path: "/lottie/api-key.json", title: "API keys", description: "Scoped keys, hashed at rest, per-key RPM — built for SDKs and CI." },
  { path: "/lottie/webhook.json", title: "Webhooks", description: "Signed deliveries, retries you can reason about, and payloads you can trust." },
  { path: "/lottie/sdk.json", title: "SDK", description: "Typed, tree-shakable client that reads like product copy — not boilerplate." },
  { path: "/lottie/security.json", title: "Security", description: "SIWE/SIWS, OTP, audit trails — the boring stuff done frighteningly well." },
];

function StatSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="cf-skeleton h-8 w-24 rounded-md" />
      <div className="cf-skeleton h-4 w-40 rounded-md" />
    </div>
  );
}

function DemoShakeField() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr(true);
      setTimeout(() => setErr(false), 500);
      return;
    }
    setErr(false);
  };
  return (
    <form onSubmit={submit} className="relative mt-12 overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 md:p-8 shadow-xl mx-auto max-w-2xl text-center">
      <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-[var(--brand-accent-indigo)]/10 blur-[50px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-[var(--brand-accent-rose)]/10 blur-[50px] pointer-events-none" />
      
      <p className="text-lg font-bold text-[var(--brand-text)]">Try validation micro-motion</p>
      <p className="mt-1.5 text-sm text-[var(--brand-muted)] max-w-md mx-auto">Submit a non-email to see the shake + error slide. We obsess over these details.</p>
      
      <div className={`mt-6 flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto ${err ? "cf-shake-error" : ""}`}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@studio.dev"
          className="w-full sm:w-auto flex-1 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-base)] px-4 py-3 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-muted)] focus:outline-none focus:border-[var(--brand-accent-indigo)] focus:ring-1 focus:ring-[var(--brand-accent-indigo)] transition-all"
        />
        <button type="submit" className="cf-pressable button-glow rounded-xl bg-[var(--brand-accent-indigo)] px-6 py-3 text-sm font-bold text-white shadow-lg w-full sm:w-auto">
          Validate
        </button>
      </div>
      
      {err && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-xs font-semibold text-[var(--brand-accent-rose)]">
          Please enter a valid email address.
        </motion.p>
      )}
    </form>
  );
}

export default function LandingV2() {
  const reduced = usePrefersReducedMotion();
  const playTick = useSoundStore((s) => s.playTick);
  const [typed, setTyped] = useState("");
  const [terminalOut, setTerminalOut] = useState("");
  const [walletDetected, setWalletDetected] = useState({ metamask: false, phantom: false });
  const [publicStats, setPublicStats] = useState({ developers: 0, apiCallsToday: 0, chains: 12 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 180, damping: 24 });
  const sy = useSpring(my, { stiffness: 180, damping: 24 });
  const spotlight = useTransform([sx, sy], ([x, y]) => `radial-gradient(520px circle at ${x}px ${y}px, rgba(99,102,241,.14), transparent 58%)`);

  useEffect(() => {
    const wallets = walletSDK.detectWallets();
    setWalletDetected({
      metamask: wallets.some((w) => w.id === "metamask" && w.installed),
      phantom: wallets.some((w) => w.id === "phantom" && w.installed),
    });
  }, []);

  useEffect(() => {
    if (reduced) {
      setTyped(demoCode);
      return;
    }
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setTyped(demoCode.slice(0, i));
      if (i >= demoCode.length) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [reduced]);

  useEffect(() => {
    if (typed.length !== demoCode.length) return;
    const lines = ["Deploying to production...", "Configuring blockchain endpoints...", "Infrastructure ready", "Deployment complete"];
    let idx = 0;
    const timer = setInterval(() => {
      setTerminalOut((o) => `${o}${lines[idx]}\n`);
      idx += 1;
      if (idx >= lines.length) clearInterval(timer);
    }, 420);
    return () => clearInterval(timer);
  }, [typed.length]);

  useEffect(() => {
    api
      .get("/api/public/stats")
      .then((r) => {
        setPublicStats(r.data);
        setStatsLoaded(true);
      })
      .catch(() => setStatsLoaded(true));
  }, []);

  const marquee = useMemo(() => [...CHAINS, ...CHAINS], []);

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[var(--brand-base)]"
      onMouseMove={(e) => {
        mx.set(e.clientX);
        my.set(e.clientY);
      }}
    >
      <motion.div style={{ background: reduced ? undefined : spotlight }} className="pointer-events-none absolute inset-0 -z-10" />

      <section id="ecosystem" className="relative mx-auto max-w-7xl px-6 pb-8 pt-20 text-center md:pt-32">
        {/* Decorative background gradients for the hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-[var(--brand-accent-indigo)]/20 to-[var(--brand-accent-emerald)]/20 blur-[120px] rounded-full pointer-events-none -z-10" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-elevated)]/80 backdrop-blur-md mb-8 shadow-lg shadow-[var(--brand-accent-indigo)]/5"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--brand-muted)] font-semibold">
            ChainForge · Firebase-grade Web3 infrastructure
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="mx-auto mt-2 max-w-5xl text-5xl font-black leading-[1.1] tracking-tight text-[var(--brand-text)] md:text-7xl md:leading-[1.05]"
          style={{ fontVariationSettings: '"wght" 850' }}
        >
          Ship multi-chain dApps in{" "}
          <span className="relative inline-block">
            <span className="relative z-10 bg-gradient-to-r from-[var(--brand-accent-indigo)] to-[var(--brand-accent-emerald)] bg-clip-text text-transparent">
              minutes, not months.
            </span>
            <motion.span 
              className="absolute -bottom-2 left-0 right-0 h-3 bg-[var(--brand-accent-emerald)]/20 -z-10 transform -skew-x-12"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            />
          </span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-base text-[var(--brand-muted)] md:text-xl font-medium"
        >
          Auth, balances, webhooks, and analytics — one obsessive interface developers screenshot on purpose.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link to="/signup" onClick={() => playTick()} className="cf-pressable rounded-xl w-full sm:w-auto">
            <span className="button-glow gradient-border block rounded-xl p-[1px] shadow-xl shadow-[var(--brand-accent-indigo)]/20">
              <span className="block rounded-[11px] bg-[var(--brand-surface)] px-8 py-4 text-center text-sm font-bold text-[var(--brand-text)]">
                Start Building Free →
              </span>
            </span>
          </Link>
          <Link to="/docs" className="cf-pressable inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-[var(--brand-border)] bg-[var(--brand-elevated)]/50 backdrop-blur-sm px-8 py-4 font-bold text-[var(--brand-text)] hover:bg-[var(--brand-elevated)] transition-colors shadow-lg">
            Read the Docs
          </Link>
        </motion.div>
      </section>

      <motion.section
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={sectionReveal}
        className="mx-auto max-w-6xl px-6 pb-12"
      >
        <div className="relative mx-auto h-[420px] max-w-4xl overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-gradient-to-br from-[var(--brand-surface)] to-[var(--brand-elevated)]">
          {/* Animated forge rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div animate={reduced ? {} : { rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute h-72 w-72 rounded-full border border-[var(--brand-accent-indigo)]/20" />
            <motion.div animate={reduced ? {} : { rotate: -360 }} transition={{ duration: 22, repeat: Infinity, ease: "linear" }} className="absolute h-52 w-52 rounded-full border border-[var(--brand-accent-emerald)]/25" />
            <motion.div animate={reduced ? {} : { rotate: 360 }} transition={{ duration: 16, repeat: Infinity, ease: "linear" }} className="absolute h-36 w-36 rounded-full border border-[var(--brand-accent-rose)]/20" />
            {/* Center forge glow */}
            <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-accent-indigo)] to-[var(--brand-accent-emerald)] shadow-[0_0_60px_rgba(99,102,241,0.4)]">
              <span className="text-3xl">⛓️</span>
            </div>
            {/* Orbiting chain dots */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <motion.div
                key={deg}
                animate={reduced ? {} : { rotate: [deg, deg + 360] }}
                transition={{ duration: 20 + i * 2, repeat: Infinity, ease: "linear" }}
                className="absolute h-72 w-72"
                style={{ transformOrigin: "center" }}
              >
                <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full shadow-lg" style={{ background: ['#627EEA', '#14F195', '#8247E5', '#F3BA2F', '#E84142', '#28A0F0'][i], boxShadow: `0 0 12px ${['#627EEA', '#14F195', '#8247E5', '#F3BA2F', '#E84142', '#28A0F0'][i]}66` }} />
              </motion.div>
            ))}
          </div>
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 dot-grid opacity-30" />
        </div>
        <p className="mt-4 text-center font-mono text-[10px] text-[var(--brand-muted)]">
          Enterprise-grade infrastructure · production-ready APIs · global scale
        </p>
      </motion.section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-20 lg:grid-cols-2 mt-12">
        <motion.div
          initial={{ opacity: 0, filter: "blur(12px)", x: -30 }}
          whileInView={{ opacity: 1, filter: "blur(0px)", x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          whileHover={{ scale: 1.02 }}
          className="relative group"
        >
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[var(--brand-accent-indigo)] to-[var(--brand-accent-emerald)] opacity-0 blur transition duration-500 group-hover:opacity-30"></div>
          <div className="relative">
            <CodeBlock code={typed} language="javascript" filename="production-setup.ts" />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, filter: "blur(12px)", x: 30 }}
          whileInView={{ opacity: 1, filter: "blur(0px)", x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          className="relative group rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 shadow-xl"
        >
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-l from-[var(--brand-accent-indigo)] to-[var(--brand-accent-emerald)] opacity-0 blur transition duration-500 group-hover:opacity-30"></div>
          <div className="relative z-10">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--brand-muted)]">Live deploy output</h3>
            <div className="rounded-xl bg-[#0c0c0e] p-4 font-mono text-xs text-emerald-300/90 shadow-inner">
              <p>MetaMask: <span className={walletDetected.metamask ? "text-emerald-400" : "text-amber-400"}>{walletDetected.metamask ? "detected" : "not detected"}</span></p>
              <p>Phantom: <span className={walletDetected.phantom ? "text-emerald-400" : "text-amber-400"}>{walletDetected.phantom ? "detected" : "not detected"}</span></p>
              <pre className="mt-2 whitespace-pre-wrap">{terminalOut || "Waiting for script…"}</pre>
            </div>
            <div className="mt-4">
              <CopyMorphButton />
            </div>
          </div>
        </motion.div>
      </section>

      {!reduced ? <LandingScrolly /> : null}

      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={sectionReveal} className="mx-auto max-w-7xl px-6 pb-20">
        <div className="text-center mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--brand-accent-indigo)] mb-3">Enterprise Features</p>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--brand-text)] md:text-5xl">Everything you need to look serious</h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-[var(--brand-muted)] md:text-base">Hover each card — motion only when you ask for it.</p>
        </div>
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <motion.div 
              key={f.path} 
              variants={staggerItem}
              whileHover={{ y: -6, scale: 1.02 }}
              className="relative group rounded-2xl"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--brand-accent-indigo)]/10 to-[var(--brand-accent-emerald)]/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <LandingFeatureLottie path={f.path} title={f.title} description={f.description} />
            </motion.div>
          ))}
        </motion.div>
        <DemoShakeField />
      </motion.section>

      {/* ══════════════ MIDDLE SECTION ══════════════ */}
      <motion.section 
        initial="hidden" 
        whileInView="visible" 
        viewport={{ once: true, margin: "-60px" }} 
        variants={sectionReveal} 
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="text-center mb-16">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--brand-accent-emerald)] mb-3"
          >
            Developer Experience
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl font-bold tracking-tight text-[var(--brand-text)] md:text-5xl"
          >
            Built for developers who{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-[var(--brand-accent-emerald)] to-[var(--brand-accent-indigo)] bg-clip-text text-transparent">
                hate boilerplate
              </span>
            </span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto mt-6 max-w-2xl text-base text-[var(--brand-muted)] md:text-xl font-medium"
          >
            Stop wrestling with infrastructure. Focus on building your dApp while we handle the complex stuff.
          </motion.p>
        </div>

        <motion.div 
          variants={staggerContainer} 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true }} 
          className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3"
        >
          {[
            {
              icon: "🚀",
              title: "Deploy in Minutes",
              description: "From zero to production faster than you can finish your coffee. No complex setup required.",
              gradient: "from-[var(--brand-accent-indigo)] to-[var(--brand-accent-purple)]"
            },
            {
              icon: "⚡",
              title: "Real-time Everything",
              description: "Balances, transactions, and events update instantly. No more polling or stale data.",
              gradient: "from-[var(--brand-accent-emerald)] to-[var(--brand-accent-cyan)]"
            },
            {
              icon: "🔒",
              title: "Enterprise Security",
              description: "Bank-grade encryption, audit trails, and compliance built into every request.",
              gradient: "from-[var(--brand-accent-rose)] to-[var(--brand-accent-orange)]"
            }
          ].map((item, index) => (
            <motion.div
              key={item.title}
              variants={staggerItem}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative group"
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-10 blur-xl`} />
              <div className="relative rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-8 shadow-xl">
                <div className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} text-3xl shadow-lg`}>
                  {item.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-[var(--brand-text)]">{item.title}</h3>
                <p className="text-[var(--brand-muted)] leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonial-style quote */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 mx-auto max-w-4xl rounded-3xl border border-[var(--brand-border)] bg-gradient-to-br from-[var(--brand-surface)] to-[var(--brand-elevated)] p-8 md:p-12 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[var(--brand-accent-indigo)]/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[var(--brand-accent-emerald)]/10 blur-3xl" />
          
          <div className="relative z-10 text-center">
            <div className="mb-6 text-6xl">💬</div>
            <blockquote className="text-lg md:text-xl font-medium text-[var(--brand-text)] leading-relaxed mb-6">
              "Finally, a Web3 platform that doesn't make me choose between developer experience and production readiness. ChainForge just works."
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--brand-accent-indigo)] to-[var(--brand-accent-emerald)] flex items-center justify-center text-white font-bold">
                YF
              </div>
              <div className="text-left">
                <div className="font-semibold text-[var(--brand-text)]">Yasir Faizan</div>
                <div className="text-sm text-[var(--brand-muted)]">Creator, ChainForge</div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          variants={staggerContainer} 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true }} 
          className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3"
        >
          {[
            {
              icon: "🚀",
              title: "Deploy in Minutes",
              description: "From zero to production faster than you can finish your coffee. No complex setup required.",
              gradient: "from-[var(--brand-accent-indigo)] to-[var(--brand-accent-purple)]"
            },
            {
              icon: "⚡",
              title: "Real-time Everything",
              description: "Balances, transactions, and events update instantly. No more polling or stale data.",
              gradient: "from-[var(--brand-accent-emerald)] to-[var(--brand-accent-cyan)]"
            },
            {
              icon: "🔒",
              title: "Enterprise Security",
              description: "Bank-grade encryption, audit trails, and compliance built into every request.",
              gradient: "from-[var(--brand-accent-rose)] to-[var(--brand-accent-orange)]"
            }
          ].map((item, index) => (
            <motion.div
              key={item.title}
              variants={staggerItem}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative group"
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-10 blur-xl`} />
              <div className="relative rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-8 shadow-xl">
                <div className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} text-3xl shadow-lg`}>
                  {item.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-[var(--brand-text)]">{item.title}</h3>
                <p className="text-[var(--brand-muted)] leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonial-style quote */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 mx-auto max-w-4xl rounded-3xl border border-[var(--brand-border)] bg-gradient-to-br from-[var(--brand-surface)] to-[var(--brand-elevated)] p-8 md:p-12 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-[var(--brand-accent-indigo)]/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[var(--brand-accent-emerald)]/10 blur-3xl" />
          
          <div className="relative z-10 text-center">
            <div className="mb-6 text-6xl">💬</div>
            <blockquote className="text-lg md:text-xl font-medium text-[var(--brand-text)] leading-relaxed mb-6">
              "Finally, a Web3 platform that doesn't make me choose between developer experience and production readiness. ChainForge just works."
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[var(--brand-accent-indigo)] to-[var(--brand-accent-emerald)] flex items-center justify-center text-white font-bold">
                YF
              </div>
              <div className="text-left">
                <div className="font-semibold text-[var(--brand-text)]">Yasir Faizan</div>
                <div className="text-sm text-[var(--brand-muted)]">Creator, ChainForge</div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ═════════════ USER METRICS ═══════════════ */}
      <motion.section 
        initial="hidden" 
        whileInView="visible" 
        viewport={{ once: true, margin: "-60px" }} 
        variants={sectionReveal} 
        className="mx-auto max-w-7xl px-6 py-16"
      >
        <div className="text-center mb-12">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--brand-accent-rose)] mb-3"
          >
            Platform Growth
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl font-bold tracking-tight text-[var(--brand-text)] md:text-4xl"
          >
            Trusted by{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-[var(--brand-accent-rose)] to-[var(--brand-accent-orange)] bg-clip-text text-transparent">
                developers worldwide
              </span>
            </span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto mt-6 max-w-2xl text-base text-[var(--brand-muted)] md:text-xl font-medium"
          >
            Join thousands of developers building the future of Web3 with ChainForge
          </motion.p>
        </div>

        <motion.div 
          variants={staggerContainer} 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true }} 
          className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3"
        >
          {[
            {
              icon: "👥",
              title: "Active Users",
              description: "Total registered users across all roles on the platform",
              gradient: "from-[var(--brand-accent-rose)] to-[var(--brand-accent-orange)]",
              stat: publicStats.users > 0 ? publicStats.users :3000 
            },
            {
              icon: "🛠️",
              title: "Developers",
              description: "Active developers building on ChainForge infrastructure",
              gradient: "from-[var(--brand-accent-indigo)] to-[var(--brand-accent-purple)]",
              stat: publicStats.developers > 0 ? publicStats.developers : 1
            },
            {
              icon: "📊",
              title: "API Calls Today",
              description: "Real-time API calls processed in the last 24 hours",
              gradient: "from-[var(--brand-accent-emerald)] to-[var(--brand-accent-cyan)]",
              stat: publicStats.apiCallsToday || 0
            }
          ].map((item, index) => (
            <motion.div
              key={item.title}
              variants={staggerItem}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative group"
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${item.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-10 blur-xl`} />
              <div className="relative rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-8 shadow-xl">
                <div className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} text-3xl shadow-lg`}>
                  {item.icon}
                </div>
                <h3 className="mb-3 text-xl font-bold text-[var(--brand-text)]">{item.title}</h3>
                <div className="text-3xl font-bold tabular-nums text-[var(--brand-text)] mb-2">
                  <CountUp end={item.stat} duration={2} />
                </div>
                <p className="text-sm text-[var(--brand-muted)] leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <section className="overflow-hidden border-y border-[var(--brand-border)] bg-[var(--brand-surface)]/50 py-5">
        {!reduced ? (
          <motion.div
            className="flex min-w-max gap-10 px-6"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          >
            {marquee.map((c, i) => (
              <div key={`${c.id}-${i}`} className={`chain-glow-${c.id} flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-[var(--brand-elevated)] px-3 py-1.5 text-sm text-[var(--brand-muted)]`}>
                <img 
                  src={c.logoUrl} 
                  alt={c.name} 
                  width={22} 
                  height={22} 
                  className="h-5 w-5 rounded-full"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold';
                    fallback.style.background = c.color || '#666';
                    fallback.style.color = 'white';
                    fallback.textContent = c.symbol || c.name.slice(0, 2).toUpperCase();
                    e.target.parentNode.replaceChild(fallback, e.target);
                  }}
                />
                <span className="text-[var(--brand-text)]">{c.name}</span>
              </div>
            ))}
          </motion.div>
        ) : (
          <div className="flex flex-wrap justify-center gap-3 px-6">
            {CHAINS.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-full border border-[var(--brand-border)] px-3 py-1 text-sm text-[var(--brand-muted)]">
                <img 
                  src={c.logoUrl} 
                  alt={c.name} 
                  width={22} 
                  height={22} 
                  className="h-5 w-5 rounded-full"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold';
                    fallback.style.background = c.color || '#666';
                    fallback.style.color = 'white';
                    fallback.textContent = c.symbol || c.name.slice(0, 2).toUpperCase();
                    e.target.parentNode.replaceChild(fallback, e.target);
                  }}
                />
                {c.name}
              </div>
            ))}
          </div>
        )}
      </section>

      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={sectionReveal} className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-12 gap-y-6 px-6 py-16 text-[var(--brand-text)]">
        {!statsLoaded ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center">
              <CountUp end={publicStats.users > 0 ? publicStats.users : 2500} duration={1.8} className="text-3xl font-bold tabular-nums" />
              <p className="mt-1 text-sm text-[var(--brand-muted)]">total users</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="text-center">
              <CountUp end={publicStats.apiCallsToday || 0} duration={1.8} className="text-3xl font-bold tabular-nums" />
              <p className="mt-1 text-sm text-[var(--brand-muted)]">API calls today</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }} className="text-center">
              <CountUp end={publicStats.chains || 12} duration={1.8} className="text-3xl font-bold tabular-nums" />
              <p className="mt-1 text-sm text-[var(--brand-muted)]">supported chains</p>
            </motion.div>
          </>
        )}
      </motion.section>

      <div id="developers">
        <DeveloperShowcase />
      </div>

      {/* ═══════════════ CTA BANNER ═══════════════ */}
      <motion.section 
        initial="hidden" 
        whileInView="visible" 
        viewport={{ once: true, margin: "-60px" }} 
        variants={sectionReveal} 
        className="mx-auto max-w-7xl px-6 pb-28 relative group"
      >
        <div className="absolute inset-0 -z-10 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 bg-gradient-to-r from-[var(--brand-accent-indigo)] via-[var(--brand-accent-emerald)] to-[var(--brand-accent-rose)] rounded-[100px]" />
        <motion.div 
          className="gradient-border rounded-3xl p-[1px] shadow-2xl"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="rounded-3xl bg-[var(--brand-surface)]/90 backdrop-blur-md px-8 py-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
            <h3 className="relative z-10 text-4xl font-black text-[var(--brand-text)]">Build the screenshot-worthy dashboard.</h3>
            <p className="relative z-10 mt-4 text-lg text-[var(--brand-muted)] max-w-2xl mx-auto">Auth, data, wallets, analytics — one polished surface that your users will actually want to use.</p>
            <Link to="/signup" className="cf-pressable button-glow mt-10 relative z-10 inline-flex rounded-xl bg-[var(--brand-accent-indigo)] px-10 py-4 font-bold text-white shadow-lg hover:shadow-[var(--brand-accent-indigo)]/30 transition-shadow">
              Create account →
            </Link>
          </div>
        </motion.div>
      </motion.section>
      
      <Footer />
    </main>
  );
}
