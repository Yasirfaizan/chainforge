const rawSlug = import.meta.env.VITE_ADMIN_SLUG || "";
const rawAdminConsolePrefix = import.meta.env.VITE_ADMIN_CONSOLE_PREFIX || "";

function normalizeSlug(value = "") {
  const cleaned = String(value).trim().replace(/^\/+|\/+$/g, "");
  if (!cleaned) return "";
  if (cleaned.toLowerCase() === "admin") return "";
  if (cleaned.toLowerCase().startsWith("admin/")) {
    return cleaned.slice("admin/".length);
  }
  return cleaned;
}

function normalizePrefix(value = "") {
  const cleaned = String(value).trim().replace(/^\/+|\/+$/g, "");
  return cleaned ? `/${cleaned}` : "";
}

const slug = normalizeSlug(rawSlug);
const adminConsolePrefix = normalizePrefix(rawAdminConsolePrefix);

export const ADMIN_CONSOLE_PREFIX =
  adminConsolePrefix || (slug ? `/admin/${slug}` : "/admin");
export const ADMIN_API_PREFIX = slug ? `/api/admin/${slug}` : "/api/admin";

export function adminConsolePath(path = "") {
  return `${ADMIN_CONSOLE_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
}

export function adminApiPath(path = "") {
  return `${ADMIN_API_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
}
