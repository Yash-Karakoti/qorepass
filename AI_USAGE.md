# AI Usage

QorePass was built for the QoreChain Developer Fest (Quantum Pass bounty) with AI tools. This file says which tools I used, what each one did, and what I did myself, so the jury can see how the project came together.

## Tools used

| Tool | Used for |
|---|---|
| **Claude (Anthropic)** | Brainstorming the idea, planning the build order, writing prompts for the other tools, helping me debug, and drafting documentation |
| **Cursor** | Writing the TypeScript chain core (`src/core`), the demo scripts and the unit tests, based on my prompts and the QoreChain docs |
| **Lovable** | Generating the first version of the frontend (pages, components, styling) [update when done] |
| **QoreChain MCP server (`@qorechain/mcp`)** | Letting Cursor read QoreChain docs and chain data, so it used the documented APIs |

## What AI did

- **Idea and planning (Claude):** helped shape the "quantum readiness passport" concept (scan, mint, verify, Attack Lab) and the order of work.
- **Chain core (Cursor):** wrote the account and PQC status reads, the scan scoring, canonical JSON plus SHAKE-256 hashing, the memo format, the verify logic and the unit tests, using `@qorechain/sdk` and `@qorechain/pqc`.
- **Demo script (Cursor):** wrote `scripts/hybrid-demo.ts` (PQC key registration, then a hybrid-signed self-transfer carrying the passport memo).
- **Frontend (Lovable):** [describe once done]
- **Integration (Cursor):** [describe once done, e.g. merging the frontend and wiring the real QoreX wallet]
- **Documentation (Claude/Cursor):** drafted the README and the project description, which I edited.

## What I did myself

- Chose to build this project and registered for the fest, the repo and the accounts.
- Set up the scaffold with `create-qorechain-dapp`, the QoreChain MCP server in Cursor, and the environment files.
- Generated a throwaway testnet account, funded it from the faucet, and ran the registration and the hybrid transaction myself.
- Reviewed Cursor's output at each step and decided what to change (see the next section).
- Checked the transactions on the explorer.
- [Add anything else that is true: copy you wrote, scoring rules you chose, the Attack Lab story, the cover image, the demo video, bugs you fixed by hand.]

## Where I corrected the AI's output

- **No server.** The first plan assumed an API server. After inspecting the scaffold (a Vite + React app with a `/lcd` proxy), I changed the design so the chain logic runs in the app itself through `src/core` and `src/lib/api.ts`, with no backend to deploy.
- **Verification that works from a transaction hash alone.** The first memo design stored only a hash, so a verifier needed extra data. I had it changed to a compact memo that carries the passport fields and the hash (96 bytes, under the 256-byte limit), so anyone can verify from the tx hash.
- **Stable score.** One scored check (whether a passport had been minted) would have changed a passport's score after minting. I had it removed from the score and shown as a separate flag.
- **Repository hygiene.** `node_modules` and the `.env` files had been pushed by mistake. I untracked them and fixed `.gitignore`. They held no secrets.
- [Add more as they happen, e.g. wrong API routes, gas settings, wallet issues.]

## On-chain proof

- Testnet: `qorechain-diana`
- Account: `qor104gaa3jgq3fe4h6xl0hgk9fpu934lzw6wu64q2`
- PQC key registration: `55C039C73359B4F869C0600837E5C58D4441D323BDB55075FD05CED19DA3404C`
- Hybrid-signed passport mint (self-transfer of 1000 uqor): [`909111CEB14A0EA5C8728D523B7B6D5CC0A8212EB56424ECE476D67CC9BAEC8D`](https://explore.qore.network/tx/909111CEB14A0EA5C8728D523B7B6D5CC0A8212EB56424ECE476D67CC9BAEC8D)
- Memo: `qorepass:v1:100:A:15:1795781758:3102da0da2f45ad84ccaa5a85b803cc90c070a43e58360353e88197201e60ee9`

## Safeguards

- No private keys or mnemonics are committed. The demo script reads a throwaway testnet mnemonic from `.env`, which is gitignored and never has a `VITE_` prefix.
- Every score check is backed by data read from the chain.
- The Attack Lab is an educational simulation and is labelled as one in the app. [update when built]
- A passport proves that an address signed a claim at a certain time. It does not independently guarantee that the claim is true, and the verify page says so.
- I checked AI output against the QoreChain docs rather than trusting it blindly.

## Prompts

The main prompts, in short:

1. **Cursor, chain core:** build the scan, passport hash and verify logic with the documented SDK calls, then prove one hybrid-signed transaction on testnet.
2. **Cursor, API documentation:** document the exported functions and types in `docs/API.md`.
3. **Lovable, frontend:** build the pages against a typed mock layer and a mock wallet hook.
4. **Cursor, integration and polish:** merge the frontend, connect the real QoreX wallet, write the README.

## Summary

AI wrote a large share of the code and the UI scaffolding. My part was the setup, the testnet work, reviewing and steering the output, and verifying the results on chain.