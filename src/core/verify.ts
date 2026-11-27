import { explorerTxUrl, getTx, type QoreChainClient } from "@qorechain/sdk";

import { explorerNetwork } from "./client.js";
import { MEMO_MAX_BYTES } from "./checks.js";
import {
  parseCompactMemo,
  passportFromCompact,
  passportPayloadHash,
} from "./passport.js";
import { parseTxMeta } from "./tx.js";
import type { VerifyPassportResult } from "./types.js";

export async function verifyPassportTx(
  client: QoreChainClient,
  txHash: string,
): Promise<VerifyPassportResult> {
  const reasons: string[] = [];
  const normalizedHash = txHash.toLowerCase().replace(/^0x/, "");

  let raw;
  try {
    raw = await getTx(client.rest, normalizedHash);
  } catch (err) {
    return {
      status: "INVALID",
      valid: false,
      reasons: [
        "TX_NOT_FOUND",
        err instanceof Error ? err.message : String(err),
      ],
    };
  }

  const meta = parseTxMeta(raw);
  const explorerUrl = explorerTxUrl(explorerNetwork(client), normalizedHash);

  if (!raw.tx_response?.txhash) {
    return {
      status: "INVALID",
      valid: false,
      reasons: ["TX_NOT_FOUND"],
      explorerUrl,
    };
  }

  if (meta.code !== undefined && meta.code !== 0) {
    reasons.push(`TX_FAILED: abci code ${meta.code}`);
  }

  if (!meta.signer) {
    reasons.push("SIGNER_UNKNOWN");
    return {
      status: "INVALID",
      valid: false,
      reasons,
      memo: meta.memo,
      signer: meta.signer,
      height: meta.height,
      time: meta.time,
      explorerUrl,
      txCode: meta.code,
    };
  }

  const parsed = meta.memo ? parseCompactMemo(meta.memo) : null;
  if (!parsed) {
    reasons.push(
      "MALFORMED_MEMO: expected qorepass:v1:<score>:<grade>:<bitmask>:<unixTime>:<hexhash>",
    );
    return {
      status: "INVALID",
      valid: false,
      reasons,
      memo: meta.memo,
      signer: meta.signer,
      height: meta.height,
      time: meta.time,
      explorerUrl,
      txCode: meta.code,
    };
  }

  const memoBytes = new TextEncoder().encode(meta.memo.trim()).byteLength;
  if (memoBytes > MEMO_MAX_BYTES) {
    reasons.push(`MEMO_TOO_LARGE: ${memoBytes} bytes > ${MEMO_MAX_BYTES}`);
  }

  const passport = passportFromCompact(meta.signer, {
    score: parsed.score,
    grade: parsed.grade,
    bitmask: parsed.bitmask,
    unixTime: parsed.unixTime,
  });

  if (passport.score !== parsed.score || passport.grade !== parsed.grade) {
    reasons.push("MEMO_FIELDS_INCONSISTENT");
  }

  const recomputedHash = passportPayloadHash(passport);
  const memoHash = parsed.hash;

  if (recomputedHash !== memoHash) {
    reasons.push("HASH_MISMATCH");
  }

  const failures = reasons.filter(
    (r) =>
      r.startsWith("HASH_MISMATCH") ||
      r.startsWith("SIGNER_MISMATCH") ||
      r.startsWith("TX_FAILED") ||
      r.startsWith("SIGNER_UNKNOWN") ||
      r.startsWith("MALFORMED_MEMO") ||
      r.startsWith("MEMO_TOO_LARGE") ||
      r.startsWith("MEMO_FIELDS_INCONSISTENT"),
  );

  const valid =
    failures.length === 0 &&
    (meta.code === undefined || meta.code === 0) &&
    recomputedHash === memoHash;

  return {
    status: valid ? "VALID" : "INVALID",
    valid,
    reasons: valid ? [] : reasons,
    passport,
    memo: meta.memo,
    memoHash,
    recomputedHash,
    signer: meta.signer,
    height: meta.height,
    time: meta.time,
    explorerUrl,
    txCode: meta.code,
  };
}