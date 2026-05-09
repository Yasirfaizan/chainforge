import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion.js";

export default function LandingFeatureLottie({ path, title, description }) {
  const lottieRef = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(path)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (reduced) {
    return (
      <div className="cf-card-glow rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 shadow-lg">
        <div className="mb-3 h-14 w-14 rounded-xl bg-[var(--brand-elevated)] ring-1 ring-[var(--brand-border)]" />
        <h4 className="text-lg font-semibold tracking-tight text-[var(--brand-text)]">{title}</h4>
        <p className="mt-1 text-sm leading-relaxed text-[var(--brand-muted)]">{description}</p>
      </div>
    );
  }

  return (
    <div
      className="cf-card-glow group relative overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5 shadow-lg transition-[box-shadow] duration-300 ease-out hover:shadow-[0_0_48px_-12px_rgba(99,102,241,0.45)]"
      onMouseMove={(e) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      }}
      onMouseEnter={() => {
        const a = lottieRef.current;
        if (!a) return;
        a.setDirection(1);
        a.play();
      }}
      onMouseLeave={() => {
        const a = lottieRef.current;
        if (!a) return;
        a.setDirection(-1);
        a.play();
      }}
    >
      <div className="mb-3 h-14 w-14 opacity-95 transition-transform duration-200 ease-out group-hover:scale-[1.02] active:scale-[0.97]">
        {data ? (
          <Lottie lottieRef={lottieRef} animationData={data} autoplay={false} loop={false} className="h-full w-full" />
        ) : (
          <div className="cf-skeleton h-full w-full rounded-xl" />
        )}
      </div>
      <h4 className="text-lg font-semibold tracking-tight text-[var(--brand-text)]">{title}</h4>
      <p className="mt-1 text-sm leading-relaxed text-[var(--brand-muted)]">{description}</p>
    </div>
  );
}
