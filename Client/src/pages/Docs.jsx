import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle.jsx";
import SoundToggle from "../components/SoundToggle.jsx";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-2 top-2 rounded-md border border-cf-border bg-cf-base/80 p-1.5 text-cf-muted transition hover:bg-cf-card hover:text-cf-text"
      aria-label="Copy code"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function CodeBlock({ children, lang = "bash" }) {
  return (
    <div className="group relative mt-3 rounded-lg border border-cf-border bg-cf-code">
      <div className="flex items-center justify-between border-b border-cf-border px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-cf-muted">
          {lang}
        </span>
      </div>
      <div className="relative">
        <pre className="overflow-x-auto p-4 font-mono text-sm text-cf-text/90">
          <code>{children}</code>
        </pre>
        <CopyButton text={children} />
      </div>
    </div>
  );
}

function Endpoint({ method, path, description, body, query, auth, response }) {
  const [open, setOpen] = useState(false);
  const methodColors = {
    GET: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
    POST: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
    PATCH:
      "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  };

  return (
    <div className="rounded-lg border border-cf-border bg-cf-card overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-cf-input/50 transition"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={`rounded px-2 py-0.5 text-xs font-bold ${methodColors[method] || ""}`}
        >
          {method}
        </span>
        <code className="flex-1 font-mono text-sm text-cf-text">{path}</code>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-cf-muted" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-cf-muted" />
        )}
      </button>
      {open && (
        <div className="border-t border-cf-border px-4 py-4 space-y-3">
          <p className="text-sm text-cf-muted">{description}</p>
          {auth && (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              🔒 Requires: <code className="font-mono">{auth}</code>
            </div>
          )}
          {body && (
            <div>
              <p className="text-xs font-semibold text-cf-muted">
                Request Body
              </p>
              <CodeBlock lang="json">{JSON.stringify(body, null, 2)}</CodeBlock>
            </div>
          )}
          {query && (
            <div>
              <p className="text-xs font-semibold text-cf-muted">
                Query Parameters
              </p>
              <div className="mt-1 space-y-1">
                {Object.entries(query).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <code className="font-mono text-purple-600 dark:text-purple-400">
                      {k}
                    </code>
                    <span className="text-cf-muted">— {v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {response && (
            <div>
              <p className="text-xs font-semibold text-cf-muted">Response</p>
              <CodeBlock lang="json">
                {JSON.stringify(response, null, 2)}
              </CodeBlock>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const sections = [
  {
    title: "Authentication",
    description:
      "Chain Forge uses a secure 2-step OTP flow. First, initiate the request to receive a code via email, then verify it to receive your JWT.",
    endpoints: [
      {
        method: "POST",
        path: "/api/client/signup/initiate",
        description: "Initiate registration. Sends a 6-digit code to the email.",
        body: { name: "John Doe", email: "john@example.com", password: "min8chars" },
        response: { message: "Verification code sent" },
      },
      {
        method: "POST",
        path: "/api/client/signup/verify",
        description: "Complete registration with the code from email.",
        body: { email: "john@example.com", code: "123456" },
        response: { token: "eyJhbG...", user: { id: "...", role: "client" } },
      },
      {
        method: "POST",
        path: "/api/client/login/initiate",
        description: "Initiate login. Sends a code if password is correct.",
        body: { email: "john@example.com", password: "min8chars" },
        response: { message: "Verification code sent" },
      },
      {
        method: "POST",
        path: "/api/client/login/verify",
        description: "Complete login with the code from email.",
        body: { email: "john@example.com", code: "123456" },
        response: { token: "eyJhbG...", user: { id: "...", role: "client" } },
      },
    ],
  },
  {
    title: "Admin Authentication",
    description:
      "Admin signup requires a single-use admin code. Login uses email/password only.",
    endpoints: [
      {
        method: "POST",
        path: "/api/admin/signup",
        description:
          "Register an admin account. Requires a valid, unused admin code (consumed on signup).",
        body: {
          name: "Admin",
          email: "admin@chainforge.dev",
          password: "min8chars",
          adminCode: "CF-ADMIN-X7K9M",
        },
        response: { token: "eyJhbG...", user: { id: "...", role: "admin" } },
      },
      {
        method: "POST",
        path: "/api/admin/login",
        description: "Login as admin with email and password.",
        body: { email: "admin@chainforge.dev", password: "min8chars" },
        response: { token: "eyJhbG...", user: { id: "...", role: "admin" } },
      },
    ],
  },
  {
    title: "Data & Stats",
    description:
      "Fetch dashboard data, transaction history, and platform analytics.",
    endpoints: [
      {
        method: "GET",
        path: "/api/data/stats",
        description:
          "Get the authenticated user's stats (transaction count, API keys, sessions).",
        auth: "Bearer <token>",
        response: {
          totalTransactions: 42,
          activeApiKeys: 2,
          activeSessions: 1,
        },
      },
      {
        method: "GET",
        path: "/api/data/transactions",
        description:
          "Fetch the authenticated user's transactions with optional filtering.",
        auth: "Bearer <token>",
        query: {
          chain: "filter by chain id",
          status: "Pending | Confirmed | Failed",
          limit: "max results (default 20)",
          offset: "pagination offset",
        },
        response: { rows: ["..."], total: 42, limit: 20, offset: 0 },
      },
      {
        method: "GET",
        path: "/api/data/admin/overview",
        description: "Platform-wide admin overview with aggregated stats.",
        auth: "Bearer <admin token>",
        response: {
          totalUsers: 1204,
          totalTransactions: 45231,
          activeApiKeys: 89,
          chainBreakdown: ["..."],
        },
      },
    ],
  },
  {
    title: "API Keys",
    description: "Generate, list, and revoke API keys for programmatic access.",
    endpoints: [
      {
        method: "GET",
        path: "/api/keys",
        description:
          "List all API keys for the authenticated user (keys are masked).",
        auth: "Bearer <token>",
        response: [
          {
            id: "...",
            mask: "cf_live_••••••••3f9a",
            label: "prod",
            scopes: ["read"],
            status: "Active",
          },
        ],
      },
      {
        method: "POST",
        path: "/api/keys/generate",
        description:
          "Generate a new API key. The raw key is returned ONLY in this response — save it immediately.",
        auth: "Bearer <token>",
        body: { label: "production", scopes: ["read", "write"] },
        response: {
          rawKey: "cf_live_abc123...",
          mask: "cf_live_••••••••c123",
          message: "Save this key — it won't be shown again.",
        },
      },
      {
        method: "PATCH",
        path: "/api/keys/:id/revoke",
        description: "Revoke an API key. This cannot be undone.",
        auth: "Bearer <token>",
        response: { message: "Key revoked", id: "..." },
      },
    ],
  },
  {
    title: "Wallet Management",
    description: "Link and manage blockchain wallets for tracking and analytics.",
    endpoints: [
      {
        method: "GET",
        path: "/api/wallets",
        description: "List all integrated wallets for the authenticated user.",
        auth: "Bearer <token>",
        response: { wallets: [{ id: "...", address: "0x...", chain: "ethereum", label: "Main" }] },
      },
      {
        method: "POST",
        path: "/api/wallets/link",
        description: "Integrate a new wallet address for a specific chain.",
        auth: "Bearer <token>",
        body: { address: "0x71C...", chain: "polygon", type: "evm", label: "DeFi Ops" },
        response: { message: "Wallet integrated successfully", id: "..." },
      },
      {
        method: "DELETE",
        path: "/api/wallets/:id",
        description: "Unlink a wallet. History tracking will stop immediately.",
        auth: "Bearer <token>",
        response: { message: "Wallet unlinked" },
      },
    ],
  },
  {
    title: "Webhooks",
    description: "Configure real-time notifications for on-chain events.",
    endpoints: [
      {
        method: "GET",
        path: "/api/webhooks",
        description: "List all configured webhooks.",
        auth: "Bearer <token>",
        response: { webhooks: [{ id: "...", url: "https://api.myapp.com/webhooks", chain: "ethereum", eventType: "receive" }] },
      },
      {
        method: "POST",
        path: "/api/webhooks",
        description: "Create a new webhook listener. Chain Forge will sign each payload with a secret provided in the response.",
        auth: "Bearer <token>",
        body: { url: "https://...", chain: "ethereum", eventType: "receive", isActive: true },
        response: { id: "...", secret: "whsec_...", message: "Webhook created. Verify signatures using the secret." },
      },
      {
        method: "SIGNATURE VERIFICATION",
        path: "HTTP Header: X-ChainForge-Signature",
        description: "Verify payloads using HMAC-SHA256. Concatenate timestamp and raw body: `t=<timestamp>,v1=<signature>`.",
        response: { 
          example_verification: "const hmac = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');" 
        },
      },
    ],
  },
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState(0);

  return (
    <motion.div
      className="min-h-screen bg-cf-base"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:pt-28">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-cf-text sm:text-3xl">
              API Documentation
            </h1>
            <p className="mt-1 text-cf-muted">
              ChainForge REST API v2.0 — JWT-secured, multi-chain by design.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Toggles are provided by the global Layout/Navbar */}
          </div>
        </div>

        {/* Quick start */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5 dark:border-purple-900/40 dark:bg-purple-950/20 sm:p-6">
          <h2 className="text-lg font-semibold text-cf-text">Quick Start</h2>
          <p className="mt-2 text-sm text-cf-muted">
            Base URL:{" "}
            <code className="rounded bg-cf-code px-1.5 py-0.5 font-mono text-purple-600 dark:text-purple-400">
              {import.meta.env.}VITE_API_URL || "https://chainforge-gold.vercel.app/"}
            </code>
          </p>
          <CodeBlock lang="bash">{`# 1. Sign up
curl -X POST ${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/client/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email":"dev@example.com","password":"mypassword","name":"Dev"}'

# 2. Use the returned token
curl ${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/data/stats \\
  -H "Authorization: Bearer <your-token>"

# 3. Generate an API key
curl -X POST ${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/keys/generate \\
  -H "Authorization: Bearer <your-token>" \\
  -H "Content-Type: application/json" \\
  -d '{"label":"my-key","scopes":["read"]}'`}</CodeBlock>
        </div>

        {/* Rate limiting notice */}
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          <strong>Rate Limiting:</strong> Auth endpoints are limited to 10
          requests per 15 minutes. General API endpoints allow 200 requests per
          15 minutes. Headers{" "}
          <code className="font-mono text-xs">X-RateLimit-Remaining</code> and{" "}
          <code className="font-mono text-xs">X-RateLimit-Reset</code> are
          included in every response.
        </div>

        {/* Section navigation */}
        <nav className="mt-8 flex flex-wrap gap-2 border-b border-cf-border pb-4">
          {sections.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setActiveSection(i)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeSection === i
                  ? "bg-purple-600 text-on-surface dark:bg-purple-700"
                  : "text-cf-muted hover:bg-cf-card hover:text-cf-text"
              }`}
            >
              {s.title}
            </button>
          ))}
        </nav>

        {/* Active section */}
        {sections.map((section, i) => (
          <div
            key={section.title}
            className={i === activeSection ? "" : "hidden"}
          >
            <div className="mt-6">
              <h2 className="text-xl font-bold text-cf-text">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-cf-muted">
                {section.description}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {section.endpoints.map((ep) => (
                <Endpoint key={`${ep.method} ${ep.path}`} {...ep} />
              ))}
            </div>
          </div>
        ))}

        {/* Error responses */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-cf-text">Error Responses</h2>
          <p className="mt-1 text-sm text-cf-muted">
            All errors return a JSON object with an error message.
          </p>
          <CodeBlock lang="json">{`{
  "error": "Human-readable error message"
}`}</CodeBlock>
          <div className="mt-4 overflow-x-auto rounded-lg border border-cf-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cf-border text-cf-muted">
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Meaning</th>
                </tr>
              </thead>
              <tbody className="text-cf-text">
                <tr className="border-b border-cf-border/50">
                  <td className="px-4 py-2 font-mono">400</td>
                  <td className="px-4 py-2">
                    Validation error / missing fields
                  </td>
                </tr>
                <tr className="border-b border-cf-border/50">
                  <td className="px-4 py-2 font-mono">401</td>
                  <td className="px-4 py-2">
                    Unauthorized — missing or invalid token
                  </td>
                </tr>
                <tr className="border-b border-cf-border/50">
                  <td className="px-4 py-2 font-mono">403</td>
                  <td className="px-4 py-2">
                    Forbidden — insufficient permissions or account suspended
                  </td>
                </tr>
                <tr className="border-b border-cf-border/50">
                  <td className="px-4 py-2 font-mono">404</td>
                  <td className="px-4 py-2">Resource not found</td>
                </tr>
                <tr className="border-b border-cf-border/50">
                  <td className="px-4 py-2 font-mono">409</td>
                  <td className="px-4 py-2">Conflict — duplicate resource</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono">429</td>
                  <td className="px-4 py-2">Rate limit exceeded</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <Link
          to="/client/login"
          className="mt-8 inline-block text-purple-600 hover:underline dark:text-purple-400"
        >
          ← Back to client portal
        </Link>
      </div>
    </motion.div>
  );
}
