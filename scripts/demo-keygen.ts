/**
 * Node-only: never import this script or DEMO_MNEMONIC from browser code.
 */
import { deriveNativeAccount, generateMnemonic } from "@qorechain/sdk";

const mnemonic = generateMnemonic();

const native = await deriveNativeAccount(mnemonic);

console.log("Testnet mnemonic (fund via faucet, store only in .env):");
console.log(mnemonic);
console.log("");
console.log("Native address (qor1…):");
console.log(native.address);
console.log("");
console.log("Nothing was written to disk.");