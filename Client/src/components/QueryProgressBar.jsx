import { useIsFetching } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export default function QueryProgressBar() {
  const isFetching = useIsFetching();
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <AnimatePresence>
      {isFetching > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed left-0 top-0 z-[300] h-1 w-full bg-transparent"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400"
            initial={{ width: "8%" }}
            animate={{ width: ["24%", "68%", "92%"] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

