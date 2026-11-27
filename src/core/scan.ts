import { searchTxs, type QoreChainClient } from "@qorechain/sdk";

import { getAccountStatus, isMldsa87Registered } from "./account.js";
import { parseCompactMemo, scoreToGrade, weightedScore } from "./passport.js";
import type { ScanCheck, ScanResult } from "./types.js";

interface TxBodyLike {
  body?: { memo?: string };
}

async function detectPassportOnChain(
  client: QoreChainClient,
  address: string,
): Promise<{ hasPassport: boolean; passportTxHash?: string }> {
  const query = `message.sender='${address}' AND transfer.memo CONTAINS 'qorepass:v1:'`;
  try {
    const result = await searchTxs(client.rest, query, {
      limit: 10,
      orderBy: "desc",
    });
    const responses = result.tx_responses ?? [];
    const txs = (result.txs ?? []) as TxBodyLike[];
    for (let i = 0; i < responses.length; i++) {
      const txRes = responses[i];
      if (!txRes || txRes.code !== 0) continue;
      const memo = txs[i]?.body?.memo ?? "";
      if (parseCompactMemo(memo)) {
        return { hasPassport: true, passportTxHash: txRes.txhash };
      }
    }
  } catch {
    // Tx search unavailable — treat as no passport tx.
  }
  return { hasPassport: false };
}

function buildScoredChecks(input: {
  funded: boolean;
  pqcRegistered: boolean;
  mldsa87: boolean | undefined;
  possessionProven: boolean | undefined;
  balanceUqor: string;
}): ScanCheck[] {
  const checks: ScanCheck[] = [
    {
      id: "account_funded",
      label: "Native balance (uqor)",
      passed: input.funded,
      weight: 20,
      explanation: input.funded
        ? `Account holds ${input.balanceUqor} uqor on-chain.`
        : "No uqor balance returned from GET /cosmos/bank/v1beta1/balances/{address}.",
    },
    {
      id: "pqc_key_registered",
      label: "ML-DSA-87 key registered",
      passed: input.pqcRegistered,
      weight: 35,
      explanation: input.pqcRegistered
        ? "GET /qorechain/pqc/v1/account/{address} reports a registered PQC key."
        : "No PQC key registered for this address (found: false).",
    },
    {
      id: "pqc_algorithm_mldsa87",
      label: "Registered algorithm ML-DSA-87",
      passed: input.mldsa87 === true,
      weight: 15,
      explanation:
        input.mldsa87 === true
          ? "Registered algorithm id matches ML-DSA-87 (Dilithium-5)."
          : input.mldsa87 === false
            ? "Registered PQC algorithm id is not ML-DSA-87."
            : input.pqcRegistered
              ? "Chain response omitted algorithm id."
              : "No registered PQC key to inspect.",
    },
  ];

  if (input.possessionProven !== undefined) {
    checks.push({
      id: "pqc_possession_proven",
      label: "PQC proof of possession",
      passed: input.possessionProven,
      weight: 15,
      explanation: input.possessionProven
        ? "Registered key reports possessionProven=true."
        : "Registered key reports possessionProven=false.",
    });
  }

  return checks;
}

export async function runScan(
  client: QoreChainClient,
  address: string,
): Promise<ScanResult> {
  const [status, passportState] = await Promise.all([
    getAccountStatus(client, address),
    detectPassportOnChain(client, address),
  ]);

  const funded = BigInt(status.balanceUqor) > 0n;
  const mldsa87 = isMldsa87Registered(status);

  const checks = buildScoredChecks({
    funded,
    pqcRegistered: status.pqcKeyRegistered,
    mldsa87,
    possessionProven: status.pqcPossessionProven,
    balanceUqor: status.balanceUqor,
  });

  const score = weightedScore(checks);
  const grade = scoreToGrade(score);

  return {
    address: status.address,
    network: status.network,
    balanceQor: status.balanceQor,
    balanceUqor: status.balanceUqor,
    pqcKeyRegistered: status.pqcKeyRegistered,
    hasPassport: passportState.hasPassport,
    checks,
    score,
    grade,
    scannedAt: new Date().toISOString(),
    passportTxHash: passportState.passportTxHash,
  };
}