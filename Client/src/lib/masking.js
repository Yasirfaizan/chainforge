/**
 * Redacts sensitive string data for display in the UI.
 * Prevents full exposure of PII and private identifiers.
 */

export function maskAddress(address) {
  if (!address || typeof address !== "string") return "";
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function maskEmail(email) {
  if (!email || typeof email !== "string") return "";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${user[1]}***@${domain}`;
}

export function maskKey(keyMask) {
  // Usually API keys come as "cf_live_abcd...1234" from backend
  // If it's a full key (raw), we should never show it here.
  // The backend already sends a 'mask' field like 'cf_live_****1234'
  return keyMask || "••••••••••••";
}
