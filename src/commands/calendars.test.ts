import { describe, expect, it } from "@codeforbreakfast/bun-test-effect";
import { Effect } from "effect";

import { MockLayer, mockCalendars } from "../test/mock-service.ts";
import { calendarsHandler } from "./calendars.ts";

describe("calendarsHandler", () => {
  it.effect("returns success envelope with calendars", () =>
    Effect.gen(function* () {
      const env = yield* calendarsHandler();
      expect(env.ok).toBe(true);
      expect(env.command).toBe("calendars");
      if (!env.ok) return;
      expect(env.result.calendars).toHaveLength(2);
      expect(env.result.calendars[0]!.displayName).toBe("Work");
      expect(env.result.calendars[1]!.displayName).toBe("Personal");
    }).pipe(Effect.provide(MockLayer)),
  );

  it.effect("includes next_actions when calendars exist", () =>
    Effect.gen(function* () {
      const env = yield* calendarsHandler();
      expect(env.ok).toBe(true);
      expect(env.next_actions.length).toBeGreaterThan(0);
      expect(env.next_actions[0]!.command).toContain(`events ${mockCalendars[0]!.id}`);
    }).pipe(Effect.provide(MockLayer)),
  );
});
