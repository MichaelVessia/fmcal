import * as Schema from "effect/Schema"

// ============================================================================
// Branded IDs
// ============================================================================

export const CalendarId = Schema.String.pipe(Schema.brand("CalendarId"))
export type CalendarId = typeof CalendarId.Type

export const EventId = Schema.String.pipe(Schema.brand("EventId"))
export type EventId = typeof EventId.Type

// ============================================================================
// Domain Models
// ============================================================================

export class Calendar extends Schema.Class<Calendar>("Calendar")({
  id: CalendarId,
  displayName: Schema.String,
  description: Schema.OptionFromNullOr(Schema.String),
  color: Schema.OptionFromNullOr(Schema.String),
  timezone: Schema.OptionFromNullOr(Schema.String),
  url: Schema.String,
}) {}

export class CalendarEvent extends Schema.Class<CalendarEvent>("CalendarEvent")({
  id: EventId,
  calendarId: CalendarId,
  summary: Schema.String,
  description: Schema.OptionFromNullOr(Schema.String),
  location: Schema.OptionFromNullOr(Schema.String),
  start: Schema.DateFromSelf,
  end: Schema.DateFromSelf,
  allDay: Schema.Boolean,
  recurrenceRule: Schema.OptionFromNullOr(Schema.String),
  url: Schema.String,
  etag: Schema.OptionFromNullOr(Schema.String),
}) {}

export class FreeBusySlot extends Schema.Class<FreeBusySlot>("FreeBusySlot")({
  start: Schema.DateFromSelf,
  end: Schema.DateFromSelf,
  type: Schema.Literal("busy", "free", "tentative"),
}) {}

export class FreeBusyResult extends Schema.Class<FreeBusyResult>("FreeBusyResult")({
  calendarId: CalendarId,
  slots: Schema.Array(FreeBusySlot),
}) {}

// ============================================================================
// Input Types
// ============================================================================

export class CreateEventInput extends Schema.Class<CreateEventInput>("CreateEventInput")({
  summary: Schema.String,
  start: Schema.DateFromSelf,
  end: Schema.DateFromSelf,
  description: Schema.OptionFromNullOr(Schema.String),
  location: Schema.OptionFromNullOr(Schema.String),
  allDay: Schema.optional(Schema.Boolean),
  recurrenceRule: Schema.OptionFromNullOr(Schema.String),
}) {}

export class UpdateEventInput extends Schema.Class<UpdateEventInput>("UpdateEventInput")({
  summary: Schema.OptionFromNullOr(Schema.String),
  start: Schema.OptionFromNullOr(Schema.DateFromSelf),
  end: Schema.OptionFromNullOr(Schema.DateFromSelf),
  description: Schema.OptionFromNullOr(Schema.String),
  location: Schema.OptionFromNullOr(Schema.String),
  allDay: Schema.OptionFromNullOr(Schema.Boolean),
  recurrenceRule: Schema.OptionFromNullOr(Schema.String),
}) {}
