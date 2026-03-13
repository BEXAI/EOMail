import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { suggestOptimalTime } from "../ai";
import { apiError, aiLimiter } from "./_shared";

const calendarEventUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().max(100).optional(),
  location: z.string().max(500).optional(),
  meetingUrl: z.string().url().max(500).optional().or(z.literal("")),
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
}).strict();

const createCalendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string().max(100).optional(),
  location: z.string().max(500).optional(),
  meetingUrl: z.string().url().max(500).optional(),
  status: z.enum(["pending", "confirmed", "cancelled"]).optional(),
}).strict();

const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format"),
  timezone: z.string().max(100).optional(),
  isAvailable: z.boolean().optional(),
  priority: z.number().int().min(1).max(5).optional(),
});

const timezoneConflictUpdateSchema = z.object({
  resolved: z.boolean().optional(),
  details: z.string().max(500).optional(),
}).strict();

export function registerCalendarRoutes(app: Express): void {
  app.get("/api/calendar/events", requireAuth, async (req, res) => {
    try {
      const start = req.query.start ? new Date(req.query.start as string) : undefined;
      const end = req.query.end ? new Date(req.query.end as string) : undefined;
      const events = await storage.getCalendarEvents(req.user!.id, start, end);
      const eventsWithParticipants = await Promise.all(
        events.map(async (event) => {
          const participants = await storage.getCalendarParticipants(event.id);
          return { ...event, participants };
        })
      );
      res.json(eventsWithParticipants);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  app.get("/api/calendar/events/:id", requireAuth, async (req, res) => {
    try {
      const event = await storage.getCalendarEvent(req.params.id, req.user!.id);
      if (!event) return res.status(404).json({ error: "Event not found" });
      const participants = await storage.getCalendarParticipants(event.id);
      res.json({ ...event, participants });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  app.post("/api/calendar/events", requireAuth, async (req, res) => {
    try {
      const parsed = createCalendarEventSchema.safeParse(req.body);
      if (!parsed.success) return apiError(res, 400, "VALIDATION_ERROR", "Invalid event data");
      const event = await storage.createCalendarEvent({
        userId: req.user!.id,
        title: parsed.data.title,
        description: parsed.data.description,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        timezone: parsed.data.timezone || "America/New_York",
        location: parsed.data.location,
        meetingUrl: parsed.data.meetingUrl,
        status: parsed.data.status || "pending",
      });
      res.status(201).json(event);
    } catch (e) {
      apiError(res, 500, "INTERNAL_ERROR", "Failed to create event");
    }
  });

  app.patch("/api/calendar/events/:id", requireAuth, async (req, res) => {
    try {
      const parsed = calendarEventUpdateSchema.safeParse(req.body);
      if (!parsed.success) return apiError(res, 400, "VALIDATION_ERROR", "Invalid event update");
      const updates: any = { ...parsed.data };
      if (updates.startTime) updates.startTime = new Date(updates.startTime);
      if (updates.endTime) updates.endTime = new Date(updates.endTime);
      const updated = await storage.updateCalendarEvent(req.params.id, req.user!.id, updates);
      if (!updated) return apiError(res, 404, "NOT_FOUND", "Event not found");
      res.json(updated);
    } catch (e) {
      apiError(res, 500, "INTERNAL_ERROR", "Failed to update event");
    }
  });

  app.delete("/api/calendar/events/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteCalendarEvent(req.params.id, req.user!.id);
      if (!deleted) return res.status(404).json({ error: "Event not found" });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  app.get("/api/calendar/availability", requireAuth, async (req, res) => {
    try {
      const slots = await storage.getAvailabilitySlots(req.user!.id);
      res.json(slots);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  app.put("/api/calendar/availability", requireAuth, async (req, res) => {
    try {
      const slotsArray = z.array(availabilitySlotSchema).max(50);
      const parsed = z.object({ slots: slotsArray }).safeParse(req.body);
      if (!parsed.success) return apiError(res, 400, "VALIDATION_ERROR", "Invalid availability slots");
      const userId = req.user!.id;
      const typedSlots = parsed.data.slots.map((s) => ({
        userId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        timezone: s.timezone || "America/New_York",
        isAvailable: s.isAvailable ?? true,
        priority: s.priority,
      }));
      const savedSlots = await storage.setAvailabilitySlots(userId, typedSlots);
      res.json(savedSlots);
    } catch (e) {
      apiError(res, 500, "INTERNAL_ERROR", "Failed to save availability");
    }
  });

  app.get("/api/calendar/conflicts", requireAuth, async (req, res) => {
    try {
      const resolved = req.query.resolved === "true" ? true : req.query.resolved === "false" ? false : undefined;
      const conflicts = await storage.getTimezoneConflicts(req.user!.id, resolved);
      res.json(conflicts);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch conflicts" });
    }
  });

  app.patch("/api/calendar/conflicts/:id", requireAuth, async (req, res) => {
    try {
      const parsed = timezoneConflictUpdateSchema.safeParse(req.body);
      if (!parsed.success) return apiError(res, 400, "VALIDATION_ERROR", "Invalid conflict update");
      const updated = await storage.updateTimezoneConflict(req.params.id, req.user!.id, parsed.data as any);
      if (!updated) return apiError(res, 404, "NOT_FOUND", "Conflict not found");
      res.json(updated);
    } catch (e) {
      apiError(res, 500, "INTERNAL_ERROR", "Failed to update conflict");
    }
  });

  app.post("/api/ai/suggest-time", requireAuth, aiLimiter, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { durationMinutes, participantTimezones, constraints } = req.body;
      const slots = await storage.getAvailabilitySlots(userId);
      const slotsStr = slots.map((s) =>
        `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][s.dayOfWeek]} ${s.startTime}-${s.endTime} (${s.timezone})`
      ).join("\n");

      const result = await suggestOptimalTime(
        slotsStr || "Mon-Fri 09:00-17:00 (America/New_York)",
        durationMinutes || 60,
        participantTimezones || [],
        constraints
      );
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: "Failed to suggest time" });
    }
  });
}
