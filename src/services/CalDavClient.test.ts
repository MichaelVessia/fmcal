import { describe, expect } from "@codeforbreakfast/bun-test-effect";
import { it } from "@codeforbreakfast/bun-test-effect";
import { Effect, Layer, Option } from "effect";

import type { CalendarId, EventId } from "../domain.ts";
import { CreateEventInput, UpdateEventInput } from "../domain.ts";
import {
  CalDavAuthError,
  CalDavError,
  CalendarNotFoundError,
  EventNotFoundError,
} from "../errors.ts";

import {
  CalDavClient,
  type CalDavClientService,
  generateICalEvent,
  generateUid,
  parseICalEvent,
} from "./CalDavClient.ts";

// ============================================================================
// Mock CalDavClient for testing
// ============================================================================

const mockCalendars = [
  {
    id: "work" as CalendarId,
    displayName: "Work",
    description: Option.some("Work calendar"),
    color: Option.some("#0000ff"),
    timezone: Option.some("America/New_York"),
    url: "https://caldav.example.com/work",
  },
  {
    id: "personal" as CalendarId,
    displayName: "Personal",
    description: Option.none(),
    color: Option.none(),
    timezone: Option.none(),
    url: "https://caldav.example.com/personal",
  },
];

const mockEvents = [
  {
    id: "event-1" as EventId,
    calendarId: "work" as CalendarId,
    summary: "Team Meeting",
    description: Option.some("Weekly sync"),
    location: Option.some("Room A"),
    start: new Date("2025-01-15T10:00:00Z"),
    end: new Date("2025-01-15T11:00:00Z"),
    allDay: false,
    recurrenceRule: Option.none(),
    url: "https://caldav.example.com/work/event-1.ics",
    etag: Option.some('"abc123"'),
  },
  {
    id: "event-2" as EventId,
    calendarId: "work" as CalendarId,
    summary: "Lunch",
    description: Option.none(),
    location: Option.none(),
    start: new Date("2025-01-15T12:00:00Z"),
    end: new Date("2025-01-15T13:00:00Z"),
    allDay: false,
    recurrenceRule: Option.none(),
    url: "https://caldav.example.com/work/event-2.ics",
    etag: Option.none(),
  },
];

function createMockService(options?: {
  failAuth?: boolean;
  failFetch?: boolean;
}): CalDavClientService {
  return {
    fetchCalendars: options?.failAuth
      ? Effect.fail(new CalDavAuthError({ message: "Auth failed" }))
      : options?.failFetch
        ? Effect.fail(new CalDavError({ message: "Fetch failed" }))
        : Effect.succeed(mockCalendars),

    fetchEvents: ({ calendarId }) => {
      if (options?.failAuth) {
        return Effect.fail(new CalDavAuthError({ message: "Auth failed" }));
      }
      const calendar = mockCalendars.find((c) => c.id === calendarId);
      if (!calendar) {
        return Effect.fail(new CalendarNotFoundError({ calendarId }));
      }
      return Effect.succeed(mockEvents.filter((e) => e.calendarId === calendarId));
    },

    fetchEvent: ({ calendarId, eventId }) => {
      if (options?.failAuth) {
        return Effect.fail(new CalDavAuthError({ message: "Auth failed" }));
      }
      const calendar = mockCalendars.find((c) => c.id === calendarId);
      if (!calendar) {
        return Effect.fail(new CalendarNotFoundError({ calendarId }));
      }
      const event = mockEvents.find((e) => e.calendarId === calendarId && e.id === eventId);
      if (!event) {
        return Effect.fail(new EventNotFoundError({ calendarId, eventId }));
      }
      return Effect.succeed(event);
    },

    createEvent: ({ calendarId, input }) => {
      if (options?.failAuth) {
        return Effect.fail(new CalDavAuthError({ message: "Auth failed" }));
      }
      const calendar = mockCalendars.find((c) => c.id === calendarId);
      if (!calendar) {
        return Effect.fail(new CalendarNotFoundError({ calendarId }));
      }
      return Effect.succeed({
        id: "new-event" as EventId,
        calendarId,
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: input.start,
        end: input.end,
        allDay: input.allDay ?? false,
        recurrenceRule: input.recurrenceRule,
        url: `https://caldav.example.com/${calendarId}/new-event.ics`,
        etag: Option.none(),
      });
    },

    updateEvent: ({ calendarId, eventId, input }) => {
      if (options?.failAuth) {
        return Effect.fail(new CalDavAuthError({ message: "Auth failed" }));
      }
      const calendar = mockCalendars.find((c) => c.id === calendarId);
      if (!calendar) {
        return Effect.fail(new CalendarNotFoundError({ calendarId }));
      }
      const event = mockEvents.find((e) => e.calendarId === calendarId && e.id === eventId);
      if (!event) {
        return Effect.fail(new EventNotFoundError({ calendarId, eventId }));
      }
      return Effect.succeed({
        ...event,
        summary: Option.getOrElse(input.summary, () => event.summary),
        description: Option.isSome(input.description) ? input.description : event.description,
        location: Option.isSome(input.location) ? input.location : event.location,
        start: Option.getOrElse(input.start, () => event.start),
        end: Option.getOrElse(input.end, () => event.end),
        allDay: Option.getOrElse(input.allDay, () => event.allDay),
      });
    },

    deleteEvent: ({ calendarId, eventId }) => {
      if (options?.failAuth) {
        return Effect.fail(new CalDavAuthError({ message: "Auth failed" }));
      }
      const calendar = mockCalendars.find((c) => c.id === calendarId);
      if (!calendar) {
        return Effect.fail(new CalendarNotFoundError({ calendarId }));
      }
      const event = mockEvents.find((e) => e.calendarId === calendarId && e.id === eventId);
      if (!event) {
        return Effect.fail(new EventNotFoundError({ calendarId, eventId }));
      }
      return Effect.void;
    },

    freeBusy: ({ calendarIds }) => {
      if (options?.failAuth) {
        return Effect.fail(new CalDavAuthError({ message: "Auth failed" }));
      }
      const results = [];
      for (const calendarId of calendarIds) {
        const calendar = mockCalendars.find((c) => c.id === calendarId);
        if (!calendar) {
          return Effect.fail(new CalendarNotFoundError({ calendarId }));
        }
        const events = mockEvents.filter((e) => e.calendarId === calendarId);
        results.push({
          calendarId,
          slots: events.map((e) => ({
            start: e.start,
            end: e.end,
            type: "busy" as const,
          })),
        });
      }
      return Effect.succeed(results);
    },
  };
}

const MockCalDavClientLayer = Layer.succeed(CalDavClient, createMockService());
const MockCalDavClientAuthFailLayer = Layer.succeed(
  CalDavClient,
  createMockService({ failAuth: true }),
);

describe("CalDavClient Service", () => {
  describe("fetchCalendars", () => {
    it.effect("returns list of calendars", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const calendars = yield* client.fetchCalendars;

        expect(calendars).toHaveLength(2);
        expect(calendars[0].id as string).toBe("work");
        expect(calendars[0].displayName).toBe("Work");
        expect(calendars[1].id as string).toBe("personal");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );

    it.effect("fails with CalDavAuthError on auth failure", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const exit = yield* Effect.exit(client.fetchCalendars);

        expect(exit._tag).toBe("Failure");
        if (exit._tag === "Failure") {
          const error = exit.cause;
          expect(error._tag).toBe("Fail");
        }
      }).pipe(Effect.provide(MockCalDavClientAuthFailLayer)),
    );
  });

  describe("fetchEvents", () => {
    it.effect("returns events for a calendar", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const events = yield* client.fetchEvents({
          calendarId: "work" as CalendarId,
        });

        expect(events).toHaveLength(2);
        expect(events[0].summary).toBe("Team Meeting");
        expect(events[1].summary).toBe("Lunch");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );

    it.effect("returns empty array for calendar with no events", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const events = yield* client.fetchEvents({
          calendarId: "personal" as CalendarId,
        });

        expect(events).toHaveLength(0);
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );

    it.effect("fails with CalendarNotFoundError for unknown calendar", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const exit = yield* Effect.exit(
          client.fetchEvents({ calendarId: "unknown" as CalendarId }),
        );

        expect(exit._tag).toBe("Failure");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );
  });

  describe("fetchEvent", () => {
    it.effect("returns a specific event", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const event = yield* client.fetchEvent({
          calendarId: "work" as CalendarId,
          eventId: "event-1" as EventId,
        });

        expect(event.summary).toBe("Team Meeting");
        expect(Option.getOrNull(event.description)).toBe("Weekly sync");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );

    it.effect("fails with EventNotFoundError for unknown event", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const exit = yield* Effect.exit(
          client.fetchEvent({
            calendarId: "work" as CalendarId,
            eventId: "unknown" as EventId,
          }),
        );

        expect(exit._tag).toBe("Failure");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );

    it.effect("fails with CalendarNotFoundError for unknown calendar", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const exit = yield* Effect.exit(
          client.fetchEvent({
            calendarId: "unknown" as CalendarId,
            eventId: "event-1" as EventId,
          }),
        );

        expect(exit._tag).toBe("Failure");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );
  });

  describe("createEvent", () => {
    it.effect("creates a new event", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const input = new CreateEventInput({
          summary: "New Meeting",
          start: new Date("2025-01-20T14:00:00Z"),
          end: new Date("2025-01-20T15:00:00Z"),
          description: Option.some("A new meeting"),
          location: Option.some("Room B"),
          recurrenceRule: Option.none(),
        });

        const event = yield* client.createEvent({
          calendarId: "work" as CalendarId,
          input,
        });

        expect(event.summary).toBe("New Meeting");
        expect(Option.getOrNull(event.description)).toBe("A new meeting");
        expect(Option.getOrNull(event.location)).toBe("Room B");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );

    it.effect("fails with CalendarNotFoundError for unknown calendar", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const input = new CreateEventInput({
          summary: "Test",
          start: new Date(),
          end: new Date(),
          description: Option.none(),
          location: Option.none(),
          recurrenceRule: Option.none(),
        });

        const exit = yield* Effect.exit(
          client.createEvent({
            calendarId: "unknown" as CalendarId,
            input,
          }),
        );

        expect(exit._tag).toBe("Failure");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );
  });

  describe("updateEvent", () => {
    it.effect("updates an existing event", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const input = new UpdateEventInput({
          summary: Option.some("Updated Meeting"),
          start: Option.none(),
          end: Option.none(),
          description: Option.some("Updated description"),
          location: Option.none(),
          allDay: Option.none(),
          recurrenceRule: Option.none(),
        });

        const event = yield* client.updateEvent({
          calendarId: "work" as CalendarId,
          eventId: "event-1" as EventId,
          input,
        });

        expect(event.summary).toBe("Updated Meeting");
        expect(Option.getOrNull(event.description)).toBe("Updated description");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );

    it.effect("fails with EventNotFoundError for unknown event", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const input = new UpdateEventInput({
          summary: Option.some("Test"),
          start: Option.none(),
          end: Option.none(),
          description: Option.none(),
          location: Option.none(),
          allDay: Option.none(),
          recurrenceRule: Option.none(),
        });

        const exit = yield* Effect.exit(
          client.updateEvent({
            calendarId: "work" as CalendarId,
            eventId: "unknown" as EventId,
            input,
          }),
        );

        expect(exit._tag).toBe("Failure");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );
  });

  describe("deleteEvent", () => {
    it.effect("deletes an existing event", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const result = yield* client.deleteEvent({
          calendarId: "work" as CalendarId,
          eventId: "event-1" as EventId,
        });

        expect(result).toBeUndefined();
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );

    it.effect("fails with EventNotFoundError for unknown event", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const exit = yield* Effect.exit(
          client.deleteEvent({
            calendarId: "work" as CalendarId,
            eventId: "unknown" as EventId,
          }),
        );

        expect(exit._tag).toBe("Failure");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );

    it.effect("fails with CalendarNotFoundError for unknown calendar", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const exit = yield* Effect.exit(
          client.deleteEvent({
            calendarId: "unknown" as CalendarId,
            eventId: "event-1" as EventId,
          }),
        );

        expect(exit._tag).toBe("Failure");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );
  });

  describe("freeBusy", () => {
    it.effect("returns free/busy slots for calendars", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const results = yield* client.freeBusy({
          calendarIds: ["work" as CalendarId],
          from: new Date("2025-01-15T00:00:00Z"),
          to: new Date("2025-01-16T00:00:00Z"),
        });

        expect(results).toHaveLength(1);
        expect(results[0].calendarId as string).toBe("work");
        expect(results[0].slots).toHaveLength(2);
        expect(results[0].slots[0].type).toBe("busy");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );

    it.effect("returns results for multiple calendars", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const results = yield* client.freeBusy({
          calendarIds: ["work" as CalendarId, "personal" as CalendarId],
          from: new Date("2025-01-15T00:00:00Z"),
          to: new Date("2025-01-16T00:00:00Z"),
        });

        expect(results).toHaveLength(2);
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );

    it.effect("fails with CalendarNotFoundError for unknown calendar", () =>
      Effect.gen(function* () {
        const client = yield* CalDavClient;
        const exit = yield* Effect.exit(
          client.freeBusy({
            calendarIds: ["unknown" as CalendarId],
            from: new Date(),
            to: new Date(),
          }),
        );

        expect(exit._tag).toBe("Failure");
      }).pipe(Effect.provide(MockCalDavClientLayer)),
    );
  });
});

// ============================================================================
// iCal Helper Tests
// ============================================================================

describe("iCal Helpers", () => {
  describe("generateUid", () => {
    it("generates a unique ID", () =>
      Effect.gen(function* () {
        const uid1 = yield* generateUid;
        const uid2 = yield* generateUid;

        expect(uid1).not.toBe(uid2);
        expect(uid1).toContain("@fmcal");
        expect(uid2).toContain("@fmcal");
      }).pipe(Effect.runPromise));

    it("generates valid UUID format", () =>
      Effect.gen(function* () {
        const uid = yield* generateUid;
        const uuidPart = uid.split("@")[0];

        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        expect(uuidPart).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        );
      }).pipe(Effect.runPromise));
  });

  describe("generateICalEvent", () => {
    it("generates valid iCal string for basic event", () => {
      const input = new CreateEventInput({
        summary: "Test Event",
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        description: Option.none(),
        location: Option.none(),
        recurrenceRule: Option.none(),
      });

      const ical = generateICalEvent(input, "test-uid@fmcal");

      expect(ical).toContain("BEGIN:VCALENDAR");
      expect(ical).toContain("END:VCALENDAR");
      expect(ical).toContain("BEGIN:VEVENT");
      expect(ical).toContain("END:VEVENT");
      expect(ical).toContain("UID:test-uid@fmcal");
      expect(ical).toContain("SUMMARY:Test Event");
    });

    it("includes description when provided", () => {
      const input = new CreateEventInput({
        summary: "Event with Description",
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        description: Option.some("This is a description"),
        location: Option.none(),
        recurrenceRule: Option.none(),
      });

      const ical = generateICalEvent(input, "test-uid@fmcal");

      expect(ical).toContain("DESCRIPTION:This is a description");
    });

    it("includes location when provided", () => {
      const input = new CreateEventInput({
        summary: "Event with Location",
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        description: Option.none(),
        location: Option.some("Conference Room A"),
        recurrenceRule: Option.none(),
      });

      const ical = generateICalEvent(input, "test-uid@fmcal");

      expect(ical).toContain("LOCATION:Conference Room A");
    });

    it("handles all-day events", () => {
      const input = new CreateEventInput({
        summary: "All Day Event",
        start: new Date("2025-01-15"),
        end: new Date("2025-01-16"),
        description: Option.none(),
        location: Option.none(),
        allDay: true,
        recurrenceRule: Option.none(),
      });

      const ical = generateICalEvent(input, "test-uid@fmcal");

      expect(ical).toContain("SUMMARY:All Day Event");
      // All-day events should have DATE (not DATE-TIME) values
      expect(ical).toContain("DTSTART;VALUE=DATE:");
    });

    it("includes recurrence rule when provided", () => {
      const input = new CreateEventInput({
        summary: "Recurring Event",
        start: new Date("2025-01-15T10:00:00Z"),
        end: new Date("2025-01-15T11:00:00Z"),
        description: Option.none(),
        location: Option.none(),
        recurrenceRule: Option.some("FREQ=WEEKLY;BYDAY=MO"),
      });

      const ical = generateICalEvent(input, "test-uid@fmcal");

      expect(ical).toContain("RRULE:");
    });
  });

  describe("parseICalEvent", () => {
    const sampleIcal = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//fmcal//EN
BEGIN:VEVENT
UID:test-event-123@fmcal
DTSTAMP:20250115T100000Z
DTSTART:20250115T100000Z
DTEND:20250115T110000Z
SUMMARY:Parsed Event
DESCRIPTION:Event description
LOCATION:Room B
END:VEVENT
END:VCALENDAR`;

    it("parses a valid iCal string", () => {
      const result = parseICalEvent(
        sampleIcal,
        "work" as CalendarId,
        "https://example.com/event.ics",
        '"etag123"',
      );

      expect(Option.isSome(result)).toBe(true);
      const event = Option.getOrThrow(result);
      expect(event.id as string).toBe("test-event-123@fmcal");
      expect(event.summary).toBe("Parsed Event");
      expect(Option.getOrNull(event.description)).toBe("Event description");
      expect(Option.getOrNull(event.location)).toBe("Room B");
      expect(Option.getOrNull(event.etag)).toBe('"etag123"');
    });

    it("returns None for invalid iCal string", () => {
      const result = parseICalEvent(
        "not valid ical",
        "work" as CalendarId,
        "https://example.com/event.ics",
        undefined,
      );

      expect(Option.isNone(result)).toBe(true);
    });

    it("returns None for iCal without VEVENT", () => {
      const noEvent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//fmcal//EN
END:VCALENDAR`;

      const result = parseICalEvent(
        noEvent,
        "work" as CalendarId,
        "https://example.com/event.ics",
        undefined,
      );

      expect(Option.isNone(result)).toBe(true);
    });

    it("handles missing optional fields", () => {
      const minimalIcal = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:minimal@fmcal
DTSTART:20250115T100000Z
DTEND:20250115T110000Z
SUMMARY:Minimal Event
END:VEVENT
END:VCALENDAR`;

      const result = parseICalEvent(
        minimalIcal,
        "personal" as CalendarId,
        "https://example.com/minimal.ics",
        undefined,
      );

      expect(Option.isSome(result)).toBe(true);
      const event = Option.getOrThrow(result);
      expect(event.summary).toBe("Minimal Event");
      expect(Option.isNone(event.description)).toBe(true);
      expect(Option.isNone(event.location)).toBe(true);
      expect(Option.isNone(event.etag)).toBe(true);
    });

    it("parses all-day events correctly", () => {
      const allDayIcal = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:allday@fmcal
DTSTART;VALUE=DATE:20250115
DTEND;VALUE=DATE:20250116
SUMMARY:All Day
END:VEVENT
END:VCALENDAR`;

      const result = parseICalEvent(
        allDayIcal,
        "work" as CalendarId,
        "https://example.com/allday.ics",
        undefined,
      );

      expect(Option.isSome(result)).toBe(true);
      const event = Option.getOrThrow(result);
      expect(event.allDay).toBe(true);
    });
  });
});
