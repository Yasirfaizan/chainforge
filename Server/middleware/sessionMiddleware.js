import User from "../models/User.js";

/**
 * Middleware to check session validity (5-day auto-logout)
 * Should be applied after requireAuth middleware
 */
export const checkSessionValidity = async (req, res, next) => {
  try {
    // Skip for admin users or if no user
    if (!req.user?.sub || req.user?.role === "admin") {
      return next();
    }

    const user = await User.findById(req.user.sub);
    
    if (!user) {
      return res.status(401).json({ 
        error: "User not found",
        code: "SESSION_INVALID" 
      });
    }

    // Check if session is still valid
    if (!user.isSessionValid()) {
      // Clear the session
      await user.clearSession();
      
      return res.status(401).json({
        error: "Session expired. Please log in again.",
        code: "SESSION_EXPIRED",
        expiredAt: user.sessionExpiresAt,
        message: "Your session has expired after 5 days of inactivity. Please log in again to continue."
      });
    }

    // Attach session info to request
    req.sessionInfo = {
      valid: true,
      expiresAt: user.sessionExpiresAt,
      expiresIn: Math.floor((user.sessionExpiresAt - new Date()) / 1000)
    };

    next();
  } catch (error) {
    console.error("Session check error:", error);
    next(error);
  }
};

/**
 * Middleware to refresh session on activity
 * Extends the 5-day window when user makes authenticated requests
 */
export const refreshSession = async (req, res, next) => {
  try {
    // Only for clients, not admins
    if (!req.user?.sub || req.user?.role === "admin") {
      return next();
    }

    // Don't refresh on every request - only every 5 minutes to save DB writes
    const user = await User.findById(req.user.sub);
    if (!user) return next();

    const lastRefresh = user.lastLoginAt ? new Date(user.lastLoginAt) : new Date(0);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    if (lastRefresh < fiveMinutesAgo) {
      await user.refreshSession();
    }

    next();
  } catch (error) {
    console.error("Session refresh error:", error);
    next(error);
  }
};

export default { checkSessionValidity, refreshSession };
