import fs from "fs";
import path from "path";

export interface SecurityConfig {
  allowedOrigins: string[];
  behindProxy: boolean;
  enableCors: boolean;
  proxySecret: string;
  proxyId: string;
}

export interface RuntimeConfig {
  frontendUrl: string;
  backendUrl: string;
  security: SecurityConfig;
}

const LOCALHOST_ORIGINS = [
  "http://localhost",
  "http://localhost:3498",
  "http://localhost:3470",
  "http://127.0.0.1",
  "http://127.0.0.1:3498",
  "http://127.0.0.1:3470",
] as const;

const ROOT_DIR = path.resolve(__dirname, "../..");
const CONFIG_PATH = path.join(ROOT_DIR, "config", "krapi-config.json");
let runtimeAllowedOrigins: string[] = [];

function loadConfigFile(): RuntimeConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return {
        frontendUrl: "",
        backendUrl: "",
        security: {
          allowedOrigins: [],
          behindProxy: true,
          enableCors: true,
          proxySecret: "",
          proxyId: "frontend-manager",
        },
      };
    }
    const content = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(content) as {
      frontend?: { url?: string };
      backend?: { url?: string };
      security?: Partial<SecurityConfig>;
    };

    return {
      frontendUrl: parsed.frontend?.url || "",
      backendUrl: parsed.backend?.url || "",
      security: {
        allowedOrigins: parsed.security?.allowedOrigins || [],
        behindProxy: parsed.security?.behindProxy ?? true,
        enableCors: parsed.security?.enableCors ?? true,
        proxySecret: parsed.security?.proxySecret ?? "",
        proxyId: parsed.security?.proxyId ?? "frontend-manager",
      },
    };
  } catch {
    return {
      frontendUrl: "",
      backendUrl: "",
      security: {
        allowedOrigins: [],
        behindProxy: true,
        enableCors: true,
        proxySecret: "",
        proxyId: "frontend-manager",
      },
    };
  }
}

function parseEnvList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function uniqueOrigins(origins: string[]): string[] {
  return Array.from(new Set(origins));
}

function writeConfigFile(config: Partial<RuntimeConfig>): void {
  const existing = loadConfigFile();
  const next = {
    ...existing,
    ...config,
    security: {
      ...(existing.security || {}),
      ...(config.security || {}),
    },
  };

  const serialized = JSON.stringify(next, null, 2);
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, serialized, "utf8");
}

/**
 * Resolve runtime configuration from environment variables and config file.
 * Precedence: environment variables > config file > defaults.
 */
export function loadRuntimeConfig(): RuntimeConfig {
  const fileConfig = loadConfigFile();

  const envAllowedOrigins =
    parseEnvList(process.env.KRAPI_ALLOWED_ORIGINS) ||
    parseEnvList(process.env.ALLOWED_ORIGINS);

  const envFrontendUrl =
    process.env.KRAPI_FRONTEND_PUBLIC_URL ||
    process.env.KRAPI_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  const envBackendUrl =
    process.env.KRAPI_BACKEND_URL || process.env.BACKEND_URL;

  const proxySecret =
    process.env.KRAPI_PROXY_SECRET ||
    process.env.PROXY_SECRET ||
    fileConfig.security.proxySecret ||
    "";

  const proxyId =
    process.env.KRAPI_PROXY_ID ||
    process.env.PROXY_ID ||
    fileConfig.security.proxyId ||
    "frontend-manager";

  const allowedOrigins = uniqueOrigins([
    ...LOCALHOST_ORIGINS,
    ...(envFrontendUrl ? [envFrontendUrl] : []),
    ...(envAllowedOrigins.length > 0
      ? envAllowedOrigins
      : fileConfig.security?.allowedOrigins || []),
  ]);

  const behindProxy =
    process.env.NODE_ENV === "production"
      ? true
      : process.env.BEHIND_PROXY !== "false" &&
        (process.env.BEHIND_PROXY === "true" ||
          fileConfig.security?.behindProxy !== false);

  const enableCors =
    process.env.ENABLE_CORS !== undefined
      ? process.env.ENABLE_CORS === "true"
      : fileConfig.security?.enableCors ?? true;

  return {
    frontendUrl: envFrontendUrl || fileConfig.frontendUrl || "",
    backendUrl: envBackendUrl || fileConfig.backendUrl || "",
    security: {
      allowedOrigins,
      behindProxy,
      enableCors,
      proxySecret,
      proxyId,
    },
  };
}

export const LOCALHOST_ALLOWED_ORIGINS = [...LOCALHOST_ORIGINS];

export function initializeRuntimeConfig(): RuntimeConfig {
  const config = loadRuntimeConfig();
  runtimeAllowedOrigins = config.security.allowedOrigins;
  return config;
}

export function getRuntimeAllowedOrigins(): string[] {
  if (runtimeAllowedOrigins.length === 0) {
    const config = loadRuntimeConfig();
    runtimeAllowedOrigins = config.security.allowedOrigins;
  }
  return runtimeAllowedOrigins;
}

export function updateRuntimeAllowedOrigins(origins: string[]): string[] {
  runtimeAllowedOrigins = uniqueOrigins([...LOCALHOST_ORIGINS, ...origins]);
  return runtimeAllowedOrigins;
}

export function persistSecurityConfig(update: Partial<SecurityConfig>, frontendUrl?: string): void {
  const existing = loadConfigFile();
  const allowedOrigins = update.allowedOrigins
    ? uniqueOrigins([...LOCALHOST_ORIGINS, ...update.allowedOrigins])
    : existing.security.allowedOrigins;

  if (allowedOrigins) {
    updateRuntimeAllowedOrigins(allowedOrigins);
  }

  writeConfigFile({
    frontendUrl: frontendUrl || existing.frontendUrl,
    backendUrl: existing.backendUrl,
    security: {
      ...existing.security,
      ...update,
      allowedOrigins: allowedOrigins || existing.security.allowedOrigins || [],
      behindProxy:
        update.behindProxy !== undefined
          ? update.behindProxy
          : existing.security.behindProxy,
      enableCors:
        update.enableCors !== undefined
          ? update.enableCors
          : existing.security.enableCors,
      proxySecret: update.proxySecret ?? existing.security.proxySecret,
      proxyId: update.proxyId ?? existing.security.proxyId,
    },
  });
}

