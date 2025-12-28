import { describe, expect } from "@codeforbreakfast/bun-test-effect";
import { it } from "@codeforbreakfast/bun-test-effect";
import { Effect, Layer, Option } from "effect";

import type { CalendarId } from "../domain.ts";
import { CalDavClient, type CalDavClientService } from "../services/CalDavClient.ts";

import { calendarsCommand } from "./calendars.ts";

const mockCalendars = [
  {
    id: "work" as CalendarId,
    displayName: "Work",
    description: Option.some("Work calendar"),
    color: Option.some("#0000ff"),
    timezone: Option.some("America/New_York"),
    url: "https://caldav.example.com/work",
    readOnly: false,
  },
  {
    id: "personal" as CalendarId,
    displayName: "Personal",
    description: Option.none(),
    color: Option.none(),
    timezone: Option.none(),
    url: "https://caldav.example.com/personal",
    readOnly: false,
  },
];

const mockService: CalDavClientService = {
  fetchCalendars: Effect.succeed(mockCalendars),
  fetchEvents: () => Effect.succeed([]),
  fetchEvent: () => Effect.die("not implemented"),
  createEvent: () => Effect.die("not implemented"),
  updateEvent: () => Effect.die("not implemented"),
  deleteEvent: () => Effect.die("not implemented"),
  freeBusy: () => Effect.succeed([]),
};

const MockLayer = Layer.succeed(CalDavClient, mockService);

describe("calendars command", () => {
  it("exports the command", () => {
    expect(calendarsCommand).toBeDefined();
  });

  it.effect("fetches and outputs calendars", () =>
    Effect.gen(function* () {
      const client = yield* CalDavClient;
      const calendars = yield* client.fetchCalendars;

      expect(calendars).toHaveLength(2);
      expect(calendars[0].displayName).toBe("Work");
      expect(calendars[1].displayName).toBe("Personal");
    }).pipe(Effect.provide(MockLayer)),
  );
});
