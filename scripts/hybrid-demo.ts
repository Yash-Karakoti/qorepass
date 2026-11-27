/**
 * Node-only hybrid-signed self-transfer with compact QorePass memo.
 * Never import DEMO_MNEMONIC from browser code.
 */
import "dotenv/config";

import {
  deriveNativeAccount,
  derivePqcCanonical,
  directSignerFromPrivateKey,
  ensurePqcRegistered,
  explorerTxUrl,
  validateMnemonic,
} from "@qorechain/sdk";

import { buildPassport, runScan } from "../src/core/index.js";
import { createQorePassClient, explorerNetwork } from "../src/core/client.js";

const mnemonic = process.env.DEMO_MNEMONIC?.trim();
if (!mnemonic) {
  console.error("Set DEMO_MNEMONIC in .env (testnet throwaway only).");
  process.exit(1);
}
if (!validateMnemonic(mnemonic)) {
  console.error("DEMO_MNEMONIC is not a valid BIP-39 phrase.");
  process.exit(1);
}

const rpc = process.env.QORE_RPC_URL?.trim();
if (!rpc) {
  console.error("Set QORE_RPC_URL in .env (e.g. https://rpc-testnet.qore.host).");
  process.exit(1);
}

const native = await deriveNativeAccount(mnemonic);
const address = native.address;
const pqcKeypair = derivePqcCanonical(address, mnemonic);

console.log(`QorePass hybrid demo — testnet\nAddress: ${address}\n`);

const dryRun = process.argv.includes("--dry-run");

const client = createQorePassClient({ endpoints: { rpc } });

const scan = await runScan(client, address);
const { memo, passportHash } = buildPassport(scan);

console.log("\n--- QorePass memo (before broadcast) ---");
console.log(memo);
console.log(`(${new TextEncoder().encode(memo).byteLength} bytes, limit 256)`);
console.log(`passportHash: ${passportHash}`);
console.log(`score=${scan.score} grade=${scan.grade}`);
console.log("----------------------------------------\n");

if (dryRun) {
  console.log("--dry-run: skipping PQC registration and broadcast.");
  process.exit(0);
}

const signer = await directSignerFromPrivateKey(
  native.privateKey,
  client.network.bech32.account,
);

const tx = await client.connectTx(signer, { pqcKeypair });

console.log("Registering ML-DSA-87 key if needed (ensurePqcRegistered)…");
const reg = await ensurePqcRegistered(tx, {
  pqcKeypair,
  rest: client.network.endpoints.rest,
});
if (reg.txHash) {
  console.log(`PQC registration tx: ${reg.txHash}`);
} else {
  console.log(`PQC already registered (alreadyRegistered=${reg.alreadyRegistered})`);
}

const amount = process.argv.find((a) => a.startsWith("--amount="))?.split("=")[1] ?? "1000";

console.log(`Broadcasting self-transfer ${amount} uqor…`);
const result = await tx.bankSend(
  address,
  [{ denom: "uqor", amount }],
  { memo, fee: "auto" },
);

const txHash =
  "transactionHash" in result
    ? result.transactionHash
    : (result as { hash?: string }).hash;

if (!txHash) {
  console.error("Broadcast succeeded but no transaction hash in result:", result);
  process.exit(1);
}

const explorer = explorerTxUrl(explorerNetwork(client), txHash);
console.log("\nSuccess");
console.log(`Tx hash: ${txHash}`);
console.log(`Explorer: ${explorer}`);
console.log(`Address: ${address}`);