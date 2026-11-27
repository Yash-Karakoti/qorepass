import type { QoreChainClient } from "@qorechain/sdk";

import { getAccountStatus, isMldsa87Registered } from "./account.js";
import {
  SCORED_CHECK_IDS,
  checksFromBitmask,
  type ScoredCheckId,
} from "./checks.js";

export interface CheckStateComparison {
  id: ScoredCheckId;
  /** Claim embedded in the on-chain memo bitmask. */
  claimedPassed: boolean;
  /** Pass/fail from a fresh chain read right now. */
  currentPassed: boolean;
  matches: boolean;
  explanation: string;
}

export interface VerifyCurrentState {
  address: string;
  scannedAt: string;
  /** True when every claimed bit matches current chain state. */
  allMatch: boolean;
  comparisons: CheckStateComparison[];
}

function currentPassedForCheck(
  id: ScoredCheckId,
  status: Awaited<ReturnType<typeof getAccountStatus>>,
): { passed: boolean; explanation: string } {
  switch (id) {
    case "account_funded": {
      const passed = BigInt(status.balanceUqor) > 0n;
      return {
        passed,
        explanation: passed
          ? `Balance ${status.balanceUqor} uqor > 0.`
          : "No uqor balance on chain.",
      };
    }
    case "pqc_key_registered":
      return {
        passed: status.pqcKeyRegistered,
        explanation: status.pqcKeyRegistered
          ? "PQC key registered (GET /qorechain/pqc/v1/account/{address})."
          : "No PQC key registered.",
      };
    case "pqc_algorithm_mldsa87": {
      const mldsa = isMldsa87Registered(status);
      const passed = mldsa === true;
      return {
        passed,
        explanation:
          mldsa === true
            ? "Registered algorithm is ML-DSA-87."
            : mldsa === false
              ? "Registered algorithm is not ML-DSA-87."
              : "PQC key registered but algorithm id not reported.",
      };
    }
    case "pqc_possession_proven": {
      const passed = status.pqcPossessionProven === true;
      return {
        passed,
        explanation:
          status.pqcPossessionProven === true
            ? "possessionProven=true."
            : status.pqcPossessionProven === false
              ? "possessionProven=false."
              : "Chain did not report possessionProven (treated as not proven).",
      };
    }
    default:
      return { passed: false, explanation: "Unknown check." };
  }
}

export async function compareClaimedToCurrentState(
  client: QoreChainClient,
  address: string,
  bitmask: number,
): Promise<VerifyCurrentState> {
  const status = await getAccountStatus(client, address);
  const claimed = checksFromBitmask(bitmask);

  const comparisons: CheckStateComparison[] = SCORED_CHECK_IDS.map((id) => {
    const claim = claimed.find((c) => c.id === id);
    const claimedPassed = claim?.passed ?? false;
    const live = currentPassedForCheck(id, status);
    return {
      id,
      claimedPassed,
      currentPassed: live.passed,
      matches: claimedPassed === live.passed,
      explanation: live.explanation,
    };
  });

  return {
    address,
    scannedAt: new Date().toISOString(),
    allMatch: comparisons.every((c) => c.matches),
    comparisons,
  };
}