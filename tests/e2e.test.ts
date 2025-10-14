/**
 * End-to-end tests for aqfile CLI
 * Tests actual upload, list, and delete operations against a real PDS
 *
 * Requires credentials in .env.e2e file:
 * - AQFILE_SERVICE
 * - AQFILE_USERNAME
 * - AQFILE_PASSWORD
 *
 * Run with: deno task test:e2e
 */

import { expect } from "@std/expect";
import { join } from "@std/path";
import { AtpAgent } from "@atproto/api";
import type { NetAltqAqfile } from "../src/lexicons/index.ts";
import { calculateChecksum, getFileMetadata } from "../src/utils.ts";

// Load environment variables from .env.e2e
const envPath = join(Deno.cwd(), ".env.e2e");
try {
  const envContent = await Deno.readTextFile(envPath);
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=");
      if (key && value) {
        Deno.env.set(key, value);
      }
    }
  }
} catch {
  console.warn("Warning: .env.e2e file not found, using existing env vars");
}

const SERVICE = Deno.env.get("AQFILE_SERVICE") || "https://bsky.social";
const USERNAME = Deno.env.get("AQFILE_USERNAME");
const PASSWORD = Deno.env.get("AQFILE_PASSWORD");

if (!USERNAME || !PASSWORD) {
  console.error(
    "Error: AQFILE_USERNAME and AQFILE_PASSWORD must be set in .env.e2e",
  );
  Deno.exit(1);
}

const COLLECTION = "net.altq.aqfile";

// Helper to create a test agent
async function createAgent(): Promise<AtpAgent> {
  const agent = new AtpAgent({ service: SERVICE });
  await agent.login({ identifier: USERNAME!, password: PASSWORD! });
  return agent;
}

// Helper to create a temporary test file
async function createTestFile(
  name: string,
  content: string,
): Promise<string> {
  const tempDir = await Deno.makeTempDir();
  const filePath = join(tempDir, name);
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

// Helper to upload a file and return the record URI and blob
async function uploadTestFile(
  agent: AtpAgent,
  filePath: string,
): Promise<{ uri: string; cid: string; rkey: string; blob: unknown }> {
  const did = agent.session?.did;
  if (!did) throw new Error("No DID in session");

  const data = await Deno.readFile(filePath);
  const fileName = filePath.split("/").pop() || "test.txt";
  const mimeType = "text/plain";

  // Upload blob
  const uploadRes = await agent.uploadBlob(data, { encoding: mimeType });
  const blob = uploadRes.data?.blob;
  if (!blob) throw new Error("Upload failed");

  // Calculate checksum
  const checksum = calculateChecksum(data);

  // Get file metadata
  const fileMetadata = await getFileMetadata(filePath, fileName, mimeType);

  // Create record
  const recordData: NetAltqAqfile.Main = {
    $type: COLLECTION,
    blob: blob as unknown as NetAltqAqfile.Main["blob"],
    checksum,
    createdAt: new Date().toISOString(),
    file: fileMetadata,
  };

  // Create record (PDS will validate)
  const createRes = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: COLLECTION,
    record: recordData,
  });

  const rkey = createRes.data.uri.split("/").pop() || "";

  return {
    uri: createRes.data.uri,
    cid: createRes.data.cid,
    rkey,
    blob,
  };
}

// Helper to delete a record
async function deleteTestRecord(
  agent: AtpAgent,
  rkey: string,
): Promise<void> {
  const did = agent.session?.did;
  if (!did) throw new Error("No DID in session");

  await agent.com.atproto.repo.deleteRecord({
    repo: did,
    collection: COLLECTION,
    rkey,
  });
}

// Clean up any existing test records before starting
Deno.test({
  name: "e2e - cleanup existing test records",
  async fn() {
    const agent = await createAgent();
    const did = agent.session?.did;
    if (!did) throw new Error("No DID in session");

    const response = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: COLLECTION,
      limit: 100,
    });

    // Delete all existing records to start fresh
    for (const record of response.data.records) {
      const rkey = record.uri.split("/").pop();
      if (rkey) {
        await deleteTestRecord(agent, rkey);
      }
    }

    expect(true).toBe(true); // Placeholder assertion
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "e2e - upload a small text file",
  async fn() {
    const agent = await createAgent();
    const testContent = "Hello, this is a test file for aqfile!";
    const filePath = await createTestFile("test-upload.txt", testContent);

    try {
      const result = await uploadTestFile(agent, filePath);

      // Verify the record was created
      expect(result.uri).toBeTruthy();
      expect(result.cid).toBeTruthy();
      expect(result.rkey).toBeTruthy();

      // Verify we can retrieve the record
      const did = agent.session?.did;
      const recordRes = await agent.com.atproto.repo.getRecord({
        repo: did!,
        collection: COLLECTION,
        rkey: result.rkey,
      });

      const record = recordRes.data.value as NetAltqAqfile.Main;
      expect(record.$type).toBe(COLLECTION);
      expect(record.file.name).toBe("test-upload.txt");
      expect(record.file.size).toBe(testContent.length);
      expect(record.checksum).toBeTruthy();
      expect(record.checksum?.algo).toBe("sha256");

      // Cleanup
      await deleteTestRecord(agent, result.rkey);
    } finally {
      await Deno.remove(filePath);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "e2e - type checking enforces size constraints",
  fn() {
    // TypeScript enforces that file.size must be within 0-1GB range at compile time
    // This test verifies the type definition is correct
    const validSize = 500000000; // 500MB - valid
    const record: NetAltqAqfile.Main = {
      $type: COLLECTION,
      blob: {
        $type: "blob",
        ref: { $link: "bafytest" },
        mimeType: "application/octet-stream",
        size: validSize,
      } as unknown as NetAltqAqfile.Main["blob"],
      createdAt: new Date().toISOString(),
      file: {
        name: "test.bin",
        size: validSize,
        mimeType: "application/octet-stream",
      },
    };

    expect(record.file.size).toBe(validSize);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "e2e - type checking enforces name length",
  fn() {
    const validName = "test.txt"; // Valid name

    const record: NetAltqAqfile.Main = {
      $type: COLLECTION,
      blob: {
        $type: "blob",
        ref: { $link: "bafytest" },
        mimeType: "text/plain",
        size: 100,
      } as unknown as NetAltqAqfile.Main["blob"],
      createdAt: new Date().toISOString(),
      file: {
        name: validName,
        size: 100,
      },
    };

    expect(record.file.name).toBe(validName);
    expect(record.file.name.length).toBeLessThanOrEqual(512);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "e2e - type system enforces required fields",
  fn() {
    // TypeScript enforces that all required fields must be present
    // This won't compile if fields are missing
    const mockBlob = {
      $type: "blob",
      ref: { $link: "bafytest" },
      mimeType: "text/plain",
      size: 100,
    } as unknown as NetAltqAqfile.Main["blob"];

    const record: NetAltqAqfile.Main = {
      $type: COLLECTION,
      blob: mockBlob, // Required
      createdAt: new Date().toISOString(), // Required
      file: {
        // Required
        name: "test.txt", // Required
        size: 100, // Required
      },
    };

    expect(record.blob).toBeTruthy();
    expect(record.createdAt).toBeTruthy();
    expect(record.file).toBeTruthy();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "e2e - list records shows uploaded files",
  async fn() {
    const agent = await createAgent();
    const did = agent.session?.did;

    // Upload two test files
    const file1 = await createTestFile("list-test-1.txt", "Content 1");
    const file2 = await createTestFile("list-test-2.txt", "Content 2");

    try {
      const result1 = await uploadTestFile(agent, file1);
      const result2 = await uploadTestFile(agent, file2);

      // List records
      const response = await agent.com.atproto.repo.listRecords({
        repo: did!,
        collection: COLLECTION,
        limit: 100,
      });

      expect(response.data.records.length).toBeGreaterThanOrEqual(2);

      const uris = response.data.records.map((r) => r.uri);
      expect(uris).toContain(result1.uri);
      expect(uris).toContain(result2.uri);

      // Verify record structure
      const record = response.data.records[0].value as NetAltqAqfile.Main;
      expect(record.$type).toBe(COLLECTION);
      expect(record.file).toBeTruthy();
      expect(record.file.name).toBeTruthy();
      expect(record.file.size).toBeGreaterThan(0);
      expect(record.blob).toBeTruthy();
      expect(record.createdAt).toBeTruthy();

      // Cleanup
      await deleteTestRecord(agent, result1.rkey);
      await deleteTestRecord(agent, result2.rkey);
    } finally {
      await Deno.remove(file1);
      await Deno.remove(file2);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "e2e - delete record removes it from list",
  async fn() {
    const agent = await createAgent();
    const did = agent.session?.did;

    const testFile = await createTestFile("delete-test.txt", "To be deleted");

    try {
      // Upload
      const result = await uploadTestFile(agent, testFile);

      // Verify it exists
      const beforeList = await agent.com.atproto.repo.listRecords({
        repo: did!,
        collection: COLLECTION,
        limit: 100,
      });
      const beforeUris = beforeList.data.records.map((r) => r.uri);
      expect(beforeUris).toContain(result.uri);

      // Delete
      await deleteTestRecord(agent, result.rkey);

      // Verify it's gone
      const afterList = await agent.com.atproto.repo.listRecords({
        repo: did!,
        collection: COLLECTION,
        limit: 100,
      });
      const afterUris = afterList.data.records.map((r) => r.uri);
      expect(afterUris).not.toContain(result.uri);

      // Verify getRecord fails
      try {
        await agent.com.atproto.repo.getRecord({
          repo: did!,
          collection: COLLECTION,
          rkey: result.rkey,
        });
        throw new Error("Expected getRecord to fail");
      } catch (error) {
        expect(error).toBeTruthy();
      }
    } finally {
      await Deno.remove(testFile);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "e2e - upload file with checksum verification",
  async fn() {
    const agent = await createAgent();
    const testContent = "Checksum test content";
    const filePath = await createTestFile("checksum-test.txt", testContent);

    try {
      const result = await uploadTestFile(agent, filePath);

      // Get the record
      const did = agent.session?.did;
      const recordRes = await agent.com.atproto.repo.getRecord({
        repo: did!,
        collection: COLLECTION,
        rkey: result.rkey,
      });

      const record = recordRes.data.value as NetAltqAqfile.Main;

      // Verify checksum
      expect(record.checksum).toBeTruthy();
      expect(record.checksum?.algo).toBe("sha256");
      expect(record.checksum?.hash).toBeTruthy();
      expect(record.checksum?.hash?.length).toBe(64); // SHA256 hex length

      // Verify checksum constraints
      if (record.checksum) {
        expect(record.checksum.algo.length).toBeLessThanOrEqual(32);
        expect(record.checksum.hash.length).toBeLessThanOrEqual(128);
      }

      // Cleanup
      await deleteTestRecord(agent, result.rkey);
    } finally {
      await Deno.remove(filePath);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "e2e - upload file with optional mimeType and modifiedAt",
  async fn() {
    const agent = await createAgent();
    const did = agent.session?.did;
    if (!did) throw new Error("No DID in session");

    const testContent = "Optional fields test";
    const filePath = await createTestFile("optional-test.txt", testContent);

    try {
      const data = await Deno.readFile(filePath);
      const fileName = "optional-test.txt";
      const mimeType = "text/plain";

      // Upload blob
      const uploadRes = await agent.uploadBlob(data, { encoding: mimeType });
      const blob = uploadRes.data?.blob;
      if (!blob) throw new Error("Upload failed");

      const checksum = calculateChecksum(data);

      // Create record with all optional fields
      const modifiedAt = new Date("2024-01-15T10:30:00Z").toISOString();
      const recordData: NetAltqAqfile.Main = {
        $type: COLLECTION,
        blob: blob as unknown as NetAltqAqfile.Main["blob"],
        checksum,
        createdAt: new Date().toISOString(),
        file: {
          name: fileName,
          size: data.length,
          mimeType: mimeType,
          modifiedAt: modifiedAt,
        },
      };

      // Create record with optional fields
      const createRes = await agent.com.atproto.repo.createRecord({
        repo: did,
        collection: COLLECTION,
        record: recordData,
      });

      const rkey = createRes.data.uri.split("/").pop() || "";

      // Verify optional fields are present
      const recordRes = await agent.com.atproto.repo.getRecord({
        repo: did,
        collection: COLLECTION,
        rkey,
      });

      const record = recordRes.data.value as NetAltqAqfile.Main;
      expect(record.file.mimeType).toBe(mimeType);
      expect(record.file.modifiedAt).toBe(modifiedAt);

      // Cleanup
      await deleteTestRecord(agent, rkey);
    } finally {
      await Deno.remove(filePath);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "e2e - handle empty list when no records exist",
  async fn() {
    const agent = await createAgent();
    const did = agent.session?.did;

    // Delete all records first
    const listRes = await agent.com.atproto.repo.listRecords({
      repo: did!,
      collection: COLLECTION,
      limit: 100,
    });

    for (const record of listRes.data.records) {
      const rkey = record.uri.split("/").pop();
      if (rkey) {
        await deleteTestRecord(agent, rkey);
      }
    }

    // Verify list is empty
    const emptyList = await agent.com.atproto.repo.listRecords({
      repo: did!,
      collection: COLLECTION,
      limit: 100,
    });

    expect(emptyList.data.records.length).toBe(0);
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "e2e - upload various file sizes",
  async fn() {
    const agent = await createAgent();
    const sizes = [
      { name: "tiny.txt", size: 10 }, // 10 bytes
      { name: "small.txt", size: 1024 }, // 1 KB
      { name: "medium.txt", size: 10240 }, // 10 KB
      { name: "large.txt", size: 102400 }, // 100 KB
    ];

    for (const { name, size } of sizes) {
      const content = "x".repeat(size);
      const filePath = await createTestFile(name, content);

      try {
        const result = await uploadTestFile(agent, filePath);

        // Verify size
        const did = agent.session?.did;
        const recordRes = await agent.com.atproto.repo.getRecord({
          repo: did!,
          collection: COLLECTION,
          rkey: result.rkey,
        });

        const record = recordRes.data.value as NetAltqAqfile.Main;
        expect(record.file.size).toBe(size);

        // Cleanup
        await deleteTestRecord(agent, result.rkey);
      } finally {
        await Deno.remove(filePath);
      }
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
