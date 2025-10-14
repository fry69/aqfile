/**
 * Configuration management for Aqfile
 * Supports loading config from multiple sources with precedence:
 * 1. CLI arguments (highest)
 * 2. Environment variables
 * 3. Config file
 * 4. Defaults (lowest)
 */

import { join } from "@std/path";

export interface Config {
  service?: string;
  identifier?: string;
  password?: string;
}

/**
 * Get the config file path based on the OS
 */
export function getConfigPath(): string {
  const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "";

  if (Deno.build.os === "darwin") {
    // macOS: ~/Library/Application Support/aqfile/config.json
    return join(
      homeDir,
      "Library",
      "Application Support",
      "aqfile",
      "config.json",
    );
  } else if (Deno.build.os === "windows") {
    // Windows: %APPDATA%\aqfile\config.json
    const appData = Deno.env.get("APPDATA") ||
      join(homeDir, "AppData", "Roaming");
    return join(appData, "aqfile", "config.json");
  } else {
    // Linux/Unix: ~/.config/aqfile/config.json or $XDG_CONFIG_HOME/aqfile/config.json
    const configHome = Deno.env.get("XDG_CONFIG_HOME") ||
      join(homeDir, ".config");
    return join(configHome, "aqfile", "config.json");
  }
}

/**
 * Load configuration from file if it exists
 */
export async function loadConfigFile(): Promise<Config> {
  const configPath = getConfigPath();

  try {
    const data = await Deno.readTextFile(configPath);
    const config = JSON.parse(data);
    return config;
  } catch (error) {
    // Config file doesn't exist or is invalid, return empty config
    if (error instanceof Deno.errors.NotFound) {
      return {};
    }
    throw new Error(
      `Failed to load config file: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Load configuration from environment variables
 */
export function loadEnvConfig(): Config {
  return {
    service: Deno.env.get("AQFILE_SERVICE") || Deno.env.get("SERVICE"),
    identifier: Deno.env.get("AQFILE_USERNAME") || Deno.env.get("IDENTIFIER"),
    password: Deno.env.get("AQFILE_PASSWORD") || Deno.env.get("PASSWORD"),
  };
}

/**
 * Merge multiple config sources with precedence
 */
export function mergeConfigs(...configs: Config[]): Config {
  const merged: Config = {};

  for (const config of configs) {
    if (config.service !== undefined) merged.service = config.service;
    if (config.identifier !== undefined) merged.identifier = config.identifier;
    if (config.password !== undefined) merged.password = config.password;
  }

  return merged;
}

/**
 * Load complete configuration from all sources
 */
export async function loadConfig(cliConfig: Config = {}): Promise<Config> {
  const defaults: Config = {
    service: "https://bsky.social",
  };

  const fileConfig = await loadConfigFile();
  const envConfig = loadEnvConfig();

  return mergeConfigs(defaults, fileConfig, envConfig, cliConfig);
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  const configDir = configPath.substring(0, configPath.lastIndexOf("/"));

  // Create directory if it doesn't exist
  try {
    await Deno.mkdir(configDir, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }

  const data = JSON.stringify(config, null, 2);
  await Deno.writeTextFile(configPath, data);
}
