/**
 * Static examples for frontend development (Lovable). Shapes match src/lib/api.ts.
 */
import type {
  AccountStatus,
  ApiErrorBody,
  BuildPassportResult,
  CheckStateComparison,
  HealthResult,
  ScanResult,
  VerifyPassportResult,
} from "./api.js";

export const mockHealth: HealthResult = {
  status: "ok",
  network: "testnet",
  chainId: "qorechain-diana",
  evmChainId: 9800,
  rest: "/lcd",
  evmRpc: "https://evm-testnet.qore.host",
};

export const mockScanResult: ScanResult = {
  address: "qor104gaa3jgq3fe4h6xl0hgk9fpu934lzw6wu64q2",
  network: "qorechain-diana",
  balanceQor: "10.5",
  balanceUqor: "10500000",
  pqcKeyRegistered: true,
  hasPassport: true,
  passportTxHash:
    "909111CEB14A0EA5C8728D523B7B6D5CC0A8212EB56424ECE476D67CC9BAEC8D",
  checks: [
    {
      id: "account_funded",
      label: "Native balance (uqor)",
      passed: true,
      weight: 20,
      explanation: "Account holds 10500000 uqor on-chain.",
    },
    {
      id: "pqc_key_registered",
      label: "ML-DSA-87 key registered",
      passed: true,
      weight: 35,
      explanation:
        "GET /qorechain/pqc/v1/account/{address} reports a registered PQC key.",
    },
    {
      id: "pqc_algorithm_mldsa87",
      label: "Registered algorithm ML-DSA-87",
      passed: true,
      weight: 15,
      explanation: "Registered algorithm id matches ML-DSA-87 (Dilithium-5).",
    },
    {
      id: "pqc_possession_proven",
      label: "PQC proof of possession",
      passed: true,
      weight: 15,
      explanation: "Registered key reports possessionProven=true.",
    },
  ],
  score: 100,
  grade: "A",
  scannedAt: "2026-11-27T12:15:58.000Z",
};

export const mockPreparePassport: BuildPassportResult = {
  passport: {
    v: 1,
    address: mockScanResult.address,
    score: 100,
    grade: "A",
    checks: [
      { id: "account_funded", passed: true },
      { id: "pqc_key_registered", passed: true },
      { id: "pqc_algorithm_mldsa87", passed: true },
      { id: "pqc_possession_proven", passed: true },
    ],
    issuedAt: "2026-11-27T12:15:58.000Z",
  },
  passportHash:
    "3102da0da2f45ad84ccaa5a85b803cc90c070a43e58360353e88197201e60ee9",
  memo: "qorepass:v1:100:A:15:1795781758:3102da0da2f45ad84ccaa5a85b803cc90c070a43e58360353e88197201e60ee9",
};

export const mockAccountStatus: AccountStatus = {
  address: mockScanResult.address,
  network: "qorechain-diana",
  balances: [{ denom: "uqor", amount: "10500000" }],
  balanceUqor: "10500000",
  balanceQor: "10.5",
  pqcKeyRegistered: true,
  pqcAlgorithmId: 1,
  pqcPossessionProven: true,
};

export const mockVerifyValid: VerifyPassportResult = {
  status: "VALID",
  valid: true,
  interpretation:
    "VALID: this address signed this transaction and the QorePass memo is internally consistent (hash matches the embedded claim). This is not an independent guarantee — compare currentState to see whether the claim still matches the chain today.",
  reasons: [],
  passport: mockPreparePassport.passport,
  memo: mockPreparePassport.memo,
  memoHash: mockPreparePassport.passportHash,
  recomputedHash: mockPreparePassport.passportHash,
  signer: mockScanResult.address,
  height: 12_345_678,
  time: "2026-11-27T12:16:02.123456789Z",
  explorerUrl:
    "https://explore.qore.network/tx/909111CEB14A0EA5C8728D523B7B6D5CC0A8212EB56424ECE476D67CC9BAEC8D",
  txCode: 0,
  currentState: {
    address: mockScanResult.address,
    scannedAt: "2026-11-27T12:20:00.000Z",
    allMatch: true,
    comparisons: [
      {
        id: "account_funded",
        claimedPassed: true,
        currentPassed: true,
        matches: true,
        explanation: "Balance 10500000 uqor > 0.",
      },
      {
        id: "pqc_key_registered",
        claimedPassed: true,
        currentPassed: true,
        matches: true,
        explanation:
          "PQC key registered (GET /qorechain/pqc/v1/account/{address}).",
      },
      {
        id: "pqc_algorithm_mldsa87",
        claimedPassed: true,
        currentPassed: true,
        matches: true,
        explanation: "Registered algorithm is ML-DSA-87.",
      },
      {
        id: "pqc_possession_proven",
        claimedPassed: true,
        currentPassed: true,
        matches: true,
        explanation: "possessionProven=true.",
      },
    ],
  },
};

export const mockVerifyStaleClaim: VerifyPassportResult = {
  ...mockVerifyValid,
  currentState: {
    ...mockVerifyValid.currentState!,
    allMatch: false,
    comparisons: mockVerifyValid.currentState!.comparisons.map((c: CheckStateComparison) =>
      c.id === "account_funded"
        ? {
            ...c,
            currentPassed: false,
            matches: false,
            explanation: "No uqor balance on chain.",
          }
        : c,
    ),
  },
};

export const mockInvalidAddress: ApiErrorBody = {
  error: {
    code: "INVALID_ADDRESS",
    message: "Expected a valid qor1… bech32 address.",
  },
};

export const mockInvalidTxHash: ApiErrorBody = {
  error: {
    code: "INVALID_TX_HASH",
    message: "Expected a 64-character lowercase hex transaction hash.",
  },
};

export const mockScanFailed: ApiErrorBody = {
  error: {
    code: "SCAN_FAILED",
    message: "HTTP 503 from REST upstream.",
  },
};

export const mockApi = {
  health: mockHealth,
  scanAddress: mockScanResult,
  preparePassport: mockPreparePassport,
  accountStatus: mockAccountStatus,
  verifyTx: mockVerifyValid,
  errors: {
    invalidAddress: mockInvalidAddress,
    invalidTxHash: mockInvalidTxHash,
    scanFailed: mockScanFailed,
  },
} as const;