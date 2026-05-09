import LoginHistory from "../models/LoginHistory.js";

function compactMetadata(metadata) {
  const safe = metadata && typeof metadata === "object" ? metadata : {};
  return Object.fromEntries(
    Object.entries(safe)
      .filter(([, value]) => value !== undefined && value !== null)
      .slice(0, 20),
  );
}

export async function recordLogin(userId, method, req, metadata = {}) {
  if (!userId || !method) return;

  await LoginHistory.create({
    userId,
    method,
    ip: req?.ip || "",
    userAgent: req?.get?.("user-agent") || "",
    metadata: compactMetadata(metadata),
  });
}
