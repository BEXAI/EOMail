import { storage } from "./storage";
import { extractMeetingData } from "./ai";
import type { Email, InsertCalendarEvent, InsertCalendarParticipant, InsertTimezoneConflict } from "@shared/schema";

/**
 * Full meeting extraction pipeline for a single email.
 * Returns the created CalendarEvent ID if successful, null otherwise.
 */
export async function processMeetingExtraction(
  email: Email,
  userId: string
): Promise<string | null> {
  try {
    const meetingData = await extractMeetingData(
      email.from,
      email.fromEmail,
      email.subject,
      email.body
    );

    if (!meetingData || !meetingData.title) {
      return null;
    }

    let startTime: Date;
    let endTime: Date;
    try {
      startTime = new Date(meetingData.startTime);
      endTime = new Date(meetingData.endTime);
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.warn("[Chrono] Invalid dates extracted, skipping");
        return null;
      }
    } catch {
      console.warn("[Chrono] Failed to parse extracted dates");
      return null;
    }

    const eventData: InsertCalendarEvent = {
      userId,
      emailId: email.id,
      title: meetingData.title,
      description: meetingData.description,
      startTime,
      endTime,
      timezone: meetingData.timezone || "America/New_York",
      location: meetingData.location,
      meetingUrl: meetingData.meetingUrl,
      status: "pending",
      organizerEmail: meetingData.organizerEmail,
      recurrenceRule: meetingData.recurrenceRule,
    };

    const event = await storage.createCalendarEvent(eventData);

    if (meetingData.participants.length > 0) {
      for (const p of meetingData.participants) {
        const participantData: InsertCalendarParticipant = {
          eventId: event.id,
          email: p.email,
          name: p.name,
          status: "pending",
          isOptional: p.isOptional || false,
        };
        await storage.createCalendarParticipant(participantData);
      }
    }

    await detectTimezoneConflicts(event.id, userId, startTime, endTime, meetingData.timezone);

    console.log(`[Chrono] Created calendar event "${meetingData.title}" (${event.id}) from email ${email.id}`);
    return event.id;
  } catch (error) {
    console.error("[Chrono] Meeting extraction pipeline failed:", error);
    return null;
  }
}

/**
 * Check if the event time conflicts with user's availability/working hours.
 */
async function detectTimezoneConflicts(
  eventId: string,
  userId: string,
  startTime: Date,
  endTime: Date,
  eventTimezone: string
): Promise<void> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return;

    const userTimezone = user.timezone || "America/New_York";
    const userWorkStart = user.workingHoursStart || "09:00";
    const userWorkEnd = user.workingHoursEnd || "17:00";

    const eventHour = startTime.getHours();
    const eventEndHour = endTime.getHours();
    const workStartHour = parseInt(userWorkStart.split(":")[0]);
    const workEndHour = parseInt(userWorkEnd.split(":")[0]);

    const conflicts: Array<{ type: string; severity: string; details: string }> = [];

    if (eventHour < workStartHour || eventEndHour > workEndHour) {
      conflicts.push({
        type: "outside_working_hours",
        severity: "medium",
        details: `Meeting at ${startTime.toISOString()} falls outside working hours (${userWorkStart}-${userWorkEnd} ${userTimezone})`,
      });
    }

    if (eventTimezone !== userTimezone) {
      conflicts.push({
        type: "timezone_mismatch",
        severity: "low",
        details: `Event timezone (${eventTimezone}) differs from your timezone (${userTimezone})`,
      });
    }

    const slots = await storage.getAvailabilitySlots(userId);
    if (slots.length > 0) {
      const eventDay = startTime.getDay();
      const daySlots = slots.filter((s) => s.dayOfWeek === eventDay && s.isAvailable);

      if (daySlots.length === 0) {
        conflicts.push({
          type: "no_availability",
          severity: "high",
          details: `No availability slots defined for ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][eventDay]}`,
        });
      }
    }

    for (const conflict of conflicts) {
      const data: InsertTimezoneConflict = {
        eventId,
        userId,
        conflictType: conflict.type,
        severity: conflict.severity,
        details: conflict.details,
        resolved: false,
      };
      await storage.createTimezoneConflict(data);
    }
  } catch (error) {
    console.error("[Chrono] Timezone conflict detection failed:", error);
  }
}
