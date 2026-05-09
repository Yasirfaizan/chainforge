/**
 * Admin console path helpers.
 *
 * VITE_ADMIN_SLUG is intentionally left EMPTY in .env.
 * The server's ADMIN_ROUTE_SLUG only affects rate-limiting/audit display;
 * the actual API mount point is always /api/admin.
 *
 * If you set VITE_ADMIN_SLUG="admin" you get /admin/admin — DON'T do that.
 * Leave VITE_ADMIN_SLUG unset (or empty) to use the default /admin prefix.
 */
const slug = import.meta.env.VITE_ADMIN_SLUG || "";

// Console URL prefix: /admin  (no slug — avoids /admin/admin duplication)
export const ADMIN_CONSOLE_PREFIX = slug ? `/admin/${slug}` : "/admin";

// API prefix: always /api/admin regardless of slug
export const ADMIN_API_PREFIX = "/api/admin";

export function adminConsolePath(path = "") {
  return `${ADMIN_CONSOLE_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
}

export function adminApiPath(path = "") {
  return `${ADMIN_API_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
}
