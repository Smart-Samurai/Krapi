import { getRuntimeAllowedOrigins, initializeRuntimeConfig, updateRuntimeAllowedOrigins } from "../runtime-config";

describe("runtime-config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prioritizes env allowed origins over config file", () => {
    process.env.KRAPI_ALLOWED_ORIGINS = "https://example.com";
    process.env.BEHIND_PROXY = "false";
    const config = initializeRuntimeConfig();

    expect(config.security.allowedOrigins).toEqual(
      expect.arrayContaining(["https://example.com"])
    );
    expect(config.security.allowedOrigins.some((origin) => origin.includes("localhost"))).toBe(true);
  });

  it("updates runtime allowed origins without restart", () => {
    const updated = updateRuntimeAllowedOrigins(["https://new.example.com"]);
    expect(updated).toEqual(
      expect.arrayContaining(["https://new.example.com", "http://localhost:3498"])
    );
    expect(getRuntimeAllowedOrigins()).toEqual(updated);
  });
});


