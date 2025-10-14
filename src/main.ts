/**
 * Aqfile - Upload files to AT Protocol PDS
 * Reimplementation in modern TypeScript using Deno runtime
 */

import { basename } from "@std/path";
import { parseArgs } from "@std/cli";
import { lookup } from "mime-types";
import { AtpAgent } from "@atproto/api";
import { getConfigPath, loadConfig } from "./config.ts";
import { calculateChecksum, getFileMetadata } from "./utils.ts";
import type { NetAltqAqfile } from "./lexicons/index.ts";

const VERSION = "0.1.0";

interface UploadOptions {
  serviceUrl: string;
  identifier: string;
  password: string;
  filePath: string;
}

interface UploadResult {
  blob: unknown;
  record: {
    uri: string;
    cid: string;
  };
}

interface DeleteOptions {
  serviceUrl: string;
  identifier: string;
  password: string;
  rkey: string;
}

interface ListOptions {
  serviceUrl: string;
  identifier: string;
  password: string;
  limit?: number;
}

/**
 * Upload a file to AT Protocol PDS and create a record
 */
async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { serviceUrl, identifier, password, filePath } = options;

  // Initialize agent
  const agent = new AtpAgent({ service: serviceUrl });

  // Login
  await agent.login({ identifier, password });
  console.log(`✓ Logged in as ${identifier}`);

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
 */
async function listRecords(options: ListOptions): Promise<void> {
  const { serviceUrl, identifier, password, limit = 100 } = options;

  // Initialize agent
  const agent = new AtpAgent({ service: serviceUrl });

  // Login
  await agent.login({ identifier, password });

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
 */
async function deleteRecord(options: DeleteOptions): Promise<void> {
  const { serviceUrl, identifier, password, rkey } = options;

  // Initialize agent
  const agent = new AtpAgent({ service: serviceUrl });

  // Login
  await agent.login({ identifier, password });
  console.log(`✓ Logged in as ${identifier}`);

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
 * Display help message
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
  aqfile help              Show this help
  aqfile version           Show version

Environment variables:
  AQFILE_SERVICE           PDS service URL (default: https://bsky.social)
  AQFILE_USERNAME          AT Protocol identifier (handle or DID)
  AQFILE_PASSWORD          AT Protocol password or app password

Config file:
  Configuration can be stored in a JSON file at:
  - Linux/Unix: ~/.config/aqfile/config.json
  - macOS: ~/Library/Application Support/aqfile/config.json
  - Windows: %APPDATA%\\aqfile\\config.json

  Example config.json:
  {
    "service": "https://bsky.social",
    "identifier": "alice.bsky.social",
    "password": "your-app-password"
  }

Examples:
  aqfile upload document.pdf
  aqfile upload image.png --service https://my-pds.example.com
  aqfile list
  aqfile delete 3jxyz123abc
`);
}

/**
 * Main CLI entry point
 */
async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version"],
    string: ["service", "identifier", "password"],
    alias: {
      h: "help",
      v: "version",
      s: "service",
      i: "identifier",
      p: "password",
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
    const configPath = getConfigPath();
    console.log(`Config file location: ${configPath}`);

    try {
      const config = await loadConfig();
      console.log("\nCurrent configuration:");
      console.log(`  Service:    ${config.service || "(not set)"}`);
      console.log(`  Identifier: ${config.identifier || "(not set)"}`);
      console.log(`  Password:   ${config.password ? "***" : "(not set)"}`);
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
    const config = await loadConfig({
      service: args.service,
      identifier: args.identifier,
      password: args.password,
    });

    if (!config.identifier || !config.password) {
      console.error(
        "Error: Credentials not provided. Set AQFILE_USERNAME and AQFILE_PASSWORD environment variables,",
      );
      console.error(`       or create a config file at: ${getConfigPath()}`);
      Deno.exit(1);
    }

    try {
      await uploadFile({
        serviceUrl: config.service!,
        identifier: config.identifier,
        password: config.password,
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
      identifier: args.identifier,
      password: args.password,
    });

    if (!config.identifier || !config.password) {
      console.error(
        "Error: Credentials not provided. Set AQFILE_USERNAME and AQFILE_PASSWORD environment variables,",
      );
      console.error(`       or create a config file at: ${getConfigPath()}`);
      Deno.exit(1);
    }

    try {
      await listRecords({
        serviceUrl: config.service!,
        identifier: config.identifier,
        password: config.password,
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
      identifier: args.identifier,
      password: args.password,
    });

    if (!config.identifier || !config.password) {
      console.error(
        "Error: Credentials not provided. Set AQFILE_USERNAME and AQFILE_PASSWORD environment variables,",
      );
      console.error(`       or create a config file at: ${getConfigPath()}`);
      Deno.exit(1);
    }

    try {
      await deleteRecord({
        serviceUrl: config.service!,
        identifier: config.identifier,
        password: config.password,
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
