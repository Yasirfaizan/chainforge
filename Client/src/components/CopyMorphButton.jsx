import { useState } from "react";
import { Check } from "lucide-react";

export default function CopyMorphButton({ text = "0x71C7656ec213abedDf9d4eB6Fc8a2F3d6e9A3e", label = "Copy address" }) {
  const [ok, setOk] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {
      setOk(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="cf-pressable inline-flex min-h-[36px] items-center gap-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-elevated)] px-3 py-1.5 font-mono text-xs text-[var(--brand-text)] transition-colors duration-200 ease-out hover:border-[var(--brand-accent-indigo)]"
      aria-label={label}
    >
      {ok ? (
        <>
          <Check className="h-4 w-4 text-[var(--brand-accent-emerald)]" />
          <span className="text-[var(--brand-accent-emerald)]">Copied</span>
        </>
      ) : (
        <>
          <span className="max-w-[200px] truncate">{text}</span>
          <span className="text-[var(--brand-muted)]">Copy</span>
        </>
      )}
    </button>
  );
}
