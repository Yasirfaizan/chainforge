import jwt from "jsonwebtoken";
import crypto from "crypto";

const SECRET = process.env.JWT_SECRET || (() => {
  const fallback = crypto.randomBytes(32).toString("hex");
  console.warn(
    "⚠️  JWT_SECRET not set — using random ephemeral secret. " +
    "Tokens will invalidate on server restart. Set JWT_SECRET in .env for production."
  );
  return fallback;
})();

export function signToken(payload, expiresIn = "30d") {
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
