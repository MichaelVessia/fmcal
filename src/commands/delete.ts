import { Args, Command } from "@effect/cli"
import { Console, Effect } from "effect"

import type { CalendarId, EventId } from "../domain.ts"
import { CalDavClient } from "../services/CalDavClient.ts"

const calendarIdArg = Args.text({ name: "calendarId" })
const eventIdArg = Args.text({ name: "eventId" })

export const deleteCommand = Command.make(
  "delete",
  {
    calendarId: calendarIdArg,
    eventId: eventIdArg,
  },
  ({ calendarId, eventId }) =>
    Effect.gen(function* () {
      const client = yield* CalDavClient
      yield* client.deleteEvent({
        calendarId: calendarId as CalendarId,
        eventId: eventId as EventId,
      })

      yield* Console.log(JSON.stringify({ deleted: true, eventId }, null, 2))
    })
)
