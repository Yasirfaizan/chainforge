const slug = import.meta.env.VITE_ADMIN_SLUG || "";
const adminConsolePrefix = import.meta.env.VITE_ADMIN_CONSOLE_PREFIX || "";

export const ADMIN_CONSOLE_PREFIX =
  adminConsolePrefix || (slug ? `/admin/${slug}` : "/admin");
export const ADMIN_API_PREFIX = slug ? `/api/admin/${slug}` : "/api/admin";

export function adminConsolePath(path = "") {
  return `${ADMIN_CONSOLE_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
}

export function adminApiPath(path = "") {
  return `${ADMIN_API_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
}
