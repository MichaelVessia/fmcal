import { describe, expect, it } from "@codeforbreakfast/bun-test-effect";
import { Option, Schema } from "effect";

import {
  Calendar,
  CalendarEvent,
  CalendarId,
  CreateEventInput,
  EventId,
  FreeBusyResult,
  FreeBusySlot,
  UpdateEventInput,
} from "./domain.ts";

describe("Domain Models", () => {
  describe("CalendarId", () => {
    it("creates a branded CalendarId from string", () => {
      const id = Schema.decodeSync(CalendarId)("my-calendar");

      expect(id as string).toBe("my-calendar");
    });

    it("rejects non-string values", () => {
      expect(() => Schema.decodeSync(CalendarId)(123 as unknown as string)).toThrow();
    });
  });

  describe("EventId", () => {
    it("creates a branded EventId from string", () => {
      const id = Schema.decodeSync(EventId)("event-123");

      expect(id as string).toBe("event-123");
    });

    it("rejects non-string values", () => {
      expect(() => Schema.decodeSync(EventId)(null as unknown as string)).toThrow();
    });
  });

  describe("Calendar", () => {
    it("creates a Calendar with all fields", () => {
      const calendar = new Calendar({
        id: "work" as CalendarId,
        displayName: "Work Calendar",
        description: Option.some("My work calendar"),
        color: Option.some("#ff0000"),
        timezone: Option.some("America/New_York"),
        url: "https://caldav.example.com/calendars/work",
        readOnly: false,
      });

      expect(calendar.id as string).toBe("work");
      expect(calendar.displayName).toBe("Work Calendar");
      expect(Option.getOrNull(calendar.description)).toBe("My work calendar");
      expect(Option.getOrNull(calendar.color)).toBe("#ff0000");
      expect(Option.getOrNull(calendar.timezone)).toBe("America/New_York");
      expect(calendar.url).toBe("https://caldav.example.com/calendars/work");
      expect(calendar.readOnly).toBe(false);
    });

    it("creates a Calendar with optional fields as None", () => {
      const calendar = new Calendar({
        id: "personal" as CalendarId,
        displayName: "Personal",
        description: Option.none(),
        color: Option.none(),
        timezone: Option.none(),
        url: "https://caldav.example.com/calendars/personal",
        readOnly: false,
      });

      expect(Option.isNone(calendar.description)).toBe(true);
      expect(Option.isNone(calendar.color)).toBe(true);
      expect(Option.isNone(calendar.timezone)).toBe(true);
    });

    it("creates a read-only Calendar", () => {
      const calendar = new Calendar({
        id: "subscribed" as CalendarId,
        displayName: "Holidays",
        description: Option.some("Public holidays"),
        color: Option.none(),
        timezone: Option.none(),
        url: "https://caldav.example.com/calendars/holidays",
        readOnly: true,
      });

      expect(calendar.readOnly).toBe(true);
    });
  });

  describe("CalendarEvent", () => {
    const baseDate = new Date("2025-01-15T10:00:00Z");
    const endDate = new Date("2025-01-15T11:00:00Z");

    it("creates a CalendarEvent with all fields", () => {
      const event = new CalendarEvent({
        id: "event-1" as EventId,
        calendarId: "work" as CalendarId,
        summary: "Team Meeting",
        description: Option.some("Weekly sync"),
        location: Option.some("Conference Room A"),
        start: baseDate,
        end: endDate,
        allDay: false,
        recurrenceRule: Option.some("FREQ=WEEKLY;BYDAY=MO"),
        url: "https://caldav.example.com/events/event-1.ics",
        etag: Option.some('"abc123"'),
      });

      expect(event.id as string).toBe("event-1");
      expect(event.calendarId as string).toBe("work");
      expect(event.summary).toBe("Team Meeting");
      expect(Option.getOrNull(event.description)).toBe("Weekly sync");
      expect(Option.getOrNull(event.location)).toBe("Conference Room A");
      expect(event.start).toEqual(baseDate);
      expect(event.end).toEqual(endDate);
      expect(event.allDay).toBe(false);
      expect(Option.getOrNull(event.recurrenceRule)).toBe("FREQ=WEEKLY;BYDAY=MO");
      expect(Option.getOrNull(event.etag)).toBe('"abc123"');
    });

    it("creates an all-day event", () => {
      const event = new CalendarEvent({
        id: "holiday" as EventId,
        calendarId: "personal" as CalendarId,
        summary: "Holiday",
        description: Option.none(),
        location: Option.none(),
        start: new Date("2025-12-25"),
        end: new Date("2025-12-26"),
        allDay: true,
        recurrenceRule: Option.none(),
        url: "https://caldav.example.com/events/holiday.ics",
        etag: Option.none(),
      });

      expect(event.allDay).toBe(true);
      expect(Option.isNone(event.description)).toBe(true);
      expect(Option.isNone(event.location)).toBe(true);
    });
  });

  describe("FreeBusySlot", () => {
    it("creates a busy slot", () => {
      const start = new Date("2025-01-15T09:00:00Z");
      const end = new Date("2025-01-15T10:00:00Z");

      const slot = new FreeBusySlot({
        start,
        end,
        type: "busy",
      });

      expect(slot.type).toBe("busy");
      expect(slot.start).toEqual(start);
      expect(slot.end).toEqual(end);
    });

    it("creates a free slot", () => {
      const slot = new FreeBusySlot({
        start: new Date("2025-01-15T12:00:00Z"),
        end: new Date("2025-01-15T13:00:00Z"),
        type: "free",
      });

      expect(slot.type).toBe("free");
    });

    it("creates a tentative slot", () => {
      const slot = new FreeBusySlot({
        start: new Date("2025-01-15T14:00:00Z"),
        end: new Date("2025-01-15T15:00:00Z"),
        type: "tentative",
      });

      expect(slot.type).toBe("tentative");
    });

    it("rejects invalid slot types", () => {
      expect(
        () =>
          new FreeBusySlot({
            start: new Date(),
            end: new Date(),
            type: "invalid" as "busy",
          }),
      ).toThrow();
    });
  });

  describe("FreeBusyResult", () => {
    it("creates a result with slots", () => {
      const slots = [
        new FreeBusySlot({
          start: new Date("2025-01-15T09:00:00Z"),
          end: new Date("2025-01-15T10:00:00Z"),
          type: "busy",
        }),
        new FreeBusySlot({
          start: new Date("2025-01-15T14:00:00Z"),
          end: new Date("2025-01-15T15:00:00Z"),
          type: "busy",
        }),
      ];

      const result = new FreeBusyResult({
        calendarId: "work" as CalendarId,
        slots,
      });

      expect(result.calendarId as string).toBe("work");
      expect(result.slots).toHaveLength(2);
    });

    it("creates a result with empty slots", () => {
      const result = new FreeBusyResult({
        calendarId: "empty" as CalendarId,
        slots: [],
      });

      expect(result.slots).toHaveLength(0);
    });
  });

  describe("CreateEventInput", () => {
    it("creates input with required fields only", () => {
      const input = new CreateEventInput({
        summary: "New Event",
        start: new Date("2025-01-20T10:00:00Z"),
        end: new Date("2025-01-20T11:00:00Z"),
        description: Option.none(),
        location: Option.none(),
        recurrenceRule: Option.none(),
      });

      expect(input.summary).toBe("New Event");
      expect(input.allDay).toBeUndefined();
    });

    it("creates input with all fields", () => {
      const input = new CreateEventInput({
        summary: "Full Event",
        start: new Date("2025-01-20T10:00:00Z"),
        end: new Date("2025-01-20T11:00:00Z"),
        description: Option.some("A detailed description"),
        location: Option.some("Office"),
        allDay: false,
        recurrenceRule: Option.some("FREQ=DAILY"),
      });

      expect(input.summary).toBe("Full Event");
      expect(Option.getOrNull(input.description)).toBe("A detailed description");
      expect(Option.getOrNull(input.location)).toBe("Office");
      expect(input.allDay).toBe(false);
      expect(Option.getOrNull(input.recurrenceRule)).toBe("FREQ=DAILY");
    });
  });

  describe("UpdateEventInput", () => {
    it("creates input with no updates (all None)", () => {
      const input = new UpdateEventInput({
        summary: Option.none(),
        start: Option.none(),
        end: Option.none(),
        description: Option.none(),
        location: Option.none(),
        allDay: Option.none(),
        recurrenceRule: Option.none(),
      });

      expect(Option.isNone(input.summary)).toBe(true);
      expect(Option.isNone(input.start)).toBe(true);
      expect(Option.isNone(input.end)).toBe(true);
    });

    it("creates input with partial updates", () => {
      const input = new UpdateEventInput({
        summary: Option.some("Updated Title"),
        start: Option.none(),
        end: Option.none(),
        description: Option.some("New description"),
        location: Option.none(),
        allDay: Option.none(),
        recurrenceRule: Option.none(),
      });

      expect(Option.getOrNull(input.summary)).toBe("Updated Title");
      expect(Option.getOrNull(input.description)).toBe("New description");
      expect(Option.isNone(input.start)).toBe(true);
    });

    it("creates input with all updates", () => {
      const newStart = new Date("2025-02-01T09:00:00Z");
      const newEnd = new Date("2025-02-01T10:00:00Z");

      const input = new UpdateEventInput({
        summary: Option.some("Rescheduled"),
        start: Option.some(newStart),
        end: Option.some(newEnd),
        description: Option.some("Changed plans"),
        location: Option.some("New Location"),
        allDay: Option.some(true),
        recurrenceRule: Option.some("FREQ=MONTHLY"),
      });

      expect(Option.getOrNull(input.summary)).toBe("Rescheduled");
      expect(Option.getOrNull(input.start)).toEqual(newStart);
      expect(Option.getOrNull(input.end)).toEqual(newEnd);
      expect(Option.getOrNull(input.allDay)).toBe(true);
    });
  });
});
