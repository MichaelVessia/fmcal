import { Args, Command } from "@effect/cli"
import { Console, Effect } from "effect"

import type { CalendarId, EventId } from "../domain.ts"
import { CalDavClient } from "../services/CalDavClient.ts"

const calendarIdArg = Args.text({ name: "calendarId" })
const eventIdArg = Args.text({ name: "eventId" })

export const eventCommand = Command.make(
  "event",
  {
    calendarId: calendarIdArg,
    eventId: eventIdArg,
  },
  ({ calendarId, eventId }) =>
    Effect.gen(function* () {
      const client = yield* CalDavClient
      const event = yield* client.fetchEvent({
        calendarId: calendarId as CalendarId,
        eventId: eventId as EventId,
      })

      yield* Console.log(JSON.stringify(event, null, 2))
    })
)
