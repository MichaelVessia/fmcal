import { Args, Command } from "@effect/cli"
import { Effect } from "effect"

import type { CalendarId, EventId } from "../domain.ts"
import * as Envelope from "../envelope/index.ts"
import * as NextActions from "../envelope/next-actions.ts"
import { CalDavClient } from "../services/CalDavClient.ts"

const calendarIdArg = Args.text({ name: "calendarId" })
const eventIdArg = Args.text({ name: "eventId" })

export const deleteHandler = (args: { calendarId: string; eventId: string }) =>
  Effect.gen(function* () {
    const client = yield* CalDavClient
    yield* client.deleteEvent({
      calendarId: args.calendarId as CalendarId,
      eventId: args.eventId as EventId,
    })

    return Envelope.success(
      "delete",
      { deleted: true, eventId: args.eventId },
      [NextActions.listEvents(args.calendarId)],
    )
  })

export const deleteCommand = Command.make(
  "delete",
  { calendarId: calendarIdArg, eventId: eventIdArg },
  (args) => deleteHandler(args).pipe(Effect.flatMap(Envelope.output)),
).pipe(Command.withDescription("Delete an event"))
