import { KrapiSDK } from "@/lib/krapi";
import type { RootState } from "./index";

export function buildKrapiFromState(state: RootState): KrapiSDK {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3470";
  const client = new KrapiSDK({ baseUrl });
  if (state.auth.sessionToken) {
    client.setSessionToken(state.auth.sessionToken);
  } else if (state.auth.apiKey) {
    client.setApiKey(state.auth.apiKey);
  }
  return client;
}