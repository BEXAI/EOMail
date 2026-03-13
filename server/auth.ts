import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { type Express } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { z } from "zod";
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
      timezone: string | null;
      workingHoursStart: string | null;
      workingHoursEnd: string | null;
      createdAt: Date;
    }
  }
}

const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS_MAP_SIZE = 10000;
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

// Short-lived cache for deserialized users to avoid DB hit on every request
const USER_CACHE_TTL = 60_000; // 60 seconds
const userCache = new Map<string, { user: Express.User; cachedAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of userCache) {
    if (now - entry.cachedAt > USER_CACHE_TTL) {
      userCache.delete(key);
    }
  }
}, 2 * 60 * 1000);

function invalidateUserCache(userId: string): void {
  userCache.delete(userId);
}

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
    new LocalStrategy(async (rawUsername, password, done) => {
      const username = rawUsername.trim().toLowerCase();
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
      const cached = userCache.get(id);
      if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL) {
        return done(null, cached.user);
      }
      const user = await storage.getUser(id);
      if (!user) {
        userCache.delete(id);
        return done(null, false);
      }
      const { password: _, verificationToken: _vt, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user;
      const expressUser = safeUser as Express.User;
      userCache.set(id, { user: expressUser, cachedAt: Date.now() });
      done(null, expressUser);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { username, password, displayName } = req.body;

      if (!username || !password || !displayName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const trimmedUsername = username.trim().toLowerCase();
      const trimmedDisplayName = displayName.trim();

      if (!trimmedUsername || !trimmedDisplayName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password.length < 12) {
        return res.status(400).json({ message: "Password must be at least 12 characters" });
      }

      const existingUsername = await storage.getUserByUsername(trimmedUsername);
      if (existingUsername) {
        return res.status(400).json({ message: "An account with this username already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const initials = trimmedDisplayName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      const domain = process.env.DOMAIN || "eomail.co";
      const email = `${trimmedUsername}@${domain}`;
      const mailboxAddress = email;

      const user = await storage.createUser({
        username: trimmedUsername,
        email,
        password: hashedPassword,
        displayName: trimmedDisplayName,
        avatarInitials: initials,
        mailboxAddress,
        emailVerified: true,
      });

      const { password: _, verificationToken: _vt, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user;
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) return next(regenerateErr);
        req.login(safeUser as Express.User, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.status(201).json(safeUser);
        });
      });
    } catch (err: any) {
      if (err.code === "23505") {
        const detail = err.detail || "";
        if (detail.includes("email")) {
          return res.status(400).json({ message: "An account with this email already exists" });
        }
        return res.status(400).json({ message: "An account with this username already exists" });
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
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) return next(regenerateErr);
        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.json(user);
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    const userId = req.user?.id;
    req.logout((err) => {
      if (err) return next(err);
      if (userId) invalidateUserCache(userId);
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
      const rawUsername = req.body.username;
      if (!rawUsername) return res.status(400).json({ message: "Username is required" });
      const trimmedUsername = rawUsername.trim().toLowerCase();

      const user = await storage.getUserByUsername(trimmedUsername);
      if (!user) {
        return res.json({ message: "If an account with that username exists, a reset link has been sent." });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await storage.updateUser(user.id, { resetToken, resetTokenExpiry });
      await sendPasswordResetEmail(user.email, resetToken, user.displayName);

      res.json({ message: "If an account with that username exists, a reset link has been sent." });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ message: "Token and password are required" });
      if (password.length < 12) return res.status(400).json({ message: "Password must be at least 12 characters" });

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

  const updateProfileSchema = z.object({
    displayName: z.string().min(1).max(100).optional(),
    timezone: z.string().min(1).max(100).optional(),
    workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }).strict();

  app.patch("/api/auth/user", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten().fieldErrors });
      }

      const updates: Partial<User> = {};
      if (parsed.data.displayName) {
        updates.displayName = parsed.data.displayName.trim();
        updates.avatarInitials = updates.displayName
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
      }
      if (parsed.data.timezone) {
        updates.timezone = parsed.data.timezone;
      }
      if (parsed.data.workingHoursStart !== undefined) {
        updates.workingHoursStart = parsed.data.workingHoursStart;
      }
      if (parsed.data.workingHoursEnd !== undefined) {
        updates.workingHoursEnd = parsed.data.workingHoursEnd;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updated = await storage.updateUser(req.user!.id, updates);
      if (!updated) return res.status(404).json({ message: "User not found" });
      invalidateUserCache(req.user!.id);

      const { password: _, verificationToken: _vt, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err) {
      console.error("Update profile error:", err);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      if (newPassword.length < 12) {
        return res.status(400).json({ message: "New password must be at least 12 characters" });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { password: hashedPassword });
      invalidateUserCache(user.id);

      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error("Change password error:", err);
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
