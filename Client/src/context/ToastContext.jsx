import { createContext, useCallback, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, variant = "info") => {
    setToast({ id: Date.now(), message, variant });
    setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 8, x: 12 }}
            className={`fixed bottom-4 left-4 right-4 z-[300] mx-auto max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg sm:left-auto ${
              toast.variant === "error"
                ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/95 dark:text-red-200"
                : toast.variant === "success"
                  ? "border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/95 dark:text-green-200"
                  : "border-cf-border bg-cf-card text-cf-text"
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}
