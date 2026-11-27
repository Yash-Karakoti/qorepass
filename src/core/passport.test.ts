import { describe, expect, it } from "vitest";

import { bitmaskFromChecks, checksFromBitmask } from "./checks.js";
import { canonicalJson } from "./canonical.js";
import {
  buildCompactMemo,
  buildPassport,
  parseCompactMemo,
  passportFromCompact,
  passportPayloadHash,
} from "./passport.js";
import type { ScanResult } from "./types.js";

function fixtureScan(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    address: "qor1test00000000000000000000000000000aa",
    network: "qorechain-diana",
    balanceQor: "1",
    balanceUqor: "1000000",
    pqcKeyRegistered: true,
    hasPassport: false,
    checks: [
      {
        id: "account_funded",
        label: "",
        passed: true,
        weight: 20,
        explanation: "",
      },
      {
        id: "pqc_key_registered",
        label: "",
        passed: true,
        weight: 35,
        explanation: "",
      },
      {
        id: "pqc_algorithm_mldsa87",
        label: "",
        passed: true,
        weight: 15,
        explanation: "",
      },
    ],
    score: 88,
    grade: "B",
    scannedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("canonical JSON", () => {
  it("sorts keys deterministically", () => {
    const a = canonicalJson({ b: 1, a: { d: 2, c: 3 } });
    const b = canonicalJson({ a: { c: 3, d: 2 }, b: 1 });
    expect(a).toBe(b);
    expect(a).not.toMatch(/\s/);
  });
});

describe("bitmask", () => {
  it("round-trips the four fixed scored checks", () => {
    const mask = bitmaskFromChecks([
      { id: "account_funded", passed: true },
      { id: "pqc_key_registered", passed: true },
      { id: "pqc_algorithm_mldsa87", passed: false },
      { id: "pqc_possession_proven", passed: false },
    ]);
    expect(mask).toBe(3);
    expect(checksFromBitmask(mask)).toEqual([
      { id: "account_funded", passed: true },
      { id: "pqc_key_registered", passed: true },
      { id: "pqc_algorithm_mldsa87", passed: false },
      { id: "pqc_possession_proven", passed: false },
    ]);
  });
});

describe("passport hashing", () => {
  it("is stable for the same payload", () => {
    const passport = passportFromCompact("qor1abc", {
      score: 70,
      grade: "C",
      bitmask: 5,
      unixTime: 1_700_000_000,
    });
    const h1 = passportPayloadHash(passport);
    const h2 = passportPayloadHash({
      ...passport,
      checks: [...passport.checks],
    });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("buildPassport memo embeds fields and verifies via parse", () => {
    const scan = fixtureScan();
    const built = buildPassport(scan);
    const parsed = parseCompactMemo(built.memo);
    expect(parsed).not.toBeNull();
    expect(parsed?.hash).toBe(built.passportHash);
    expect(parsed?.score).toBe(scan.score);
    expect(parsed?.grade).toBe(scan.grade);

    const rebuilt = passportFromCompact(scan.address, {
      score: parsed!.score,
      grade: parsed!.grade,
      bitmask: parsed!.bitmask,
      unixTime: parsed!.unixTime,
    });
    expect(passportPayloadHash(rebuilt)).toBe(parsed!.hash);
    expect(built.memo.length).toBeLessThan(256);
    expect(buildCompactMemo(built.passport, built.passportHash, parsed!.unixTime, parsed!.bitmask)).toBe(
      built.memo,
    );
  });
});