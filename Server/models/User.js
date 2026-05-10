import mongoose from "mongoose";

/**
 * Identity Bridge Design Pattern
 * ================================
 * All authentication methods (email, wallet, Google, GitHub) converge to a single user account
 * via email-based identity resolution:
 *
 * Scenario 1: Email → Google → GitHub (same account)
 * 1. User signs up with email/password → User created with authMethod: "email"
 * 2. User logs in with Google (same email) → findOne({email}) links googleId, authMethod updates to "google"
 * 3. User logs in with GitHub (same email) → findOne({email}) links githubId, authMethod updates to "github"
 * Result: Single account with email, googleId, and githubId linked
 *
 * Scenario 2: Wallet Primary + OAuth Secondary
 * 1. User signs up via wallet → User created with authMethod: "wallet"
 * 2. User logs in with Google (email-less flow) or later adds email → googleId is linked
 * 3. authMethod stays "wallet" (preserved as primary method)
 * Result: Single account with wallet primary and Google/GitHub as secondary identities
 *
 * Key Behaviors:
 * - Email-based lookup (findOne({email})) is the convergence point for OAuth
 * - Wallet is ALWAYS preserved as primary auth method (never downgraded)
 * - googleId, githubId, and wallets array track all linked identities
 * - User can log in via ANY linked method and access the same account
 * - authMethod field indicates the "most recently used" login method (wallet always wins)
 *
 * See: routes/clientAuth.js (wallet-auth merge), routes/googleAuth.js, routes/githubAuth.js
 */

// Embedded wallet schema for multiple wallet support
const walletSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    set: (v) => v?.toLowerCase(),
  },
  chain: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  type: {
    type: String,
    enum: ["injected", "private_key"],
    default: "injected",
  },
  label: {
    type: String,
    default: "",
    trim: true,
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
  number: {
    type: Number,
    default: 0,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true,
  },
  githubId: {
    type: String,
    sparse: true,
    unique: true,
  },
  avatarUrl: { type: String, default: "" },
  passwordHash: { type: String, default: "" },
  name: { type: String, default: "", trim: true },
  role: { type: String, enum: ["client", "admin"], required: true },

  // Legacy single wallet (for backwards compatibility)
  walletAddress: { type: String, default: "", trim: true },
  chain: { type: String, default: "" },

  // New: Multiple wallets support
  wallets: { type: [walletSchema], default: [] },
  nextWalletNumber: { type: Number, default: 1 },

    authMethod: {
    type: String,
    enum: ["email", "wallet", "google", "github"],
    default: "email",
  },
  adminTotpSecret: { type: String, default: "" },
  adminTotpEnabled: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["Active", "Suspended", "Pending"],
    default: "Pending", // New users start as pending until email verified
  },

  // Email verification
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerifiedAt: {
    type: Date,
    default: null,
  },

  // Password reset
  passwordResetToken: {
    type: String,
    default: null,
  },
  passwordResetExpires: {
    type: Date,
    default: null,
  },

  // User preferences
  preferences: {
    defaultChain: { type: String, default: "ethereum" },
    notifications: { type: Boolean, default: true },
    autoConnect: { type: Boolean, default: true },
  },

  // Session tracking for 30-day logout
  lastLoginAt: {
    type: Date,
    default: Date.now,
  },
  sessionExpiresAt: {
    type: Date,
    default: function () {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    },
  },
}, { timestamps: true });

// Compound indexes for wallet lookups
userSchema.index({ walletAddress: 1, chain: 1 }, { sparse: true });
userSchema.index({ "wallets.address": 1, "wallets.chain": 1 });

// Virtual for primary wallet
userSchema.virtual("primaryWallet").get(function () {
  return this.wallets.find((w) => w.isPrimary) || this.wallets[0] || null;
});

// Method to add a wallet
userSchema.methods.addWallet = async function (walletData) {
  const { address, chain, label } = walletData;
  const VALID_WALLET_TYPES = ["injected", "private_key"];
  const type = VALID_WALLET_TYPES.includes(walletData.type) ? walletData.type : "injected";

  // Check if wallet already exists
  const exists = this.wallets.find(
    (w) =>
      w.address.toLowerCase() === address.toLowerCase() && w.chain === chain,
  );

  if (exists) {
    throw new Error("Wallet already linked to this account");
  }

  // Use sequential wallet numbering
  const walletNumber = this.nextWalletNumber;

  this.wallets.push({
    address,
    chain,
    type,
    label: label || `Wallet ${walletNumber}`,
    isPrimary: this.wallets.length === 0, // First wallet is primary
    addedAt: new Date(),
    lastUsed: new Date(),
  });

  // Increment wallet number for next wallet
  this.nextWalletNumber += 1;

  // Also update legacy fields for backwards compatibility
  if (this.wallets.length === 1) {
    this.walletAddress = address;
    this.chain = chain;
  }

  return await this.save();
};

// Method to remove a wallet
userSchema.methods.removeWallet = async function (walletId) {
  const wallet = this.wallets.id(walletId);
  if (!wallet) {
    throw new Error("Wallet not found");
  }

  if (wallet.isPrimary && this.wallets.length > 1) {
    throw new Error(
      "Cannot remove primary wallet. Set another wallet as primary first.",
    );
  }

  this.wallets.pull(walletId);

  // Update legacy fields if primary was removed
  const newPrimary = this.wallets.find((w) => w.isPrimary) || this.wallets[0];
  if (newPrimary) {
    this.walletAddress = newPrimary.address;
    this.chain = newPrimary.chain;
  } else {
    this.walletAddress = "";
    this.chain = "";
  }

  return await this.save();
};

// Method to set primary wallet
userSchema.methods.setPrimaryWallet = async function (walletId) {
  this.wallets.forEach((w) => {
    w.isPrimary = w._id.toString() === walletId;
  });

  const primary = this.wallets.find((w) => w.isPrimary);
  if (primary) {
    this.walletAddress = primary.address;
    this.chain = primary.chain;
  }

  return await this.save();
};

// Static method to find user by wallet
userSchema.statics.findByWallet = function (address, chain) {
  return this.findOne({
    $or: [
      { walletAddress: address, chain },
      { "wallets.address": address, "wallets.chain": chain },
    ],
  });
};

// Session management methods
userSchema.methods.refreshSession = async function () {
  this.lastLoginAt = new Date();
  this.sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  return await this.save();
};

userSchema.methods.isSessionValid = function () {
  return this.sessionExpiresAt && this.sessionExpiresAt > new Date();
};

userSchema.methods.clearSession = async function () {
  this.sessionExpiresAt = new Date();
  return await this.save();
};

// Email verification methods
userSchema.methods.verifyEmail = async function () {
  this.emailVerified = true;
  this.emailVerifiedAt = new Date();
  this.status = "Active";
  return await this.save();
};

// Password reset methods
userSchema.methods.setPasswordResetToken = async function (token) {
  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  return await this.save();
};

userSchema.methods.clearPasswordResetToken = async function () {
  this.passwordResetToken = null;
  this.passwordResetExpires = null;
  return await this.save();
};

userSchema.methods.isPasswordResetTokenValid = function (token) {
  return (
    this.passwordResetToken === token &&
    this.passwordResetExpires &&
    this.passwordResetExpires > new Date()
  );
};

export default mongoose.model("User", userSchema);
