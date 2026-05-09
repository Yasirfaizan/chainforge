/**
 * Simple request body validator middleware.
 * Usage: validate({ email: "string", password: "string" })
 */
export function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, type] of Object.entries(schema)) {
      const val = req.body[field];
      if (val === undefined || val === null || val === "") {
        errors.push(`${field} is required`);
      } else if (typeof val !== type) {
        errors.push(`${field} must be a ${type}`);
      }
    }
    if (errors.length) {
      return res.status(400).json({ error: errors.join(", ") });
    }
    next();
  };
}

/**
 * Sanitize common string fields — trim and lowercase email.
 */
export function sanitize(...fields) {
  return (req, _res, next) => {
    for (const field of fields) {
      if (typeof req.body[field] === "string") {
        req.body[field] = req.body[field].trim();
        if (field === "email") {
          req.body[field] = req.body[field].toLowerCase();
        }
      }
    }
    next();
  };
}
