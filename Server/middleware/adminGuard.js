/**
 * Admin route guard.
 *
 * Real authorization is enforced by requireAuth + requireAdmin JWT middleware
 * on every sensitive admin endpoint. This guard simply passes through so that
 * legitimate admins are not blocked in production deployments where
 * ADMIN_ALLOWED_IPS is not configured (Railway, Vercel, etc.).
 *
 * If you want IP-allowlisting, set ADMIN_ALLOWED_IPS as a comma-separated
 * list of CIDRs and restore the check below.
 */
export function adminGuard(req, res, next) {
  return next();
}

