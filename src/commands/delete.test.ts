import { describe, expect, it } from "@codeforbreakfast/bun-test-effect";
import { Effect } from "effect";

import { MockLayer } from "../test/mock-service.ts";
import { deleteHandler } from "./delete.ts";

describe("deleteHandler", () => {
  it.effect("returns success envelope with deletion confirmation", () =>
    Effect.gen(function* () {
      const env = yield* deleteHandler({ calendarId: "work", eventId: "evt-1" });
      expect(env.ok).toBe(true);
      expect(env.command).toBe("delete");
      if (!env.ok) return;
      expect(env.result.deleted).toBe(true);
      expect(env.result.eventId).toBe("evt-1");
    }).pipe(Effect.provide(MockLayer)),
  );

  it.effect("includes list events next_action", () =>
    Effect.gen(function* () {
      const env = yield* deleteHandler({ calendarId: "work", eventId: "evt-1" });
      expect(env.ok).toBe(true);
      expect(env.next_actions).toHaveLength(1);
      expect(env.next_actions[0]!.command).toContain("fmcal events work");
    }).pipe(Effect.provide(MockLayer)),
  );
});
