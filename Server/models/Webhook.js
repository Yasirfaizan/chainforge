import mongoose from "mongoose";

const webhookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Webhook configuration
    url: {
      type: String,
      required: true,
      trim: true,
    },

    label: {
      type: String,
      default: "",
      trim: true,
    },

    // Event types to subscribe to
    events: [
      {
        type: String,
        enum: [
          "transaction.incoming", // Received transaction
          "transaction.outgoing", // Sent transaction
          "transaction.confirmed", // Transaction confirmed
          "transaction.failed", // Transaction failed
          "balance.change", // Balance changed
          "wallet.linked", // New wallet linked
          "wallet.unlinked", // Wallet removed
          "api.key.created", // API key created
          "api.key.revoked", // API key revoked
          "user.created", // New user created (newly triggered)
          "user.login", // User logged in
          "user.updated", // User profile updated
        ],
        required: true,
      },
    ],

    // Filter by chain (optional)
    chains: [
      {
        type: String,
        enum: [
          "ethereum",
          "polygon",
          "bnb",
          "avalanche",
          "arbitrum",
          "optimism",
          "solana",
        ],
      },
    ],

    // Filter by wallet address (optional)
    walletAddresses: [
      {
        type: String,
        trim: true,
      },
    ],

    // Security
    secret: {
      type: String,
      required: true,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "paused", "disabled"],
      default: "active",
    },

    // Delivery stats
    stats: {
      totalDeliveries: { type: Number, default: 0 },
      successfulDeliveries: { type: Number, default: 0 },
      failedDeliveries: { type: Number, default: 0 },
      lastDelivery: { type: Date },
      lastError: { type: String },
    },

    // Retry configuration
    retryConfig: {
      maxRetries: { type: Number, default: 3 },
      retryDelay: { type: Number, default: 1000 }, // ms
      backoffMultiplier: { type: Number, default: 2 },
    },
  },
  { timestamps: true },
);

// Indexes for efficient querying
webhookSchema.index({ userId: 1, status: 1 });
webhookSchema.index({ events: 1 });
webhookSchema.index({ "stats.lastDelivery": 1 });

// Method to increment delivery stats
webhookSchema.methods.recordDelivery = async function (success, error = null) {
  this.stats.totalDeliveries++;
  this.stats.lastDelivery = new Date();

  if (success) {
    this.stats.successfulDeliveries++;
    this.stats.lastError = null;
  } else {
    this.stats.failedDeliveries++;
    if (error) this.stats.lastError = error;

    // Auto-disable if too many failures
    if (
      this.stats.failedDeliveries > 100 &&
      this.stats.failedDeliveries / this.stats.totalDeliveries > 0.9
    ) {
      this.status = "disabled";
    }
  }

  return await this.save();
};

// Method to check if webhook should receive an event
webhookSchema.methods.shouldReceiveEvent = function (
  event,
  chain,
  walletAddress,
) {
  if (this.status !== "active") return false;

  // Check event type
  if (!this.events.includes(event)) return false;

  // Check chain filter
  if (this.chains.length > 0 && !this.chains.includes(chain)) return false;

  // Check wallet filter
  if (
    this.walletAddresses.length > 0 &&
    !this.walletAddresses.includes(walletAddress)
  )
    return false;

  return true;
};

export default mongoose.model("Webhook", webhookSchema);
