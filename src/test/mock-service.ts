import { Effect, Layer, Option } from "effect";

import type { CalendarId, EventId } from "../domain.ts";
import { CalDavClient, type CalDavClientService } from "../services/CalDavClient.ts";

export const mockCalendars = [
  {
    id: "work" as CalendarId,
    displayName: "Work",
    description: Option.some("Work calendar"),
    color: Option.some("#0000ff"),
    timezone: Option.some("America/New_York"),
    url: "https://caldav.example.com/work",
    readOnly: false,
  },
  {
    id: "personal" as CalendarId,
    displayName: "Personal",
    description: Option.none(),
    color: Option.none(),
    timezone: Option.none(),
    url: "https://caldav.example.com/personal",
    readOnly: false,
  },
];

export const mockEvent = {
  id: "evt-1" as EventId,
  calendarId: "work" as CalendarId,
  summary: "Team standup",
  description: Option.some("Daily standup meeting"),
  location: Option.some("Room 42"),
  start: new Date("2026-03-01T09:00:00Z"),
  end: new Date("2026-03-01T09:30:00Z"),
  allDay: false,
  recurrenceRule: Option.none(),
  url: "https://caldav.example.com/work/evt-1.ics",
  etag: Option.some('"abc123"'),
};

export const mockFreeBusyResult = {
  calendarId: "work" as CalendarId,
  slots: [
    {
      start: new Date("2026-03-01T09:00:00Z"),
      end: new Date("2026-03-01T10:00:00Z"),
      type: "busy" as const,
    },
  ],
};

export const mockService: CalDavClientService = {
  fetchCalendars: Effect.succeed(mockCalendars),
  fetchEvents: () => Effect.succeed([mockEvent]),
  fetchEvent: () => Effect.succeed(mockEvent),
  createEvent: () => Effect.succeed(mockEvent),
  updateEvent: () => Effect.succeed(mockEvent),
  deleteEvent: () => Effect.void,
  freeBusy: () => Effect.succeed([mockFreeBusyResult]),
};

export const MockLayer = Layer.succeed(CalDavClient, mockService);
