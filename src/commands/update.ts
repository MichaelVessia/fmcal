import { Args, Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";

import type { CalendarId, EventId } from "../domain.ts";
import { UpdateEventInput } from "../domain.ts";
import * as Envelope from "../envelope/index.ts";
import * as NextActions from "../envelope/next-actions.ts";
import { CalDavClient } from "../services/CalDavClient.ts";

const calendarIdArg = Args.text({ name: "calendarId" });
const eventIdArg = Args.text({ name: "eventId" });

const currentDate = new Date().toISOString().split("T")[0];

const summaryOption = Options.text("summary").pipe(Options.optional);
const startOption = Options.date("start").pipe(
  Options.withDescription(`ISO-8601 datetime. Current date: ${currentDate}`),
  Options.optional,
);
const endOption = Options.date("end").pipe(
  Options.withDescription(`ISO-8601 datetime. Current date: ${currentDate}`),
  Options.optional,
);
const descriptionOption = Options.text("description").pipe(Options.optional);
const locationOption = Options.text("location").pipe(Options.optional);
const allDayOption = Options.boolean("all-day").pipe(Options.optional);

export const updateHandler = (args: {
  calendarId: string;
  eventId: string;
  summary: Option.Option<string>;
  start: Option.Option<Date>;
  end: Option.Option<Date>;
  description: Option.Option<string>;
  location: Option.Option<string>;
  allDay: Option.Option<boolean>;
}) =>
  Effect.gen(function* () {
    const client = yield* CalDavClient;

    const input = new UpdateEventInput({
      summary: Option.isSome(args.summary) ? Option.some(args.summary.value) : Option.none(),
      start: Option.isSome(args.start) ? Option.some(args.start.value) : Option.none(),
      end: Option.isSome(args.end) ? Option.some(args.end.value) : Option.none(),
      description: Option.isSome(args.description) ? Option.some(args.description.value) : Option.none(),
      location: Option.isSome(args.location) ? Option.some(args.location.value) : Option.none(),
      allDay: Option.isSome(args.allDay) ? Option.some(args.allDay.value) : Option.none(),
      recurrenceRule: Option.none(),
    });

    const event = yield* client.updateEvent({
      calendarId: args.calendarId as CalendarId,
      eventId: args.eventId as EventId,
      input,
    });

    return Envelope.success("update", event, [
      NextActions.getEvent(args.calendarId, args.eventId),
    ]);
  });

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
  (args) => updateHandler(args).pipe(Effect.flatMap(Envelope.output)),
).pipe(Command.withDescription("Update an existing event"));
