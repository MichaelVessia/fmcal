import { describe, expect, it } from "@codeforbreakfast/bun-test-effect";
import { Effect, Option } from "effect";

import { MockLayer } from "../test/mock-service.ts";
import { updateHandler } from "./update.ts";

describe("updateHandler", () => {
  it.effect("returns success envelope with updated event", () =>
    Effect.gen(function* () {
      const env = yield* updateHandler({
        calendarId: "work",
        eventId: "evt-1",
        summary: Option.some("Updated title"),
        start: Option.none(),
        end: Option.none(),
        description: Option.none(),
        location: Option.none(),
        allDay: Option.none(),
      });
      expect(env.ok).toBe(true);
      expect(env.command).toBe("update");
      if (!env.ok) return;
      expect(String(env.result.id)).toBe("evt-1");
    }).pipe(Effect.provide(MockLayer)),
  );

  it.effect("includes get event next_action", () =>
    Effect.gen(function* () {
      const env = yield* updateHandler({
        calendarId: "work",
        eventId: "evt-1",
        summary: Option.none(),
        start: Option.none(),
        end: Option.none(),
        description: Option.none(),
        location: Option.none(),
        allDay: Option.none(),
      });
      expect(env.ok).toBe(true);
      expect(env.next_actions).toHaveLength(1);
      expect(env.next_actions[0]!.command).toContain("fmcal event work evt-1");
    }).pipe(Effect.provide(MockLayer)),
  );
});
