import { describe, expect, it } from "@codeforbreakfast/bun-test-effect";
import { Effect, Option } from "effect";

import { MockLayer } from "../test/mock-service.ts";
import { eventsHandler } from "./events.ts";

describe("eventsHandler", () => {
  it.effect("returns success envelope with events", () =>
    Effect.gen(function* () {
      const env = yield* eventsHandler({
        calendarId: "work",
        from: Option.none(),
        to: Option.none(),
        max: Option.none(),
        query: Option.none(),
      });
      expect(env.ok).toBe(true);
      expect(env.command).toBe("events");
      if (!env.ok) return;
      expect(env.result.count).toBe(1);
      expect(env.result.events[0]!.summary).toBe("Team standup");
      expect(env.result.truncated).toBe(false);
      expect(env.result.total).toBe(1);
    }).pipe(Effect.provide(MockLayer)),
  );

  it.effect("includes next_actions for event detail and creation", () =>
    Effect.gen(function* () {
      const env = yield* eventsHandler({
        calendarId: "work",
        from: Option.none(),
        to: Option.none(),
        max: Option.none(),
        query: Option.none(),
      });
      expect(env.ok).toBe(true);
      expect(env.next_actions).toHaveLength(2);
      expect(env.next_actions[0]!.command).toContain("fmcal event work");
      expect(env.next_actions[1]!.command).toContain("fmcal create work");
    }).pipe(Effect.provide(MockLayer)),
  );
});
