/**
 * ATfile - Upload files to AT Protocol PDS
 * Reimplementation in modern TypeScript using Deno runtime
 */

import { basename } from "@std/path";
import { parseArgs } from "@std/cli";
import { lookup } from "mime-types";
import { AtpAgent } from "@atproto/api";
import { getConfigPath, loadConfig } from "./config.ts";
import {
  calculateChecksum,
  generateFingerprint,
  getFileMetadata,
} from "./utils.ts";

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

  // Calculate checksum
  const checksum = calculateChecksum(data);

  // Get file metadata
  const fileMetadata = await getFileMetadata(filePath, fileName, mimeType);

  // Generate fingerprint
  const fingerprint = generateFingerprint(VERSION);

  // Get DID
  const did = agent.session?.did;
  if (!did) {
    throw new Error("Could not determine DID from session");
  }

  // Create record according to blue.zio.atfile.upload lexicon
  const collection = "blue.zio.atfile.upload";
  const record: Record<string, unknown> = {
    $type: collection,
    blob,
    checksum,
    createdAt: new Date().toISOString(),
    file: fileMetadata,
    finger: fingerprint,
  };

  console.log(`📝 Creating record in ${collection}...`);
  const createRes = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection,
    record,
  });

  console.log(`✓ Record created: ${createRes.data.uri}`);
  console.log(`  CID: ${createRes.data.cid}`);

  return {
    blob,
    record: createRes.data,
  };
}

/**
 * Display help message
 */
function showHelp(): void {
  console.log(`
ATfile-ts v${VERSION}
Upload files to AT Protocol PDS

Usage:
  atfile upload <file>     Upload a file
  atfile config            Show config file location
  atfile help              Show this help
  atfile version           Show version

Environment variables:
  ATFILE_SERVICE           PDS service URL (default: https://bsky.social)
  ATFILE_USERNAME          AT Protocol identifier (handle or DID)
  ATFILE_PASSWORD          AT Protocol password or app password

Config file:
  Configuration can be stored in a JSON file at:
  - Linux/Unix: ~/.config/atfile/config.json
  - macOS: ~/Library/Application Support/atfile/config.json
  - Windows: %APPDATA%\\atfile\\config.json

  Example config.json:
  {
    "service": "https://bsky.social",
    "identifier": "alice.bsky.social",
    "password": "your-app-password"
  }

Examples:
  atfile upload document.pdf
  atfile upload image.png --service https://my-pds.example.com
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
    console.log(`atfile-ts v${VERSION}`);
    Deno.exit(0);
  }

  const command = args._[0]?.toString();

  if (command === "help") {
    showHelp();
    Deno.exit(0);
  }

  if (command === "version") {
    console.log(`atfile-ts v${VERSION}`);
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
      console.error("Usage: atfile upload <file>");
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
        "Error: Credentials not provided. Set ATFILE_USERNAME and ATFILE_PASSWORD environment variables,",
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
  } else {
    console.error(`Error: Unknown command: ${command}`);
    console.error("Run 'atfile help' for usage information");
    Deno.exit(1);
  }
}

// Run if main module
if (import.meta.main) {
  main();
}
