import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import ICAL from "ical.js"
import { DAVClient } from "tsdav"

import { FastmailConfig } from "../config.ts"
import type {
  Calendar,
  CalendarEvent,
  CalendarId,
  CreateEventInput,
  EventId,
  FreeBusyResult,
  UpdateEventInput,
} from "../domain.ts"
import {
  CalDavAuthError,
  CalDavError,
  CalendarNotFoundError,
  EventNotFoundError,
} from "../errors.ts"

// ============================================================================
// Service Interface
// ============================================================================

export interface CalDavClientService {
  readonly fetchCalendars: Effect.Effect<
    ReadonlyArray<Calendar>,
    CalDavAuthError | CalDavError
  >

  readonly fetchEvents: (params: {
    calendarId: CalendarId
    from?: Date
    to?: Date
    max?: number
    query?: string
  }) => Effect.Effect<
    ReadonlyArray<CalendarEvent>,
    CalDavAuthError | CalDavError | CalendarNotFoundError
  >

  readonly fetchEvent: (params: {
    calendarId: CalendarId
    eventId: EventId
  }) => Effect.Effect<
    CalendarEvent,
    CalDavAuthError | CalDavError | CalendarNotFoundError | EventNotFoundError
  >

  readonly createEvent: (params: {
    calendarId: CalendarId
    input: CreateEventInput
  }) => Effect.Effect<
    CalendarEvent,
    CalDavAuthError | CalDavError | CalendarNotFoundError
  >

  readonly updateEvent: (params: {
    calendarId: CalendarId
    eventId: EventId
    input: UpdateEventInput
  }) => Effect.Effect<
    CalendarEvent,
    CalDavAuthError | CalDavError | CalendarNotFoundError | EventNotFoundError
  >

  readonly deleteEvent: (params: {
    calendarId: CalendarId
    eventId: EventId
  }) => Effect.Effect<
    void,
    CalDavAuthError | CalDavError | CalendarNotFoundError | EventNotFoundError
  >

  readonly freeBusy: (params: {
    calendarIds: ReadonlyArray<CalendarId>
    from: Date
    to: Date
  }) => Effect.Effect<
    ReadonlyArray<FreeBusyResult>,
    CalDavAuthError | CalDavError | CalendarNotFoundError
  >
}

// ============================================================================
// Service Tag
// ============================================================================

export class CalDavClient extends Context.Tag("CalDavClient")<
  CalDavClient,
  CalDavClientService
>() {}

// ============================================================================
// iCal Helpers
// ============================================================================

function parseICalEvent(
  icalString: string,
  calendarId: CalendarId,
  eventUrl: string,
  etag: string | undefined
): CalendarEvent | null {
  try {
    const jcal = ICAL.parse(icalString)
    const vcalendar = new ICAL.Component(jcal)
    const vevent = vcalendar.getFirstSubcomponent("vevent")

    if (!vevent) return null

    const event = new ICAL.Event(vevent)
    const uid = event.uid

    return {
      id: uid as EventId,
      calendarId,
      summary: event.summary || "",
      description: Option.fromNullable(event.description),
      location: Option.fromNullable(event.location),
      start: event.startDate.toJSDate(),
      end: event.endDate.toJSDate(),
      allDay: event.startDate.isDate,
      recurrenceRule: Option.fromNullable(
        vevent.getFirstPropertyValue("rrule")?.toString()
      ),
      url: eventUrl,
      etag: Option.fromNullable(etag),
    } as CalendarEvent
  } catch {
    return null
  }
}

function generateICalEvent(input: CreateEventInput, uid: string): string {
  const vcalendar = new ICAL.Component(["vcalendar", [], []])
  vcalendar.updatePropertyWithValue("prodid", "-//fmcal//EN")
  vcalendar.updatePropertyWithValue("version", "2.0")

  const vevent = new ICAL.Component("vevent")
  vevent.updatePropertyWithValue("uid", uid)
  vevent.updatePropertyWithValue("dtstamp", ICAL.Time.now())
  vevent.updatePropertyWithValue("summary", input.summary)

  const startTime = ICAL.Time.fromJSDate(input.start, false)
  const endTime = ICAL.Time.fromJSDate(input.end, false)

  if (input.allDay) {
    startTime.isDate = true
    endTime.isDate = true
  }

  vevent.updatePropertyWithValue("dtstart", startTime)
  vevent.updatePropertyWithValue("dtend", endTime)

  if (Option.isSome(input.description)) {
    vevent.updatePropertyWithValue("description", input.description.value)
  }

  if (Option.isSome(input.location)) {
    vevent.updatePropertyWithValue("location", input.location.value)
  }

  if (Option.isSome(input.recurrenceRule)) {
    const rrule = ICAL.Recur.fromString(input.recurrenceRule.value)
    vevent.updatePropertyWithValue("rrule", rrule)
  }

  vcalendar.addSubcomponent(vevent)
  return vcalendar.toString()
}

function generateUid(): string {
  return `${crypto.randomUUID()}@fmcal`
}

// ============================================================================
// Live Implementation
// ============================================================================

const make = Effect.gen(function* () {
  const config = yield* FastmailConfig

  // Create and login to DAV client
  const client = new DAVClient({
    serverUrl: config.serverUrl,
    credentials: {
      username: config.username,
      password: Redacted.value(config.password),
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  })

  yield* Effect.tryPromise({
    try: () => client.login(),
    catch: (error) =>
      new CalDavAuthError({
        message: "Failed to authenticate with CalDAV server",
        cause: error,
      }),
  })

  // Cache calendars for lookup
  let calendarsCache: Awaited<ReturnType<typeof client.fetchCalendars>> = []

  const refreshCalendarsCache = Effect.tryPromise({
    try: () => client.fetchCalendars(),
    catch: (error) =>
      new CalDavError({
        message: "Failed to fetch calendars",
        cause: error,
      }),
  }).pipe(Effect.tap((cals) => Effect.sync(() => (calendarsCache = cals))))

  const findCalendar = (calendarId: CalendarId) =>
    Effect.gen(function* () {
      if (calendarsCache.length === 0) {
        yield* refreshCalendarsCache
      }
      const calendar = calendarsCache.find((c) => c.displayName === calendarId)
      if (!calendar) {
        return yield* Effect.fail(new CalendarNotFoundError({ calendarId }))
      }
      return calendar
    })

  // Service implementation
  const service: CalDavClientService = {
    fetchCalendars: Effect.gen(function* () {
      const davCalendars = yield* refreshCalendarsCache

      return davCalendars.map(
        (cal) =>
          ({
            id: cal.displayName as CalendarId,
            displayName: cal.displayName || "",
            description: Option.fromNullable(cal.description),
            color: Option.fromNullable(cal.calendarColor),
            timezone: Option.fromNullable(cal.timezone),
            url: cal.url,
          }) as Calendar
      )
    }),

    fetchEvents: ({ calendarId, from, to }) =>
      Effect.gen(function* () {
        const calendar = yield* findCalendar(calendarId)

        const timeRange =
          from && to
            ? {
                start: from.toISOString(),
                end: to.toISOString(),
              }
            : undefined

        const objects = yield* Effect.tryPromise({
          try: () =>
            client.fetchCalendarObjects({
              calendar,
              ...(timeRange ? { timeRange } : {}),
            }),
          catch: (error) =>
            new CalDavError({
              message: "Failed to fetch calendar objects",
              cause: error,
            }),
        })

        const events: CalendarEvent[] = []
        for (const obj of objects) {
          if (obj.data) {
            const event = parseICalEvent(
              obj.data,
              calendarId,
              obj.url,
              obj.etag
            )
            if (event) {
              events.push(event)
            }
          }
        }
        return events
      }),

    fetchEvent: ({ calendarId, eventId }) =>
      Effect.gen(function* () {
        const calendar = yield* findCalendar(calendarId)

        const objects = yield* Effect.tryPromise({
          try: () =>
            client.fetchCalendarObjects({
              calendar,
            }),
          catch: (error) =>
            new CalDavError({
              message: "Failed to fetch calendar objects",
              cause: error,
            }),
        })

        for (const obj of objects) {
          if (obj.data) {
            const event = parseICalEvent(
              obj.data,
              calendarId,
              obj.url,
              obj.etag
            )
            if (event && event.id === eventId) {
              return event
            }
          }
        }

        return yield* Effect.fail(new EventNotFoundError({ calendarId, eventId }))
      }),

    createEvent: ({ calendarId, input }) =>
      Effect.gen(function* () {
        const calendar = yield* findCalendar(calendarId)
        const uid = generateUid()
        const icalString = generateICalEvent(input, uid)

        yield* Effect.tryPromise({
          try: () =>
            client.createCalendarObject({
              calendar,
              iCalString: icalString,
              filename: `${uid}.ics`,
            }),
          catch: (error) =>
            new CalDavError({
              message: "Failed to create calendar event",
              cause: error,
            }),
        })

        // Return the created event
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
        } as CalendarEvent
      }),

    updateEvent: ({ calendarId, eventId, input }) =>
      Effect.gen(function* () {
        const calendar = yield* findCalendar(calendarId)

        // Fetch existing event
        const objects = yield* Effect.tryPromise({
          try: () =>
            client.fetchCalendarObjects({
              calendar,
            }),
          catch: (error) =>
            new CalDavError({
              message: "Failed to fetch calendar objects",
              cause: error,
            }),
        })

        let existingObj: (typeof objects)[0] | undefined
        let existingEvent: CalendarEvent | undefined

        for (const obj of objects) {
          if (obj.data) {
            const event = parseICalEvent(
              obj.data,
              calendarId,
              obj.url,
              obj.etag
            )
            if (event && event.id === eventId) {
              existingObj = obj
              existingEvent = event
              break
            }
          }
        }

        if (!existingObj || !existingEvent) {
          return yield* Effect.fail(new EventNotFoundError({ calendarId, eventId }))
        }

        // Build updated event
        const updatedInput: CreateEventInput = {
          summary: Option.isSome(input.summary)
            ? input.summary.value
            : existingEvent.summary,
          start: Option.isSome(input.start)
            ? input.start.value
            : existingEvent.start,
          end: Option.isSome(input.end) ? input.end.value : existingEvent.end,
          description: Option.isSome(input.description)
            ? input.description
            : existingEvent.description,
          location: Option.isSome(input.location)
            ? input.location
            : existingEvent.location,
          allDay: Option.isSome(input.allDay)
            ? input.allDay.value
            : existingEvent.allDay,
          recurrenceRule: Option.isSome(input.recurrenceRule)
            ? input.recurrenceRule
            : existingEvent.recurrenceRule,
        } as CreateEventInput

        const icalString = generateICalEvent(updatedInput, eventId)

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
              message: "Failed to update calendar event",
              cause: error,
            }),
        })

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
        } as CalendarEvent
      }),

    deleteEvent: ({ calendarId, eventId }) =>
      Effect.gen(function* () {
        const calendar = yield* findCalendar(calendarId)

        const objects = yield* Effect.tryPromise({
          try: () =>
            client.fetchCalendarObjects({
              calendar,
            }),
          catch: (error) =>
            new CalDavError({
              message: "Failed to fetch calendar objects",
              cause: error,
            }),
        })

        let targetObj: (typeof objects)[0] | undefined

        for (const obj of objects) {
          if (obj.data) {
            const event = parseICalEvent(
              obj.data,
              calendarId,
              obj.url,
              obj.etag
            )
            if (event && event.id === eventId) {
              targetObj = obj
              break
            }
          }
        }

        if (!targetObj) {
          return yield* Effect.fail(new EventNotFoundError({ calendarId, eventId }))
        }

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
              message: "Failed to delete calendar event",
              cause: error,
            }),
        })
      }),

    freeBusy: ({ calendarIds, from, to }) =>
      Effect.gen(function* () {
        const results: FreeBusyResult[] = []

        for (const calendarId of calendarIds) {
          const events = yield* service.fetchEvents({
            calendarId,
            from,
            to,
          })

          // Convert events to busy slots
          const slots = events.map((event) => ({
            start: event.start,
            end: event.end,
            type: "busy" as const,
          }))

          results.push({
            calendarId,
            slots,
          } as FreeBusyResult)
        }

        return results
      }),
  }

  return service
})

// ============================================================================
// Live Layer
// ============================================================================

export const CalDavClientLive: Layer.Layer<
  CalDavClient,
  CalDavAuthError | CalDavError,
  FastmailConfig
> = Layer.effect(CalDavClient, make)
