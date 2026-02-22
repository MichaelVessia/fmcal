import { Args, Command, Options } from "@effect/cli";
import { Effect } from "effect";

import type { CalendarId } from "../domain.ts";
import * as Envelope from "../envelope/index.ts";
import * as NextActions from "../envelope/next-actions.ts";
import { CalDavClient } from "../services/CalDavClient.ts";

const calendarIdsArg = Args.text({ name: "calendarIds" });

const currentDate = new Date().toISOString().split("T")[0];

const fromOption = Options.date("from").pipe(
  Options.withDescription(`ISO-8601 datetime. Current date: ${currentDate}`),
);
const toOption = Options.date("to").pipe(
  Options.withDescription(`ISO-8601 datetime. Current date: ${currentDate}`),
);

export const freebusyHandler = (args: { calendarIds: string; from: Date; to: Date }) =>
  Effect.gen(function* () {
    const client = yield* CalDavClient;

    const ids = args.calendarIds.split(",").map((id) => id.trim() as CalendarId);

    const results = yield* client.freeBusy({
      calendarIds: ids,
      from: args.from,
      to: args.to,
    });

    return Envelope.success(
      "freebusy",
      { results },
      ids.map((id) => NextActions.createEvent(id)),
    );
  });

export const freebusyCommand = Command.make(
  "freebusy",
  {
    calendarIds: calendarIdsArg,
    from: fromOption,
    to: toOption,
  },
  (args) => freebusyHandler(args).pipe(Effect.flatMap(Envelope.output)),
).pipe(Command.withDescription("Check free/busy availability"));
