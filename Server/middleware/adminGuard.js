/**
 * Guard admin routes by CIDR allowlist in production-like environments.
 */
import ipaddr from "ipaddr.js";

function parseAllowedCidrs(raw) {
  return (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((cidr) => ipaddr.parseCIDR(cidr));
}

function extractIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0].trim();
  return req.ip || req.connection?.remoteAddress || "";
}

export function adminGuard(req, res, next) {
  if (process.env.NODE_ENV === "development") return next();

  const ip = extractIp(req);
  const allowlist = parseAllowedCidrs(process.env.ADMIN_ALLOWED_IPS);
  if (!ip || allowlist.length === 0) return res.status(404).json({ error: "Not found" });

  try {
    const parsed = ipaddr.parse(ip);
    const ok = allowlist.some(([net, prefix]) => parsed.match(net, prefix));
    if (!ok) return res.status(404).json({ error: "Not found" });
    return next();
  } catch {
    return res.status(404).json({ error: "Not found" });
  }
}

