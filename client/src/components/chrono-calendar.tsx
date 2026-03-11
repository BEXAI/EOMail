import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CalendarEvent, CalendarParticipant, TimezoneConflict, AvailabilitySlot } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { DEMO_CALENDAR_EVENTS, DEMO_TIMEZONE_CONFLICTS } from "@/lib/demo-data";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChronoCalendarProps {
  isDemo?: boolean;
}

export function ChronoCalendar({ isDemo }: ChronoCalendarProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: liveEvents = [], isLoading: eventsLoading } = useQuery<(CalendarEvent & { participants?: CalendarParticipant[] })[]>({
    queryKey: ["/api/calendar/events"],
    enabled: !isDemo,
  });

  const { data: liveConflicts = [] } = useQuery<TimezoneConflict[]>({
    queryKey: ["/api/calendar/conflicts"],
    enabled: !isDemo,
  });

  const events = isDemo ? DEMO_CALENDAR_EVENTS : liveEvents;
  const conflicts = isDemo ? DEMO_TIMEZONE_CONFLICTS : liveConflicts;
  const unresolvedConflicts = conflicts.filter((c) => !c.resolved);

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/calendar/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Event deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete event", description: "Please try again.", variant: "destructive" });
    },
  });

  const resolveConflictMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/calendar/conflicts/${id}`, { resolved: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/conflicts"] });
      toast({ title: "Conflict resolved" });
    },
    onError: () => {
      toast({ title: "Failed to resolve conflict", description: "Please try again.", variant: "destructive" });
    },
  });

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
          {unresolvedConflicts.length > 0 && (
            <Badge className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              {unresolvedConflicts.length} conflict{unresolvedConflicts.length > 1 ? "s" : ""}
            </Badge>
          )}
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
                  isDeleting={deleteEventMutation.isPending}
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
                  isResolving={resolveConflictMutation.isPending}
                  isDemo={isDemo}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EventCard({
  event,
  onDelete,
  isDeleting,
  isDemo,
}: {
  event: CalendarEvent & { participants?: CalendarParticipant[] };
  onDelete: () => void;
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
          <div className="ml-auto">
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
