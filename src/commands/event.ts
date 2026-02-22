import { Args, Command } from "@effect/cli"
import { Effect } from "effect"

import type { CalendarId, EventId } from "../domain.ts"
import * as Envelope from "../envelope/index.ts"
import * as NextActions from "../envelope/next-actions.ts"
import { CalDavClient } from "../services/CalDavClient.ts"

const calendarIdArg = Args.text({ name: "calendarId" })
const eventIdArg = Args.text({ name: "eventId" })

export const eventHandler = (args: { calendarId: string; eventId: string }) =>
  Effect.gen(function* () {
    const client = yield* CalDavClient
    const event = yield* client.fetchEvent({
      calendarId: args.calendarId as CalendarId,
      eventId: args.eventId as EventId,
    })

    return Envelope.success("event", event, [
      NextActions.updateEvent(args.calendarId, args.eventId),
      NextActions.deleteEvent(args.calendarId, args.eventId),
    ])
  })

export const eventCommand = Command.make(
  "event",
  { calendarId: calendarIdArg, eventId: eventIdArg },
  (args) => eventHandler(args).pipe(Effect.flatMap(Envelope.output)),
).pipe(Command.withDescription("Get a single event"))
