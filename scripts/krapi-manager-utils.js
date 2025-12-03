#!/usr/bin/env node
/**
 * KRAPI Manager Utilities
 * 
 * Utility functions for configuration management, environment file parsing,
 * and cross-platform process management.
 */

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const configPath = path.join(rootDir, "config", "krapi-config.json");
const rootEnvPath = path.join(rootDir, ".env");
const frontendEnvPath = path.join(rootDir, "frontend-manager", ".env.local");
const backendEnvPath = path.join(rootDir, "backend-server", ".env");

/**
 * Default configuration structure
 */
const DEFAULT_CONFIG = {
  version: "1.0.0",
  app: {
    name: "KRAPI",
    version: "2.0.0",
    nodeEnv: "development",
  },
  frontend: {
    url: "http://localhost:3498",
    port: 3498,
    host: "localhost",
    allowedOrigins: [],
  },
  backend: {
    url: "http://localhost:3470",
    port: 3470,
    host: "localhost",
  },
  security: {
    allowedOrigins: [],
    behindProxy: true,
    enableCors: true,
  },
  database: {
    path: "./data/krapi.db",
    projectsDir: "./data/projects",
  },
};

/**
 * Load configuration from JSON file
 */
function loadConfig() {
  try {
    if (!fs.existsSync(configPath)) {
      // Create config directory if it doesn't exist
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      // Save default config
      saveConfig(DEFAULT_CONFIG);
      return { ...DEFAULT_CONFIG };
    }
    const content = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(content);
    // Merge with defaults to ensure all keys exist
    return mergeConfig(DEFAULT_CONFIG, config);
  } catch (error) {
    console.error(`Error loading config: ${error.message}`);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to JSON file
 */
function saveConfig(config) {
  try {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error(`Error saving config: ${error.message}`);
    return false;
  }
}

/**
 * Merge two config objects, with source taking precedence
 */
function mergeConfig(defaults, source) {
  const merged = { ...defaults };
  for (const key in source) {
    if (typeof source[key] === "object" && !Array.isArray(source[key]) && source[key] !== null) {
      merged[key] = mergeConfig(defaults[key] || {}, source[key]);
    } else {
      merged[key] = source[key];
    }
  }
  return merged;
}

/**
 * Get nested config value by dot-notation key (e.g., "frontend.url")
 */
function getConfigValue(key) {
  const config = loadConfig();
  const keys = key.split(".");
  let value = config;
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }
  return value;
}

/**
 * Set nested config value by dot-notation key
 */
function setConfigValue(key, value) {
  const config = loadConfig();
  const keys = key.split(".");
  let current = config;
  
  // Navigate to the parent object
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in current) || typeof current[k] !== "object" || Array.isArray(current[k])) {
      current[k] = {};
    }
    current = current[k];
  }
  
  // Set the value
  const lastKey = keys[keys.length - 1];
  const oldValue = current[lastKey];
  current[lastKey] = value;
  
  // Special handling: if setting allowedOrigins, ensure localhost is included
  if (key === "security.allowedOrigins" && Array.isArray(value)) {
    current[lastKey] = ensureLocalhostInOrigins(value);
  }
  
  // Special handling: if setting port, update URL accordingly
  if (key === "frontend.port") {
    const protocol = config.frontend.url.startsWith("https") ? "https" : "http";
    const host = config.frontend.host || "localhost";
    config.frontend.url = `${protocol}://${host}:${value}`;
  }
  if (key === "backend.port") {
    const protocol = config.backend.url.startsWith("https") ? "https" : "http";
    const host = config.backend.host || "localhost";
    config.backend.url = `${protocol}://${host}:${value}`;
  }
  
  // Save config
  saveConfig(config);
  
  // Sync to .env files
  syncConfigToEnv(config);
  
  return { oldValue, newValue: value };
}

/**
 * Parse .env file into object
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const env = {};
  const comments = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Preserve comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) {
      comments.push({ line: i, content: line });
      continue;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = { value, line: i, original: line };
    }
  }

  return { env, comments, lines };
}

/**
 * Update .env file with new value, preserving comments and structure
 */
function updateEnvFile(filePath, key, value) {
  const { env, comments, lines } = parseEnvFile(filePath);
  
  // Update or add the key
  if (key in env) {
    // Update existing line
    const lineIndex = env[key].line;
    lines[lineIndex] = `${key}=${value}`;
  } else {
    // Add new line at the end
    lines.push(`${key}=${value}`);
  }
  
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

/**
 * Ensure localhost is always in allowed origins
 */
function ensureLocalhostInOrigins(origins) {
  const localhostOrigins = [
    "http://localhost",
    "http://localhost:3498",
    "http://localhost:3470",
    "http://127.0.0.1",
    "http://127.0.0.1:3498",
    "http://127.0.0.1:3470",
  ];
  
  const combined = [...new Set([...localhostOrigins, ...origins])];
  return combined;
}

/**
 * Sync configuration to .env files
 */
function syncConfigToEnv(config) {
  // Always include localhost in allowed origins
  const allowedOrigins = ensureLocalhostInOrigins(config.security.allowedOrigins || []);
  
  // Sync root .env
  if (fs.existsSync(rootEnvPath)) {
    updateEnvFile(rootEnvPath, "FRONTEND_URL", config.frontend.url);
    updateEnvFile(rootEnvPath, "FRONTEND_PORT", config.frontend.port.toString());
    updateEnvFile(rootEnvPath, "FRONTEND_HOST", config.frontend.host);
    updateEnvFile(rootEnvPath, "BACKEND_URL", config.backend.url);
    updateEnvFile(rootEnvPath, "BACKEND_PORT", config.backend.port.toString());
    updateEnvFile(rootEnvPath, "BACKEND_HOST", config.backend.host);
    updateEnvFile(rootEnvPath, "NODE_ENV", config.app.nodeEnv);
    updateEnvFile(rootEnvPath, "BEHIND_PROXY", config.security.behindProxy.toString());
    updateEnvFile(rootEnvPath, "ENABLE_CORS", config.security.enableCors.toString());
    // Always set ALLOWED_ORIGINS (includes localhost)
    updateEnvFile(rootEnvPath, "ALLOWED_ORIGINS", allowedOrigins.join(","));
  }

  // Sync frontend .env.local
  if (fs.existsSync(frontendEnvPath) || fs.existsSync(path.join(rootDir, "frontend-manager", "env.example"))) {
    if (!fs.existsSync(frontendEnvPath)) {
      // Create if doesn't exist
      fs.writeFileSync(frontendEnvPath, "", "utf8");
    }
    updateEnvFile(frontendEnvPath, "NEXT_PUBLIC_APP_URL", config.frontend.url);
    updateEnvFile(frontendEnvPath, "NEXT_PUBLIC_LISTEN_HOST", config.frontend.host);
    updateEnvFile(frontendEnvPath, "KRAPI_BACKEND_URL", config.backend.url);
    updateEnvFile(frontendEnvPath, "NEXT_PUBLIC_API_URL", config.backend.url);
    // Always set ALLOWED_ORIGINS (includes localhost)
    updateEnvFile(frontendEnvPath, "ALLOWED_ORIGINS", allowedOrigins.join(","));
  }

  // Sync backend .env
  if (fs.existsSync(backendEnvPath) || fs.existsSync(path.join(rootDir, "backend-server", "env.example"))) {
    if (!fs.existsSync(backendEnvPath)) {
      // Create if doesn't exist
      fs.writeFileSync(backendEnvPath, "", "utf8");
    }
    updateEnvFile(backendEnvPath, "PORT", config.backend.port.toString());
    updateEnvFile(backendEnvPath, "HOST", config.backend.host);
    updateEnvFile(backendEnvPath, "NODE_ENV", config.app.nodeEnv);
    updateEnvFile(backendEnvPath, "FRONTEND_URL", config.frontend.url);
    updateEnvFile(backendEnvPath, "KRAPI_FRONTEND_URL", config.frontend.url);
    updateEnvFile(backendEnvPath, "ENABLE_CORS", config.security.enableCors.toString());
    // Always set ALLOWED_ORIGINS (includes localhost)
    updateEnvFile(backendEnvPath, "ALLOWED_ORIGINS", allowedOrigins.join(","));
  }
}

/**
 * Validate URL format
 */
function validateUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate port number
 */
function validatePort(port) {
  const num = parseInt(port, 10);
  return !isNaN(num) && num > 0 && num <= 65535;
}

/**
 * Validate host
 */
function validateHost(host) {
  return host === "localhost" || host === "0.0.0.0" || /^[a-zA-Z0-9.-]+$/.test(host);
}

/**
 * Format config for display
 */
function formatConfigForDisplay(config, prefix = "") {
  let output = "";
  for (const key in config) {
    const value = config[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && !Array.isArray(value) && value !== null) {
      output += formatConfigForDisplay(value, fullKey);
    } else {
      const displayValue = Array.isArray(value) ? `[${value.join(", ")}]` : value;
      output += `${fullKey}: ${displayValue}\n`;
    }
  }
  return output;
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  syncConfigToEnv,
  ensureLocalhostInOrigins,
  validateUrl,
  validatePort,
  validateHost,
  formatConfigForDisplay,
  DEFAULT_CONFIG,
  configPath,
  rootDir,
};

