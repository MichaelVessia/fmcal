import * as Array from "effect/Array";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Ref from "effect/Ref";
import ICAL from "ical.js";
import { DAVClient } from "tsdav";

import { FastmailConfig } from "../config.ts";
import type {
  Calendar,
  CalendarEvent,
  CalendarId,
  CreateEventInput,
  EventId,
  FreeBusyResult,
  UpdateEventInput,
} from "../domain.ts";
import {
  CalDavAuthError,
  CalDavError,
  CalendarNotFoundError,
  EventNotFoundError,
  ICalGenerateError,
  ICalParseError,
} from "../errors.ts";

// ============================================================================
// Service Interface
// ============================================================================

export interface CalDavClientService {
  readonly fetchCalendars: Effect.Effect<ReadonlyArray<Calendar>, CalDavAuthError | CalDavError>;

  readonly fetchEvents: (params: {
    calendarId: CalendarId;
    from?: Date;
    to?: Date;
    max?: number;
    query?: string;
  }) => Effect.Effect<
    ReadonlyArray<CalendarEvent>,
    CalDavAuthError | CalDavError | CalendarNotFoundError | ICalParseError
  >;

  readonly fetchEvent: (params: {
    calendarId: CalendarId;
    eventId: EventId;
  }) => Effect.Effect<
    CalendarEvent,
    CalDavAuthError | CalDavError | CalendarNotFoundError | EventNotFoundError | ICalParseError
  >;

  readonly createEvent: (params: {
    calendarId: CalendarId;
    input: CreateEventInput;
  }) => Effect.Effect<
    CalendarEvent,
    CalDavAuthError | CalDavError | CalendarNotFoundError | ICalGenerateError
  >;

  readonly updateEvent: (params: {
    calendarId: CalendarId;
    eventId: EventId;
    input: UpdateEventInput;
  }) => Effect.Effect<
    CalendarEvent,
    | CalDavAuthError
    | CalDavError
    | CalendarNotFoundError
    | EventNotFoundError
    | ICalParseError
    | ICalGenerateError
  >;

  readonly deleteEvent: (params: {
    calendarId: CalendarId;
    eventId: EventId;
  }) => Effect.Effect<
    void,
    CalDavAuthError | CalDavError | CalendarNotFoundError | EventNotFoundError | ICalParseError
  >;

  readonly freeBusy: (params: {
    calendarIds: ReadonlyArray<CalendarId>;
    from: Date;
    to: Date;
  }) => Effect.Effect<
    ReadonlyArray<FreeBusyResult>,
    CalDavAuthError | CalDavError | CalendarNotFoundError | ICalParseError
  >;
}

// ============================================================================
// Service Tag
// ============================================================================

export class CalDavClient extends Context.Tag("CalDavClient")<
  CalDavClient,
  CalDavClientService
>() {}

// ============================================================================
// iCal Helpers (exported for testing)
// ============================================================================

/** Parse iCal data into a CalendarEvent, returning Effect with proper error */
export const parseICalEvent = (
  icalString: string,
  calendarId: CalendarId,
  eventUrl: string,
  etag: string | undefined,
): Effect.Effect<Option.Option<CalendarEvent>, ICalParseError> =>
  Effect.try({
    try: () => {
      const jcal = ICAL.parse(icalString);
      const vcalendar = new ICAL.Component(jcal);
      const vevent = vcalendar.getFirstSubcomponent("vevent");

      if (!vevent) return Option.none();

      const event = new ICAL.Event(vevent);
      const uid = event.uid;

      return Option.some({
        id: uid as EventId,
        calendarId,
        summary: event.summary || "",
        description: Option.fromNullable(event.description),
        location: Option.fromNullable(event.location),
        start: event.startDate.toJSDate(),
        end: event.endDate.toJSDate(),
        allDay: event.startDate.isDate,
        recurrenceRule: Option.fromNullable(vevent.getFirstPropertyValue("rrule")?.toString()),
        url: eventUrl,
        etag: Option.fromNullable(etag),
      } as CalendarEvent);
    },
    catch: (error) =>
      new ICalParseError({
        reason: "InvalidFormat",
        message: `Failed to parse iCal data: ${error instanceof Error ? error.message : String(error)}`,
        rawData: icalString.slice(0, 500), // Truncate for debugging
        cause: error,
      }),
  });

/** Generate iCal string from event input, returning Effect with proper error */
export const generateICalEvent = (
  input: CreateEventInput,
  uid: string,
): Effect.Effect<string, ICalGenerateError> =>
  Effect.try({
    try: () => {
      const vcalendar = new ICAL.Component(["vcalendar", [], []]);
      vcalendar.updatePropertyWithValue("prodid", "-//fmcal//EN");
      vcalendar.updatePropertyWithValue("version", "2.0");

      const vevent = new ICAL.Component("vevent");
      vevent.updatePropertyWithValue("uid", uid);
      vevent.updatePropertyWithValue("dtstamp", ICAL.Time.now());
      vevent.updatePropertyWithValue("summary", input.summary);

      const startTime = ICAL.Time.fromJSDate(input.start, false);
      const endTime = ICAL.Time.fromJSDate(input.end, false);

      if (input.allDay) {
        startTime.isDate = true;
        endTime.isDate = true;
      }

      vevent.updatePropertyWithValue("dtstart", startTime);
      vevent.updatePropertyWithValue("dtend", endTime);

      if (Option.isSome(input.description)) {
        vevent.updatePropertyWithValue("description", input.description.value);
      }

      if (Option.isSome(input.location)) {
        vevent.updatePropertyWithValue("location", input.location.value);
      }

      if (Option.isSome(input.recurrenceRule)) {
        const rrule = ICAL.Recur.fromString(input.recurrenceRule.value);
        vevent.updatePropertyWithValue("rrule", rrule);
      }

      vcalendar.addSubcomponent(vevent);
      return vcalendar.toString();
    },
    catch: (error) =>
      new ICalGenerateError({
        reason: "InvalidInput",
        message: `Failed to generate iCal data: ${error instanceof Error ? error.message : String(error)}`,
        cause: error,
      }),
  });

/** @internal */
export const generateUid: Effect.Effect<string> = Effect.sync(() => `${crypto.randomUUID()}@fmcal`);

// ============================================================================
// Internal Helpers
// ============================================================================

type DavCalendar = Awaited<ReturnType<DAVClient["fetchCalendars"]>>[number];
type DavCalendarObject = Awaited<ReturnType<DAVClient["fetchCalendarObjects"]>>[number];

/** Parse calendar objects into events, collecting parse errors */
const parseCalendarObjects = (
  objects: ReadonlyArray<DavCalendarObject>,
  calendarId: CalendarId,
): Effect.Effect<ReadonlyArray<CalendarEvent>, ICalParseError> =>
  Effect.gen(function* () {
    const results = yield* Effect.forEach(
      objects,
      (obj) =>
        obj.data
          ? parseICalEvent(obj.data, calendarId, obj.url, obj.etag)
          : Effect.succeed(Option.none()),
      { concurrency: "unbounded" },
    );
    return Array.filterMap(results, (opt) => opt);
  });

/** Find an event by ID from calendar objects */
const findEventInObjects = (
  objects: ReadonlyArray<DavCalendarObject>,
  calendarId: CalendarId,
  eventId: EventId,
): Effect.Effect<Option.Option<{ obj: DavCalendarObject; event: CalendarEvent }>, ICalParseError> =>
  Effect.gen(function* () {
    for (const obj of objects) {
      if (!obj.data) continue;
      const maybeEvent = yield* parseICalEvent(obj.data, calendarId, obj.url, obj.etag);
      if (Option.isSome(maybeEvent) && maybeEvent.value.id === eventId) {
        return Option.some({ obj, event: maybeEvent.value });
      }
    }
    return Option.none();
  });

// ============================================================================
// Live Implementation
// ============================================================================

const make = Effect.gen(function* () {
  const config = yield* FastmailConfig;

  // Create and login to DAV client
  const client = new DAVClient({
    serverUrl: config.serverUrl,
    credentials: {
      username: config.username,
      password: Redacted.value(config.password),
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });

  yield* Effect.tryPromise({
    try: () => client.login(),
    catch: (error) =>
      new CalDavAuthError({
        reason: "Unknown",
        message: "Failed to authenticate with CalDAV server",
        cause: error,
      }),
  });

  // Cache calendars using Ref for Effect-managed state
  const calendarsCache = yield* Ref.make<ReadonlyArray<DavCalendar>>([]);

  const refreshCalendarsCache = Effect.gen(function* () {
    const cals = yield* Effect.tryPromise({
      try: () => client.fetchCalendars(),
      catch: (error) =>
        new CalDavError({
          reason: "FetchCalendarsFailed",
          message: "Failed to fetch calendars",
          cause: error,
        }),
    });
    yield* Ref.set(calendarsCache, cals);
    return cals;
  });

  const findCalendar = (calendarId: CalendarId) =>
    Effect.gen(function* () {
      const cached = yield* Ref.get(calendarsCache);
      const calendars = Array.isEmptyReadonlyArray(cached) ? yield* refreshCalendarsCache : cached;
      const calendar = Array.findFirst(calendars, (c) => c.displayName === calendarId);
      return yield* Option.match(calendar, {
        onNone: () => Effect.fail(new CalendarNotFoundError({ calendarId })),
        onSome: Effect.succeed,
      });
    });

  const fetchCalendarObjects = (
    calendar: DavCalendar,
    timeRange?: { start: string; end: string },
  ) =>
    Effect.tryPromise({
      try: () =>
        client.fetchCalendarObjects({
          calendar,
          ...(timeRange ? { timeRange } : {}),
        }),
      catch: (error) =>
        new CalDavError({
          reason: "FetchEventsFailed",
          message: "Failed to fetch calendar objects",
          cause: error,
        }),
    });

  // Service implementation
  const service: CalDavClientService = {
    fetchCalendars: Effect.gen(function* () {
      const davCalendars = yield* refreshCalendarsCache;

      return Array.map(davCalendars, (cal) => ({
        id: cal.displayName as CalendarId,
        displayName: cal.displayName || "",
        description: Option.fromNullable(cal.description),
        color: Option.fromNullable(cal.calendarColor),
        timezone: Option.fromNullable(cal.timezone),
        url: cal.url,
      })) as ReadonlyArray<Calendar>;
    }),

    fetchEvents: ({ calendarId, from, to }) =>
      Effect.gen(function* () {
        const calendar = yield* findCalendar(calendarId);

        const timeRange =
          from && to ? { start: from.toISOString(), end: to.toISOString() } : undefined;

        const objects = yield* fetchCalendarObjects(calendar, timeRange);
        return yield* parseCalendarObjects(objects, calendarId);
      }),

    fetchEvent: ({ calendarId, eventId }) =>
      Effect.gen(function* () {
        const calendar = yield* findCalendar(calendarId);
        const objects = yield* fetchCalendarObjects(calendar);
        const found = yield* findEventInObjects(objects, calendarId, eventId);

        return yield* Option.match(found, {
          onNone: () => Effect.fail(new EventNotFoundError({ calendarId, eventId })),
          onSome: ({ event }) => Effect.succeed(event),
        });
      }),

    createEvent: ({ calendarId, input }) =>
      Effect.gen(function* () {
        const calendar = yield* findCalendar(calendarId);
        const uid = yield* generateUid;
        const icalString = yield* generateICalEvent(input, uid);

        yield* Effect.tryPromise({
          try: () =>
            client.createCalendarObject({
              calendar,
              iCalString: icalString,
              filename: `${uid}.ics`,
            }),
          catch: (error) =>
            new CalDavError({
              reason: "CreateEventFailed",
              message: "Failed to create calendar event",
              cause: error,
            }),
        });

        return {
          id: uid as EventId,
          calendarId,
          summary: input.summary,
          description: input.description,
          location: input.location,
          start: input.start,
          end: input.end,
          allDay: input.allDay ?? false,
          recurrenceRule: input.recurrenceRule,
          url: `${calendar.url}${uid}.ics`,
          etag: Option.none(),
        } as CalendarEvent;
      }),

    updateEvent: ({ calendarId, eventId, input }) =>
      Effect.gen(function* () {
        const calendar = yield* findCalendar(calendarId);
        const objects = yield* fetchCalendarObjects(calendar);
        const found = yield* findEventInObjects(objects, calendarId, eventId);

        const { obj: existingObj, event: existingEvent } = yield* Option.match(found, {
          onNone: () => Effect.fail(new EventNotFoundError({ calendarId, eventId })),
          onSome: Effect.succeed,
        });

        // Build updated event using Option.getOrElse for cleaner merging
        const updatedInput: CreateEventInput = {
          summary: Option.getOrElse(input.summary, () => existingEvent.summary),
          start: Option.getOrElse(input.start, () => existingEvent.start),
          end: Option.getOrElse(input.end, () => existingEvent.end),
          description: Option.isSome(input.description)
            ? input.description
            : existingEvent.description,
          location: Option.isSome(input.location) ? input.location : existingEvent.location,
          allDay: Option.getOrElse(input.allDay, () => existingEvent.allDay),
          recurrenceRule: Option.isSome(input.recurrenceRule)
            ? input.recurrenceRule
            : existingEvent.recurrenceRule,
        } as CreateEventInput;

        const icalString = yield* generateICalEvent(updatedInput, eventId);

        yield* Effect.tryPromise({
          try: () =>
            client.updateCalendarObject({
              calendarObject: {
                url: existingObj.url,
                etag: existingObj.etag ?? "",
                data: icalString,
              },
            }),
          catch: (error) =>
            new CalDavError({
              reason: "UpdateEventFailed",
              message: "Failed to update calendar event",
              cause: error,
            }),
        });

        return {
          id: eventId,
          calendarId,
          summary: updatedInput.summary,
          description: updatedInput.description,
          location: updatedInput.location,
          start: updatedInput.start,
          end: updatedInput.end,
          allDay: updatedInput.allDay ?? false,
          recurrenceRule: updatedInput.recurrenceRule,
          url: existingObj.url,
          etag: Option.none(),
        } as CalendarEvent;
      }),

    deleteEvent: ({ calendarId, eventId }) =>
      Effect.gen(function* () {
        const calendar = yield* findCalendar(calendarId);
        const objects = yield* fetchCalendarObjects(calendar);
        const found = yield* findEventInObjects(objects, calendarId, eventId);

        const { obj: targetObj } = yield* Option.match(found, {
          onNone: () => Effect.fail(new EventNotFoundError({ calendarId, eventId })),
          onSome: Effect.succeed,
        });

        yield* Effect.tryPromise({
          try: () =>
            client.deleteCalendarObject({
              calendarObject: {
                url: targetObj.url,
                etag: targetObj.etag ?? "",
              },
            }),
          catch: (error) =>
            new CalDavError({
              reason: "DeleteEventFailed",
              message: "Failed to delete calendar event",
              cause: error,
            }),
        });
      }),

    freeBusy: ({ calendarIds, from, to }) =>
      Effect.forEach(
        calendarIds,
        (calendarId) =>
          Effect.gen(function* () {
            const events = yield* service.fetchEvents({ calendarId, from, to });

            const slots = Array.map(events, (event) => ({
              start: event.start,
              end: event.end,
              type: "busy" as const,
            }));

            return { calendarId, slots } as FreeBusyResult;
          }),
        { concurrency: "unbounded" },
      ),
  };

  return service;
});

// ============================================================================
// Live Layer
// ============================================================================

export const CalDavClientLive: Layer.Layer<
  CalDavClient,
  CalDavAuthError | CalDavError,
  FastmailConfig
> = Layer.effect(CalDavClient, make);
