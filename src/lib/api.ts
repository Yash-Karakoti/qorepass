/**
 * Programmatic API surface for QorePass (no HTTP server).
 * Browser and tooling import this module directly.
 */
import {
  buildPassport,
  createQorePassClient,
  getAccountStatus,
  runScan,
  verifyPassportTx,
  type AccountStatus,
  type BuildPassportResult,
  type PassportV1,
  type ScanResult,
  type VerifyPassportResult,
} from "../core/index.js";
import {
  qorAddressSchema,
  txHashSchema,
  validationFailure,
} from "./validation.js";

export type ApiErrorCode =
  | "INVALID_ADDRESS"
  | "INVALID_TX_HASH"
  | "SCAN_FAILED"
  | "PASSPORT_FAILED"
  | "VERIFY_FAILED"
  | "ACCOUNT_STATUS_FAILED"
  | "HEALTH_FAILED";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export function isApiError<T>(
  result: T | ApiErrorBody,
): result is ApiErrorBody {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof (result as ApiErrorBody).error?.code === "string"
  );
}

export interface HealthResult {
  status: "ok";
  network: string;
  chainId: string;
  evmChainId?: number;
  rest: string;
  evmRpc: string;
}

export async function health(): Promise<HealthResult | ApiErrorBody> {
  try {
    const client = createQorePassClient();
    return {
      status: "ok",
      network: client.network.name,
      chainId: client.network.chainId,
      evmChainId: client.network.evmChainId,
      rest: client.network.endpoints.rest,
      evmRpc: client.network.endpoints.evmRpc,
    };
  } catch (err) {
    return {
      error: {
        code: "HEALTH_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export async function scanAddress(
  address: string,
): Promise<ScanResult | ApiErrorBody> {
  const parsed = qorAddressSchema.safeParse(address);
  if (!parsed.success) {
    return validationFailure("INVALID_ADDRESS", parsed.error);
  }
  try {
    const client = createQorePassClient();
    return await runScan(client, parsed.data);
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
  if (isApiError(scanResult)) {
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

export async function accountStatus(
  address: string,
): Promise<AccountStatus | ApiErrorBody> {
  const parsed = qorAddressSchema.safeParse(address);
  if (!parsed.success) {
    return validationFailure("INVALID_ADDRESS", parsed.error);
  }
  try {
    const client = createQorePassClient();
    return await getAccountStatus(client, parsed.data);
  } catch (err) {
    return {
      error: {
        code: "ACCOUNT_STATUS_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export async function verifyTx(
  txHash: string,
): Promise<VerifyPassportResult | ApiErrorBody> {
  const parsed = txHashSchema.safeParse(txHash);
  if (!parsed.success) {
    return validationFailure("INVALID_TX_HASH", parsed.error);
  }
  try {
    const client = createQorePassClient();
    return await verifyPassportTx(client, parsed.data);
  } catch (err) {
    return {
      error: {
        code: "VERIFY_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export type {
  AccountStatus,
  BuildPassportResult,
  PassportV1,
  ScanCheck,
  ScanResult,
  VerifyPassportResult,
  VerifyCurrentState,
  CheckStateComparison,
} from "../core/index.js";