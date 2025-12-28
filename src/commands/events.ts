import { Args, Command, Options } from "@effect/cli";
import { Console, Effect, Option } from "effect";

import type { CalendarId } from "../domain.ts";
import { CalDavClient } from "../services/CalDavClient.ts";

const calendarIdArg = Args.text({ name: "calendarId" });

const currentDate = new Date().toISOString().split("T")[0];

const fromOption = Options.date("from").pipe(
  Options.withDescription(`ISO-8601 datetime. Current date: ${currentDate}`),
  Options.optional,
);
const toOption = Options.date("to").pipe(
  Options.withDescription(`ISO-8601 datetime. Current date: ${currentDate}`),
  Options.optional,
);
const maxOption = Options.integer("max").pipe(Options.optional);
const queryOption = Options.text("query").pipe(Options.optional);

export const eventsCommand = Command.make(
  "events",
  {
    calendarId: calendarIdArg,
    from: fromOption,
    to: toOption,
    max: maxOption,
    query: queryOption,
  },
  ({ calendarId, from, to, max, query }) =>
    Effect.gen(function* () {
      const client = yield* CalDavClient;
      const params: {
        calendarId: CalendarId;
        from?: Date;
        to?: Date;
        max?: number;
        query?: string;
      } = { calendarId: calendarId as CalendarId };

      if (Option.isSome(from)) params.from = from.value;
      if (Option.isSome(to)) params.to = to.value;
      if (Option.isSome(max)) params.max = max.value;
      if (Option.isSome(query)) params.query = query.value;

      const events = yield* client.fetchEvents(params);

      yield* Console.log(JSON.stringify(events, null, 2));
    }),
);
