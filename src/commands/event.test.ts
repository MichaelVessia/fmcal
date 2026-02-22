import { describe, expect, it } from "@codeforbreakfast/bun-test-effect";
import { Effect } from "effect";

import { MockLayer } from "../test/mock-service.ts";
import { eventHandler } from "./event.ts";

describe("eventHandler", () => {
  it.effect("returns success envelope with event detail", () =>
    Effect.gen(function* () {
      const env = yield* eventHandler({ calendarId: "work", eventId: "evt-1" });
      expect(env.ok).toBe(true);
      expect(env.command).toBe("event");
      if (!env.ok) return;
      expect(env.result.summary).toBe("Team standup");
      expect(String(env.result.id)).toBe("evt-1");
    }).pipe(Effect.provide(MockLayer)),
  );

  it.effect("includes update and delete next_actions", () =>
    Effect.gen(function* () {
      const env = yield* eventHandler({ calendarId: "work", eventId: "evt-1" });
      expect(env.ok).toBe(true);
      expect(env.next_actions).toHaveLength(2);
      expect(env.next_actions[0]!.command).toContain("fmcal update work evt-1");
      expect(env.next_actions[1]!.command).toContain("fmcal delete work evt-1");
    }).pipe(Effect.provide(MockLayer)),
  );
});
