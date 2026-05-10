import nodemailer from "nodemailer";

/**
 * Create a nodemailer transporter for Gmail SMTP.
 *
 * Key points:
 *  - Port 587 requires STARTTLS (secure: false + requireTLS: true)
 *  - SMTP_PORT env var comes in as a string → parseInt() is required
 *  - Gmail App Passwords (16-char, no spaces) must be used when 2FA is on
 *  - We call transporter.verify() at startup so a bad config fails loudly
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  // port 465 uses implicit TLS; all other ports (587, 25) use STARTTLS
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,   // force STARTTLS upgrade on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // Accept Gmail's cert in all environments
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
    },
    // Force IPv4 as Railway/Cloud environments often have IPv6 routing issues
    family: 4,
    // Prevent long hangs — must be less than frontend 15s timeout
    connectionTimeout: 5000, // 5s
    greetingTimeout: 5000,   // 5s
    socketTimeout: 8000,    // 8s
  });
}

// Verify SMTP config once at module load so misconfiguration is caught early
const _transporter = createTransporter();
_transporter.verify().then(() => {
  console.log("✅ SMTP connection verified — emails will send correctly");
}).catch((err) => {
  console.error("❌ SMTP verification failed:", err.message);
  console.error("   Check SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS in env");
});


const normalizeVerificationType = (type) => {
  if (type === "admin_signup") return { baseType: "signup", isAdmin: true };
  if (type === "admin_login") return { baseType: "login", isAdmin: true };
  if (type === "signup" || type === "login" || type === "forgot_password") {
    return { baseType: type, isAdmin: false };
  }
  return { baseType: "forgot_password", isAdmin: false };
};

// Email templates
const templates = {
  verification: (code, type) => {
    const { baseType, isAdmin } = normalizeVerificationType(type);
    const subjectLabel =
      baseType === "signup"
        ? "Sign Up"
        : baseType === "login"
          ? "Login"
          : "Password Reset";
    const audience = isAdmin ? "Admin " : "";
    return {
      subject: `ChainForge ${audience}${subjectLabel} Verification`,
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin: 0; font-size: 28px;">⛓️ ChainForge</h1>
          <p style="color: #6b7280; margin-top: 8px;">The Firebase of Web3</p>
        </div>
        
        <div style="background: #f9fafb; border-radius: 12px; padding: 30px; text-align: center;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 20px;">
            ${baseType === "signup" ? "Verify Your Email" : baseType === "login" ? "Login Verification" : "Reset Your Password"}
          </h2>
          
          <p style="color: #6b7280; margin-bottom: 24px; font-size: 16px; line-height: 1.5;">
            ${
              baseType === "signup"
                ? "Thank you for signing up! Please use the verification code below to complete your registration."
                : baseType === "login"
                  ? "Please use the verification code below to complete your login."
                  : "You requested a password reset. Use the code below to proceed."
            }
          </p>
          
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 24px 0; border: 2px dashed #7c3aed;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #7c3aed; font-family: monospace;">
              ${code}
            </span>
          </div>
          
          <p style="color: #ef4444; font-size: 14px; margin: 16px 0;">
            ⏰ This code expires in 10 minutes
          </p>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            If you didn't request this code, please ignore this email.<br>
            This is an automated message from ChainForge.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>© 2024 ChainForge. All rights reserved.</p>
          <p>Need help? Contact support@chainforge.io</p>
        </div>
      </div>
    `,
    text: `
  ChainForge ${audience}${subjectLabel} Verification

Your verification code is: ${code}

This code expires in 10 minutes.

If you didn't request this code, please ignore this email.

© 2024 ChainForge
support@chainforge.io
    `,
  };
  },

  welcome: (name) => ({
    subject: "Welcome to ChainForge! 🎉",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin: 0; font-size: 28px;">⛓️ ChainForge</h1>
        </div>
        
        <div style="background: #f9fafb; border-radius: 12px; padding: 30px; text-align: center;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 24px;">
            Welcome to the Firebase of Web3! 🚀
          </h2>
          
          <p style="color: #6b7280; margin-bottom: 24px; font-size: 16px; line-height: 1.5;">
            Hi ${name || "there"},
          </p>
          
          <p style="color: #6b7280; margin-bottom: 24px; font-size: 16px; line-height: 1.5;">
            Your email has been verified and your account is now active. You can now:
          </p>
          
          <ul style="text-align: left; color: #6b7280; margin-bottom: 24px; line-height: 1.8;">
            <li>🔗 Connect multiple wallets across 7 blockchains</li>
            <li>📊 Track your transactions in human-readable format</li>
            <li>🔔 Set up real-time webhook notifications</li>
            <li>🔑 Generate API keys for your dApps</li>
          </ul>
          
          <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/client/dashboard" 
             style="display: inline-block; background: #7c3aed; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            Go to Dashboard
          </a>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>© 2024 ChainForge. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `
Welcome to ChainForge!

Hi ${name || "there"},

Your email has been verified and your account is now active.

You can now:
- Connect multiple wallets across 7 blockchains
- Track your transactions in human-readable format
- Set up real-time webhook notifications
- Generate API keys for your dApps

Go to Dashboard: ${process.env.CLIENT_URL || "http://localhost:5173"}/client/dashboard

© 2024 ChainForge
    `,
  }),

  passwordReset: (name) => ({
    subject: "Password Reset Successful",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #7c3aed; margin: 0; font-size: 28px;">⛓️ ChainForge</h1>
        </div>
        
        <div style="background: #f9fafb; border-radius: 12px; padding: 30px; text-align: center;">
          <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 20px;">
            Password Reset Successful ✅
          </h2>
          
          <p style="color: #6b7280; margin-bottom: 24px; font-size: 16px; line-height: 1.5;">
            Hi ${name || "there"},
          </p>
          
          <p style="color: #6b7280; margin-bottom: 24px; font-size: 16px; line-height: 1.5;">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            If you didn't make this change, please contact support immediately.
          </p>
        </div>
      </div>
    `,
    text: `
Password Reset Successful

Hi ${name || "there"},

Your password has been successfully reset. You can now log in with your new password.

If you didn't make this change, please contact support immediately.

© 2024 ChainForge
    `,
  }),
};

// Send verification email
export const sendVerificationEmail = async (email, code, type) => {
  try {
    const template = templates.verification(code, type);

    const info = await _transporter.sendMail({
      from: `"ChainForge" <${process.env.SMTP_USER || "noreply@chainforge.io"}>`,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });


    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    throw error;
  }
};

// Send welcome email
export const sendWelcomeEmail = async (email, name) => {
  try {
    const template = templates.welcome(name);

    const info = await _transporter.sendMail({
      from: `"ChainForge" <${process.env.SMTP_USER || "noreply@chainforge.io"}>`,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Failed to send welcome email:", error);
    // Don't throw - welcome email is non-critical
    return { success: false, error: error.message };
  }
};

// Send password reset confirmation
export const sendPasswordResetConfirmation = async (email, name) => {
  try {
    const template = templates.passwordReset(name);

    await _transporter.sendMail({
      from: `"ChainForge" <${process.env.SMTP_USER || "noreply@chainforge.io"}>`,
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return { success: true };
  } catch (error) {
    console.error("❌ Failed to send password reset confirmation:", error);
    return { success: false };
  }
};

export default {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetConfirmation,
};
