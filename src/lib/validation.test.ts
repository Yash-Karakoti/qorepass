import { describe, expect, it } from "vitest";

import { qorAddressSchema, txHashSchema } from "./validation.js";

describe("qorAddressSchema", () => {
  it("rejects garbage", () => {
    expect(qorAddressSchema.safeParse("not-an-address").success).toBe(false);
  });
});

describe("txHashSchema", () => {
  it("normalizes 0x prefix", () => {
    const hex = "a".repeat(64);
    const parsed = txHashSchema.parse(`0x${hex}`);
    expect(parsed).toBe(hex);
  });

  it("rejects short hash", () => {
    expect(txHashSchema.safeParse("abc").success).toBe(false);
  });
});