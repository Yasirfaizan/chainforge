import { Volume2, VolumeX } from "lucide-react";
import { useSoundStore } from "../lib/sound.js";

export default function SoundToggle({ className = "" }) {
  const enabled = useSoundStore((s) => s.enabled);
  const setEnabled = useSoundStore((s) => s.setEnabled);

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      className={`cf-pressable inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container text-on-surface-variant transition hover:border-primary/50 hover:text-primary ${className}`}
      aria-label={enabled ? "Mute UI sounds" : "Enable UI sounds"}
      title={enabled ? "Sound on" : "Sound off (default)"}
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
