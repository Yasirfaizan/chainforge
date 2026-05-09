import { useEffect, useRef } from "react";

export default function ParticleNetwork() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const nodes = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0007,
      vy: (Math.random() - 0.5) * 0.0007,
    }));

    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x <= 0 || n.x >= 1) n.vx *= -1;
        if (n.y <= 0 || n.y >= 1) n.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        const ax = a.x * window.innerWidth;
        const ay = a.y * window.innerHeight;
        ctx.fillStyle = "rgba(148,163,184,0.4)";
        ctx.beginPath();
        ctx.arc(ax, ay, 1.4, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const bx = b.x * window.innerWidth;
          const by = b.y * window.innerHeight;
          const dist = Math.hypot(ax - bx, ay - by);
          if (dist < 120) {
            ctx.strokeStyle = `rgba(148,163,184,${0.17 - dist / 800})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 -z-10 opacity-60" />;
}

