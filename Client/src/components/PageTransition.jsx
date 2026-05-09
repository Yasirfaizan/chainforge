import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useSoundStore } from "../lib/sound.js";

export default function PageTransition({ children }) {
  const location = useLocation();
  const reduced = useReducedMotion();
  const playWhoosh = useSoundStore((s) => s.playWhoosh);
  const skipFirst = useRef(true);

  useEffect(() => {
    if (reduced) return;
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    playWhoosh();
  }, [location.pathname, reduced, playWhoosh]);

  if (reduced) return <>{children}</>;

  return (
    <motion.div
      key={location.pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

