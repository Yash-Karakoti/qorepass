import {
  createClient,
  getNetwork,
  type CreateClientOptions,
  type NetworkConfig,
  type QoreChainClient,
} from "@qorechain/sdk";

/** Public testnet explorer (not baked into the SDK presets). */
export const TESTNET_EXPLORER_URL = "https://explore.qore.network";

const COIN_EXPONENT = 6;

function isBrowserRuntime(): boolean {
  return typeof globalThis.window !== "undefined";
}

function nodeEnv(name: string): string | undefined {
  if (isBrowserRuntime()) return undefined;
  return (globalThis.process?.env as Record<string, string | undefined> | undefined)?.[name];
}

/** REST base URL: browser uses the Vite `/lcd` proxy; Node uses QORE_REST_URL. */
export function resolveRestUrl(): string {
  if (isBrowserRuntime()) {
    return import.meta.env.VITE_QORE_REST_URL ?? "/lcd";
  }
  return (
    nodeEnv("QORE_REST_URL") ??
    nodeEnv("QORE_REST_PROXY_TARGET") ??
    getNetwork("testnet").endpoints.rest
  );
}

export function resolveEvmRpcUrl(): string {
  if (isBrowserRuntime()) {
    return (
      import.meta.env.VITE_QORE_EVM_RPC_URL ??
      getNetwork("testnet").endpoints.evmRpc
    );
  }
  return (
    nodeEnv("VITE_QORE_EVM_RPC_URL") ??
    nodeEnv("QORE_EVM_RPC_URL") ??
    getNetwork("testnet").endpoints.evmRpc
  );
}

export function resolveRpcUrl(): string | undefined {
  if (isBrowserRuntime()) return undefined;
  return nodeEnv("QORE_RPC_URL") ?? getNetwork("testnet").endpoints.rpc;
}

export function explorerNetwork(client: QoreChainClient): NetworkConfig {
  return { ...client.network, explorerUrl: TESTNET_EXPLORER_URL };
}

/**
 * Shared read client for QorePass (testnet / qorechain-diana).
 * Signing scripts should pass `rpc` via QORE_RPC_URL in `.env`.
 */
export function createQorePassClient(
  opts: Omit<CreateClientOptions, "network"> = {},
): QoreChainClient {
  const preset = getNetwork("testnet");
  const rest = resolveRestUrl();
  const evmRpc = resolveEvmRpcUrl();
  const rpc = resolveRpcUrl();
  return createClient({
    ...opts,
    network: "testnet",
    endpoints: {
      ...preset.endpoints,
      rest,
      evmRpc,
      ...(rpc ? { rpc } : {}),
      ...opts.endpoints,
    },
  });
}

/** uqor base amount string → display QOR (10^6 uqor). */
export function uqorToQor(amount: string): string {
  const base = BigInt(amount === "" ? "0" : amount);
  const scale = 10n ** BigInt(COIN_EXPONENT);
  const whole = base / scale;
  const frac = base % scale;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(COIN_EXPONENT, "0").replace(/0+$/, "");
  return `${whole}.${fracStr}`;
}

export function restBaseUrl(client: QoreChainClient): string {
  return client.network.endpoints.rest;
}