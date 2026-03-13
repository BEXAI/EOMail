import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { apiError } from "./_shared";

const financialDocumentUpdateSchema = z.object({
  status: z.enum(["extracted", "confirmed", "rejected"]).optional(),
  vendorName: z.string().max(200).optional(),
  vendorEmail: z.string().email().optional(),
  invoiceNumber: z.string().max(100).optional(),
  paymentStatus: z.string().max(50).optional(),
  confirmedAt: z.string().datetime().optional(),
}).strict();

export function registerFinopsRoutes(app: Express): void {
  app.get("/api/finance/documents", requireAuth, async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const emailId = req.query.emailId as string | undefined;
      const docs = await storage.getFinancialDocuments(req.user!.id, { status, emailId });
      res.json(docs);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch financial documents" });
    }
  });

  app.get("/api/finance/documents/:id", requireAuth, async (req, res) => {
    try {
      const doc = await storage.getFinancialDocument(req.params.id, req.user!.id);
      if (!doc) return res.status(404).json({ error: "Document not found" });
      res.json(doc);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.patch("/api/finance/documents/:id", requireAuth, async (req, res) => {
    try {
      const parsed = financialDocumentUpdateSchema.safeParse(req.body);
      if (!parsed.success) return apiError(res, 400, "VALIDATION_ERROR", "Invalid document update");
      const updated = await storage.updateFinancialDocument(req.params.id, req.user!.id, parsed.data as any);
      if (!updated) return apiError(res, 404, "NOT_FOUND", "Document not found");
      res.json(updated);
    } catch (e) {
      apiError(res, 500, "INTERNAL_ERROR", "Failed to update document");
    }
  });
}
