import crypto from "crypto";

import { Response } from "express";

import { createProxyAuthMiddleware, RawBodyRequest } from "../proxy-auth.middleware";

function buildSignature(options: {
  secret: string;
  timestamp: string;
  nonce: string;
  method: string;
  url: string;
  body?: string;
}): string {
  const { secret, timestamp, nonce, method, url, body } = options;
  const payload = [timestamp, nonce, method, url, body || ""].join(":");
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

describe("proxy-auth middleware", () => {
  const secret = "test-secret";
  const middleware = createProxyAuthMiddleware({ secret, clockSkewMs: 10000 });

  function createResponse(resolve: (value: unknown) => void): Response {
    let statusCode: number | undefined;
    const res: Partial<Response> = {};
    res.status = jest.fn((code: number) => {
      statusCode = code;
      return res as Response;
    }) as Response["status"];
    res.json = jest.fn((body: unknown) => {
      resolve({ status: statusCode, body });
      return res as Response;
    }) as Response["json"];
    return res as Response;
  }

  it("allows valid signed requests", async () => {
    await new Promise<void>((resolve) => {
      const timestamp = Date.now().toString();
      const nonce = "abc123";
      const rawBody = '{"test":true}';
      const signature = buildSignature({
        secret,
        timestamp,
        nonce,
        method: "POST",
        url: "/krapi/k1/test",
        body: rawBody,
      });

      const req: RawBodyRequest = {
        method: "POST",
        originalUrl: "/krapi/k1/test",
        path: "/krapi/k1/test",
        headers: {
          "x-krapi-proxy-signature": signature,
          "x-krapi-timestamp": timestamp,
          "x-krapi-nonce": nonce,
        },
        rawBody,
      } as unknown as RawBodyRequest;

      const res = createResponse(() => resolve());
      const next = jest.fn(() => resolve());
      middleware(req, res, next);
    });
  });

  it("rejects requests with missing headers", async () => {
    const result = await new Promise<{ status?: number; body: unknown }>((resolve) => {
      const req: RawBodyRequest = {
        method: "GET",
        originalUrl: "/krapi/k1/test",
        path: "/krapi/k1/test",
        headers: {},
        rawBody: "",
      } as unknown as RawBodyRequest;

      const res = createResponse((value) => resolve(value as { status?: number; body: unknown }));
      const next = jest.fn();
      middleware(req, res, next);
    });

    expect(result.status).toBe(401);
  });

  it("rejects expired signatures", async () => {
    const result = await new Promise<{ status?: number; body: unknown }>((resolve) => {
      const timestamp = (Date.now() - 60000).toString();
      const nonce = "expired";
      const rawBody = "";
      const signature = buildSignature({
        secret,
        timestamp,
        nonce,
        method: "GET",
        url: "/krapi/k1/test",
        body: rawBody,
      });

      const req: RawBodyRequest = {
        method: "GET",
        originalUrl: "/krapi/k1/test",
        path: "/krapi/k1/test",
        headers: {
          "x-krapi-proxy-signature": signature,
          "x-krapi-timestamp": timestamp,
          "x-krapi-nonce": nonce,
        },
        rawBody,
      } as unknown as RawBodyRequest;

      const res = createResponse((value) => resolve(value as { status?: number; body: unknown }));
      const next = jest.fn();
      middleware(req, res, next);
    });

    expect(result.status).toBe(401);
  });

  it("bypasses health without secret when configured", async () => {
    const noSecretMiddleware = createProxyAuthMiddleware({});
    await new Promise<void>((resolve) => {
      const req: RawBodyRequest = {
        method: "GET",
        originalUrl: "/health",
        path: "/health",
        headers: {},
        rawBody: "",
      } as unknown as RawBodyRequest;
      const res = createResponse(() => resolve());
      const next = jest.fn(() => resolve());
      noSecretMiddleware(req, res, next);
    });
  });
});

