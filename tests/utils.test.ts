import { expect } from "@std/expect";
import { join } from "@std/path";
import {
  calculateChecksum,
  generateFingerprint,
  getFileMetadata,
} from "../src/utils.ts";

Deno.test("utils - calculateChecksum generates correct SHA256 hash", () => {
  const testData = new TextEncoder().encode("Hello, ATfile!");
  const checksum = calculateChecksum(testData, "sha256");

  expect(checksum.$type).toBe("blue.zio.atfile.upload#checksum");
  expect(checksum.algo).toBe("sha256");
  expect(checksum.hash).toBeTruthy();
  expect(checksum.hash?.length).toBe(64); // SHA256 produces 64 hex characters
});

Deno.test("utils - calculateChecksum generates correct MD5 hash", () => {
  const testData = new TextEncoder().encode("Hello, ATfile!");
  const checksum = calculateChecksum(testData, "md5");

  expect(checksum.$type).toBe("blue.zio.atfile.upload#checksum");
  expect(checksum.algo).toBe("md5");
  expect(checksum.hash).toBeTruthy();
  expect(checksum.hash?.length).toBe(32); // MD5 produces 32 hex characters
});

Deno.test("utils - calculateChecksum defaults to SHA256", () => {
  const testData = new TextEncoder().encode("Test");
  const checksum = calculateChecksum(testData);

  expect(checksum.algo).toBe("sha256");
  expect(checksum.hash?.length).toBe(64);
});

Deno.test("utils - calculateChecksum is deterministic", () => {
  const testData = new TextEncoder().encode("Deterministic test");
  const checksum1 = calculateChecksum(testData);
  const checksum2 = calculateChecksum(testData);

  expect(checksum1.hash).toBe(checksum2.hash);
});

Deno.test("utils - generateFingerprint returns valid machine info", () => {
  const fingerprint = generateFingerprint("0.1.0");

  expect(fingerprint.$type).toBe("blue.zio.atfile.finger#machine");
  expect(fingerprint.app).toContain("atfile-ts");
  expect(fingerprint.app).toContain("0.1.0");
  expect(fingerprint.host).toBeTruthy();
  expect(fingerprint.id).toBeTruthy();
  expect(fingerprint.id?.length).toBe(16); // We generate 16-char IDs
  expect(fingerprint.os).toBeTruthy();
  expect(["darwin", "linux", "windows"]).toContain(fingerprint.os);
});

Deno.test("utils - generateFingerprint is deterministic for same machine", () => {
  const fingerprint1 = generateFingerprint("0.1.0");
  const fingerprint2 = generateFingerprint("0.1.0");

  expect(fingerprint1.id).toBe(fingerprint2.id);
  expect(fingerprint1.host).toBe(fingerprint2.host);
  expect(fingerprint1.os).toBe(fingerprint2.os);
});

Deno.test("utils - getFileMetadata returns correct info", async () => {
  // Create a temporary test file
  const tempDir = await Deno.makeTempDir();
  const testFile = join(tempDir, "test.txt");
  const testContent = "Test file content";
  await Deno.writeTextFile(testFile, testContent);

  const metadata = await getFileMetadata(testFile, "test.txt", "text/plain");

  expect(metadata.$type).toBe("blue.zio.atfile.upload#file");
  expect(metadata.name).toBe("test.txt");
  expect(metadata.size).toBe(testContent.length);
  expect(metadata.mimeType).toBe("text/plain");
  expect(metadata.modifiedAt).toBeTruthy();

  // Verify ISO datetime format
  const date = new Date(metadata.modifiedAt!);
  expect(date).toBeInstanceOf(Date);
  expect(isNaN(date.getTime())).toBe(false);

  // Clean up
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("utils - getFileMetadata handles different file sizes", async () => {
  const tempDir = await Deno.makeTempDir();
  const testFile = join(tempDir, "large.bin");

  // Create a 1MB file
  const size = 1024 * 1024;
  const largeData = new Uint8Array(size);
  await Deno.writeFile(testFile, largeData);

  const metadata = await getFileMetadata(
    testFile,
    "large.bin",
    "application/octet-stream",
  );

  expect(metadata.size).toBe(size);
  expect(metadata.mimeType).toBe("application/octet-stream");

  // Clean up
  await Deno.remove(tempDir, { recursive: true });
});
