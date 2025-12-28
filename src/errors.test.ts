import { describe, expect, it } from "@codeforbreakfast/bun-test-effect"

import {
  CalDavAuthError,
  CalDavError,
  CalendarNotFoundError,
  EventNotFoundError,
} from "./errors.ts"

describe("Error Types", () => {
  describe("CalDavAuthError", () => {
    it("creates error with message", () => {
      const error = new CalDavAuthError({ message: "Auth failed" })

      expect(error._tag).toBe("CalDavAuthError")
      expect(error.message).toBe("Auth failed")
    })

    it("creates error with cause", () => {
      const cause = new Error("Network error")
      const error = new CalDavAuthError({ message: "Auth failed", cause })

      expect(error._tag).toBe("CalDavAuthError")
      expect(error.message).toBe("Auth failed")
      expect(error.cause).toBe(cause)
    })

    it("is an instance of Error", () => {
      const error = new CalDavAuthError({ message: "Auth failed" })

      expect(error).toBeInstanceOf(Error)
    })
  })

  describe("CalendarNotFoundError", () => {
    it("creates error with calendarId", () => {
      const error = new CalendarNotFoundError({ calendarId: "my-calendar" })

      expect(error._tag).toBe("CalendarNotFoundError")
      expect(error.calendarId).toBe("my-calendar")
    })

    it("generates message from calendarId", () => {
      const error = new CalendarNotFoundError({ calendarId: "work" })

      expect(error.message).toBe("Calendar not found: work")
    })

    it("is an instance of Error", () => {
      const error = new CalendarNotFoundError({ calendarId: "test" })

      expect(error).toBeInstanceOf(Error)
    })
  })

  describe("EventNotFoundError", () => {
    it("creates error with calendarId and eventId", () => {
      const error = new EventNotFoundError({
        calendarId: "my-calendar",
        eventId: "event-123",
      })

      expect(error._tag).toBe("EventNotFoundError")
      expect(error.calendarId).toBe("my-calendar")
      expect(error.eventId).toBe("event-123")
    })

    it("generates message from calendarId and eventId", () => {
      const error = new EventNotFoundError({
        calendarId: "work",
        eventId: "meeting-1",
      })

      expect(error.message).toBe("Event not found: meeting-1 in calendar work")
    })

    it("is an instance of Error", () => {
      const error = new EventNotFoundError({
        calendarId: "test",
        eventId: "event",
      })

      expect(error).toBeInstanceOf(Error)
    })
  })

  describe("CalDavError", () => {
    it("creates error with message", () => {
      const error = new CalDavError({ message: "Something went wrong" })

      expect(error._tag).toBe("CalDavError")
      expect(error.message).toBe("Something went wrong")
    })

    it("creates error with cause", () => {
      const cause = new Error("Underlying error")
      const error = new CalDavError({ message: "Operation failed", cause })

      expect(error._tag).toBe("CalDavError")
      expect(error.cause).toBe(cause)
    })

    it("is an instance of Error", () => {
      const error = new CalDavError({ message: "Error" })

      expect(error).toBeInstanceOf(Error)
    })
  })
})
