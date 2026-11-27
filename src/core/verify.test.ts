import { describe, expect, it } from "vitest";

import { parseCompactMemo, passportFromCompact, passportPayloadHash } from "./passport.js";

describe("verify logic (memo-only)", () => {
  it("accepts when recomputed hash matches memo hash", () => {
    const address = "qor1verify00000000000000000000000000000";
    const unixTime = 1_731_500_000;
    const passport = passportFromCompact(address, {
      score: 82,
      grade: "B",
      bitmask: 7,
      unixTime,
    });
    const hash = passportPayloadHash(passport);
    const memo = `qorepass:v1:${passport.score}:${passport.grade}:${7}:${unixTime}:${hash}`;
    const parsed = parseCompactMemo(memo)!;
    const recomputed = passportFromCompact(address, parsed);
    expect(passportPayloadHash(recomputed)).toBe(parsed.hash);
  });

  it("rejects tampered score in memo", () => {
    const address = "qor1verify00000000000000000000000000000";
    const passport = passportFromCompact(address, {
      score: 50,
      grade: "F",
      bitmask: 1,
      unixTime: 1_731_500_000,
    });
    const hash = passportPayloadHash(passport);
    const memo = `qorepass:v1:99:A:1:1731500000:${hash}`;
    const parsed = parseCompactMemo(memo)!;
    const recomputed = passportFromCompact(address, parsed);
    expect(passportPayloadHash(recomputed)).not.toBe(parsed.hash);
  });
});