import { Args, Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";

import type { CalendarId } from "../domain.ts";
import * as Envelope from "../envelope/index.ts";
import * as NextActions from "../envelope/next-actions.ts";
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

export const eventsHandler = (args: {
  calendarId: string;
  from: Option.Option<Date>;
  to: Option.Option<Date>;
  max: Option.Option<number>;
  query: Option.Option<string>;
}) =>
  Effect.gen(function* () {
    const client = yield* CalDavClient;
    const params: {
      calendarId: CalendarId;
      from?: Date;
      to?: Date;
      max?: number;
      query?: string;
    } = { calendarId: args.calendarId as CalendarId };

    if (Option.isSome(args.from)) params.from = args.from.value;
    if (Option.isSome(args.to)) params.to = args.to.value;
    if (Option.isSome(args.max)) params.max = args.max.value;
    if (Option.isSome(args.query)) params.query = args.query.value;

    const allEvents = yield* client.fetchEvents(params);
    const { items: events, truncated, total } = Envelope.truncateList(allEvents);

    return Envelope.success(
      "events",
      { events, count: events.length, truncated, total },
      [NextActions.getEvent(args.calendarId, "<eventId>"), NextActions.createEvent(args.calendarId)],
    );
  });

export const eventsCommand = Command.make(
  "events",
  {
    calendarId: calendarIdArg,
    from: fromOption,
    to: toOption,
    max: maxOption,
    query: queryOption,
  },
  (args) => eventsHandler(args).pipe(Effect.flatMap(Envelope.output)),
).pipe(Command.withDescription("List events in a calendar"));
