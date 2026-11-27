import type { GetTxResponse } from "@qorechain/sdk";

interface TxBody {
  memo?: string;
  messages?: Array<Record<string, unknown>>;
}

interface DecodedTx {
  body?: TxBody;
}

export interface ParsedTxMeta {
  memo: string;
  signer?: string;
  height?: number;
  time?: string;
  txHash?: string;
  code?: number;
}

function messageSender(msg: Record<string, unknown>): string | undefined {
  for (const key of ["from_address", "sender", "creator", "delegator_address"]) {
    const value = msg[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function signerFromEvents(
  events: unknown[] | undefined,
): string | undefined {
  if (!Array.isArray(events)) return undefined;
  for (const raw of events) {
    if (!raw || typeof raw !== "object") continue;
    const event = raw as { type?: string; attributes?: unknown[] };
    if (event.type !== "message") continue;
    if (!Array.isArray(event.attributes)) continue;
    for (const attr of event.attributes) {
      if (!attr || typeof attr !== "object") continue;
      const a = attr as { key?: string; value?: string };
      const key = a.key;
      const value = a.value;
      if (
        (key === "sender" || key === "/cosmos.tx.v1beta1.EventAttribute.key" || key === "signer") &&
        typeof value === "string" &&
        value.startsWith("qor1")
      ) {
        return value;
      }
      if (key === "sender" && typeof value === "string") {
        return value;
      }
    }
  }
  return undefined;
}

export function parseTxMeta(raw: GetTxResponse): ParsedTxMeta {
  const tx = raw.tx as DecodedTx | undefined;
  const memo = tx?.body?.memo ?? "";
  let signer: string | undefined;
  for (const msg of tx?.body?.messages ?? []) {
    signer = messageSender(msg);
    if (signer) break;
  }
  const txResponse = raw.tx_response;
  if (!signer) {
    signer = signerFromEvents(
      txResponse?.events as unknown[] | undefined,
    );
  }
  const height =
    txResponse?.height !== undefined
      ? Number.parseInt(String(txResponse.height), 10)
      : undefined;
  const code =
    txResponse?.code !== undefined ? Number(txResponse.code) : undefined;
  let time: string | undefined;
  if (txResponse && typeof txResponse === "object") {
    const ts = (txResponse as { timestamp?: unknown }).timestamp;
    if (typeof ts === "string") {
      time = ts;
    }
  }

  return {
    memo,
    signer,
    height: Number.isFinite(height) ? height : undefined,
    time,
    txHash: txResponse?.txhash,
    code,
  };
}