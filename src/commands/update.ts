import { Args, Command, Options } from "@effect/cli"
import { Console, Effect, Option } from "effect"

import type { CalendarId, EventId } from "../domain.ts"
import { UpdateEventInput } from "../domain.ts"
import { CalDavClient } from "../services/CalDavClient.ts"

const calendarIdArg = Args.text({ name: "calendarId" })
const eventIdArg = Args.text({ name: "eventId" })

const summaryOption = Options.text("summary").pipe(Options.optional)
const startOption = Options.date("start").pipe(Options.optional)
const endOption = Options.date("end").pipe(Options.optional)
const descriptionOption = Options.text("description").pipe(Options.optional)
const locationOption = Options.text("location").pipe(Options.optional)
const allDayOption = Options.boolean("all-day").pipe(Options.optional)

export const updateCommand = Command.make(
  "update",
  {
    calendarId: calendarIdArg,
    eventId: eventIdArg,
    summary: summaryOption,
    start: startOption,
    end: endOption,
    description: descriptionOption,
    location: locationOption,
    allDay: allDayOption,
  },
  ({ calendarId, eventId, summary, start, end, description, location, allDay }) =>
    Effect.gen(function* () {
      const client = yield* CalDavClient

      const input = new UpdateEventInput({
        summary: Option.isSome(summary) ? Option.some(summary.value) : Option.none(),
        start: Option.isSome(start) ? Option.some(start.value) : Option.none(),
        end: Option.isSome(end) ? Option.some(end.value) : Option.none(),
        description: Option.isSome(description)
          ? Option.some(description.value)
          : Option.none(),
        location: Option.isSome(location)
          ? Option.some(location.value)
          : Option.none(),
        allDay: Option.isSome(allDay) ? Option.some(allDay.value) : Option.none(),
        recurrenceRule: Option.none(),
      })

      const event = yield* client.updateEvent({
        calendarId: calendarId as CalendarId,
        eventId: eventId as EventId,
        input,
      })

      yield* Console.log(JSON.stringify(event, null, 2))
    })
)
