import { Command } from "@effect/cli"
import { Effect } from "effect"

import * as Envelope from "../envelope/index.ts"
import * as NextActions from "../envelope/next-actions.ts"
import { CalDavClient } from "../services/CalDavClient.ts"

export const calendarsHandler = () =>
  Effect.gen(function* () {
    const client = yield* CalDavClient
    const calendars = yield* client.fetchCalendars

    return Envelope.success(
      "calendars",
      { calendars },
      calendars.length > 0
        ? [NextActions.listEvents(calendars[0]!.id), NextActions.freeBusy()]
        : [],
    )
  })

export const calendarsCommand = Command.make("calendars", {}, () =>
  calendarsHandler().pipe(Effect.flatMap(Envelope.output)),
).pipe(Command.withDescription("List all calendars"))
