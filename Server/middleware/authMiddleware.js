import { verifyToken } from "../util/jwt.js";
import User from "../models/User.js";

// Enhanced auth middleware with session validation for clients
export async function requireAuthWithSession(req, res, next) {
  const h = req.headers.authorization;
  const token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const user = verifyToken(token);
    req.user = user;
    
    // For clients, check session validity (5-day auto-logout) with atomic operations
    if (user.role === "client") {
      // Use findOneAndUpdate for atomic session validation and cleanup
      const dbUser = await User.findOneAndUpdate(
        { 
          _id: user.sub,
          sessionExpiresAt: { $gt: new Date() }, // Only find if session is still valid
          status: "Active" // Ensure user is not suspended
        },
        {
          $setOnInsert: { lastLoginAt: new Date() }, // Update login time on match
        },
        { 
          new: true, // Return updated document
          runValidators: true,
          lean: true // Better performance for read-only operations
        }
      );
      
      if (!dbUser) {
        // Session expired or user not found - clear session atomically
        await User.updateOne(
          { _id: user.sub },
          { 
            $set: { 
              sessionExpiresAt: new Date(),
              lastLoginAt: new Date()
            }
          }
        ).exec();
        
        return res.status(401).json({
          error: "Session expired. Please log in again.",
          code: "SESSION_EXPIRED",
          expiredAt: new Date()
        });
      }
      
      // Attach fresh user data to request
      req.user = {
        ...user,
        sessionExpiresAt: dbUser.sessionExpiresAt,
        status: dbUser.status
      };
      
      // Do not auto-refresh client session here.
      // Requirement: client must be auto-logged out after 5 days.
    }
    
    next();
  } catch (error) {
    // Log authentication errors for monitoring
    console.error(`Auth middleware error: ${error.message}`, {
      token: token ? token.substring(0, 10) + '...' : 'none',
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Use session-aware auth as the default auth middleware.
export const requireAuth = requireAuthWithSession;
export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}
