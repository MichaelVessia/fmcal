import { describe, expect, it } from "@codeforbreakfast/bun-test-effect";
import { Effect, Option } from "effect";

import { MockLayer } from "../test/mock-service.ts";
import { createHandler } from "./create.ts";

describe("createHandler", () => {
  it.effect("returns success envelope with created event", () =>
    Effect.gen(function* () {
      const env = yield* createHandler({
        calendarId: "work",
        summary: "New meeting",
        start: new Date("2026-03-01T14:00:00Z"),
        end: new Date("2026-03-01T15:00:00Z"),
        description: Option.none(),
        location: Option.none(),
        allDay: Option.none(),
      });
      expect(env.ok).toBe(true);
      expect(env.command).toBe("create");
      if (!env.ok) return;
      expect(env.result.summary).toBe("Team standup");
    }).pipe(Effect.provide(MockLayer)),
  );

  it.effect("includes get event and list events next_actions", () =>
    Effect.gen(function* () {
      const env = yield* createHandler({
        calendarId: "work",
        summary: "New meeting",
        start: new Date("2026-03-01T14:00:00Z"),
        end: new Date("2026-03-01T15:00:00Z"),
        description: Option.none(),
        location: Option.none(),
        allDay: Option.none(),
      });
      expect(env.ok).toBe(true);
      expect(env.next_actions).toHaveLength(2);
      expect(env.next_actions[0]!.command).toContain("fmcal event work");
      expect(env.next_actions[1]!.command).toContain("fmcal events work");
    }).pipe(Effect.provide(MockLayer)),
  );
});
