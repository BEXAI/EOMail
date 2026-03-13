import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CalendarEvent, CalendarParticipant, TimezoneConflict, AvailabilitySlot } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useDemoData } from "@/hooks/use-demo-data";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  AlertTriangle,
  Check,
  Trash2,
  Loader2,
  CalendarX,
  Sparkles,
  Plus,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChronoCalendarProps {
  isDemo?: boolean;
}

export function ChronoCalendar({ isDemo }: ChronoCalendarProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const demoData = useDemoData(isDemo);

  const { data: liveEvents = [], isLoading: eventsLoading } = useQuery<(CalendarEvent & { participants?: CalendarParticipant[] })[]>({
    queryKey: ["/api/calendar/events"],
    enabled: !isDemo,
  });

  const { data: liveConflicts = [] } = useQuery<TimezoneConflict[]>({
    queryKey: ["/api/calendar/conflicts"],
    enabled: !isDemo,
  });

  const events = isDemo ? (demoData?.DEMO_CALENDAR_EVENTS ?? []) : liveEvents;
  const conflicts = isDemo ? (demoData?.DEMO_TIMEZONE_CONFLICTS ?? []) : liveConflicts;
  const unresolvedConflicts = conflicts.filter((c) => !c.resolved);

  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<(CalendarEvent & { participants?: CalendarParticipant[] }) | null>(null);
  const [eventForm, setEventForm] = useState({ title: "", description: "", startTime: "", endTime: "", location: "", meetingUrl: "" });
  const [suggestions, setSuggestions] = useState<{ startTime: string; endTime: string; score: number; reason: string }[] | null>(null);

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/calendar/events/${id}`);
    },
    onMutate: (id) => { setDeletingEventId(id); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete event", description: "Please try again.", variant: "destructive" });
    },
    onSettled: () => { setDeletingEventId(null); },
  });

  const resolveConflictMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/calendar/conflicts/${id}`, { resolved: true });
    },
    onMutate: (id) => { setResolvingConflictId(id); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/conflicts"] });
      toast({ title: "Conflict resolved" });
    },
    onError: () => {
      toast({ title: "Failed to resolve conflict", description: "Please try again.", variant: "destructive" });
    },
    onSettled: () => { setResolvingConflictId(null); },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: typeof eventForm) => {
      const res = await apiRequest("POST", "/api/calendar/events", {
        title: data.title,
        description: data.description || undefined,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        location: data.location || undefined,
        meetingUrl: data.meetingUrl || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      setShowEventDialog(false);
      setEventForm({ title: "", description: "", startTime: "", endTime: "", location: "", meetingUrl: "" });
      toast({ title: "Event created" });
    },
    onError: () => {
      toast({ title: "Failed to create event", variant: "destructive" });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof eventForm }) => {
      const res = await apiRequest("PATCH", `/api/calendar/events/${id}`, {
        title: data.title,
        description: data.description || undefined,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        location: data.location || undefined,
        meetingUrl: data.meetingUrl || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      setShowEventDialog(false);
      setEditingEvent(null);
      setEventForm({ title: "", description: "", startTime: "", endTime: "", location: "", meetingUrl: "" });
      toast({ title: "Event updated" });
    },
    onError: () => {
      toast({ title: "Failed to update event", variant: "destructive" });
    },
  });

  const suggestTimeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/suggest-time", {
        durationMinutes: 60,
        participantTimezones: [],
      });
      return res.json() as Promise<{ suggestions: { startTime: string; endTime: string; score: number; reason: string }[] }>;
    },
    onSuccess: (data) => {
      setSuggestions(data.suggestions || []);
      toast({ title: "Time suggestions ready" });
    },
    onError: () => {
      toast({ title: "Failed to suggest times", variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setEditingEvent(null);
    setEventForm({ title: "", description: "", startTime: "", endTime: "", location: "", meetingUrl: "" });
    setShowEventDialog(true);
  };

  const openEditDialog = (event: CalendarEvent & { participants?: CalendarParticipant[] }) => {
    setEditingEvent(event);
    const toLocal = (d: Date | string) => {
      const dt = new Date(d);
      return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    setEventForm({
      title: event.title,
      description: event.description || "",
      startTime: toLocal(event.startTime),
      endTime: toLocal(event.endTime),
      location: event.location || "",
      meetingUrl: event.meetingUrl || "",
    });
    setShowEventDialog(true);
  };

  const handleEventSubmit = () => {
    if (!eventForm.title || !eventForm.startTime || !eventForm.endTime) return;
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data: eventForm });
    } else {
      createEventMutation.mutate(eventForm);
    }
  };

  if (eventsLoading) {
    return (
      <div className="flex flex-col h-full p-6 gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 md:px-6 pt-6 pb-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Calendar</h1>
            <p className="text-xs text-muted-foreground">Meetings extracted from your emails</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {unresolvedConflicts.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                {unresolvedConflicts.length} conflict{unresolvedConflicts.length > 1 ? "s" : ""}
              </Badge>
            )}
            {!isDemo && (
              <>
                <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => suggestTimeMutation.mutate()} disabled={suggestTimeMutation.isPending}>
                  {suggestTimeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Suggest Time
                </Button>
                <Button size="sm" className="gap-1 text-xs h-7" onClick={openCreateDialog}>
                  <Plus className="w-3 h-3" />
                  Event
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <Tabs defaultValue="events" className="flex flex-col h-full">
          <div className="px-6 pt-3 shrink-0">
            <TabsList className="w-full">
              <TabsTrigger value="events" className="flex-1 text-xs">
                Upcoming Events ({sortedEvents.length})
              </TabsTrigger>
              <TabsTrigger value="conflicts" className="flex-1 text-xs">
                Conflicts ({unresolvedConflicts.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="events" className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3 mt-0 transition-all duration-200">
            {suggestions && suggestions.length > 0 && (
              <Card className="border-blue-200 dark:border-blue-900 mb-3">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">AI Suggested Times</p>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setSuggestions(null)}>Dismiss</Button>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/50">
                        <div>
                          <p className="font-medium text-foreground">{new Date(s.startTime).toLocaleString()} — {new Date(s.endTime).toLocaleTimeString()}</p>
                          <p className="text-muted-foreground">{s.reason}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">Score: {s.score}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {sortedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarX className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No upcoming events</p>
                <p className="text-xs text-muted-foreground max-w-xs">Chrono Logistics automatically extracts meetings and calendar events from your emails. Events will appear here once detected.</p>
              </div>
            ) : (
              sortedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onDelete={() => deleteEventMutation.mutate(event.id)}
                  onEdit={() => openEditDialog(event)}
                  isDeleting={deletingEventId === event.id}
                  isDemo={isDemo}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="conflicts" className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3 mt-0 transition-all duration-200">
            {unresolvedConflicts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Check className="w-12 h-12 text-green-500/40 mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No scheduling conflicts</p>
                <p className="text-xs text-muted-foreground max-w-xs">Chrono Logistics monitors timezone differences and scheduling overlaps across your meetings. Conflicts will appear here.</p>
              </div>
            ) : (
              unresolvedConflicts.map((conflict) => (
                <ConflictCard
                  key={conflict.id}
                  conflict={conflict}
                  onResolve={() => resolveConflictMutation.mutate(conflict.id)}
                  isResolving={resolvingConflictId === conflict.id}
                  isDemo={isDemo}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="event-title">Title</Label>
              <Input id="event-title" value={eventForm.title} onChange={(e) => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Meeting title" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="event-desc">Description</Label>
              <Input id="event-desc" value={eventForm.description} onChange={(e) => setEventForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="event-start">Start</Label>
                <Input id="event-start" type="datetime-local" value={eventForm.startTime} onChange={(e) => setEventForm(f => ({ ...f, startTime: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="event-end">End</Label>
                <Input id="event-end" type="datetime-local" value={eventForm.endTime} onChange={(e) => setEventForm(f => ({ ...f, endTime: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="event-location">Location</Label>
              <Input id="event-location" value={eventForm.location} onChange={(e) => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="Office, Room 301" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="event-url">Meeting URL</Label>
              <Input id="event-url" value={eventForm.meetingUrl} onChange={(e) => setEventForm(f => ({ ...f, meetingUrl: e.target.value }))} placeholder="https://meet.google.com/..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>Cancel</Button>
            <Button onClick={handleEventSubmit} disabled={!eventForm.title || !eventForm.startTime || !eventForm.endTime || createEventMutation.isPending || updateEventMutation.isPending}>
              {(createEventMutation.isPending || updateEventMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {editingEvent ? "Save Changes" : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({
  event,
  onDelete,
  onEdit,
  isDeleting,
  isDemo,
}: {
  event: CalendarEvent & { participants?: CalendarParticipant[] };
  onDelete: () => void;
  onEdit: () => void;
  isDeleting: boolean;
  isDemo?: boolean;
}) {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  let countdown = "";
  if (diffMs < 0) {
    countdown = "Past";
  } else if (diffDays > 0) {
    countdown = `in ${diffDays}d`;
  } else if (diffHours > 0) {
    countdown = `in ${diffHours}h`;
  } else {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    countdown = diffMins > 0 ? `in ${diffMins}m` : "Now";
  }

  const participants = event.participants || [];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-semibold text-sm text-foreground">{event.title}</p>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{event.description}</p>
            )}
          </div>
          <Badge
            className={cn(
              "text-[10px] font-bold shrink-0",
              diffMs < 0
                ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                : diffHours < 24
                  ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                  : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
            )}
            variant="secondary"
          >
            {countdown}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{" "}
              {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} —{" "}
              {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{event.location}</span>
            </div>
          )}
          {event.meetingUrl && (
            <div className="flex items-center gap-1">
              <Video className="w-3 h-3" />
              <span>Video call</span>
            </div>
          )}
        </div>

        {participants.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-3 h-3 text-muted-foreground" />
            <div className="flex items-center gap-1 flex-wrap">
              {participants.map((p) => (
                <Badge
                  key={p.id}
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    p.isOptional && "border-dashed"
                  )}
                >
                  {p.name || p.email}
                  {p.status === "accepted" && <Check className="w-2.5 h-2.5 ml-0.5 text-green-500" />}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Badge variant="outline" className="text-[10px] capitalize">{event.status}</Badge>
          <div className="ml-auto flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs text-muted-foreground h-7"
              onClick={onEdit}
              disabled={isDemo}
              aria-label="Edit calendar event"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-xs text-muted-foreground h-7"
              onClick={onDelete}
              disabled={isDeleting || isDemo}
              aria-label="Remove calendar event"
            >
              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Remove
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConflictCard({
  conflict,
  onResolve,
  isResolving,
  isDemo,
}: {
  conflict: TimezoneConflict;
  onResolve: () => void;
  isResolving: boolean;
  isDemo?: boolean;
}) {
  const severityColors: Record<string, string> = {
    high: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  };

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={cn("text-[10px] font-bold uppercase", severityColors[conflict.severity])} variant="secondary">
                {conflict.severity}
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">
                {conflict.conflictType.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm text-foreground/80 mb-3">{conflict.details}</p>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs h-7"
              onClick={onResolve}
              disabled={isResolving || isDemo}
              aria-label="Mark conflict as resolved"
            >
              {isResolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Mark Resolved
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
