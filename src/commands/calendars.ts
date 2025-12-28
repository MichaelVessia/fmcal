import { Command } from "@effect/cli"
import { Console, Effect } from "effect"

import { CalDavClient } from "../services/CalDavClient.ts"

export const calendarsCommand = Command.make(
  "calendars",
  {},
  () =>
    Effect.gen(function* () {
      const client = yield* CalDavClient
      const calendars = yield* client.fetchCalendars

      yield* Console.log(JSON.stringify(calendars, null, 2))
    })
)
