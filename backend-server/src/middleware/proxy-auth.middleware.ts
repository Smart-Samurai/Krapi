import crypto from "crypto";

import { NextFunction, Request, Response } from "express";

export interface RawBodyRequest extends Request {
  rawBody?: string;
}

export interface ProxyAuthConfig {
  secret?: string;
  proxyId?: string;
  clockSkewMs?: number;
  bypassPaths?: string[];
}

const DEFAULT_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_BYPASS_PATHS = ["/health", "/krapi/k1/health"];

function getHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()] || req.headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return typeof value === "string" ? value : undefined;
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function createProxyAuthMiddleware(config: ProxyAuthConfig) {
  const { secret, proxyId, clockSkewMs, bypassPaths } = config;
  const maxSkew = clockSkewMs ?? DEFAULT_CLOCK_SKEW_MS;
  const bypass = new Set(bypassPaths || DEFAULT_BYPASS_PATHS);

  let warnedAboutMissingSecret = false;

  return (req: RawBodyRequest, res: Response, next: NextFunction) => {
    if (!secret) {
      if (!warnedAboutMissingSecret) {
        // Warn once to avoid log spam but do not leak routes or headers.
        console.warn(
          "[proxy-auth] Missing KRAPI_PROXY_SECRET/PROXY_SECRET; proxy authentication is disabled."
        );
        warnedAboutMissingSecret = true;
      }
      return next();
    }

    if (bypass.has(req.path)) {
      return next();
    }

    const signature = getHeader(req, "X-KRAPI-Proxy-Signature");
    const timestamp = getHeader(req, "X-KRAPI-Timestamp");
    const nonce = getHeader(req, "X-KRAPI-Nonce");
    const providedProxyId = getHeader(req, "X-KRAPI-Proxy-Id");

    if (!signature || !timestamp || !nonce) {
      return res.status(401).json({
        success: false,
        error: "Missing proxy authentication headers",
      });
    }

    const parsedTimestamp = Number(timestamp);
    if (!Number.isFinite(parsedTimestamp)) {
      return res.status(401).json({
        success: false,
        error: "Invalid proxy timestamp",
      });
    }

    const now = Date.now();
    if (Math.abs(now - parsedTimestamp) > maxSkew) {
      return res.status(401).json({
        success: false,
        error: "Expired proxy signature",
      });
    }

    const rawBody = req.rawBody ?? "";
    const payload = [
      timestamp,
      nonce,
      req.method.toUpperCase(),
      req.originalUrl,
      rawBody,
    ].join(":");

    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    if (!safeEqual(computedSignature, signature)) {
      return res.status(401).json({
        success: false,
        error: "Invalid proxy signature",
      });
    }

    // Optional proxy identity check when configured
    if (proxyId && providedProxyId && proxyId !== providedProxyId) {
      return res.status(401).json({
        success: false,
        error: "Proxy identity mismatch",
      });
    }

    return next();
  };
}


