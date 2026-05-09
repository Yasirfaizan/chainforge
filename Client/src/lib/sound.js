/**
 * Optional UI sounds (muted by default). Uses Howler with tiny bundled WAVs.
 */
import { Howl, Howler } from "howler";
import { create } from "zustand";

const TICK_URL = "/sounds/tick.wav";
const WHOOSH_URL = "/sounds/whoosh.wav";
const DING_URL = "/sounds/ding.wav";

let tickHowl;
let whooshHowl;
let dingHowl;

function ensureHowls() {
  if (typeof window === "undefined") return;
  Howler.volume(0.35);
  if (!tickHowl) {
    tickHowl = new Howl({ src: [TICK_URL], volume: 0.9, preload: true });
    whooshHowl = new Howl({ src: [WHOOSH_URL], volume: 0.85, preload: true });
    dingHowl = new Howl({ src: [DING_URL], volume: 0.9, preload: true });
  }
}

function webClick(freq = 880, duration = 0.04) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + duration + 0.02);
    setTimeout(() => ctx.close(), 250);
  } catch {
    /* ignore */
  }
}

export const useSoundStore = create((set, get) => ({
  enabled: false,
  setEnabled: (v) => {
    set({ enabled: Boolean(v) });
    try {
      localStorage.setItem("chainforge_sound", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  },
  initFromStorage: () => {
    try {
      const v = localStorage.getItem("chainforge_sound");
      set({ enabled: v === "1" });
    } catch {
      /* ignore */
    }
    ensureHowls();
  },
  playTick: () => {
    if (!get().enabled) return;
    ensureHowls();
    try {
      tickHowl?.play();
    } catch {
      webClick(920, 0.035);
    }
  },
  playWhoosh: () => {
    if (!get().enabled) return;
    ensureHowls();
    try {
      whooshHowl?.play();
    } catch {
      webClick(440, 0.06);
    }
  },
  playDing: () => {
    if (!get().enabled) return;
    ensureHowls();
    try {
      dingHowl?.play();
    } catch {
      webClick(660, 0.03);
      setTimeout(() => webClick(880, 0.04), 60);
    }
  },
}));

if (typeof window !== "undefined") {
  useSoundStore.getState().initFromStorage();
}
