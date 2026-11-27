# QorePass

Quantum Readiness Passport for [QoreChain](https://docs.qorechain.io) testnet
(`qorechain-diana`, EVM chain id **9800**).

TypeScript (strict), MIT. Chain logic lives in `src/core` and is exposed through
`src/lib/api.ts` (no separate API server in Step 2).

## Prerequisites

- **Node.js >= 20**
- Testnet endpoints (defaults in `.env.example`):
  - REST `https://api-testnet.qore.host`
  - RPC `https://rpc-testnet.qore.host`
  - EVM `https://evm-testnet.qore.host`

## Setup

```sh
npm install
cp .env.example .env
npm run dev    # http://localhost:5173
```

### Environment

| Variable | Used by | Purpose |
| -------- | ------- | ------- |
| `VITE_QORE_REST_URL` | Browser | REST base (`/lcd` → Vite proxy) |
| `QORE_REST_PROXY_TARGET` | Vite dev/preview | Upstream REST for `/lcd` |
| `VITE_QORE_EVM_RPC_URL` | Browser | EVM JSON-RPC |
| `QORE_REST_URL` | Node scripts | Direct REST (no proxy) |
| `QORE_RPC_URL` | Node scripts (signing) | Comet RPC |
| `DEMO_MNEMONIC` | Node scripts only | Testnet demo wallet — **never** `VITE_` |

`DEMO_MNEMONIC` must not be imported from browser code.

### CORS / production hosting

The public REST API has **no CORS headers**. In development, Vite proxies
`/lcd` to `QORE_REST_PROXY_TARGET` (see `vite.config.ts`).

For **production** (Vercel, Netlify, etc.), add a rewrite so browser requests to
`/lcd/*` reach testnet REST, for example:

- **Vercel** (`vercel.json`): rewrite `/lcd/:path*` →
  `https://api-testnet.qore.host/:path*`
- **Netlify** (`netlify.toml`): `from = "/lcd/*"`, `to = "https://api-testnet.qore.host/:splat"`, `status = 200`

Keep `VITE_QORE_REST_URL=/lcd` in the deployed environment.

## Chain core (`src/core`)

| Module | Responsibility |
| ------ | -------------- |
| `client.ts` | `createQorePassClient()` — browser `/lcd` vs Node `QORE_REST_URL` |
| `account.ts` | `getAccountStatus` — balances + `fetchPqcStatus` (`GET /qorechain/pqc/v1/account/{address}`) |
| `scan.ts` | `runScan` — weighted checks, score 0–100, grade A–F |
| `passport.ts` | Compact memo + canonical JSON + SHAKE-256 (`@qorechain/pqc`) |
| `verify.ts` | `verifyPassportTx(txHash)` — self-contained memo parse + hash check |
| `checks.ts` | Fixed scored-check bitmask order (see file header) |

### Scan checks (on-chain only)

- Native **uqor** balance (bank REST)
- **PQC key registered** (`/qorechain/pqc/v1/account/{address}` via `fetchPqcStatus`)
- **ML-DSA-87** algorithm id when reported
- **Proof of possession** when the chain returns `possessionProven`
- **`hasPassport`** (not scored) — prior compact memo tx found via tx search

## Programmatic API (`src/lib/api.ts`)

- `health()` — network + endpoints
- `scanAddress(address)`
- `preparePassport(address)`
- `verifyTx(txHash)` — parses memo only; no fresh scan required

### Compact on-chain memo (≤256 bytes)

Chain limit: **256 bytes** (QoreX + custody kit; SDK `sdk` code 12).

```
qorepass:v1:<score>:<grade>:<bitmask>:<unixTime>:<hexhash>
```

Bitmask bits (fixed order): `account_funded` (1), `pqc_key_registered` (2),
`pqc_algorithm_mldsa87` (4), `pqc_possession_proven` (8). The SHAKE-256 hash
covers canonical JSON `{ v, address, score, grade, checks[{id,passed}], issuedAt }`
with `issuedAt` = `new Date(unixTime * 1000).toISOString()`.

## Scripts

```sh
npm run typecheck
npm test
npm run demo:keygen   # new mnemonic + qor1 address (stdout only)
npm run demo:hybrid   # hybrid self-transfer + compact memo (fund DEMO_MNEMONIC first)
npm run demo:hybrid -- --dry-run   # print memo only
```

## Build

```sh
npm run build
npm run preview
```