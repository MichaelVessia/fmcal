import { Args, Command, Options } from "@effect/cli"
import { Console, Effect } from "effect"

import type { CalendarId } from "../domain.ts"
import { CalDavClient } from "../services/CalDavClient.ts"

const calendarIdsArg = Args.text({ name: "calendarIds" })
const fromOption = Options.date("from")
const toOption = Options.date("to")

export const freebusyCommand = Command.make(
  "freebusy",
  {
    calendarIds: calendarIdsArg,
    from: fromOption,
    to: toOption,
  },
  ({ calendarIds, from, to }) =>
    Effect.gen(function* () {
      const client = yield* CalDavClient

      // Split comma-separated calendar IDs
      const ids = calendarIds.split(",").map((id) => id.trim() as CalendarId)

      const results = yield* client.freeBusy({
        calendarIds: ids,
        from,
        to,
      })

      yield* Console.log(JSON.stringify(results, null, 2))
    })
)
