import { describe, expect, it } from "@codeforbreakfast/bun-test-effect"
import { Effect } from "effect"

import * as Envelope from "./index.ts"

describe("Envelope.success", () => {
  it("builds a success envelope with defaults", () => {
    const env = Envelope.success("test", { value: 42 })
    expect(env).toEqual({
      ok: true,
      command: "test",
      result: { value: 42 },
      next_actions: [],
    })
  })

  it("includes next_actions when provided", () => {
    const actions = [{ command: "fmcal calendars", description: "List calendars" }]
    const env = Envelope.success("test", "ok", actions)
    expect(env.ok).toBe(true)
    expect(env.next_actions).toHaveLength(1)
    expect(env.next_actions[0]?.command).toBe("fmcal calendars")
  })
})

describe("Envelope.error", () => {
  it("builds an error envelope with defaults", () => {
    const env = Envelope.error("test", "something broke", "TestError", "try again")
    expect(env).toEqual({
      ok: false,
      command: "test",
      error: { message: "something broke", code: "TestError" },
      fix: "try again",
      next_actions: [],
    })
  })

  it("includes next_actions when provided", () => {
    const actions = [{ command: "fmcal calendars", description: "List calendars" }]
    const env = Envelope.error("test", "not found", "NotFound", "check id", actions)
    expect(env.ok).toBe(false)
    expect(env.next_actions).toHaveLength(1)
  })
})

describe("Envelope.output", () => {
  it.effect("serializes success envelope to JSON", () =>
    Effect.gen(function* () {
      const env = Envelope.success("test", { x: 1 })
      // output writes to Console.log; just verify it doesn't throw
      yield* Envelope.output(env)
    }),
  )

  it.effect("serializes error envelope to JSON", () =>
    Effect.gen(function* () {
      const env = Envelope.error("test", "err", "Code", "fix")
      yield* Envelope.output(env)
    }),
  )
})
