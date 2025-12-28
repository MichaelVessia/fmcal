import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";

import type { CalendarId } from "../domain.ts";
import { CreateEventInput } from "../domain.ts";
import { CalDavClient } from "../services/CalDavClient.ts";

const calendarIdArg = Args.text({ name: "calendarId" });

const currentDate = new Date().toISOString().split("T")[0];

const summaryOption = Options.text("summary");
const startOption = Options.date("start").pipe(
  Options.withDescription(`ISO-8601 datetime. Current date: ${currentDate}`),
);
const endOption = Options.date("end").pipe(
  Options.withDescription(`ISO-8601 datetime. Current date: ${currentDate}`),
);
const descriptionOption = Options.text("description").pipe(Options.optional);
const locationOption = Options.text("location").pipe(Options.optional);
const allDayOption = Options.boolean("all-day").pipe(Options.optional);

export const createCommand = Command.make(
  "create",
  {
    calendarId: calendarIdArg,
    summary: summaryOption,
    start: startOption,
    end: endOption,
    description: descriptionOption,
    location: locationOption,
    allDay: allDayOption,
  },
  ({ calendarId, summary, start, end, description, location, allDay }) =>
    Effect.gen(function* () {
      const client = yield* CalDavClient;

      const input = new CreateEventInput({
        summary,
        start,
        end,
        description: Option.isSome(description) ? Option.some(description.value) : Option.none(),
        location: Option.isSome(location) ? Option.some(location.value) : Option.none(),
        allDay: Option.getOrUndefined(allDay),
        recurrenceRule: Option.none(),
      });

      const event = yield* client.createEvent({
        calendarId: calendarId as CalendarId,
        input,
      });

      yield* Console.log(JSON.stringify(event, null, 2));
    }),
);
