import { shake256 } from "@qorechain/pqc";

import {
  assertMemoByteLength,
  bitmaskFromChecks,
  checksFromBitmask,
} from "./checks.js";
import { canonicalJson } from "./canonical.js";
import type { BuildPassportResult, PassportGrade, PassportV1, ScanResult } from "./types.js";

const MEMO_PREFIX = "qorepass:v1:";
const HASH_BYTES = 32;

/** Compact memo: qorepass:v1:<score>:<grade>:<bitmask>:<unixTime>:<hexhash> */
const COMPACT_MEMO_RE =
  /^qorepass:v1:(\d{1,3}):([A-F]):(\d{1,2}):(\d{9,13}):([0-9a-f]{64})$/i;

export interface CompactMemoFields {
  score: number;
  grade: PassportGrade;
  bitmask: number;
  unixTime: number;
  hash: string;
}

export function passportPayloadHash(payload: unknown): string {
  const text = canonicalJson(payload);
  const digest = shake256(new TextEncoder().encode(text), HASH_BYTES);
  return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function unixToIssuedAt(unixTime: number): string {
  return new Date(unixTime * 1000).toISOString();
}

export function passportFromCompact(
  address: string,
  fields: Omit<CompactMemoFields, "hash">,
): PassportV1 {
  return {
    v: 1,
    address,
    score: fields.score,
    grade: fields.grade,
    checks: checksFromBitmask(fields.bitmask),
    issuedAt: unixToIssuedAt(fields.unixTime),
  };
}

export function buildCompactMemo(
  passport: PassportV1,
  passportHash: string,
  unixTime: number,
  bitmask: number,
): string {
  const memo = `${MEMO_PREFIX}${passport.score}:${passport.grade}:${bitmask}:${unixTime}:${passportHash}`;
  assertMemoByteLength(memo);
  return memo;
}

export function parseCompactMemo(memo: string): CompactMemoFields | null {
  const trimmed = memo.trim();
  const match = COMPACT_MEMO_RE.exec(trimmed);
  if (!match) {
    return null;
  }
  const score = Number.parseInt(match[1] ?? "", 10);
  const grade = (match[2] ?? "F").toUpperCase() as PassportGrade;
  const bitmask = Number.parseInt(match[3] ?? "", 10);
  const unixTime = Number.parseInt(match[4] ?? "", 10);
  const hash = (match[5] ?? "").toLowerCase();
  if (
    !Number.isFinite(score) ||
    !Number.isFinite(bitmask) ||
    !Number.isFinite(unixTime) ||
    bitmask < 0 ||
    bitmask > 15
  ) {
    return null;
  }
  if (!/^[A-F]$/.test(grade)) {
    return null;
  }
  return { score, grade, bitmask, unixTime, hash };
}

export function buildPassport(scan: ScanResult): BuildPassportResult {
  const unixTime = Math.floor(Date.now() / 1000);
  const issuedAt = unixToIssuedAt(unixTime);
  const bitmask = bitmaskFromChecks(scan.checks);

  const passport: PassportV1 = {
    v: 1,
    address: scan.address,
    score: scan.score,
    grade: scan.grade,
    checks: checksFromBitmask(bitmask),
    issuedAt,
  };
  const passportHash = passportPayloadHash(passport);
  const memo = buildCompactMemo(passport, passportHash, unixTime, bitmask);

  return { passport, passportHash, memo };
}

export function scoreToGrade(score: number): PassportGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function weightedScore(
  checks: Array<{ weight: number; passed: boolean }>,
): number {
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  const earned = checks
    .filter((c) => c.passed)
    .reduce((sum, c) => sum + c.weight, 0);
  return Math.round((earned / totalWeight) * 100);
}