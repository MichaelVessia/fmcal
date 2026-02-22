import { Command } from "@effect/cli";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { Console, Effect, Layer } from "effect";

import { calendarsCommand } from "./commands/calendars.ts";
import { createCommand } from "./commands/create.ts";
import { deleteCommand } from "./commands/delete.ts";
import { eventCommand } from "./commands/event.ts";
import { eventsCommand } from "./commands/events.ts";
import { freebusyCommand } from "./commands/freebusy.ts";
import { updateCommand } from "./commands/update.ts";
import { FastmailConfigLive } from "./config.ts";
import * as Envelope from "./envelope/index.ts";
import * as NextActions from "./envelope/next-actions.ts";
import {
  CalDavAuthError,
  CalDavError,
  CalendarNotFoundError,
  EventNotFoundError,
  ICalGenerateError,
  ICalParseError,
  ReadOnlyCalendarError,
} from "./errors.ts";
import { CalDavClientLive } from "./services/CalDavClient.ts";

const commandTree = {
  name: "fmcal",
  version: "0.1.1",
  description: "CLI for Fastmail calendar management via CalDAV",
  commands: [
    { name: "calendars", description: "List all calendars" },
    {
      name: "events",
      description: "List events in a calendar",
      args: "<calendarId>",
      flags: ["--from", "--to", "--max", "--query"],
    },
    { name: "event", description: "Get a single event", args: "<calendarId> <eventId>" },
    {
      name: "create",
      description: "Create a new event",
      args: "<calendarId>",
      flags: ["--summary", "--start", "--end", "--description", "--location", "--all-day"],
    },
    {
      name: "update",
      description: "Update an existing event",
      args: "<calendarId> <eventId>",
      flags: ["--summary", "--start", "--end", "--description", "--location", "--all-day"],
    },
    { name: "delete", description: "Delete an event", args: "<calendarId> <eventId>" },
    {
      name: "freebusy",
      description: "Check free/busy availability",
      args: "<calendarIds>",
      flags: ["--from", "--to"],
    },
  ],
  environment: {
    FMCAL_USERNAME: { description: "Fastmail username", required: true },
    FMCAL_PASSWORD: { description: "Fastmail app-specific password", required: true },
    FMCAL_SERVER_URL: {
      description: "CalDAV server URL",
      required: false,
      default: "https://caldav.fastmail.com/",
    },
  },
};

const fmcal = Command.make("fmcal", {}, () => Console.log(JSON.stringify(commandTree, null, 2))).pipe(
  Command.withDescription("CLI for Fastmail calendar management via CalDAV"),
  Command.withSubcommands([
    calendarsCommand,
    eventsCommand,
    eventCommand,
    createCommand,
    updateCommand,
    deleteCommand,
    freebusyCommand,
  ]),
);

const MainLayer = Layer.mergeAll(CalDavClientLive.pipe(Layer.provide(FastmailConfigLive)), BunContext.layer);

const cli = Command.run(fmcal, {
  name: "fmcal",
  version: "0.1.1",
});

const errorToEnvelope = (e: unknown): Effect.Effect<void> => {
  if (CalDavAuthError.is(e)) {
    return Envelope.output(
      Envelope.error(
        "fmcal",
        e.message,
        "CalDavAuthError",
        "Check FMCAL_USERNAME and FMCAL_PASSWORD environment variables.",
        [],
      ),
    );
  }
  if (CalendarNotFoundError.is(e)) {
    return Envelope.output(
      Envelope.error("fmcal", e.message, "CalendarNotFoundError", "Run 'fmcal calendars' to list available calendars.", [
        NextActions.listCalendars(),
      ]),
    );
  }
  if (EventNotFoundError.is(e)) {
    return Envelope.output(
      Envelope.error(
        "fmcal",
        e.message,
        "EventNotFoundError",
        `Run 'fmcal events ${e.calendarId}' to list events in this calendar.`,
        [NextActions.listEvents(e.calendarId)],
      ),
    );
  }
  if (ReadOnlyCalendarError.is(e)) {
    return Envelope.output(
      Envelope.error("fmcal", e.message, "ReadOnlyCalendarError", "This calendar is read-only. Use a writable calendar.", [
        NextActions.listCalendars(),
      ]),
    );
  }
  if (CalDavError.is(e)) {
    return Envelope.output(
      Envelope.error("fmcal", e.message, "CalDavError", "Check server status and try again.", []),
    );
  }
  if (ICalParseError.is(e)) {
    return Envelope.output(
      Envelope.error("fmcal", e.message, "ICalParseError", "The calendar data could not be parsed.", []),
    );
  }
  if (ICalGenerateError.is(e)) {
    return Envelope.output(
      Envelope.error("fmcal", e.message, "ICalGenerateError", "Check event input values and try again.", []),
    );
  }

  const message = String(e);
  if (message.includes("FMCAL_USERNAME") || message.includes("FMCAL_PASSWORD")) {
    return Envelope.output(
      Envelope.error(
        "fmcal",
        "Missing required environment variables.",
        "ConfigurationError",
        "Set FMCAL_USERNAME and FMCAL_PASSWORD environment variables.",
        [],
      ),
    );
  }

  return Envelope.output(
    Envelope.error(
      "fmcal",
      message,
      "UnknownError",
      "An unexpected error occurred. Check command syntax and try again.",
      [],
    ),
  );
};

Effect.suspend(() => cli(process.argv)).pipe(
  Effect.provide(MainLayer),
  Effect.catchAll(errorToEnvelope),
  BunRuntime.runMain,
);
