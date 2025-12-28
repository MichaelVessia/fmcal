import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"

/**
 * Configuration for connecting to Fastmail CalDAV server
 */
export interface FastmailConfigShape {
  readonly serverUrl: string
  readonly username: string
  readonly password: Redacted.Redacted<string>
}

/**
 * Service tag for FastmailConfig
 */
export class FastmailConfig extends Context.Tag("FastmailConfig")<
  FastmailConfig,
  FastmailConfigShape
>() {}

/**
 * Config schema for loading from environment variables
 */
const configSchema = Config.all({
  serverUrl: Config.string("FMCAL_SERVER_URL").pipe(
    Config.withDefault("https://caldav.fastmail.com/")
  ),
  username: Config.string("FMCAL_USERNAME"),
  password: Config.redacted("FMCAL_PASSWORD"),
})

/**
 * Layer that loads FastmailConfig from environment variables
 */
export const FastmailConfigLive: Layer.Layer<FastmailConfig, ConfigError> =
  Layer.effect(
    FastmailConfig,
    Effect.map(configSchema, (config) => config)
  )

/**
 * Create a test layer with provided credentials
 */
export const FastmailConfigTest = (
  config: Omit<FastmailConfigShape, "password"> & { password: string }
): Layer.Layer<FastmailConfig> =>
  Layer.succeed(FastmailConfig, {
    serverUrl: config.serverUrl,
    username: config.username,
    password: Redacted.make(config.password),
  })
