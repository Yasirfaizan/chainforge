/**
 * Google OAuth and ID token verification routes.
 */
import express from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { signToken } from "../util/jwt.js";
import webhookService from "../services/webhookService.js";
import { recordLogin } from "../services/loginHistoryService.js";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

if (googleEnabled) {
  // Always use explicit full HTTPS URL — behind Railway's proxy, passport can
  // reconstruct an http:// callback URL which Google then rejects.
  const googleCallbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    "https://chainforge-production.up.railway.app/api/auth/google/callback";

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: googleCallbackURL,
      },
      (_accessToken, _refreshToken, profile, done) => done(null, profile),
    ),
  );
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

async function upsertGoogleUser({ email, name, googleId, avatarUrl }) {
  // Identity Bridge: Look up by email to converge multiple auth methods
  // If user already has email account (from email/password or other OAuth), link Google ID
  // to the same account, enabling seamless cross-method authentication
  let user = await User.findOne({ email });
  if (user) {
    // Link Google ID to existing account (identity bridge via email)
    user.googleId = googleId;
    user.avatarUrl = avatarUrl || user.avatarUrl || "";
    // Preserve wallet as primary auth method; otherwise update to google
    user.authMethod = user.authMethod === "wallet" ? "wallet" : "google";
    user.emailVerified = true;
    user.status = user.status === "Suspended" ? "Suspended" : "Active";
    await user.save();
    return { user, isNewUser: false };
  }

  // New user via Google - create account with google authMethod
  user = await User.create({
    email,
    name: name || "",
    googleId,
    avatarUrl: avatarUrl || "",
    role: "client",
    authMethod: "google",
    emailVerified: true,
    status: "Active",
  });
  return { user, isNewUser: true };
}

router.get("/google", (req, res, next) => {
  if (!googleEnabled)
    return res.status(503).json({ error: "Google auth not configured" });
  return passport.authenticate("google", { scope: ["profile", "email"] })(
    req,
    res,
    next,
  );
});

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!googleEnabled)
      return res.status(503).json({ error: "Google auth not configured" });
    return passport.authenticate("google", {
      session: false,
      failureRedirect: `${process.env.CLIENT_ORIGIN}/client/login`,
    })(req, res, next);
  },
  async (req, res, next) => {
    try {
      const email = req.user?.emails?.[0]?.value?.toLowerCase();
      if (!email)
        return res.status(400).json({ error: "Google profile missing email" });
      const { user, isNewUser } = await upsertGoogleUser({
        email,
        name: req.user?.displayName || "",
        googleId: req.user?.id,
        avatarUrl: req.user?.photos?.[0]?.value || "",
      });

      // Trigger user.created webhook if new user
      if (isNewUser) {
        webhookService
          .triggerEvent(
            user._id.toString(),
            "user.created",
            webhookService.EventBuilders.userCreated(user),
          )
          .catch(() => {});
      }

      // Trigger user.login webhook
      webhookService
        .triggerEvent(
          user._id.toString(),
          "user.login",
          webhookService.EventBuilders.userLogin(user, "google", {
            type: "user.login",
            email: user.email,
          }),
        )
        .catch(() => {});

      recordLogin(user._id.toString(), "google", req, {
        email: user.email,
        oauthProvider: "google",
      }).catch(() => {});

      const token = signToken(
        { sub: user._id.toString(), role: "client", email: user.email },
        "30d",
      );
      const redirectBase = process.env.CLIENT_ORIGIN || "http://localhost:5173";
      return res.redirect(
        `${redirectBase}/auth/callback?token=${encodeURIComponent(token)}`,
      );
    } catch (e) {
      next(e);
    }
  },
);

router.post("/google/verify-idtoken", async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: "Google auth not configured" });
    }
    const { idToken } = req.body || {};
    if (!idToken) return res.status(400).json({ error: "idToken is required" });
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    if (!email)
      return res.status(400).json({ error: "Invalid Google token payload" });

    const { user, isNewUser } = await upsertGoogleUser({
      email,
      name: payload.name || "",
      googleId: payload.sub,
      avatarUrl: payload.picture || "",
    });

    // Trigger user.created webhook if new user
    if (isNewUser) {
      webhookService
        .triggerEvent(
          user._id.toString(),
          "user.created",
          webhookService.EventBuilders.userCreated(user),
        )
        .catch(() => {});
    }

    // Trigger user.login webhook
    webhookService
      .triggerEvent(
        user._id.toString(),
        "user.login",
        webhookService.EventBuilders.userLogin(user, "google", {
          type: "user.login",
          email: user.email,
        }),
      )
      .catch(() => {});

    recordLogin(user._id.toString(), "google", req, {
      email: user.email,
      oauthProvider: "google",
    }).catch(() => {});

    const token = signToken(
      { sub: user._id.toString(), role: "client", email: user.email },
      "30d",
    );
    return res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email || "",
        name: user.name || "",
        role: "client",
        authMethod: "google",
        avatarUrl: user.avatarUrl || "",
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
