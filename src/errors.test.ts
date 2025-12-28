import { describe, expect, it } from "@codeforbreakfast/bun-test-effect";

import {
  CalDavAuthError,
  CalDavError,
  CalendarNotFoundError,
  ConfigurationError,
  EventNotFoundError,
  ICalGenerateError,
  ICalParseError,
  NetworkError,
  ReadOnlyCalendarError,
  TypeId,
} from "./errors.ts";

describe("Error Types", () => {
  describe("CalDavAuthError", () => {
    it("creates error with message and reason", () => {
      const error = new CalDavAuthError({
        reason: "InvalidCredentials",
        message: "Auth failed",
      });

      expect(error._tag).toBe("CalDavAuthError");
      expect(error.message).toBe("Auth failed");
      expect(error.reason).toBe("InvalidCredentials");
    });

    it("creates error with cause", () => {
      const cause = new Error("Network error");
      const error = new CalDavAuthError({
        reason: "Unknown",
        message: "Auth failed",
        cause,
      });

      expect(error._tag).toBe("CalDavAuthError");
      expect(error.message).toBe("Auth failed");
      expect(error.cause).toBe(cause);
    });

    it("is an instance of Error", () => {
      const error = new CalDavAuthError({
        reason: "Unauthorized",
        message: "Auth failed",
      });

      expect(error).toBeInstanceOf(Error);
    });

    it("has TypeId for type safety", () => {
      const error = new CalDavAuthError({
        reason: "Unknown",
        message: "test",
      });

      expect(error[TypeId]).toBe(TypeId);
    });

    it("static is() method identifies error correctly", () => {
      const error = new CalDavAuthError({
        reason: "Unknown",
        message: "test",
      });

      expect(CalDavAuthError.is(error)).toBe(true);
      expect(CalDavAuthError.is(new Error("not caldav error"))).toBe(false);
    });
  });

  describe("CalendarNotFoundError", () => {
    it("creates error with calendarId", () => {
      const error = new CalendarNotFoundError({ calendarId: "my-calendar" });

      expect(error._tag).toBe("CalendarNotFoundError");
      expect(error.calendarId).toBe("my-calendar");
    });

    it("generates message from calendarId", () => {
      const error = new CalendarNotFoundError({ calendarId: "work" });

      expect(error.message).toBe("Calendar not found: work");
    });

    it("is an instance of Error", () => {
      const error = new CalendarNotFoundError({ calendarId: "test" });

      expect(error).toBeInstanceOf(Error);
    });

    it("static is() method identifies error correctly", () => {
      const error = new CalendarNotFoundError({ calendarId: "test" });

      expect(CalendarNotFoundError.is(error)).toBe(true);
      expect(CalendarNotFoundError.is(new Error("other"))).toBe(false);
    });
  });

  describe("EventNotFoundError", () => {
    it("creates error with calendarId and eventId", () => {
      const error = new EventNotFoundError({
        calendarId: "my-calendar",
        eventId: "event-123",
      });

      expect(error._tag).toBe("EventNotFoundError");
      expect(error.calendarId).toBe("my-calendar");
      expect(error.eventId).toBe("event-123");
    });

    it("generates message from calendarId and eventId", () => {
      const error = new EventNotFoundError({
        calendarId: "work",
        eventId: "meeting-1",
      });

      expect(error.message).toBe("Event not found: meeting-1 in calendar work");
    });

    it("is an instance of Error", () => {
      const error = new EventNotFoundError({
        calendarId: "test",
        eventId: "event",
      });

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe("ReadOnlyCalendarError", () => {
    it("creates error with calendarId and operation", () => {
      const error = new ReadOnlyCalendarError({
        calendarId: "holidays",
        operation: "create",
      });

      expect(error._tag).toBe("ReadOnlyCalendarError");
      expect(error.calendarId).toBe("holidays");
      expect(error.operation).toBe("create");
    });

    it("generates message from calendarId and operation", () => {
      const error = new ReadOnlyCalendarError({
        calendarId: "subscribed-cal",
        operation: "delete",
      });

      expect(error.message).toBe('Cannot delete event: calendar "subscribed-cal" is read-only');
    });

    it("supports all operation types", () => {
      const operations = ["create", "update", "delete"] as const;

      for (const operation of operations) {
        const error = new ReadOnlyCalendarError({ calendarId: "test", operation });
        expect(error.operation).toBe(operation);
      }
    });

    it("is an instance of Error", () => {
      const error = new ReadOnlyCalendarError({
        calendarId: "test",
        operation: "update",
      });

      expect(error).toBeInstanceOf(Error);
    });

    it("static is() method identifies error correctly", () => {
      const error = new ReadOnlyCalendarError({
        calendarId: "test",
        operation: "create",
      });

      expect(ReadOnlyCalendarError.is(error)).toBe(true);
      expect(ReadOnlyCalendarError.is(new Error("other"))).toBe(false);
    });
  });

  describe("CalDavError", () => {
    it("creates error with message and reason", () => {
      const error = new CalDavError({
        reason: "FetchCalendarsFailed",
        message: "Something went wrong",
      });

      expect(error._tag).toBe("CalDavError");
      expect(error.message).toBe("Something went wrong");
      expect(error.reason).toBe("FetchCalendarsFailed");
    });

    it("creates error with cause", () => {
      const cause = new Error("Underlying error");
      const error = new CalDavError({
        reason: "ServerError",
        message: "Operation failed",
        cause,
      });

      expect(error._tag).toBe("CalDavError");
      expect(error.cause).toBe(cause);
    });

    it("is an instance of Error", () => {
      const error = new CalDavError({
        reason: "Unknown",
        message: "Error",
      });

      expect(error).toBeInstanceOf(Error);
    });

    it("supports all reason types", () => {
      const reasons = [
        "FetchCalendarsFailed",
        "FetchEventsFailed",
        "CreateEventFailed",
        "UpdateEventFailed",
        "DeleteEventFailed",
        "ServerError",
        "Unknown",
      ] as const;

      for (const reason of reasons) {
        const error = new CalDavError({ reason, message: "test" });
        expect(error.reason).toBe(reason);
      }
    });
  });

  describe("NetworkError", () => {
    it("creates error with reason and message", () => {
      const error = new NetworkError({
        reason: "ConnectionRefused",
        message: "Could not connect",
      });

      expect(error._tag).toBe("NetworkError");
      expect(error.reason).toBe("ConnectionRefused");
      expect(error.message).toBe("Could not connect");
    });

    it("supports all network failure reasons", () => {
      const reasons = ["ConnectionRefused", "Timeout", "DnsLookupFailed", "Unknown"] as const;

      for (const reason of reasons) {
        const error = new NetworkError({ reason, message: "test" });
        expect(error.reason).toBe(reason);
      }
    });
  });

  describe("ICalParseError", () => {
    it("creates error with reason and message", () => {
      const error = new ICalParseError({
        reason: "InvalidFormat",
        message: "Failed to parse",
      });

      expect(error._tag).toBe("ICalParseError");
      expect(error.reason).toBe("InvalidFormat");
    });

    it("includes raw data for debugging", () => {
      const error = new ICalParseError({
        reason: "InvalidFormat",
        message: "Failed to parse",
        rawData: "BEGIN:VCALENDAR...",
      });

      expect(error.rawData).toBe("BEGIN:VCALENDAR...");
    });

    it("supports all parse failure reasons", () => {
      const reasons = ["InvalidFormat", "MissingVEvent", "InvalidDate", "Unknown"] as const;

      for (const reason of reasons) {
        const error = new ICalParseError({ reason, message: "test" });
        expect(error.reason).toBe(reason);
      }
    });
  });

  describe("ICalGenerateError", () => {
    it("creates error with reason and message", () => {
      const error = new ICalGenerateError({
        reason: "InvalidInput",
        message: "Cannot generate iCal",
      });

      expect(error._tag).toBe("ICalGenerateError");
      expect(error.reason).toBe("InvalidInput");
    });
  });

  describe("ConfigurationError", () => {
    it("creates error with field and reason", () => {
      const error = new ConfigurationError({
        reason: "MissingEnvVar",
        field: "FMCAL_USERNAME",
        message: "Environment variable not set",
      });

      expect(error._tag).toBe("ConfigurationError");
      expect(error.reason).toBe("MissingEnvVar");
      expect(error.field).toBe("FMCAL_USERNAME");
    });

    it("supports InvalidValue reason", () => {
      const error = new ConfigurationError({
        reason: "InvalidValue",
        field: "timeout",
        message: "Must be a positive number",
      });

      expect(error.reason).toBe("InvalidValue");
    });
  });
});
