/**
 * Programmatic API surface for QorePass (no HTTP server).
 * Steps 4+ can wrap these handlers; the browser imports this module directly.
 */
import { isValidBech32 } from "@qorechain/sdk";

import {
  buildPassport,
  createQorePassClient,
  getAccountStatus,
  runScan,
  verifyPassportTx,
  type BuildPassportResult,
  type PassportV1,
  type ScanResult,
  type VerifyPassportResult,
} from "../core/index.js";

export type ApiErrorCode =
  | "INVALID_ADDRESS"
  | "INVALID_TX_HASH"
  | "SCAN_FAILED"
  | "PASSPORT_FAILED"
  | "VERIFY_FAILED"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

function isQorAddress(address: string): boolean {
  return isValidBech32(address.trim(), "qor");
}

function isTxHash(hash: string): boolean {
  const h = hash.trim().toLowerCase().replace(/^0x/, "");
  return /^[0-9a-f]{64}$/.test(h);
}

export interface HealthResult {
  status: "ok";
  network: string;
  chainId: string;
  rest: string;
  evmRpc: string;
}

export async function health(): Promise<HealthResult> {
  const client = createQorePassClient();
  return {
    status: "ok",
    network: client.network.name,
    chainId: client.network.chainId,
    rest: client.network.endpoints.rest,
    evmRpc: client.network.endpoints.evmRpc,
  };
}

export async function scanAddress(
  address: string,
): Promise<ScanResult | ApiErrorBody> {
  if (!isQorAddress(address)) {
    return {
      error: {
        code: "INVALID_ADDRESS",
        message: "Expected a valid qor1… bech32 address.",
      },
    };
  }
  try {
    const client = createQorePassClient();
    return await runScan(client, address.trim());
  } catch (err) {
    return {
      error: {
        code: "SCAN_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export async function preparePassport(
  address: string,
): Promise<BuildPassportResult | ApiErrorBody> {
  const scanResult = await scanAddress(address);
  if ("error" in scanResult) {
    return scanResult;
  }
  try {
    return buildPassport(scanResult);
  } catch (err) {
    return {
      error: {
        code: "PASSPORT_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export async function accountStatus(address: string) {
  if (!isQorAddress(address)) {
    return {
      error: {
        code: "INVALID_ADDRESS",
        message: "Expected a valid qor1… bech32 address.",
      },
    } satisfies ApiErrorBody;
  }
  const client = createQorePassClient();
  return getAccountStatus(client, address.trim());
}

export async function verifyTx(
  txHash: string,
): Promise<VerifyPassportResult | ApiErrorBody> {
  if (!isTxHash(txHash)) {
    return {
      error: {
        code: "INVALID_TX_HASH",
        message: "Expected a 64-character hex transaction hash.",
      },
    };
  }
  try {
    const client = createQorePassClient();
    return await verifyPassportTx(client, txHash.trim());
  } catch (err) {
    return {
      error: {
        code: "VERIFY_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export type { PassportV1, ScanResult, VerifyPassportResult, BuildPassportResult };