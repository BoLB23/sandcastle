import { describe, expect, it } from "vitest";
import { rankAvailabilityWindows } from "./scheduling";

describe("rankAvailabilityWindows", () => {
  it("ranks windows by maximum participant overlap", () => {
    const start = new Date("2026-06-25T23:00:00.000Z");
    const slots = [0, 1, 2].map((offset) => ({
      id: `slot-${offset}`,
      startsAt: new Date(start.getTime() + offset * 60 * 60 * 1000),
      endsAt: new Date(start.getTime() + (offset + 1) * 60 * 60 * 1000)
    }));

    const recommendations = rankAvailabilityWindows(
      slots,
      [
        { userId: "mike", slotIds: ["slot-1", "slot-2"] },
        { userId: "chris", slotIds: ["slot-1"] },
        { userId: "dave", slotIds: ["slot-0", "slot-1"] }
      ],
      ["mike", "chris", "dave", "will"]
    );

    expect(recommendations[0]).toMatchObject({
      slotIds: ["slot-1"],
      availableUserIds: ["mike", "chris", "dave"],
      missingUserIds: ["will"]
    });
  });

  it("merges adjacent slots with the same available users", () => {
    const start = new Date("2026-06-26T00:00:00.000Z");
    const slots = [0, 1].map((offset) => ({
      id: `slot-${offset}`,
      startsAt: new Date(start.getTime() + offset * 60 * 60 * 1000),
      endsAt: new Date(start.getTime() + (offset + 1) * 60 * 60 * 1000)
    }));

    const recommendations = rankAvailabilityWindows(
      slots,
      [
        { userId: "mike", slotIds: ["slot-0", "slot-1"] },
        { userId: "chris", slotIds: ["slot-0", "slot-1"] }
      ],
      ["mike", "chris"]
    );

    expect(recommendations[0].slotIds).toEqual(["slot-0", "slot-1"]);
    expect(recommendations[0].endsAt.toISOString()).toBe("2026-06-26T02:00:00.000Z");
  });
});
