/**
 * GitHub OAuth routes.
 */
import express from "express";
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User.js";
import { signToken } from "../util/jwt.js";
import webhookService from "../services/webhookService.js";
import { recordLogin } from "../services/loginHistoryService.js";

const router = express.Router();
const clientOrigin = String(
  process.env.CLIENT_ORIGIN || "http://localhost:5173",
).replace(/\/+$/, "");
const githubEnabled = Boolean(
  process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
);

function resolveGitHubCallbackUrl(req) {
  if (process.env.GITHUB_CALLBACK_URL) {
    return process.env.GITHUB_CALLBACK_URL;
  }

  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.get("host") || "localhost:5001";
  return `${proto}://${host}/api/auth/github/callback`;
}

if (githubEnabled) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:5001/api/auth/github/callback",
        scope: ["user:email"],
      },
      (_accessToken, _refreshToken, profile, done) => done(null, profile),
    ),
  );
}

async function upsertGitHubUser({ email, name, githubId, avatarUrl }) {
  let user = await User.findOne({ email });
  if (user) {
    // Link GitHub ID to existing account (identity bridge via email)
    user.githubId = githubId;
    user.avatarUrl = avatarUrl || user.avatarUrl || "";
    // Preserve wallet as primary auth method; otherwise update to github
    user.authMethod = user.authMethod === "wallet" ? "wallet" : "github";
    user.emailVerified = true;
    user.status = user.status === "Suspended" ? "Suspended" : "Active";
    await user.save();
    return { user, isNewUser: false };
  }

  // New user via GitHub - create account with github authMethod
  user = await User.create({
    email,
    name: name || "",
    githubId,
    avatarUrl: avatarUrl || "",
    role: "client",
    authMethod: "github",
    emailVerified: true,
    status: "Active",
  });
  return { user, isNewUser: true };
}

router.get("/github", (req, res, next) => {
  if (!githubEnabled)
    return res.status(503).json({ error: "GitHub auth not configured" });
  const callbackURL = resolveGitHubCallbackUrl(req);
  return passport.authenticate("github", { scope: ["user:email"], callbackURL })(
    req,
    res,
    next,
  );
});

router.get(
  "/github/callback",
  (req, res, next) => {
    if (!githubEnabled)
      return res.status(503).json({ error: "GitHub auth not configured" });
    const callbackURL = resolveGitHubCallbackUrl(req);
    return passport.authenticate("github", {
      session: false,
      failureRedirect: `${clientOrigin}/login`,
      callbackURL,
    })(req, res, next);
  },
  async (req, res, next) => {
    try {
      // GitHub email might be private, passport-github2 tries to fetch it but sometimes we need to be careful
      const email = req.user?.emails?.[0]?.value?.toLowerCase();
      if (!email) {
        return res.status(400).json({
          error:
            "GitHub profile missing email. Please make your email public in GitHub settings.",
        });
      }

      const { user, isNewUser } = await upsertGitHubUser({
        email,
        name: req.user?.displayName || req.user?.username || "",
        githubId: req.user?.id,
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
          webhookService.EventBuilders.userLogin(user, "github", {
            type: "user.login",
            email: user.email,
          }),
        )
        .catch(() => {});

      recordLogin(user._id.toString(), "github", req, {
        email: user.email,
        oauthProvider: "github",
      }).catch(() => {});

      const token = signToken(
        { sub: user._id.toString(), role: "client", email: user.email },
        "30d",
      );
      const redirectBase = clientOrigin;

      // We'll use the same callback pattern as Google
      return res.redirect(
        `${redirectBase}/auth/callback?token=${encodeURIComponent(token)}`,
      );
    } catch (e) {
      next(e);
    }
  },
);

export default router;
