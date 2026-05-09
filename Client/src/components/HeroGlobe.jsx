import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

const PINS = [
  [37.77, -122.41], [51.5, -0.1], [1.35, 103.82], [35.68, 139.69],
  [19.43, -99.13], [28.61, 77.2], [52.52, 13.4], [48.85, 2.35],
  [-33.86, 151.2], [55.75, 37.62], [-23.55, -46.63], [31.23, 121.47],
];

export default function HeroGlobe() {
  const canvasRef = useRef(null);
  const reduced = useReducedMotion();
  const hovering = useRef(false);

  useEffect(() => {
    if (reduced) return;
    let globeInstance;
    let phi = 0;
    let cobe;

    import("cobe").then((mod) => {
      cobe = mod.default;
      globeInstance = cobe(canvasRef.current, {
        devicePixelRatio: 2,
        width: 640,
        height: 640,
        phi: 0,
        theta: 0.3,
        dark: 1,
        diffuse: 1.1,
        mapSamples: 22000,
        mapBrightness: 1.1,
        baseColor: [0.22, 0.24, 0.38],
        markerColor: [0.58, 0.64, 1],
        glowColor: [0.47, 0.35, 0.95],
        markers: PINS.map(([lat, lng], i) => ({
          location: [lat, lng],
          size: 0.08 + (i % 4) * 0.02,
        })),
        onRender: (state) => {
          if (!hovering.current) phi += 0.002;
          state.phi = phi;
        },
      });
    });

    return () => {
      if (globeInstance) globeInstance.destroy();
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      onMouseEnter={() => { hovering.current = true; }}
      onMouseLeave={() => { hovering.current = false; }}
      className="mx-auto aspect-square w-[min(520px,88vw)] cursor-grab rounded-full"
      style={{ contain: "layout paint size" }}
    />
  );
}

