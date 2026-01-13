import crypto from "crypto";

import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

import { config } from "@/lib/config";

const SIGNATURE_HEADER = "X-KRAPI-Proxy-Signature";
const TIMESTAMP_HEADER = "X-KRAPI-Timestamp";
const NONCE_HEADER = "X-KRAPI-Nonce";
const PROXY_ID_HEADER = "X-KRAPI-Proxy-Id";

let interceptorApplied = false;

function shouldSignRequest(targetUrl: URL, backendBase: string): boolean {
  return targetUrl.href.startsWith(backendBase);
}

function normalizeBody(body: AxiosRequestConfig["data"]): string {
  if (body === undefined || body === null) {
    return "";
  }
  if (typeof body === "string") {
    return body;
  }
  return JSON.stringify(body);
}

export function ensureProxySigningInterceptor(): void {
  if (interceptorApplied) return;

  const proxySecret =
    process.env.KRAPI_PROXY_SECRET || process.env.PROXY_SECRET || "";
  const proxyId =
    process.env.KRAPI_PROXY_ID ||
    process.env.PROXY_ID ||
    "frontend-manager";

  if (!proxySecret) {
    // No secret configured; skip applying interceptor to avoid accidental leakage.
    interceptorApplied = true;
    return;
  }

  const backendBase = config.backend.url.replace(/\/$/, "");
  const originalCreate = axios.create.bind(axios);

  axios.create = (createConfig?: AxiosRequestConfig): AxiosInstance => {
    const instance = originalCreate(createConfig);

    instance.interceptors.request.use((request) => {
      const baseURL = request.baseURL || createConfig?.baseURL || backendBase;
      const target = new URL(
        request.url || "",
        baseURL.endsWith("/") ? baseURL : `${baseURL}/`
      );

      if (!shouldSignRequest(target, backendBase)) {
        return request;
      }

      const timestamp = Date.now().toString();
      const nonce = crypto.randomBytes(12).toString("hex");
      const body = normalizeBody(request.data);
      const method = (request.method || "get").toUpperCase();
      const pathWithQuery = `${target.pathname}${target.search}`;

      const payload = [timestamp, nonce, method, pathWithQuery, body].join(":");
      const signature = crypto
        .createHmac("sha256", proxySecret)
        .update(payload)
        .digest("hex");

      request.headers = request.headers ?? {};
      request.headers[SIGNATURE_HEADER] = signature;
      request.headers[TIMESTAMP_HEADER] = timestamp;
      request.headers[NONCE_HEADER] = nonce;
      request.headers[PROXY_ID_HEADER] = proxyId;

      return request;
    });

    return instance;
  };

  interceptorApplied = true;
}

