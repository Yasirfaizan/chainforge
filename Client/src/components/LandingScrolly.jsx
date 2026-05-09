import { useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";

const STAGES = [
  {
    title: "Connect",
    code: `import { ForgeClient } from "@chainforge/sdk";

const forge = new ForgeClient();
await forge.wallets.connect("metamask");`,
    panel: "wallet",
  },
  {
    title: "Read balance",
    code: `const bal = await forge.balance({
  address: forge.address,
  chain: "base",
});
console.log(bal.formatted); // "1.42 ETH"`,
    panel: "balance",
  },
  {
    title: "Send transaction",
    code: `const tx = await forge.tx.send({
  to: "0x…",
  value: parseEther("0.01"),
});
await tx.wait();`,
    panel: "tx",
  },
];

export default function LandingScrolly() {
  const containerRef = useRef(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const rightBlur = useTransform(scrollYProgress, [0, 0.08, 0.92, 1], [10, 0, 0, 8]);
  const rightFilter = useTransform(rightBlur, (b) => `blur(${b}px)`);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const s = Math.min(STAGES.length - 1, Math.floor(v * STAGES.length + 0.001));
    setStep(s);
  });

  return (
    <section ref={containerRef} className="relative min-h-[320vh]">
      <div className="sticky top-0 flex min-h-screen items-center py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-elevated)] p-4 shadow-xl">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--brand-muted)]">
              SDK — live as you scroll
            </p>
            <pre className="max-h-[min(52vh,420px)] overflow-auto rounded-xl bg-[#0c0c0e] p-4 font-mono text-[11px] leading-relaxed text-emerald-300/95 md:text-xs">
              {STAGES[step].code}
            </pre>
          </div>

          <motion.div
            className="relative overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 transition-opacity duration-500"
            style={{ filter: rightFilter }}
          >
            <p className="font-mono text-xs text-[var(--brand-muted)]">{STAGES[step].title}</p>
            <div className="mt-6 space-y-4">
              {STAGES[step].panel === "wallet" && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <p className="text-sm text-[var(--brand-text)]">Wallet connected</p>
                  <p className="mt-1 font-mono text-xs text-[var(--brand-muted)]">0x71C…9A3e</p>
                </div>
              )}
              {STAGES[step].panel === "balance" && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                  <p className="text-sm text-[var(--brand-text)]">Balance</p>
                  <p className="mt-2 font-mono text-2xl tabular-nums text-[var(--brand-text)]">1.42 ETH</p>
                  <p className="text-xs text-[var(--brand-muted)]">Base · live indexer</p>
                </div>
              )}
              {STAGES[step].panel === "tx" && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
                  <p className="text-sm text-[var(--brand-text)]">Transaction confirmed</p>
                  <p className="mt-1 font-mono text-xs text-emerald-400">✓ block 12,842,991</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
