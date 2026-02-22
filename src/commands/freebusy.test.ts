import { describe, expect, it } from "@codeforbreakfast/bun-test-effect";
import { Effect } from "effect";

import { MockLayer } from "../test/mock-service.ts";
import { freebusyHandler } from "./freebusy.ts";

describe("freebusyHandler", () => {
  it.effect("returns success envelope with freebusy results", () =>
    Effect.gen(function* () {
      const env = yield* freebusyHandler({
        calendarIds: "work,personal",
        from: new Date("2026-03-01T00:00:00Z"),
        to: new Date("2026-03-02T00:00:00Z"),
      });
      expect(env.ok).toBe(true);
      expect(env.command).toBe("freebusy");
      if (!env.ok) return;
      expect(env.result.results).toHaveLength(1);
      expect(String(env.result.results[0]!.calendarId)).toBe("work");
    }).pipe(Effect.provide(MockLayer)),
  );

  it.effect("includes create event next_actions for each calendar", () =>
    Effect.gen(function* () {
      const env = yield* freebusyHandler({
        calendarIds: "work,personal",
        from: new Date("2026-03-01T00:00:00Z"),
        to: new Date("2026-03-02T00:00:00Z"),
      });
      expect(env.ok).toBe(true);
      expect(env.next_actions).toHaveLength(2);
      expect(env.next_actions[0]!.command).toContain("fmcal create work");
      expect(env.next_actions[1]!.command).toContain("fmcal create personal");
    }).pipe(Effect.provide(MockLayer)),
  );
});
