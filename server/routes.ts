import type { Express } from "express";
import { type Server } from "http";
import { apiLimiter, authLimiter, aiLimiter } from "./routes/_shared";
import { registerEmailRoutes } from "./routes/email";
import { registerAiRoutes } from "./routes/ai";
import { registerComposeRoutes } from "./routes/compose";
import { registerFolderRoutes } from "./routes/folders";
import { registerCalendarRoutes } from "./routes/calendar";
import { registerFinopsRoutes } from "./routes/finops";
import { registerSecurityRoutes } from "./routes/security";
import { registerSettingsRoutes } from "./routes/settings";
import { registerThreadRoutes } from "./routes/threads";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Global rate limiters
  app.use("/api/", apiLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/ai/", aiLimiter);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Domain routes
  registerEmailRoutes(app);
  registerAiRoutes(app);
  registerComposeRoutes(app);
  registerFolderRoutes(app);
  registerCalendarRoutes(app);
  registerFinopsRoutes(app);
  registerSecurityRoutes(app);
  registerSettingsRoutes(app);
  registerThreadRoutes(app);

  return httpServer;
}
