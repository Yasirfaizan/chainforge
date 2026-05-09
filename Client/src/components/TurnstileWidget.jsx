import { useEffect, useRef } from "react";

export default function TurnstileWidget({ onToken }) {
  const containerRef = useRef(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    const ensureScript = () =>
      new Promise((resolve) => {
        if (window.turnstile) return resolve();
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        document.body.appendChild(script);
      });

    ensureScript().then(() => {
      if (!window.turnstile || !containerRef.current) return;
      window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onToken?.(token),
      });
    });
  }, [onToken, siteKey]);

  if (!siteKey) {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
        Turnstile site key missing (`VITE_TURNSTILE_SITE_KEY`).
      </div>
    );
  }
  return <div ref={containerRef} className="min-h-[65px]" />;
}

