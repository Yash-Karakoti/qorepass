# QorePass programmatic API

There is **no HTTP server**. The frontend (or Lovable mock layer) imports functions from `src/lib/api.ts` and static examples from `src/lib/mock.ts`.

Network: **testnet only** — `qorechain-diana`, EVM chain id **9800**.

Browser reads chain data via the Vite `/lcd` proxy (`VITE_QORE_REST_URL=/lcd`). Node scripts use `QORE_REST_URL` from `.env`.

---

## Import

```ts
import {
  health,
  scanAddress,
  preparePassport,
  accountStatus,
  verifyTx,
  isApiError,
  type ApiErrorBody,
  type HealthResult,
  type ScanResult,
  type BuildPassportResult,
  type AccountStatus,
  type VerifyPassportResult,
} from "@/lib/api";

import { mockApi } from "@/lib/mock";
```

Use `isApiError(result)` to narrow `T | ApiErrorBody`.

---

## Error envelope

Every function returns **either** a success body **or**:

```ts
interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

type ApiErrorCode =
  | "INVALID_ADDRESS"
  | "INVALID_TX_HASH"
  | "SCAN_FAILED"
  | "PASSPORT_FAILED"
  | "VERIFY_FAILED"
  | "ACCOUNT_STATUS_FAILED"
  | "HEALTH_FAILED";
```

Functions do **not** throw for validation or expected chain failures; they return `{ error }`.

### Example error JSON

```json
{
  "error": {
    "code": "INVALID_ADDRESS",
    "message": "Expected a valid qor1… bech32 address."
  }
}
```

---

## Input validation (Zod)

| Input | Schema | Rules |
| ----- | ------ | ----- |
| `qor1…` address | `qorAddressSchema` in `src/lib/validation.ts` | Non-empty, trimmed, `isValidBech32(value, "qor")` |
| Tx hash | `txHashSchema` | Trim; strip `0x`; exactly **64** hex chars (lowercase after parse) |

---

## `health()`

**Purpose:** Liveness + configured endpoints (no chain round-trip).

**Signature:** `health(): Promise<HealthResult | ApiErrorBody>`

### `HealthResult`

```ts
interface HealthResult {
  status: "ok";
  network: string;       // e.g. "testnet"
  chainId: string;       // "qorechain-diana"
  evmChainId?: number;   // 9800
  rest: string;          // browser: "/lcd"; node: full REST URL
  evmRpc: string;
}
```

### Example success

```json
{
  "status": "ok",
  "network": "testnet",
  "chainId": "qorechain-diana",
  "evmChainId": 9800,
  "rest": "/lcd",
  "evmRpc": "https://evm-testnet.qore.host"
}
```

---

## `scanAddress(address)`

**Purpose:** Quantum-readiness scan for a `qor1…` address (balances + PQC status + scored checks). Does **not** include “has passport” in the score.

**Signature:** `scanAddress(address: string): Promise<ScanResult | ApiErrorBody>`

### Shared types

```ts
type PassportGrade = "A" | "B" | "C" | "D" | "F";

interface ScanCheck {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
  explanation: string;
}

interface ScanResult {
  address: string;
  network: string;
  balanceQor: string;
  balanceUqor: string;
  pqcKeyRegistered: boolean;
  hasPassport: boolean;        // informational — prior QorePass memo tx found
  passportTxHash?: string;     // when hasPassport is true
  checks: ScanCheck[];
  score: number;               // 0–100, weighted from checks only (not hasPassport)
  grade: PassportGrade;
  scannedAt: string;           // ISO-8601
}
```

### Scored checks (may appear in `checks[]`)

| id | weight | Source |
| -- | ------ | ------ |
| `account_funded` | 20 | `GET /cosmos/bank/v1beta1/balances/{address}` |
| `pqc_key_registered` | 35 | `GET /qorechain/pqc/v1/account/{address}` via `fetchPqcStatus` |
| `pqc_algorithm_mldsa87` | 15 | `algorithmId === ML-DSA-87` when reported |
| `pqc_possession_proven` | 15 | Only if chain returns `possessionProven` |

`hasPassport` is set by tx search (`message.sender` + `transfer.memo CONTAINS 'qorepass:v1:'`); it is **not** part of `score`.

### Example success

```json
{
  "address": "qor104gaa3jgq3fe4h6xl0hgk9fpu934lzw6wu64q2",
  "network": "qorechain-diana",
  "balanceQor": "10.5",
  "balanceUqor": "10500000",
  "pqcKeyRegistered": true,
  "hasPassport": true,
  "passportTxHash": "909111CEB14A0EA5C8728D523B7B6D5CC0A8212EB56424ECE476D67CC9BAEC8D",
  "checks": [
    {
      "id": "account_funded",
      "label": "Native balance (uqor)",
      "passed": true,
      "weight": 20,
      "explanation": "Account holds 10500000 uqor on-chain."
    }
  ],
  "score": 100,
  "grade": "A",
  "scannedAt": "2026-11-27T12:15:58.000Z"
}
```

---

## `preparePassport(address)`

**Purpose:** Run `scanAddress` and produce passport JSON, SHAKE-256 hash, and compact **memo** for a bank send (QoreX / hybrid demo).

**Signature:** `preparePassport(address: string): Promise<BuildPassportResult | ApiErrorBody>`

### `BuildPassportResult`

```ts
interface PassportV1 {
  v: 1;
  address: string;
  score: number;
  grade: PassportGrade;
  checks: Array<{ id: string; passed: boolean }>; // always 4 bitmask checks
  issuedAt: string;                              // ISO-8601 from memo unix time
}

interface BuildPassportResult {
  passport: PassportV1;
  passportHash: string;  // 64 hex chars, SHAKE-256
  memo: string;          // compact format below
}
```

### Compact on-chain memo (≤ 256 bytes)

Chain limit: **256 bytes** (QoreX, custody kit, SDK `sdk` code 12).

**Format:**

```text
qorepass:v1:<score>:<grade>:<bitmask>:<unixTime>:<hexhash>
```

| Field | Description |
| ----- | ----------- |
| `score` | 0–100 integer from scan |
| `grade` | `A`–`F` |
| `bitmask` | 0–15, four fixed bits (see below) |
| `unixTime` | Unix seconds at mint |
| `hexhash` | SHAKE-256 over canonical passport JSON |

### Bitmask order (fixed for v1)

| Bit position | Value | Check id |
| ------------ | ----- | -------- |
| 0 | 1 | `account_funded` |
| 1 | 2 | `pqc_key_registered` |
| 2 | 4 | `pqc_algorithm_mldsa87` |
| 3 | 8 | `pqc_possession_proven` |

`checks` in the hashed passport always lists all four ids; each `passed` comes from the bitmask.

### Canonical JSON (hashed)

Sorted keys, no whitespace:

```json
{
  "address": "qor1…",
  "checks": [
    { "id": "account_funded", "passed": true },
    { "id": "pqc_key_registered", "passed": true },
    { "id": "pqc_algorithm_mldsa87", "passed": true },
    { "id": "pqc_possession_proven", "passed": true }
  ],
  "grade": "A",
  "issuedAt": "2026-11-27T12:15:58.000Z",
  "score": 100,
  "v": 1
}
```

Hash: `shake256(utf8(canonicalJson), 32)` → 64 lowercase hex.

### Example success

```json
{
  "passport": {
    "v": 1,
    "address": "qor104gaa3jgq3fe4h6xl0hgk9fpu934lzw6wu64q2",
    "score": 100,
    "grade": "A",
    "checks": [
      { "id": "account_funded", "passed": true },
      { "id": "pqc_key_registered", "passed": true },
      { "id": "pqc_algorithm_mldsa87", "passed": true },
      { "id": "pqc_possession_proven", "passed": true }
    ],
    "issuedAt": "2026-11-27T12:15:58.000Z"
  },
  "passportHash": "3102da0da2f45ad84ccaa5a85b803cc90c070a43e58360353e88197201e60ee9",
  "memo": "qorepass:v1:100:A:15:1795781758:3102da0da2f45ad84ccaa5a85b803cc90c070a43e58360353e88197201e60ee9"
}
```

---

## `accountStatus(address)`

**Purpose:** Lightweight status: balances + PQC registration (no score).

**Signature:** `accountStatus(address: string): Promise<AccountStatus | ApiErrorBody>`

```ts
interface AccountStatus {
  address: string;
  network: string;
  balances: Array<{ denom: string; amount: string }>;
  balanceUqor: string;
  balanceQor: string;
  pqcKeyRegistered: boolean;
  pqcAlgorithmId?: number;
  pqcPossessionProven?: boolean;
}
```

### Example success

```json
{
  "address": "qor104gaa3jgq3fe4h6xl0hgk9fpu934lzw6wu64q2",
  "network": "qorechain-diana",
  "balances": [{ "denom": "uqor", "amount": "10500000" }],
  "balanceUqor": "10500000",
  "balanceQor": "10.5",
  "pqcKeyRegistered": true,
  "pqcAlgorithmId": 1,
  "pqcPossessionProven": true
}
```

---

## `verifyTx(txHash)`

**Purpose:** Verify a QorePass mint transaction using **only** the tx hash (memo is self-contained).

**Signature:** `verifyTx(txHash: string): Promise<VerifyPassportResult | ApiErrorBody>`

### What `valid` / `status` mean

| Field | Meaning |
| ----- | ------- |
| `status: "VALID"` + `valid: true` | Tx found, successful, memo parses, SHAKE-256 matches. **The signer published this claim in this tx.** |
| `status: "INVALID"` | Tx missing, failed, bad memo, or hash mismatch. |

**`VALID` does not mean** an auditor independently attests the claim — only that this address signed this payload. Use **`currentState`** for a live comparison.

`interpretation` is a fixed UI string explaining the above.

### `VerifyPassportResult`

```ts
interface CheckStateComparison {
  id:
    | "account_funded"
    | "pqc_key_registered"
    | "pqc_algorithm_mldsa87"
    | "pqc_possession_proven";
  claimedPassed: boolean;  // from memo bitmask at mint time
  currentPassed: boolean; // fresh chain read now
  matches: boolean;
  explanation: string;
}

interface VerifyCurrentState {
  address: string;
  scannedAt: string;
  allMatch: boolean;
  comparisons: CheckStateComparison[];
}

interface VerifyPassportResult {
  status: "VALID" | "INVALID";
  valid: boolean;
  interpretation: string;
  reasons: string[];       // empty when cryptographically VALID
  currentState?: VerifyCurrentState;
  passport?: PassportV1;
  memo?: string;
  memoHash?: string;
  recomputedHash?: string;
  signer?: string;
  height?: number;
  time?: string;
  explorerUrl?: string;
  txCode?: number;
}
```

### Verify reason codes (non-exhaustive)

| Reason prefix | When |
| ------------- | ---- |
| `TX_NOT_FOUND` | REST cannot load tx |
| `TX_FAILED` | ABCI `code !== 0` |
| `SIGNER_UNKNOWN` | Could not parse signer |
| `MALFORMED_MEMO` | Does not match compact format |
| `MEMO_TOO_LARGE` | > 256 bytes |
| `HASH_MISMATCH` | Recomputed SHAKE-256 ≠ memo hash |
| `CURRENT_STATE_UNAVAILABLE` | Live read failed (result may still be VALID) |

### Example: VALID + current state matches

```json
{
  "status": "VALID",
  "valid": true,
  "interpretation": "VALID: this address signed this transaction and the QorePass memo is internally consistent (hash matches the embedded claim). This is not an independent guarantee — compare currentState to see whether the claim still matches the chain today.",
  "reasons": [],
  "passport": { "v": 1, "address": "qor104gaa3jgq3fe4h6xl0hgk9fpu934lzw6wu64q2", "score": 100, "grade": "A", "checks": [], "issuedAt": "2026-11-27T12:15:58.000Z" },
  "memo": "qorepass:v1:100:A:15:1795781758:3102da0da2f45ad84ccaa5a85b803cc90c070a43e58360353e88197201e60ee9",
  "memoHash": "3102da0da2f45ad84ccaa5a85b803cc90c070a43e58360353e88197201e60ee9",
  "recomputedHash": "3102da0da2f45ad84ccaa5a85b803cc90c070a43e58360353e88197201e60ee9",
  "signer": "qor104gaa3jgq3fe4h6xl0hgk9fpu934lzw6wu64q2",
  "height": 12345678,
  "time": "2026-11-27T12:16:02.123456789Z",
  "explorerUrl": "https://explore.qore.network/tx/909111CEB14A0EA5C8728D523B7B6D5CC0A8212EB56424ECE476D67CC9BAEC8D",
  "txCode": 0,
  "currentState": {
    "address": "qor104gaa3jgq3fe4h6xl0hgk9fpu934lzw6wu64q2",
    "scannedAt": "2026-11-27T12:20:00.000Z",
    "allMatch": true,
    "comparisons": [
      {
        "id": "account_funded",
        "claimedPassed": true,
        "currentPassed": true,
        "matches": true,
        "explanation": "Balance 10500000 uqor > 0."
      }
    ]
  }
}
```

### Example: VALID but stale claim (`allMatch: false`)

Cryptographic verify can still be `VALID` while `currentState.allMatch` is `false` (e.g. wallet drained after mint).

---

## Mock data (`src/lib/mock.ts`)

| Export | Type |
| ------ | ---- |
| `mockHealth` | `HealthResult` |
| `mockScanResult` | `ScanResult` |
| `mockPreparePassport` | `BuildPassportResult` |
| `mockAccountStatus` | `AccountStatus` |
| `mockVerifyValid` | `VerifyPassportResult` |
| `mockVerifyStaleClaim` | `VerifyPassportResult` (same tx, drained balance) |
| `mockInvalidAddress` | `ApiErrorBody` |
| `mockInvalidTxHash` | `ApiErrorBody` |
| `mockScanFailed` | `ApiErrorBody` |
| `mockApi` | Object bundling the above |

---

## Suggested frontend wiring

```ts
async function loadScan(addr: string) {
  const res = await scanAddress(addr);
  if (isApiError(res)) throw new Error(`${res.error.code}: ${res.error.message}`);
  return res;
}
```

For local UI-only builds, swap in `mockApi.scanAddress` until `src/lib/api.ts` is connected.

Wallet mint flow: `preparePassport` → pass `memo` to QoreX `signAndBroadcast` on a bank `MsgSend` (hybrid-signed on testnet).

---

## File map

| File | Role |
| ---- | ---- |
| `src/lib/api.ts` | Public functions |
| `src/lib/validation.ts` | Zod schemas |
| `src/lib/mock.ts` | Lovable / Storybook fixtures |
| `src/core/*` | Chain logic (do not duplicate REST routes in UI) |