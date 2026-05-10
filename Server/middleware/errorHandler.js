/**
 * Global error handler — catches unhandled errors and
 * returns a consistent JSON shape.
 */
export function errorHandler(err, _req, res, _next) {
  console.error("Unhandled error:", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join(", ") });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({ error: `Duplicate ${field}` });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  return res.status(status).json({
    error: message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
}

/**
 * 404 catch-all for unmatched routes.
 */
export function notFoundHandler(_req, res) {
  return res.status(404).json({
    error: "Endpoint not found",
    hint: "Check the API docs at /api/docs for available endpoints.",
  });
}
