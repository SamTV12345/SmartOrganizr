import { describe, it, expect } from "vitest";
import { getOfflineBoot, setOfflineBoot } from "./useOnlineStatus";

describe("offlineBoot flag", () => {
  it("defaults to false and can be set", () => {
    expect(getOfflineBoot()).toBe(false);
    setOfflineBoot(true);
    expect(getOfflineBoot()).toBe(true);
    setOfflineBoot(false);
  });
});
