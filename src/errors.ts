import * as Schema from "effect/Schema"

/**
 * Error when CalDAV authentication fails
 */
export class CalDavAuthError extends Schema.TaggedError<CalDavAuthError>()(
  "CalDavAuthError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Defect),
  }
) {}

/**
 * Error when a calendar is not found
 */
export class CalendarNotFoundError extends Schema.TaggedError<CalendarNotFoundError>()(
  "CalendarNotFoundError",
  {
    calendarId: Schema.String,
  }
) {
  override get message(): string {
    return `Calendar not found: ${this.calendarId}`
  }
}

/**
 * Error when an event is not found
 */
export class EventNotFoundError extends Schema.TaggedError<EventNotFoundError>()(
  "EventNotFoundError",
  {
    calendarId: Schema.String,
    eventId: Schema.String,
  }
) {
  override get message(): string {
    return `Event not found: ${this.eventId} in calendar ${this.calendarId}`
  }
}

/**
 * Generic CalDAV operation error
 */
export class CalDavError extends Schema.TaggedError<CalDavError>()(
  "CalDavError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Defect),
  }
) {}

/**
 * Union type for all CalDAV client errors
 */
export type CalDavClientError =
  | CalDavAuthError
  | CalendarNotFoundError
  | EventNotFoundError
  | CalDavError
