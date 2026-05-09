import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Highlight, themes } from "prism-react-renderer";
import { Check, Copy } from "lucide-react";

export default function CodeBlock({
  code = "",
  language = "javascript",
  filename = "",
  showLineNumbers = true,
}) {
  const [copied, setCopied] = useState(false);
  const normalizedCode = useMemo(() => String(code || "").trimEnd(), [code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(normalizedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-cf-border bg-[#0f1220] shadow-xl"
    >
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "140%" }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />

      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200">
            {language}
          </span>
          {filename ? <span className="text-xs text-slate-400">{filename}</span> : null}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/10"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <Highlight theme={themes.nightOwl} code={normalizedCode} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} overflow-x-auto p-4 text-sm`}
            style={{ ...style, background: "transparent", margin: 0 }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })} className="table-row">
                {showLineNumbers ? (
                  <span className="table-cell select-none pr-4 text-right text-slate-500">
                    {i + 1}
                  </span>
                ) : null}
                <span className="table-cell">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </motion.div>
  );
}
