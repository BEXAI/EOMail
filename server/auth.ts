import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { type Express } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { pool } from "./db";
import { type User } from "@shared/schema";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email: string;
      displayName: string;
      avatarInitials: string;
      mailboxAddress: string | null;
      emailVerified: boolean;
      createdAt: Date;
    }
  }
}

const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS_MAP_SIZE = 10000;
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

// Periodic cleanup to prevent unbounded Map growth
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts) {
    if (now - record.firstAttempt > LOGIN_ATTEMPT_WINDOW) {
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

function purgeExpiredIfFull(): void {
  if (loginAttempts.size < MAX_LOGIN_ATTEMPTS_MAP_SIZE) return;
  const now = Date.now();
  for (const [key, record] of loginAttempts) {
    if (now - record.firstAttempt > LOGIN_ATTEMPT_WINDOW) {
      loginAttempts.delete(key);
    }
  }
}

function recordFailedLogin(username: string): boolean {
  purgeExpiredIfFull();
  const now = Date.now();
  const record = loginAttempts.get(username);
  if (!record || now - record.firstAttempt > LOGIN_ATTEMPT_WINDOW) {
    loginAttempts.set(username, { count: 1, firstAttempt: now });
    return false;
  }
  record.count++;
  return record.count >= MAX_LOGIN_ATTEMPTS;
}

function isLockedOut(username: string): boolean {
  const record = loginAttempts.get(username);
  if (!record) return false;
  if (Date.now() - record.firstAttempt > LOGIN_ATTEMPT_WINDOW) {
    loginAttempts.delete(username);
    return false;
  }
  return record.count >= MAX_LOGIN_ATTEMPTS;
}

function clearLoginAttempts(username: string): void {
  loginAttempts.delete(username);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        if (isLockedOut(username)) {
          return done(null, false, { message: "Account temporarily locked due to too many failed attempts. Try again later." });
        }
        const user = await storage.getUserByUsername(username);
        if (!user) {
          recordFailedLogin(username);
          return done(null, false, { message: "Invalid username or password" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          recordFailedLogin(username);
          return done(null, false, { message: "Invalid username or password" });
        }
        clearLoginAttempts(username);
        const { password: _, verificationToken: _vt, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user;
        return done(null, safeUser as Express.User);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      const { password: _, verificationToken: _vt, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user;
      done(null, safeUser as Express.User);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { username, email, password, displayName } = req.body;

      if (!username || !email || !password || !displayName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password.length < 4) {
        return res.status(400).json({ message: "Password must be at least 4 characters" });
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "An account with this username or email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const initials = displayName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      const domain = process.env.DOMAIN || "eomail.co";
      const mailboxAddress = `${username.toLowerCase()}@${domain}`;
      const verificationToken = crypto.randomBytes(32).toString("hex");

      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        displayName,
        avatarInitials: initials,
        mailboxAddress,
        verificationToken,
      });

      sendVerificationEmail(email, verificationToken, displayName).catch((e) =>
        console.error("Failed to send verification email:", e)
      );

      const { password: _, verificationToken: _vt, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user;
      req.login(safeUser as Express.User, (err) => {
        if (err) return next(err);
        res.status(201).json(safeUser);
      });
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      next(err);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If an account with that email exists, a reset link has been sent." });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await storage.updateUser(user.id, { resetToken, resetTokenExpiry });
      await sendPasswordResetEmail(email, resetToken, user.displayName);

      res.json({ message: "If an account with that email exists, a reset link has been sent." });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ message: "Token and password are required" });
      if (password.length < 4) return res.status(400).json({ message: "Password must be at least 4 characters" });

      const user = await storage.getUserByResetToken(token);
      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ message: "Password has been reset successfully" });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "Verification token is required" });

      const user = await storage.getUserByVerificationToken(token);
      if (!user) return res.status(400).json({ message: "Invalid verification token" });

      await storage.updateUser(user.id, {
        emailVerified: true,
        verificationToken: null,
      });

      res.json({ message: "Email verified successfully" });
    } catch (err) {
      console.error("Verify email error:", err);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.emailVerified) return res.json({ message: "Email already verified" });

      const verificationToken = crypto.randomBytes(32).toString("hex");
      await storage.updateUser(user.id, { verificationToken });
      await sendVerificationEmail(user.email, verificationToken, user.displayName);

      res.json({ message: "Verification email sent" });
    } catch (err) {
      console.error("Resend verification error:", err);
      res.status(500).json({ message: "Something went wrong" });
    }
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}
