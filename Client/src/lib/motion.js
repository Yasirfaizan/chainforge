export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export const staggerChildren = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.28, ease: "easeOut" } },
};

export const shimmer = {
  hidden: { opacity: 0.5 },
  visible: { opacity: 1, transition: { repeat: Infinity, repeatType: "mirror", duration: 1.3 } },
};

export const glow = {
  hidden: { boxShadow: "0 0 0 rgba(124,58,237,0)" },
  visible: {
    boxShadow: "0 0 24px rgba(124,58,237,0.28)",
    transition: { repeat: Infinity, repeatType: "mirror", duration: 1.8 },
  },
};

