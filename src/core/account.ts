import {
  AlgorithmDilithium5,
  fetchPqcStatus,
  type QoreChainClient,
} from "@qorechain/sdk";

import { restBaseUrl, uqorToQor } from "./client.js";
import type { AccountStatus } from "./types.js";

const NATIVE_DENOM = "uqor";

function sumUqor(
  balances: Array<{ denom: string; amount: string }>,
): string {
  const match = balances.find((b) => b.denom === NATIVE_DENOM);
  return match?.amount ?? "0";
}

/**
 * Account balances (REST) and PQC registration (`GET /qorechain/pqc/v1/account/{address}`).
 */
export async function getAccountStatus(
  client: QoreChainClient,
  address: string,
): Promise<AccountStatus> {
  const [balancesRes, pqcStatus] = await Promise.all([
    client.rest.getAllBalances(address),
    fetchPqcStatus({ rest: restBaseUrl(client), address }),
  ]);

  const balances = balancesRes.balances ?? [];
  const balanceUqor = sumUqor(balances);
  const algorithmId = pqcStatus.algorithmId;
  const possession = pqcStatus.possessionProven;

  return {
    address,
    network: client.network.chainId,
    balances,
    balanceUqor,
    balanceQor: uqorToQor(balanceUqor),
    pqcKeyRegistered: pqcStatus.registered,
    pqcAlgorithmId:
      algorithmId !== undefined ? algorithmId : undefined,
    pqcPossessionProven:
      possession !== undefined ? possession : undefined,
  };
}

export function isMldsa87Registered(
  status: Pick<AccountStatus, "pqcKeyRegistered" | "pqcAlgorithmId">,
): boolean | undefined {
  if (!status.pqcKeyRegistered) return false;
  if (status.pqcAlgorithmId === undefined) return undefined;
  return status.pqcAlgorithmId === AlgorithmDilithium5;
}