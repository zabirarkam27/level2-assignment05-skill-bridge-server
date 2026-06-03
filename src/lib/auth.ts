import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.APP_USER,
    pass: process.env.APP_PASSWORD,
  },
});

const authBaseUrl = process.env.BETTER_AUTH_URL || "http://localhost:5000";
const appUrl = process.env.APP_URL || "http://localhost:3000";
const isHttpsAuthUrl = authBaseUrl.startsWith("https://");

export const auth = betterAuth({
  baseURL: authBaseUrl,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: Array.from(
    new Set([
      appUrl,
      authBaseUrl,
      "http://localhost:3000",
      "http://localhost:5000",
      "https://skil-bridge-client-v2.vercel.app",
      "https://skil-bridge-server-v2.vercel.app",
    ]),
  ),
  advanced: {
    useSecureCookies: isHttpsAuthUrl,
    defaultCookieAttributes: {
      sameSite: isHttpsAuthUrl ? "none" : "lax",
      secure: isHttpsAuthUrl,
      httpOnly: true,
      path: "/",
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "STUDENT",
        required: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      status: {
        type: "string",
        defaultValue: "ACTIVE",
        required: false,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          if ((userData as any).role === "TUTOR") {
            return { data: { ...userData, status: "PENDING" } };
          }
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      try {
        await transporter.sendMail({
          from: '"Skill Bridge" <skillbridge.noreply@gmail.com>',
          to: user.email,
          subject: "Reset your password",
          html: `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Reset your password – Skill Bridge</title>
                <style>
                  body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
                  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
                  .header { background: linear-gradient(135deg, #4f46e5, #6366f1); color: #ffffff; text-align: center; padding: 30px 20px; }
                  .header h1 { margin: 0; font-size: 28px; letter-spacing: 0.5px; }
                  .header p { margin-top: 8px; font-size: 14px; opacity: 0.9; }
                  .content { padding: 32px; color: #374151; line-height: 1.7; font-size: 15px; }
                  .content h2 { color: #111827; font-size: 22px; margin-bottom: 12px; }
                  .button-wrapper { text-align: center; margin: 28px 0; }
                  .button { display: inline-block; padding: 14px 28px; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
                  .link-box { background-color: #f9fafb; border: 1px dashed #d1d5db; border-radius: 6px; padding: 14px; font-size: 13px; word-break: break-all; color: #4f46e5; }
                  .footer { background-color: #f9fafb; text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
                  .footer strong { color: #374151; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Skill Bridge</h1>
                    <p>Connect with expert tutors, learn anything</p>
                  </div>
                  <div class="content">
                    <h2>Reset your password</h2>
                    <p>Hello <strong>${user.name}</strong>,</p>
                    <p>We received a request to reset your password. Click the button below to set a new one:</p>
                    <div class="button-wrapper">
                      <a href="${url}" class="button">Reset Password</a>
                    </div>
                    <p>If the button doesn't work, copy and paste this link into your browser:</p>
                    <div class="link-box">${url}</div>
                    <p style="margin-top: 24px;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
                    <p>Stay secure,<br /><strong>Skill Bridge Team</strong></p>
                  </div>
                  <div class="footer">© 2026 <strong>Skill Bridge</strong>. All rights reserved.<br />Learn. Grow. Succeed.</div>
                </div>
              </body>
            </html>`,
        });
      } catch (error) {
        throw error;
      }
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, token }) => {
      try {
        const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
        await transporter.sendMail({
          from: '"Skill Bridge" <skillbridge.noreply@gmail.com>',
          to: user.email,
          subject: "Verify your email address",
          html: `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Verify your email – Skill Bridge</title>
                <style>
                  body {
                    margin: 0;
                    padding: 0;
                    background-color: #f3f4f6;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
                      Roboto, Helvetica, Arial, sans-serif;
                  }

                  .container {
                    max-width: 600px;
                    margin: 40px auto;
                    background-color: #ffffff;
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.06);
                  }

                  .header {
                    background: linear-gradient(135deg, #4f46e5, #6366f1);
                    color: #ffffff;
                    text-align: center;
                    padding: 30px 20px;
                  }

                  .header h1 {
                    margin: 0;
                    font-size: 28px;
                    letter-spacing: 0.5px;
                  }

                  .header p {
                    margin-top: 8px;
                    font-size: 14px;
                    opacity: 0.9;
                  }

                  .content {
                    padding: 32px;
                    color: #374151;
                    line-height: 1.7;
                    font-size: 15px;
                  }

                  .content h2 {
                    color: #111827;
                    font-size: 22px;
                    margin-bottom: 12px;
                  }
                  .button-wrapper {
                    text-align: center;
                    margin: 28px 0;
                  }

                  .button {
                    display: inline-block;
                    padding: 14px 28px;
                    background-color: #4f46e5;
                    color: #ffffff !important;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 15px;
                  }

                  .button:hover {
                    background-color: #4338ca;
                  }

                  .link-box {
                    background-color: #f9fafb;
                    border: 1px dashed #d1d5db;
                    border-radius: 6px;
                    padding: 14px;
                    font-size: 13px;
                    word-break: break-all;
                    color: #4f46e5;
                  }

                  .footer {
                    background-color: #f9fafb;
                    text-align: center;
                    padding: 20px;
                    font-size: 12px;
                    color: #6b7280;
                  }

                  .footer strong {
                    color: #374151;
                  }
                </style>
              </head>

              <body>
                <div class="container">
                  <!-- Header -->
                  <div class="header">
                    <h1>Skill Bridge</h1>
                    <p>Connect with expert tutors, learn anything</p>
                  </div>

                  <!-- Content -->
                  <div class="content">
                    <h2>Verify your email address</h2>

                    <p>
                      Hello <strong>${user.name}</strong>,
                    </p>

                    <p>
                      Welcome to <strong>Skill Bridge</strong> 🎓
                      You're just one step away from accessing expert tutors and starting
                      your learning journey.
                    </p>

                    <p>
                      Please confirm your email address by clicking the button below:
                    </p>

                    <div class="button-wrapper">
                      <a href="${verificationUrl}" class="button">
                        Verify Email
                      </a>
                    </div>

                    <p>
                      If the button doesn’t work, copy and paste this link into your browser:
                    </p>

                    <div class="link-box">
                      ${verificationUrl}
                    </div>

                    <p style="margin-top: 24px;">
                      If you didn’t create an account on Skill Bridge, you can safely ignore
                      this email.
                    </p>

                    <p>
                      Happy learning,<br />
                      <strong>Skill Bridge Team</strong>
                    </p>
                  </div>

                  <!-- Footer -->
                  <div class="footer">
                    © 2026 <strong>Skill Bridge</strong>. All rights reserved.<br />
                    Learn. Grow. Succeed.
                  </div>
                </div>
              </body>
            </html>
            `,
        });

      } catch (error) {
        throw error;
      }
    },
  },

  socialProviders: {
    google: {
      prompt: "select_account consent",
      accessType: "offline",
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar",
      ],
      clientId: process.env.GOOGLE_CLIENT_ID! as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET! as string,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
});
