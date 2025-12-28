# fmcal - Fastmail Calendar CLI

Agent-controllable CLI for Fastmail calendars via CalDAV, built with Effect.

## Overview

Replicates [gccli](https://github.com/badlogic/gccli) feature set for Fastmail instead of Google Calendar. Outputs JSON for easy agent/LLM consumption.

## Tech Stack

- **Runtime**: Bun
- **Framework**: `@effect/cli` + `@effect/platform-bun`
- **CalDAV**: `tsdav`
- **iCal Parsing**: `ical.js` (converts VCALENDAR to clean JSON)
- **Config**: Effect `Config` + `Redacted` for secrets

## Authentication

- **CalDAV Server**: `https://caldav.fastmail.com/`
- **Username**: Fastmail email address (e.g., `user@fastmail.com`)
- **Password**: App-specific password from Fastmail Settings -> Password & Security -> Integrations

## Environment Variables

```bash
FMCAL_USERNAME=user@fastmail.com
FMCAL_PASSWORD=app-specific-password
```

## Commands

| Command | Description |
|---------|-------------|
| `fmcal calendars` | List all calendars |
| `fmcal events <calendarId> [--from] [--to] [--max] [--query]` | List events |
| `fmcal event <calendarId> <eventId>` | Get single event details |
| `fmcal create <calendarId> --summary --start --end [--description] [--location] [--attendees] [--all-day]` | Create event |
| `fmcal update <calendarId> <eventId> [options]` | Update event |
| `fmcal delete <calendarId> <eventId>` | Delete event |
| `fmcal freebusy <calendarIds> --from --to` | Check free/busy |

## Project Structure

```
fmcal/
├── src/
│   ├── main.ts                 # CLI entry, Command.run()
│   ├── commands/
│   │   ├── calendars.ts
│   │   ├── events.ts
│   │   ├── event.ts
│   │   ├── create.ts
│   │   ├── update.ts
│   │   ├── delete.ts
│   │   └── freebusy.ts
│   ├── services/
│   │   └── CalDavClient.ts     # Service tag + layer
│   ├── domain.ts               # Schema classes for Calendar, Event, etc.
│   ├── errors.ts               # Schema.TaggedError definitions
│   └── config.ts               # FastmailConfig service
├── package.json
├── tsconfig.json
└── flake.nix
```

## Implementation Details

### Domain Models (Schema.Class)

Use `Schema.Class` for domain models with branded IDs:

```typescript
// src/domain.ts
import { Schema } from "effect"

// Branded IDs prevent mixing different entity types
export const CalendarId = Schema.String.pipe(Schema.brand("CalendarId"))
export type CalendarId = typeof CalendarId.Type

export const EventId = Schema.String.pipe(Schema.brand("EventId"))
export type EventId = typeof EventId.Type

export class Calendar extends Schema.Class<Calendar>("Calendar")({
  id: CalendarId,
  displayName: Schema.String,
  description: Schema.OptionFromNullOr(Schema.String),
  color: Schema.OptionFromNullOr(Schema.String),
  url: Schema.String,
}) {}

export class CalendarEvent extends Schema.Class<CalendarEvent>("CalendarEvent")({
  id: EventId,
  calendarId: CalendarId,
  summary: Schema.String,
  description: Schema.OptionFromNullOr(Schema.String),
  location: Schema.OptionFromNullOr(Schema.String),
  start: Schema.Date,
  end: Schema.Date,
  allDay: Schema.Boolean,
  attendees: Schema.Array(Schema.String),
  status: Schema.OptionFromNullOr(Schema.String),
  created: Schema.OptionFromNullOr(Schema.Date),
  updated: Schema.OptionFromNullOr(Schema.Date),
}) {}

export class FreeBusySlot extends Schema.Class<FreeBusySlot>("FreeBusySlot")({
  start: Schema.Date,
  end: Schema.Date,
}) {}

export class FreeBusyResult extends Schema.Class<FreeBusyResult>("FreeBusyResult")({
  busy: Schema.Array(FreeBusySlot),
}) {}

// Input types for create/update (no id/calendarId)
export class CreateEventInput extends Schema.Class<CreateEventInput>("CreateEventInput")({
  summary: Schema.String,
  start: Schema.Date,
  end: Schema.Date,
  description: Schema.OptionFromNullOr(Schema.String),
  location: Schema.OptionFromNullOr(Schema.String),
  attendees: Schema.Array(Schema.String),
  allDay: Schema.Boolean,
}) {}

export class UpdateEventInput extends Schema.Class<UpdateEventInput>("UpdateEventInput")({
  summary: Schema.OptionFromNullOr(Schema.String),
  start: Schema.OptionFromNullOr(Schema.Date),
  end: Schema.OptionFromNullOr(Schema.Date),
  description: Schema.OptionFromNullOr(Schema.String),
  location: Schema.OptionFromNullOr(Schema.String),
  attendees: Schema.OptionFromNullOr(Schema.Array(Schema.String)),
}) {}
```

### Error Types (Schema.TaggedError)

Use `Schema.TaggedError` for typed, serializable errors:

```typescript
// src/errors.ts
import { Schema } from "effect"
import { CalendarId, EventId } from "./domain.js"

export class CalDavAuthError extends Schema.TaggedError<CalDavAuthError>()(
  "CalDavAuthError",
  {
    message: Schema.String,
  }
) {}

export class CalendarNotFoundError extends Schema.TaggedError<CalendarNotFoundError>()(
  "CalendarNotFoundError",
  {
    calendarId: CalendarId,
  }
) {}

export class EventNotFoundError extends Schema.TaggedError<EventNotFoundError>()(
  "EventNotFoundError",
  {
    calendarId: CalendarId,
    eventId: EventId,
  }
) {}

export class CalDavError extends Schema.TaggedError<CalDavError>()(
  "CalDavError",
  {
    operation: Schema.String,
    cause: Schema.Defect,
  }
) {}

// Union for service error type
export const CalDavClientError = Schema.Union(
  CalDavAuthError,
  CalendarNotFoundError,
  EventNotFoundError,
  CalDavError
)
export type CalDavClientError = typeof CalDavClientError.Type
```

### Config Layer

Use the recommended config layer pattern:

```typescript
// src/config.ts
import { Config, Context, Effect, Layer, Redacted } from "effect"

export class FastmailConfig extends Context.Tag("@fmcal/FastmailConfig")<
  FastmailConfig,
  {
    readonly serverUrl: string
    readonly username: string
    readonly password: Redacted.Redacted
  }
>() {
  static readonly layer = Layer.effect(
    FastmailConfig,
    Effect.gen(function* () {
      const username = yield* Config.string("FMCAL_USERNAME")
      const password = yield* Config.redacted("FMCAL_PASSWORD")

      return FastmailConfig.of({
        serverUrl: "https://caldav.fastmail.com/",
        username,
        password,
      })
    })
  )

  // For tests
  static readonly testLayer = Layer.succeed(
    FastmailConfig,
    FastmailConfig.of({
      serverUrl: "https://test.caldav.example.com/",
      username: "test@example.com",
      password: Redacted.make("test-password"),
    })
  )
}
```

### CalDAV Service

Service with tag and layer in one file, using `Effect.fn` for tracing:

```typescript
// src/services/CalDavClient.ts
import { Context, Effect, Layer, Redacted } from "effect"
import { DAVClient } from "tsdav"
import ICAL from "ical.js"
import {
  Calendar, CalendarEvent, CalendarId, EventId,
  CreateEventInput, UpdateEventInput, FreeBusyResult
} from "../domain.js"
import {
  CalDavAuthError, CalDavError, EventNotFoundError
} from "../errors.js"
import { FastmailConfig } from "../config.js"

export class CalDavClient extends Context.Tag("@fmcal/CalDavClient")<
  CalDavClient,
  {
    readonly fetchCalendars: Effect.Effect<ReadonlyArray<Calendar>, CalDavError>
    readonly fetchEvents: (params: {
      calendarId: CalendarId
      from?: Date
      to?: Date
    }) => Effect.Effect<ReadonlyArray<CalendarEvent>, CalDavError>
    readonly fetchEvent: (
      calendarId: CalendarId,
      eventId: EventId
    ) => Effect.Effect<CalendarEvent, CalDavError | EventNotFoundError>
    readonly createEvent: (
      calendarId: CalendarId,
      input: CreateEventInput
    ) => Effect.Effect<CalendarEvent, CalDavError>
    readonly updateEvent: (
      calendarId: CalendarId,
      eventId: EventId,
      input: UpdateEventInput
    ) => Effect.Effect<CalendarEvent, CalDavError | EventNotFoundError>
    readonly deleteEvent: (
      calendarId: CalendarId,
      eventId: EventId
    ) => Effect.Effect<void, CalDavError | EventNotFoundError>
    readonly freeBusy: (
      calendarIds: ReadonlyArray<CalendarId>,
      from: Date,
      to: Date
    ) => Effect.Effect<FreeBusyResult, CalDavError>
  }
>() {
  static readonly layer = Layer.effect(
    CalDavClient,
    Effect.gen(function* () {
      const config = yield* FastmailConfig

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
        catch: (error) => CalDavAuthError.make({
          message: error instanceof Error ? error.message : "Login failed"
        })
      })

      // Use Effect.fn for call-site tracing
      const fetchCalendars = Effect.fn("CalDavClient.fetchCalendars")(function* () {
        const calendars = yield* Effect.tryPromise({
          try: () => client.fetchCalendars(),
          catch: (error) => CalDavError.make({ operation: "fetchCalendars", cause: error })
        })

        return calendars.map((cal) =>
          Calendar.make({
            id: CalendarId.make(cal.url),
            displayName: cal.displayName || "Unnamed",
            description: cal.description ?? null,
            color: cal.calendarColor ?? null,
            url: cal.url,
          })
        )
      })

      const fetchEvents = Effect.fn("CalDavClient.fetchEvents")(
        function* ({ calendarId, from, to }: {
          calendarId: CalendarId
          from?: Date
          to?: Date
        }) {
          const objects = yield* Effect.tryPromise({
            try: () => client.fetchCalendarObjects({
              calendar: { url: calendarId },
              timeRange: from && to
                ? { start: from.toISOString(), end: to.toISOString() }
                : undefined,
            }),
            catch: (error) => CalDavError.make({ operation: "fetchEvents", cause: error })
          })

          return objects.map((obj) => parseICalEvent(obj.data, calendarId))
        }
      )

      const fetchEvent = Effect.fn("CalDavClient.fetchEvent")(
        function* (calendarId: CalendarId, eventId: EventId) {
          const objects = yield* Effect.tryPromise({
            try: () => client.fetchCalendarObjects({ calendar: { url: calendarId } }),
            catch: (error) => CalDavError.make({ operation: "fetchEvent", cause: error })
          })

          const obj = objects.find((o) =>
            o.url.includes(eventId) || parseICalEvent(o.data, calendarId).id === eventId
          )

          if (!obj) {
            return yield* EventNotFoundError.make({ calendarId, eventId })
          }

          return parseICalEvent(obj.data, calendarId)
        }
      )

      const createEvent = Effect.fn("CalDavClient.createEvent")(
        function* (calendarId: CalendarId, input: CreateEventInput) {
          const uid = crypto.randomUUID()
          const eventId = EventId.make(uid)
          const event = CalendarEvent.make({
            id: eventId,
            calendarId,
            summary: input.summary,
            start: input.start,
            end: input.end,
            description: input.description ?? null,
            location: input.location ?? null,
            attendees: input.attendees,
            allDay: input.allDay,
            status: null,
            created: null,
            updated: null,
          })
          const ical = generateICalEvent(event)

          yield* Effect.tryPromise({
            try: () => client.createCalendarObject({
              calendar: { url: calendarId },
              filename: `${uid}.ics`,
              iCalString: ical,
            }),
            catch: (error) => CalDavError.make({ operation: "createEvent", cause: error })
          })

          return event
        }
      )

      const updateEvent = Effect.fn("CalDavClient.updateEvent")(
        function* (calendarId: CalendarId, eventId: EventId, input: UpdateEventInput) {
          const objects = yield* Effect.tryPromise({
            try: () => client.fetchCalendarObjects({ calendar: { url: calendarId } }),
            catch: (error) => CalDavError.make({ operation: "updateEvent.fetch", cause: error })
          })

          const obj = objects.find((o) => o.url.includes(eventId))
          if (!obj) {
            return yield* EventNotFoundError.make({ calendarId, eventId })
          }

          const existing = parseICalEvent(obj.data, calendarId)
          const updated = CalendarEvent.make({
            ...existing,
            summary: input.summary ?? existing.summary,
            start: input.start ?? existing.start,
            end: input.end ?? existing.end,
            description: input.description !== undefined ? input.description : existing.description,
            location: input.location !== undefined ? input.location : existing.location,
            attendees: input.attendees ?? existing.attendees,
          })
          const ical = generateICalEvent(updated)

          yield* Effect.tryPromise({
            try: () => client.updateCalendarObject({
              calendarObject: { url: obj.url, data: ical, etag: obj.etag },
            }),
            catch: (error) => CalDavError.make({ operation: "updateEvent.put", cause: error })
          })

          return updated
        }
      )

      const deleteEvent = Effect.fn("CalDavClient.deleteEvent")(
        function* (calendarId: CalendarId, eventId: EventId) {
          const objects = yield* Effect.tryPromise({
            try: () => client.fetchCalendarObjects({ calendar: { url: calendarId } }),
            catch: (error) => CalDavError.make({ operation: "deleteEvent.fetch", cause: error })
          })

          const obj = objects.find((o) => o.url.includes(eventId))
          if (!obj) {
            return yield* EventNotFoundError.make({ calendarId, eventId })
          }

          yield* Effect.tryPromise({
            try: () => client.deleteCalendarObject({
              calendarObject: { url: obj.url, etag: obj.etag }
            }),
            catch: (error) => CalDavError.make({ operation: "deleteEvent.delete", cause: error })
          })
        }
      )

      const freeBusy = Effect.fn("CalDavClient.freeBusy")(
        function* (calendarIds: ReadonlyArray<CalendarId>, from: Date, to: Date) {
          const result = yield* Effect.tryPromise({
            try: () => client.freeBusyQuery({
              url: calendarIds[0],
              timeRange: { start: from.toISOString(), end: to.toISOString() },
            }),
            catch: (error) => CalDavError.make({ operation: "freeBusy", cause: error })
          })

          // Parse VFREEBUSY response
          return FreeBusyResult.make({ busy: result as any })
        }
      )

      return CalDavClient.of({
        fetchCalendars,
        fetchEvents,
        fetchEvent,
        createEvent,
        updateEvent,
        deleteEvent,
        freeBusy,
      })
    })
  )
}

// Helper functions
const parseICalEvent = (icalData: string, calendarId: CalendarId): CalendarEvent => {
  const jcal = ICAL.parse(icalData)
  const comp = new ICAL.Component(jcal)
  const vevent = comp.getFirstSubcomponent("vevent")
  const event = new ICAL.Event(vevent)

  return CalendarEvent.make({
    id: EventId.make(event.uid),
    calendarId,
    summary: event.summary,
    description: event.description || null,
    location: event.location || null,
    start: event.startDate.toJSDate(),
    end: event.endDate.toJSDate(),
    allDay: event.startDate.isDate,
    attendees: event.attendees?.map((a: any) =>
      a.getParameter("cn") || a.getFirstValue()
    ) ?? [],
    status: vevent?.getFirstPropertyValue("status") || null,
    created: null,
    updated: null,
  })
}

const generateICalEvent = (event: CalendarEvent): string => {
  const formatDate = (date: Date, allDay: boolean) => {
    if (allDay) return date.toISOString().slice(0, 10).replace(/-/g, "")
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//fmcal//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}`,
    `DTSTAMP:${formatDate(new Date(), false)}`,
    `DTSTART${event.allDay ? ";VALUE=DATE" : ""}:${formatDate(event.start, event.allDay)}`,
    `DTEND${event.allDay ? ";VALUE=DATE" : ""}:${formatDate(event.end, event.allDay)}`,
    `SUMMARY:${event.summary}`,
  ]

  if (event.description) lines.push(`DESCRIPTION:${event.description}`)
  if (event.location) lines.push(`LOCATION:${event.location}`)
  event.attendees.forEach((a) => lines.push(`ATTENDEE:mailto:${a}`))
  lines.push("END:VEVENT", "END:VCALENDAR")

  return lines.join("\r\n")
}
```

### CLI Commands

Commands use `Effect.gen` and access services via yield*:

```typescript
// src/commands/calendars.ts
import { Command } from "@effect/cli"
import { Console, Effect } from "effect"
import { CalDavClient } from "../services/CalDavClient.js"

export const calendarsCommand = Command.make("calendars", {}, () =>
  Effect.gen(function* () {
    const client = yield* CalDavClient
    const calendars = yield* client.fetchCalendars
    yield* Console.log(JSON.stringify(calendars, null, 2))
  })
).pipe(Command.withDescription("List all calendars"))
```

```typescript
// src/commands/events.ts
import { Args, Command, Options } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import { CalDavClient } from "../services/CalDavClient.js"
import { CalendarId } from "../domain.js"

const calendarIdArg = Args.text({ name: "calendarId" }).pipe(
  Args.withDescription("Calendar ID (URL path)"),
  Args.map(CalendarId.make)
)
const fromOpt = Options.date("from").pipe(
  Options.withDescription("Start date filter"),
  Options.optional
)
const toOpt = Options.date("to").pipe(
  Options.withDescription("End date filter"),
  Options.optional
)

export const eventsCommand = Command.make(
  "events",
  { calendarId: calendarIdArg, from: fromOpt, to: toOpt },
  ({ calendarId, from, to }) =>
    Effect.gen(function* () {
      const client = yield* CalDavClient
      const events = yield* client.fetchEvents({
        calendarId,
        from: Option.getOrUndefined(from),
        to: Option.getOrUndefined(to),
      })
      yield* Console.log(JSON.stringify(events, null, 2))
    })
).pipe(Command.withDescription("List events from a calendar"))
```

```typescript
// src/commands/event.ts
import { Args, Command } from "@effect/cli"
import { Console, Effect } from "effect"
import { CalDavClient } from "../services/CalDavClient.js"
import { CalendarId, EventId } from "../domain.js"

const calendarIdArg = Args.text({ name: "calendarId" }).pipe(
  Args.map(CalendarId.make)
)
const eventIdArg = Args.text({ name: "eventId" }).pipe(
  Args.map(EventId.make)
)

export const eventCommand = Command.make(
  "event",
  { calendarId: calendarIdArg, eventId: eventIdArg },
  ({ calendarId, eventId }) =>
    Effect.gen(function* () {
      const client = yield* CalDavClient
      const event = yield* client.fetchEvent(calendarId, eventId)
      yield* Console.log(JSON.stringify(event, null, 2))
    })
).pipe(Command.withDescription("Get a single event"))
```

```typescript
// src/commands/create.ts
import { Args, Command, Options } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import { CalDavClient } from "../services/CalDavClient.js"
import { CalendarId, CreateEventInput } from "../domain.js"

const calendarIdArg = Args.text({ name: "calendarId" }).pipe(
  Args.map(CalendarId.make)
)
const summary = Options.text("summary").pipe(
  Options.withDescription("Event title")
)
const start = Options.date("start").pipe(
  Options.withDescription("Start date/time")
)
const end = Options.date("end").pipe(
  Options.withDescription("End date/time")
)
const description = Options.text("description").pipe(
  Options.withDescription("Event description"),
  Options.optional
)
const location = Options.text("location").pipe(
  Options.withDescription("Event location"),
  Options.optional
)
const attendees = Options.text("attendees").pipe(
  Options.withDescription("Comma-separated attendee emails"),
  Options.optional
)
const allDay = Options.boolean("all-day").pipe(
  Options.withDescription("All-day event"),
  Options.withDefault(false)
)

export const createCommand = Command.make(
  "create",
  { calendarId: calendarIdArg, summary, start, end, description, location, attendees, allDay },
  (args) =>
    Effect.gen(function* () {
      const client = yield* CalDavClient
      const input = CreateEventInput.make({
        summary: args.summary,
        start: args.start,
        end: args.end,
        description: Option.getOrNull(args.description),
        location: Option.getOrNull(args.location),
        attendees: Option.match(args.attendees, {
          onNone: () => [],
          onSome: (a) => a.split(",").map((s) => s.trim()),
        }),
        allDay: args.allDay,
      })
      const event = yield* client.createEvent(args.calendarId, input)
      yield* Console.log(JSON.stringify(event, null, 2))
    })
).pipe(Command.withDescription("Create a new event"))
```

```typescript
// src/commands/delete.ts
import { Args, Command } from "@effect/cli"
import { Console, Effect } from "effect"
import { CalDavClient } from "../services/CalDavClient.js"
import { CalendarId, EventId } from "../domain.js"

const calendarIdArg = Args.text({ name: "calendarId" }).pipe(
  Args.map(CalendarId.make)
)
const eventIdArg = Args.text({ name: "eventId" }).pipe(
  Args.map(EventId.make)
)

export const deleteCommand = Command.make(
  "delete",
  { calendarId: calendarIdArg, eventId: eventIdArg },
  ({ calendarId, eventId }) =>
    Effect.gen(function* () {
      const client = yield* CalDavClient
      yield* client.deleteEvent(calendarId, eventId)
      yield* Console.log(JSON.stringify({ success: true, deleted: eventId }))
    })
).pipe(Command.withDescription("Delete an event"))
```

### Main Entry Point

Provide layers once at the top level:

```typescript
// src/main.ts
import { Command } from "@effect/cli"
import { BunContext, BunRuntime } from "@effect/platform-bun"
import { Effect, Layer } from "effect"
import { calendarsCommand } from "./commands/calendars.js"
import { eventsCommand } from "./commands/events.js"
import { eventCommand } from "./commands/event.js"
import { createCommand } from "./commands/create.js"
import { updateCommand } from "./commands/update.js"
import { deleteCommand } from "./commands/delete.js"
import { freebusyCommand } from "./commands/freebusy.js"
import { CalDavClient } from "./services/CalDavClient.js"
import { FastmailConfig } from "./config.js"

const fmcal = Command.make("fmcal").pipe(
  Command.withDescription("Fastmail Calendar CLI"),
  Command.withSubcommands([
    calendarsCommand,
    eventsCommand,
    eventCommand,
    createCommand,
    updateCommand,
    deleteCommand,
    freebusyCommand,
  ])
)

const cli = Command.run(fmcal, {
  name: "fmcal",
  version: "0.1.0",
})

// Compose all layers
const MainLayer = CalDavClient.layer.pipe(
  Layer.provide(FastmailConfig.layer),
  Layer.provideMerge(BunContext.layer)
)

// Provide once at entry point
cli(process.argv).pipe(
  Effect.provide(MainLayer),
  BunRuntime.runMain
)
```

## Output Format

All commands output JSON to stdout. Example outputs:

### `fmcal calendars`
```json
[
  {
    "id": "/dav/calendars/user/me@fastmail.com/calendar/",
    "displayName": "Personal",
    "color": "#0000FF",
    "url": "/dav/calendars/user/me@fastmail.com/calendar/"
  }
]
```

### `fmcal events <calendarId> --from 2024-01-01 --to 2024-01-31`
```json
[
  {
    "id": "abc123",
    "calendarId": "/dav/calendars/user/me@fastmail.com/calendar/",
    "summary": "Team Meeting",
    "start": "2024-01-15T10:00:00.000Z",
    "end": "2024-01-15T11:00:00.000Z",
    "allDay": false,
    "location": "Conference Room A",
    "attendees": ["alice@example.com", "bob@example.com"]
  }
]
```

### Error Format
```json
{
  "_tag": "EventNotFoundError",
  "calendarId": "/dav/calendars/user/me@fastmail.com/calendar/",
  "eventId": "nonexistent"
}
```

## Build & Run

```bash
# Enter dev shell
nix develop

# Install dependencies
bun install

# Run directly
bun run src/main.ts calendars

# Build executable
bun build src/main.ts --compile --outfile fmcal

# Usage
./fmcal calendars
./fmcal events "/dav/calendars/user/me@fastmail.com/calendar/" --from 2024-01-01
./fmcal create "/dav/calendars/user/me@fastmail.com/calendar/" --summary "Meeting" --start "2024-01-20T10:00:00Z" --end "2024-01-20T11:00:00Z"
```

## Best Practices Applied

1. **Branded IDs**: `CalendarId` and `EventId` prevent mixing entity types
2. **Schema.Class**: Domain models with validation and serialization
3. **Schema.TaggedError**: Typed, serializable errors with `_tag` for pattern matching
4. **Service pattern**: `Context.Tag` with static `layer` for dependency injection
5. **Effect.fn**: Named functions with call-site tracing
6. **Config layer**: Separate config loading from business logic, with `testLayer` for tests
7. **Redacted secrets**: Password never appears in logs
8. **Single provide**: Layers composed and provided once at entry point
9. **Command descriptions**: `Command.withDescription` for auto-generated help
