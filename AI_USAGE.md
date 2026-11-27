# AI Usage

QorePass was built for the QoreChain Developer Fest (Quantum Pass bounty) with the help of AI tools. This file documents which tools I used, what they did, and what I did myself, so the jury can see how the project came together.

> Fill in every [bracketed] item before the deadline, and delete any line that doesn't match what really happened. Keep it honest.

## Tools used

| Tool | Used for |
|---|---|
| **Claude (Anthropic)** | Choosing the project idea, planning the build order, writing the prompts for the other tools, debugging errors, and drafting this documentation |
| **Cursor** | Building the backend and chain logic: scaffolding, the scan and verify logic, the API, tests, and wiring the QoreX wallet |
| **Lovable** | Generating the first version of the frontend (pages, components, styling) |
| **QoreChain MCP server (`@qorechain/mcp`)** | Giving Cursor read access to QoreChain docs and chain data, so it used real APIs instead of guessing |

## What AI did

- **Idea and planning (Claude):** proposed the "quantum readiness passport" concept (scan, mint, verify, Attack Lab), the backend-first build order, and the architecture split between chain core, API and frontend.
- **Backend (Cursor):** [describe, e.g. generated the chain core, the scan scoring, canonical JSON plus SHAKE-256 hashing, the verify logic, the API routes and the unit tests].
- **Frontend (Lovable):** [describe, e.g. generated the landing page, scan page, mint stepper, passport card, verify page and the Attack Lab game against mock data].
- **Integration (Cursor):** [describe, e.g. merged the Lovable frontend into the repo and replaced the mock API and wallet with real ones].
- **Documentation (Claude/Cursor):** drafted the README and the project description. I reviewed and edited them.

## What I did myself

- Created the project, repo and accounts, and registered for the fest.
- Funded the testnet wallets from the faucet and ran every command and transaction myself.
- Ran `npm run demo:hybrid` and confirmed the hybrid-signed transaction on the explorer: [tx hash and explorer link].
- Reviewed all generated code before committing it. Tested the full flow in the browser and in the QoreX app.
- [Anything you wrote or designed by hand: copy, scoring rules, the Attack Lab story, the cover image, the demo video.]

## Where AI got it wrong, and how I fixed it

Be specific here. These details are the most useful part for a reviewer.

- [e.g. Cursor guessed a REST route for the key status that didn't exist. I pointed it to the docs and the MCP server, and it used the correct route.]
- [e.g. Lovable put wallet logic in several components. I asked for it to live only in `src/lib/wallet.ts`.]
- [e.g. A transaction memo format or gas setting that failed on testnet, and what fixed it.]

## Safeguards

- No private keys or mnemonics are committed. The demo script reads a throwaway testnet mnemonic from `.env`, which is gitignored.
- The app never shows chain data that wasn't read from the chain. Every score check is backed by real, readable data.
- The Attack Lab is an educational simulation and is labelled as one in the app.
- I treated AI output as a draft and checked it against the QoreChain docs.

## Prompts

The main prompts I used are summarized below. [Optional: link to a `docs/prompts/` folder with the full text.]

1. **Cursor, backend:** scaffold with `create-qorechain-dapp`, build the chain core (scan, passport hash, verify), prove one hybrid-signed transaction, expose an API and document it in `docs/API.md`.
2. **Lovable, frontend:** build all pages against a typed mock API and a mock wallet hook, so wallet and API logic stay in two files.
3. **Cursor, integration:** merge the frontend, connect the real QoreX wallet and real API, and make the flow work end to end on testnet.
4. **Cursor, polish:** README, licence check, cleanup and the demo script.

## Honest summary

AI sped up the scaffolding, boilerplate and UI work considerably. The decisions about what the passport proves, the testing on the real testnet, and the fixes for the places where the AI was wrong were mine. [Adjust to match your experience.]
