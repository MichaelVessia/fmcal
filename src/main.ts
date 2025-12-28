import { Command } from "@effect/cli"
import { BunContext, BunRuntime } from "@effect/platform-bun"
import { Effect, Layer } from "effect"

import { calendarsCommand } from "./commands/calendars.ts"
import { createCommand } from "./commands/create.ts"
import { deleteCommand } from "./commands/delete.ts"
import { eventCommand } from "./commands/event.ts"
import { eventsCommand } from "./commands/events.ts"
import { freebusyCommand } from "./commands/freebusy.ts"
import { updateCommand } from "./commands/update.ts"
import { FastmailConfigLive } from "./config.ts"
import { CalDavClientLive } from "./services/CalDavClient.ts"

// Root command
const fmcal = Command.make("fmcal", {}, () =>
  Effect.void
).pipe(
  Command.withSubcommands([
    calendarsCommand,
    eventsCommand,
    eventCommand,
    createCommand,
    updateCommand,
    deleteCommand,
    freebusyCommand,
  ])
)

// Compose layers
const MainLayer = Layer.mergeAll(
  CalDavClientLive.pipe(Layer.provide(FastmailConfigLive)),
  BunContext.layer
)

// CLI runner
const cli = Command.run(fmcal, {
  name: "fmcal",
  version: "0.1.0",
})

// Run
Effect.suspend(() => cli(process.argv)).pipe(
  Effect.provide(MainLayer),
  BunRuntime.runMain
)
