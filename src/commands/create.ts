import { Args, Command, Options } from "@effect/cli";
import { Effect, Option } from "effect";

import type { CalendarId } from "../domain.ts";
import { CreateEventInput } from "../domain.ts";
import * as Envelope from "../envelope/index.ts";
import * as NextActions from "../envelope/next-actions.ts";
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

export const createHandler = (args: {
  calendarId: string;
  summary: string;
  start: Date;
  end: Date;
  description: Option.Option<string>;
  location: Option.Option<string>;
  allDay: Option.Option<boolean>;
}) =>
  Effect.gen(function* () {
    const client = yield* CalDavClient;

    const input = new CreateEventInput({
      summary: args.summary,
      start: args.start,
      end: args.end,
      description: Option.isSome(args.description) ? Option.some(args.description.value) : Option.none(),
      location: Option.isSome(args.location) ? Option.some(args.location.value) : Option.none(),
      allDay: Option.getOrUndefined(args.allDay),
      recurrenceRule: Option.none(),
    });

    const event = yield* client.createEvent({
      calendarId: args.calendarId as CalendarId,
      input,
    });

    return Envelope.success("create", event, [
      NextActions.getEvent(args.calendarId, event.id),
      NextActions.listEvents(args.calendarId),
    ]);
  });

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
  (args) => createHandler(args).pipe(Effect.flatMap(Envelope.output)),
).pipe(Command.withDescription("Create a new event"));
