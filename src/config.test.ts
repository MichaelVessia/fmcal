import { describe, expect } from "@codeforbreakfast/bun-test-effect"
import { it } from "@codeforbreakfast/bun-test-effect"
import { ConfigProvider, Effect, Redacted } from "effect"

import { FastmailConfig, FastmailConfigLive, FastmailConfigTest } from "./config.ts"

describe("FastmailConfig", () => {
  describe("FastmailConfigLive", () => {
    it.effect("loads config from environment variables", () =>
      Effect.gen(function* () {
        const config = yield* FastmailConfig

        expect(config.serverUrl).toBe("https://caldav.fastmail.com/")
        expect(config.username).toBe("test@fastmail.com")
        expect(Redacted.value(config.password)).toBe("test-password")
      }).pipe(
        Effect.provide(FastmailConfigLive),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([
              ["FMCAL_USERNAME", "test@fastmail.com"],
              ["FMCAL_PASSWORD", "test-password"],
            ])
          )
        )
      )
    )

    it.effect("uses default serverUrl when not provided", () =>
      Effect.gen(function* () {
        const config = yield* FastmailConfig

        expect(config.serverUrl).toBe("https://caldav.fastmail.com/")
      }).pipe(
        Effect.provide(FastmailConfigLive),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([
              ["FMCAL_USERNAME", "user@example.com"],
              ["FMCAL_PASSWORD", "pass"],
            ])
          )
        )
      )
    )

    it.effect("allows custom serverUrl", () =>
      Effect.gen(function* () {
        const config = yield* FastmailConfig

        expect(config.serverUrl).toBe("https://custom.caldav.com/")
      }).pipe(
        Effect.provide(FastmailConfigLive),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([
              ["FMCAL_SERVER_URL", "https://custom.caldav.com/"],
              ["FMCAL_USERNAME", "user@example.com"],
              ["FMCAL_PASSWORD", "pass"],
            ])
          )
        )
      )
    )

    it.effect("fails when username is missing", () =>
      Effect.gen(function* () {
        const exit = yield* Effect.exit(
          FastmailConfig.pipe(Effect.provide(FastmailConfigLive))
        )

        expect(exit._tag).toBe("Failure")
      }).pipe(
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([["FMCAL_PASSWORD", "pass"]])
          )
        )
      )
    )

    it.effect("fails when password is missing", () =>
      Effect.gen(function* () {
        const exit = yield* Effect.exit(
          FastmailConfig.pipe(Effect.provide(FastmailConfigLive))
        )

        expect(exit._tag).toBe("Failure")
      }).pipe(
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([["FMCAL_USERNAME", "user@example.com"]])
          )
        )
      )
    )
  })

  describe("FastmailConfigTest", () => {
    it.effect("creates a test layer with provided config", () =>
      Effect.gen(function* () {
        const config = yield* FastmailConfig

        expect(config.serverUrl).toBe("https://test.server.com/")
        expect(config.username).toBe("testuser")
        expect(Redacted.value(config.password)).toBe("testpass")
      }).pipe(
        Effect.provide(
          FastmailConfigTest({
            serverUrl: "https://test.server.com/",
            username: "testuser",
            password: "testpass",
          })
        )
      )
    )
  })
})
