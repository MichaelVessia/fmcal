import { hasProperty, isTagged } from "effect/Predicate";
import * as Schema from "effect/Schema";

// ============================================================================
// Type ID
// ============================================================================

/**
 * Unique symbol identifying fmcal errors for type safety
 */
export const TypeId: unique symbol = Symbol.for("fmcal/Error");
export type TypeId = typeof TypeId;

// ============================================================================
// Authentication Errors
// ============================================================================

/**
 * Error when CalDAV authentication fails.
 * This can happen with invalid credentials, expired tokens, or auth service issues.
 */
export class CalDavAuthError extends Schema.TaggedError<CalDavAuthError>()("CalDavAuthError", {
  reason: Schema.Literal("InvalidCredentials", "Unauthorized", "Unknown"),
  message: Schema.String,
  cause: Schema.optional(Schema.Defect),
}) {
  readonly [TypeId] = TypeId;

  static is(u: unknown): u is CalDavAuthError {
    return hasProperty(u, TypeId) && isTagged(u, "CalDavAuthError");
  }
}

// ============================================================================
// Not Found Errors
// ============================================================================

/**
 * Error when a calendar is not found by ID/name.
 */
export class CalendarNotFoundError extends Schema.TaggedError<CalendarNotFoundError>()(
  "CalendarNotFoundError",
  {
    calendarId: Schema.String,
  },
) {
  readonly [TypeId] = TypeId;

  override get message(): string {
    return `Calendar not found: ${this.calendarId}`;
  }

  static is(u: unknown): u is CalendarNotFoundError {
    return hasProperty(u, TypeId) && isTagged(u, "CalendarNotFoundError");
  }
}

/**
 * Error when an event is not found within a calendar.
 */
export class EventNotFoundError extends Schema.TaggedError<EventNotFoundError>()(
  "EventNotFoundError",
  {
    calendarId: Schema.String,
    eventId: Schema.String,
  },
) {
  readonly [TypeId] = TypeId;

  override get message(): string {
    return `Event not found: ${this.eventId} in calendar ${this.calendarId}`;
  }

  static is(u: unknown): u is EventNotFoundError {
    return hasProperty(u, TypeId) && isTagged(u, "EventNotFoundError");
  }
}

// ============================================================================
// Network/Connection Errors
// ============================================================================

/**
 * Error for network-level failures connecting to CalDAV server.
 */
export class NetworkError extends Schema.TaggedError<NetworkError>()("NetworkError", {
  reason: Schema.Literal("ConnectionRefused", "Timeout", "DnsLookupFailed", "Unknown"),
  message: Schema.String,
  cause: Schema.optional(Schema.Defect),
}) {
  readonly [TypeId] = TypeId;

  static is(u: unknown): u is NetworkError {
    return hasProperty(u, TypeId) && isTagged(u, "NetworkError");
  }
}

// ============================================================================
// CalDAV Protocol Errors
// ============================================================================

/**
 * Error for CalDAV protocol/operation failures.
 * Use the reason discriminant to identify the specific failure type.
 */
export class CalDavError extends Schema.TaggedError<CalDavError>()("CalDavError", {
  reason: Schema.Literal(
    "FetchCalendarsFailed",
    "FetchEventsFailed",
    "CreateEventFailed",
    "UpdateEventFailed",
    "DeleteEventFailed",
    "ServerError",
    "Unknown",
  ),
  message: Schema.String,
  cause: Schema.optional(Schema.Defect),
}) {
  readonly [TypeId] = TypeId;

  static is(u: unknown): u is CalDavError {
    return hasProperty(u, TypeId) && isTagged(u, "CalDavError");
  }
}

// ============================================================================
// Parsing Errors
// ============================================================================

/**
 * Error when parsing iCal data fails.
 * Contains the raw data that failed to parse for debugging.
 */
export class ICalParseError extends Schema.TaggedError<ICalParseError>()("ICalParseError", {
  reason: Schema.Literal("InvalidFormat", "MissingVEvent", "InvalidDate", "Unknown"),
  message: Schema.String,
  rawData: Schema.optional(Schema.String),
  cause: Schema.optional(Schema.Defect),
}) {
  readonly [TypeId] = TypeId;

  static is(u: unknown): u is ICalParseError {
    return hasProperty(u, TypeId) && isTagged(u, "ICalParseError");
  }
}

/**
 * Error when generating iCal data fails.
 */
export class ICalGenerateError extends Schema.TaggedError<ICalGenerateError>()(
  "ICalGenerateError",
  {
    reason: Schema.Literal("InvalidInput", "Unknown"),
    message: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {
  readonly [TypeId] = TypeId;

  static is(u: unknown): u is ICalGenerateError {
    return hasProperty(u, TypeId) && isTagged(u, "ICalGenerateError");
  }
}

// ============================================================================
// Configuration Errors
// ============================================================================

/**
 * Error when configuration is missing or invalid.
 */
export class ConfigurationError extends Schema.TaggedError<ConfigurationError>()(
  "ConfigurationError",
  {
    reason: Schema.Literal("MissingEnvVar", "InvalidValue"),
    field: Schema.String,
    message: Schema.String,
  },
) {
  readonly [TypeId] = TypeId;

  static is(u: unknown): u is ConfigurationError {
    return hasProperty(u, TypeId) && isTagged(u, "ConfigurationError");
  }
}

// ============================================================================
// Error Type Unions
// ============================================================================

/**
 * Union of all errors that can occur during CalDAV client operations
 */
export type CalDavClientError =
  | CalDavAuthError
  | CalendarNotFoundError
  | EventNotFoundError
  | NetworkError
  | CalDavError
  | ICalParseError
  | ICalGenerateError;

/**
 * Union of all fmcal errors
 */
export type FmcalError = CalDavClientError | ConfigurationError;
