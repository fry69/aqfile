/**
 * Configuration management for aqfile CLI
 *
 * This module handles loading and merging configuration from multiple sources
 * with the following precedence (highest to lowest):
 * 1. CLI arguments
 * 2. Environment variables
 * 3. Config file
 * 4. Defaults
 *
 * @example
 * ```ts
 * import { loadConfig } from "./config.ts";
 *
 * const config = await loadConfig({
 *   service: "https://bsky.social"
 * });
 * console.log(config.identifier); // From env or config file
 * ```
 *
 * @module
 */

import { dirname, join } from "@std/path";

/**
 * Configuration options for aqfile
 */
export interface Config {
  /** The URL of the PDS service (e.g., "https://bsky.social") */
  service?: string;
  /** AT Protocol handle (e.g., "alice.bsky.social") or DID (e.g., "did:plc:...") */
  handle?: string;
  /** App Password from https://bsky.app/settings/app-passwords */
  appPassword?: string;
}

/**
 * Get the config file path based on the operating system
 *
 * Returns the appropriate config file location for the current platform:
 * - macOS: `~/Library/Application Support/aqfile/config.json`
 * - Windows: `%APPDATA%\aqfile\config.json`
 * - Linux: `~/.config/aqfile/config.json` or `$XDG_CONFIG_HOME/aqfile/config.json`
 *
 * @returns The absolute path to the config file
 *
 * @example
 * ```ts
 * const path = getConfigPath();
 * console.log(path); // "/Users/alice/Library/Application Support/aqfile/config.json"
 * ```
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
 *
 * Reads and parses the config file at the platform-specific location.
 * Returns an empty config object if the file doesn't exist.
 *
 * @returns A promise that resolves to the parsed config object
 * @throws {Error} If the config file exists but contains invalid JSON
 *
 * @example
 * ```ts
 * const config = await loadConfigFile();
 * if (config.identifier) {
 *   console.log(`Found saved identifier: ${config.identifier}`);
 * }
 * ```
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
 *
 * Reads configuration from the following environment variables:
 * - `AQFILE_SERVICE` - PDS service URL
 * - `AQFILE_HANDLE` - AT Protocol handle or DID
 * - `AQFILE_APP_PASSWORD` - App Password from https://bsky.app/settings/app-passwords
 *
 * @returns A config object with values from environment variables
 *
 * @example
 * ```ts
 * Deno.env.set("AQFILE_SERVICE", "https://bsky.social");
 * Deno.env.set("AQFILE_HANDLE", "alice.bsky.social");
 *
 * const config = loadEnvConfig();
 * console.log(config.service); // "https://bsky.social"
 * ```
 */
export function loadEnvConfig(): Config {
  return {
    service: Deno.env.get("AQFILE_SERVICE"),
    handle: Deno.env.get("AQFILE_HANDLE"),
    appPassword: Deno.env.get("AQFILE_APP_PASSWORD"),
  };
}

/**
 * Merge multiple config sources with precedence
 *
 * Combines multiple config objects, with later configs taking precedence
 * over earlier ones. Only defined (non-undefined) values override previous values.
 *
 * @param configs - Config objects to merge, in order from lowest to highest precedence
 * @returns A merged config object
 *
 * @example
 * ```ts
 * const defaults = { service: "https://bsky.social" };
 * const userConfig = { handle: "alice.bsky.social" };
 * const cliArgs = { service: "https://custom-pds.example.com" };
 *
 * const merged = mergeConfigs(defaults, userConfig, cliArgs);
 * // Result: {
 * //   service: "https://custom-pds.example.com",  // from cliArgs
 * //   handle: "alice.bsky.social"                  // from userConfig
 * // }
 * ```
 */
export function mergeConfigs(...configs: Config[]): Config {
  const merged: Config = {};

  for (const config of configs) {
    if (config.service !== undefined) merged.service = config.service;
    if (config.handle !== undefined) merged.handle = config.handle;
    if (config.appPassword !== undefined) {
      merged.appPassword = config.appPassword;
    }
  }

  return merged;
}

/**
 * Load complete configuration from all sources
 *
 * Loads and merges configuration from multiple sources with the following precedence
 * (highest to lowest):
 * 1. CLI arguments (highest priority)
 * 2. Environment variables
 * 3. Config file (~/.config/aqfile/config.json or similar)
 * 4. Default values (lowest priority)
 *
 * @param cliConfig - Configuration from CLI arguments (highest precedence)
 * @returns A promise resolving to the merged configuration
 *
 * @example
 * ```ts
 * // Load with defaults
 * const config = await loadConfig();
 *
 * // Load with CLI overrides
 * const config = await loadConfig({
 *   service: "https://custom-pds.example.com",
 *   identifier: "alice.bsky.social"
 * });
 * ```
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
 *
 * Writes configuration to the platform-specific config file, creating
 * the directory structure if it doesn't exist. The config is saved as
 * formatted JSON for readability.
 *
 * @param config - Configuration object to save
 * @returns A promise that resolves when the file is written
 * @throws {Deno.errors.PermissionDenied} If lacking write permissions
 * @throws {Error} If directory creation or file writing fails
 *
 * @example
 * ```ts
 * // Save user credentials
 * await saveConfig({
 *   service: "https://bsky.social",
 *   handle: "alice.bsky.social",
 *   appPassword: "app-password-here"
 * });
 *
 * // Config saved to:
 * // - macOS: ~/.config/aqfile/config.json
 * // - Windows: %APPDATA%\aqfile\config.json
 * // - Linux: ~/.config/aqfile/config.json
 * ```
 */
export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  const configDir = dirname(configPath);

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

/**
 * Clear the saved configuration file
 *
 * Deletes the config file if it exists. This removes all stored credentials.
 *
 * @returns A promise that resolves when the file is deleted, or immediately if it doesn't exist
 *
 * @example
 * ```ts
 * await clearConfig();
 * console.log("Credentials cleared");
 * ```
 */
export async function clearConfig(): Promise<void> {
  const configPath = getConfigPath();

  try {
    await Deno.remove(configPath);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
    // File doesn't exist, nothing to clear
  }
}

/**
 * Check if running in an interactive terminal
 *
 * @returns true if stdin is a TTY (interactive terminal)
 */
export function isInteractive(): boolean {
  return Deno.stdin.isTerminal();
}

/**
 * Prompt user for input in an interactive terminal
 *
 * @param prompt - The prompt message to display
 * @param defaultValue - Optional default value
 * @returns The user's input or default value
 */
async function promptUser(prompt: string, defaultValue = ""): Promise<string> {
  const defaultText = defaultValue ? ` [${defaultValue}]` : "";
  await Deno.stdout.write(
    new TextEncoder().encode(`${prompt}${defaultText}: `),
  );

  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);
  if (n === null) return defaultValue;

  const input = new TextDecoder().decode(buf.subarray(0, n)).trim();
  return input || defaultValue;
}

/**
 * Prompt user to set up credentials interactively
 *
 * Only works in interactive terminals. Prompts for service, handle, and app password,
 * then offers to save them to the config file.
 *
 * @returns A promise resolving to the entered configuration
 *
 * @example
 * ```ts
 * if (isInteractive()) {
 *   const config = await promptForConfig();
 *   console.log("Config set up:", config);
 * }
 * ```
 */
export async function promptForConfig(): Promise<Config> {
  console.log("\n🔧 aqfile Configuration Setup");
  console.log("================================\n");

  const service = await promptUser(
    "PDS service URL",
    "https://bsky.social",
  );

  const handle = await promptUser(
    "Your handle (e.g., alice.bsky.social)",
  );

  console.log(
    "\n⚠️  App Password required (not your account password!)",
  );
  console.log(
    "   Generate one at: https://bsky.app/settings/app-passwords\n",
  );

  const appPassword = await promptUser("App Password");

  return { service, handle, appPassword };
}

/**
 * Ask user if they want to save credentials
 *
 * @returns true if user wants to save, false otherwise
 */
export async function promptToSave(): Promise<boolean> {
  const response = await promptUser("\nSave these credentials? (y/n)", "y");
  return response.toLowerCase() === "y" || response.toLowerCase() === "yes";
}
