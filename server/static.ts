import express, { type Express } from "express";
import fs from "fs";
import path from "path";

const BLOCKED_PATH_PATTERNS = [
  /\.env/i,
  /\.git/i,
  /\.ssh/i,
  /\.aws/i,
  /\.npmrc/i,
  /\.docker/i,
  /credentials/i,
  /\.htaccess/i,
  /wp-admin/i,
  /wp-login/i,
  /phpmyadmin/i,
];

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Block sensitive paths before static file serving
  app.use((req, res, next) => {
    if (BLOCKED_PATH_PATTERNS.some((p) => p.test(req.path))) {
      return res.status(404).json({ error: "Not found" });
    }
    next();
  });

  app.use(express.static(distPath, {
    maxAge: "1y",
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }));

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
