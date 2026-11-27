/**
 * Bit order for QorePass scored checks (v1).
 * Each bit maps to `checks[]` entries in the canonical passport hash.
 *
 * | Bit | Value | Check id |
 * | --- | ----- | -------- |
 * | 0 | 1 | account_funded |
 * | 1 | 2 | pqc_key_registered |
 * | 2 | 4 | pqc_algorithm_mldsa87 |
 * | 3 | 8 | pqc_possession_proven |
 *
 * If the chain does not report `possessionProven`, bit 3 is 0 and that check is
 * omitted from the weighted scan UI — it is still present in the hashed passport
 * with `passed: false`.
 */
export const SCORED_CHECK_IDS = [
  "account_funded",
  "pqc_key_registered",
  "pqc_algorithm_mldsa87",
  "pqc_possession_proven",
] as const;

export type ScoredCheckId = (typeof SCORED_CHECK_IDS)[number];

/** On-chain / QoreX memo limit (bytes). Source: QoreChain docs & sdk code 12. */
export const MEMO_MAX_BYTES = 256;

export function checksFromBitmask(
  bitmask: number,
): Array<{ id: ScoredCheckId; passed: boolean }> {
  return SCORED_CHECK_IDS.map((id, index) => ({
    id,
    passed: (bitmask & (1 << index)) !== 0,
  }));
}

export function bitmaskFromChecks(
  checks: Array<{ id: string; passed: boolean }>,
): number {
  let mask = 0;
  for (let index = 0; index < SCORED_CHECK_IDS.length; index++) {
    const id = SCORED_CHECK_IDS[index];
    const hit = checks.find((c) => c.id === id);
    if (hit?.passed) {
      mask |= 1 << index;
    }
  }
  return mask;
}

export function assertMemoByteLength(memo: string): void {
  const bytes = new TextEncoder().encode(memo).byteLength;
  if (bytes > MEMO_MAX_BYTES) {
    throw new Error(
      `Memo is ${bytes} bytes; chain limit is ${MEMO_MAX_BYTES} bytes (sdk code 12).`,
    );
  }
}