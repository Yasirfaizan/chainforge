import RequestLog from "../models/RequestLog.js";

function shouldLog(req) {
  // Avoid noise
  if (req.path === "/health") return false;
  if (req.path === "/") return false;
  if (req.path === "/api/docs") return false;
  // Only log API-ish routes
  if (!req.path.startsWith("/api/")) return false;
  return true;
}

export function requestLogger(req, res, next) {
  if (!shouldLog(req)) return next();

  const start = Date.now();
  res.on("finish", async () => {
    try {
      const userId = req.user?.sub || null;
      const apiKeyId = req.apiKey?._id || null;
      const authType = apiKeyId ? "apiKey" : userId ? "jwt" : "none";
      await RequestLog.create({
        authType,
        userId,
        apiKeyId,
        route: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        latencyMs: Date.now() - start,
        ip: req.ip || "",
        userAgent: req.get("user-agent") || "",
      });
    } catch {
      // non-blocking
    }
  });

  next();
}

