/**
 * Aqfile CLI - Upload, list, and manage files on AT Protocol PDS
 *
 * This module provides a command-line interface for managing file uploads to
 * AT Protocol Personal Data Servers (PDS). It supports uploading files with
 * metadata and checksums, listing all uploaded files, and deleting files.
 *
 * @example
 * ```ts
 * // Upload a file
 * import { uploadFile } from "./main.ts";
 *
 * await uploadFile({
 *   serviceUrl: "https://bsky.social",
 *   identifier: "alice.bsky.social",
 *   password: "app-password",
 *   filePath: "./document.pdf"
 * });
 * ```
 *
 * @module
 */

import { basename } from "@std/path";
import { parseArgs } from "@std/cli";
import { lookup } from "mime-types";
import { AtpAgent } from "@atproto/api";
import { getConfigPath, loadConfig } from "./config.ts";
import { calculateChecksum, getFileMetadata } from "./utils.ts";
import type { NetAltqAqfile } from "./types.ts";

/** The current version of aqfile */
const VERSION = "0.1.0";

/**
 * Options for uploading a file to the PDS
 */
interface UploadOptions {
  /** The URL of the PDS service (e.g., "https://bsky.social") */
  serviceUrl: string;
  /** AT Protocol handle (e.g., "alice.bsky.social") or DID */
  handle: string;
  /** App Password from https://bsky.app/settings/app-passwords */
  appPassword: string;
  /** Path to the file to upload */
  filePath: string;
}

/**
 * Result returned after successfully uploading a file
 */
interface UploadResult {
  /** The uploaded blob reference */
  blob: unknown;
  /** The created record information */
  record: {
    /** The AT URI of the created record */
    uri: string;
    /** The CID (Content Identifier) of the record */
    cid: string;
  };
}

/**
 * Options for deleting a file record from the PDS
 */
interface DeleteOptions {
  /** The URL of the PDS service */
  serviceUrl: string;
  /** AT Protocol handle or DID for authentication */
  handle: string;
  /** App Password from https://bsky.app/settings/app-passwords */
  appPassword: string;
  /** The record key (rkey) of the file to delete */
  rkey: string;
}

/**
 * Options for listing file records from the PDS
 */
interface ListOptions {
  /** The URL of the PDS service */
  serviceUrl: string;
  /** AT Protocol handle or DID for authentication */
  handle: string;
  /** App Password from https://bsky.app/settings/app-passwords */
  appPassword: string;
  /** Maximum number of records to retrieve. Defaults to 100 */
  limit?: number;
}

/**
 * Upload a file to AT Protocol PDS and create a record
 *
 * This function handles the complete upload workflow:
 * 1. Authenticates with the PDS
 * 2. Reads and uploads the file as a blob
 * 3. Calculates file checksum (SHA256)
 * 4. Gathers file metadata
 * 5. Creates a net.altq.aqfile record with all information
 *
 * @param options - Upload configuration options
 * @returns A promise that resolves to the upload result containing blob and record info
 * @throws {Error} If authentication fails, file is not found, or record creation fails
 *
 * @example
 * ```ts
 * const result = await uploadFile({
 *   serviceUrl: "https://bsky.social",
 *   identifier: "alice.bsky.social",
 *   password: "app-password",
 *   filePath: "./photo.jpg"
 * });
 * console.log(`Uploaded: ${result.record.uri}`);
 * ```
 */
async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { serviceUrl, handle, appPassword, filePath } = options;

  // Initialize agent
  const agent = new AtpAgent({ service: serviceUrl });

  // Login
  await agent.login({ identifier: handle, password: appPassword });
  console.log(`✓ Logged in as ${handle}`);

  // Read file
  const data = await Deno.readFile(filePath);
  const fileName = basename(filePath);
  const mimeType = lookup(filePath) || "application/octet-stream";

  // Upload blob
  console.log(`⬆ Uploading ${fileName} (${data.length} bytes, ${mimeType})...`);
  const uploadRes = await agent.uploadBlob(data, { encoding: mimeType });
  const blob = uploadRes.data?.blob;

  if (!blob) {
    throw new Error("Upload failed: no blob returned");
  }

  const blobCid = blob.ref?.["$link"] ?? blob.ref;
  console.log(`✓ Blob uploaded: ${blobCid}`);

  if (Deno.env.get("DEBUG")) {
    console.log("Blob structure:", JSON.stringify(blob, null, 2));
  }

  // Calculate checksum
  const checksum = calculateChecksum(data);

  // Get file metadata
  const fileMetadata = await getFileMetadata(filePath, fileName, mimeType);

  // Get DID
  const did = agent.session?.did;
  if (!did) {
    throw new Error("Could not determine DID from session");
  }

  // Create record according to net.altq.aqfile lexicon (corrected collection name)
  const collection = "net.altq.aqfile";

  // Build the record with proper typing
  // The blob from uploadBlob already has the correct structure
  const recordData: NetAltqAqfile.Main = {
    $type: "net.altq.aqfile",
    blob: blob as unknown as NetAltqAqfile.Main["blob"],
    checksum,
    createdAt: new Date().toISOString(),
    file: fileMetadata,
  };

  if (Deno.env.get("DEBUG")) {
    console.log("Record data:", JSON.stringify(recordData, null, 2));
  }

  console.log(`📝 Creating record in ${collection}...`);
  const createRes = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection,
    record: recordData,
  });

  console.log(`✓ Record created: ${createRes.data.uri}`);
  console.log(`  CID: ${createRes.data.cid}`);

  return {
    blob,
    record: createRes.data,
  };
}

/**
 * List all aqfile records for the authenticated user
 *
 * Retrieves and displays all file records stored under the net.altq.aqfile
 * collection for the authenticated user. The output is formatted as a table
 * showing the record key, file size, MIME type, and filename.
 *
 * @param options - List configuration options including authentication and limit
 * @returns A promise that resolves when the list is displayed
 * @throws {Error} If authentication fails or the PDS is unreachable
 *
 * @example
 * ```ts
 * await listRecords({
 *   serviceUrl: "https://bsky.social",
 *   identifier: "alice.bsky.social",
 *   password: "app-password",
 *   limit: 50
 * });
 * // Outputs:
 * // RKEY          SIZE        MIME TYPE                    NAME
 * // ─────────────────────────────────────────────────────────────────
 * // 3m35jjrc5b62d 43B         text/plain                   test.txt
 * ```
 */
async function listRecords(options: ListOptions): Promise<void> {
  const { serviceUrl, handle, appPassword, limit = 100 } = options;

  // Initialize agent
  const agent = new AtpAgent({ service: serviceUrl });

  // Login
  await agent.login({ identifier: handle, password: appPassword });

  // Get DID
  const did = agent.session?.did;
  if (!did) {
    throw new Error("Could not determine DID from session");
  }

  const collection = "net.altq.aqfile";

  // List records
  const response = await agent.com.atproto.repo.listRecords({
    repo: did,
    collection,
    limit,
  });

  const records = response.data.records;

  if (records.length === 0) {
    console.log("No aqfile records found.");
    return;
  }

  console.log(
    `Found ${records.length} record${records.length === 1 ? "" : "s"}:\n`,
  );

  // Table header
  console.log(
    "RKEY          SIZE        MIME TYPE                    NAME",
  );
  console.log(
    "─────────────────────────────────────────────────────────────────────────────────────────",
  );

  // Print each record
  for (const record of records) {
    const rkey = record.uri.split("/").pop() || "unknown";
    const value = record.value as NetAltqAqfile.Main;

    // Extract relevant info
    const fileName = value.file?.name || "unknown";
    const fileSize = value.file?.size || 0;
    const mimeType = value.file?.mimeType || "unknown";

    // Format size for readability
    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
      if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
      }
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
    };

    // Print row with fixed widths
    const rkeyStr = rkey.padEnd(13);
    const sizeStr = formatSize(fileSize).padEnd(11);
    const mimeStr = mimeType.slice(0, 28).padEnd(29);
    const nameStr = fileName.slice(0, 40);

    console.log(`${rkeyStr} ${sizeStr} ${mimeStr} ${nameStr}`);
  }

  console.log();
}

/**
 * Delete an aqfile record and its associated blob
 *
 * Removes a file record from the PDS by its record key (rkey). The associated
 * blob will be marked for garbage collection by the PDS. Note that the actual
 * blob deletion is handled by the PDS garbage collector and occurs when no other
 * records reference the blob.
 *
 * @param options - Delete configuration options including authentication and rkey
 * @returns A promise that resolves when the record is deleted
 * @throws {Error} If authentication fails, record is not found, or deletion fails
 *
 * @example
 * ```ts
 * await deleteRecord({
 *   serviceUrl: "https://bsky.social",
 *   identifier: "alice.bsky.social",
 *   password: "app-password",
 *   rkey: "3m35jjrc5b62d"
 * });
 * // Outputs:
 * // ✓ Logged in as alice.bsky.social
 * // 🗑  Deleting record 3m35jjrc5b62d...
 * // ✓ Record deleted
 * // ℹ  Blob bafkreic... will be cleaned up by PDS garbage collection
 * ```
 */
async function deleteRecord(options: DeleteOptions): Promise<void> {
  const { serviceUrl, handle, appPassword, rkey } = options;

  // Initialize agent
  const agent = new AtpAgent({ service: serviceUrl });

  // Login
  await agent.login({ identifier: handle, password: appPassword });
  console.log(`✓ Logged in as ${handle}`);

  // Get DID
  const did = agent.session?.did;
  if (!did) {
    throw new Error("Could not determine DID from session");
  }

  const collection = "net.altq.aqfile";

  // Get the record first to extract blob reference
  try {
    const recordResponse = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection,
      rkey,
    });

    const record = recordResponse.data.value as NetAltqAqfile.Main;
    const blob = record.blob;

    // Delete the record
    console.log(`🗑  Deleting record ${rkey}...`);
    await agent.com.atproto.repo.deleteRecord({
      repo: did,
      collection,
      rkey,
    });
    console.log(`✓ Record deleted`);

    // Note: Blob deletion is handled automatically by PDS when no records reference it
    // Individual blob deletion API is not available in @atproto/api
    if (blob && typeof blob === "object" && "ref" in blob) {
      const blobRef = blob.ref;
      const cid = typeof blobRef === "object" && blobRef && "$link" in blobRef
        ? blobRef.$link
        : blobRef;
      console.log(
        `ℹ  Blob ${cid} will be cleaned up by PDS garbage collection`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      throw new Error(`Record not found: ${rkey}`);
    }
    throw error;
  }
}

/**
 * Display help message showing all available commands and options
 *
 * Prints comprehensive usage information including commands, environment
 * variables, configuration file format, and examples.
 */
function showHelp(): void {
  console.log(`
aqfile v${VERSION}
Upload files to AT Protocol PDS

Usage:
  aqfile upload <file>     Upload a file
  aqfile list              List all uploaded files
  aqfile delete <rkey>     Delete a file record (and its blob)
  aqfile config            Show config file location
  aqfile config setup      Set up credentials interactively
  aqfile config clear      Clear stored credentials
  aqfile help              Show this help
  aqfile version           Show version

Options:
  -h, --help               Show this help
  -v, --version            Show version
  -s, --service <url>      PDS service URL (default: https://bsky.social)
  --handle <handle>        AT Protocol handle (e.g., alice.bsky.social) or DID
  --app-password <pass>    App Password (generate at https://bsky.app/settings/app-passwords)

Environment variables:
  AQFILE_SERVICE           PDS service URL (default: https://bsky.social)
  AQFILE_HANDLE            AT Protocol handle or DID
  AQFILE_APP_PASSWORD      App Password from https://bsky.app/settings/app-passwords

Config file:
  Configuration can be stored in a JSON file at:
  - Linux/Unix: ~/.config/aqfile/config.json
  - macOS: ~/Library/Application Support/aqfile/config.json
  - Windows: %APPDATA%\\aqfile\\config.json

  Example config.json:
  {
    "service": "https://bsky.social",
    "handle": "alice.bsky.social",
    "appPassword": "your-app-password-here"
  }

  ⚠️  IMPORTANT: Always use an App Password, never your account password!
      Generate one at: https://bsky.app/settings/app-passwords

Examples:
  aqfile upload document.pdf
  aqfile upload image.png --service https://my-pds.example.com
  aqfile list
  aqfile delete 3jxyz123abc
  aqfile config setup
  aqfile config clear
`);
}

/**
 * Main CLI entry point
 *
 * Parses command-line arguments and routes to the appropriate command handler.
 * Supports: upload, list, delete, config, help, and version commands.
 */
async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version"],
    string: ["service", "handle", "app-password"],
    alias: {
      h: "help",
      v: "version",
      s: "service",
    },
  });

  // Handle help
  if (args.help || args._.length === 0) {
    showHelp();
    Deno.exit(0);
  }

  // Handle version
  if (args.version) {
    console.log(`aqfile v${VERSION}`);
    Deno.exit(0);
  }

  const command = args._[0]?.toString();

  if (command === "help") {
    showHelp();
    Deno.exit(0);
  }

  if (command === "version") {
    console.log(`aqfile-ts v${VERSION}`);
    Deno.exit(0);
  }

  if (command === "config") {
    const subcommand = args._[1]?.toString();
    const configPath = getConfigPath();

    if (subcommand === "setup") {
      // Interactive setup
      const {
        isInteractive,
        promptForConfig,
        promptToSave,
        saveConfig: saveCfg,
      } = await import(
        "./config.ts"
      );

      if (!isInteractive()) {
        console.error("Error: Interactive setup requires a terminal");
        Deno.exit(1);
      }

      const config = await promptForConfig();

      if (config.handle && config.appPassword) {
        if (await promptToSave()) {
          await saveCfg(config);
          console.log(`\n✓ Configuration saved to: ${configPath}`);
        } else {
          console.log("\n Configuration not saved");
        }
      }

      Deno.exit(0);
    }

    if (subcommand === "clear") {
      const { clearConfig } = await import("./config.ts");
      await clearConfig();
      console.log(`✓ Configuration cleared: ${configPath}`);
      Deno.exit(0);
    }

    // Show config
    console.log(`Config file location: ${configPath}`);

    try {
      const config = await loadConfig();
      console.log("\nCurrent configuration:");
      console.log(`  Service:     ${config.service || "(not set)"}`);
      console.log(`  Handle:      ${config.handle || "(not set)"}`);
      console.log(
        `  App Password:${config.appPassword ? " ***" : " (not set)"}`,
      );
    } catch {
      console.log("\nNo configuration found");
    }

    Deno.exit(0);
  }

  if (command === "upload") {
    const filePath = args._[1]?.toString();
    if (!filePath) {
      console.error("Error: No file specified");
      console.error("Usage: aqfile upload <file>");
      Deno.exit(1);
    }

    // Check if file exists
    try {
      await Deno.stat(filePath);
    } catch {
      console.error(`Error: File not found: ${filePath}`);
      Deno.exit(1);
    }

    // Load configuration from all sources (file, env, CLI args)
    let config = await loadConfig({
      service: args.service,
      handle: args.handle,
      appPassword: args["app-password"],
    });

    // Check if credentials are missing
    if (!config.handle || !config.appPassword) {
      const {
        isInteractive,
        promptForConfig,
        promptToSave,
        saveConfig: saveCfg,
      } = await import(
        "./config.ts"
      );

      // If interactive and missing credentials, offer to set them up
      if (isInteractive()) {
        console.log("\n⚠️  No credentials configured.");
        console.log("   Would you like to set them up now?\n");

        const newConfig = await promptForConfig();
        config = { ...config, ...newConfig };

        // If CLI args were provided, ask if they want to save
        if (args.handle || args["app-password"]) {
          if (await promptToSave()) {
            await saveCfg(config);
            console.log(`\n✓ Configuration saved to: ${getConfigPath()}`);
          }
        } else {
          // Always ask to save if configured interactively
          if (await promptToSave()) {
            await saveCfg(config);
            console.log(`\n✓ Configuration saved to: ${getConfigPath()}`);
          }
        }
      } else {
        console.error(
          "Error: Credentials not provided. Set AQFILE_HANDLE and AQFILE_APP_PASSWORD environment variables,",
        );
        console.error(`       or create a config file at: ${getConfigPath()}`);
        console.error(
          `       or run 'aqfile config setup' to configure interactively.`,
        );
        Deno.exit(1);
      }
    }

    try {
      await uploadFile({
        serviceUrl: config.service!,
        handle: config.handle!,
        appPassword: config.appPassword!,
        filePath,
      });
      console.log("\n✓ Upload complete");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n✗ Upload failed: ${message}`);
      if (Deno.env.get("DEBUG")) {
        console.error(error);
      }
      Deno.exit(1);
    }
  } else if (command === "list") {
    // Load configuration
    const config = await loadConfig({
      service: args.service,
      handle: args.handle,
      appPassword: args["app-password"],
    });

    if (!config.handle || !config.appPassword) {
      console.error(
        "Error: Credentials not provided. Set AQFILE_HANDLE and AQFILE_APP_PASSWORD environment variables,",
      );
      console.error(`       or create a config file at: ${getConfigPath()}`);
      console.error(
        `       or run 'aqfile config setup' to configure interactively.`,
      );
      Deno.exit(1);
    }

    try {
      await listRecords({
        serviceUrl: config.service!,
        handle: config.handle,
        appPassword: config.appPassword,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`✗ List failed: ${message}`);
      if (Deno.env.get("DEBUG")) {
        console.error(error);
      }
      Deno.exit(1);
    }
  } else if (command === "delete") {
    const rkey = args._[1]?.toString();
    if (!rkey) {
      console.error("Error: No record key specified");
      console.error("Usage: aqfile delete <rkey>");
      console.error("Hint: Use 'aqfile list' to see available records");
      Deno.exit(1);
    }

    // Load configuration
    const config = await loadConfig({
      service: args.service,
      handle: args.handle,
      appPassword: args["app-password"],
    });

    if (!config.handle || !config.appPassword) {
      console.error(
        "Error: Credentials not provided. Set AQFILE_HANDLE and AQFILE_APP_PASSWORD environment variables,",
      );
      console.error(`       or create a config file at: ${getConfigPath()}`);
      console.error(
        `       or run 'aqfile config setup' to configure interactively.`,
      );
      Deno.exit(1);
    }

    try {
      await deleteRecord({
        serviceUrl: config.service!,
        handle: config.handle,
        appPassword: config.appPassword,
        rkey,
      });
      console.log("\n✓ Delete complete");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`\n✗ Delete failed: ${message}`);
      if (Deno.env.get("DEBUG")) {
        console.error(error);
      }
      Deno.exit(1);
    }
  } else {
    console.error(`Error: Unknown command: ${command}`);
    console.error("Run 'aqfile help' for usage information");
    Deno.exit(1);
  }
}

// Run if main module
if (import.meta.main) {
  main();
}
