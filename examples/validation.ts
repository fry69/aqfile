/**
 * Example: Using net.altq.aqfile lexicon schema for validation
 *
 * This demonstrates how to use the generated TypeScript schemas
 * for type-safe validation with @atcute/lexicons
 */

import { is, parse, safeParse } from "@atcute/lexicons";
import { NetAltqAqfile } from "../src/lexicons/index.ts";

// Example 1: Type Guard Validation
console.log("=== Example 1: Type Guard (is) ===");
{
  // Mock blob ref for example
  const mockBlobRef = {
    $type: "blob" as const,
    ref: { $link: "bafyreicontent" },
    mimeType: "application/pdf",
    size: 1024000,
  };

  const fileRecord = {
    $type: "net.altq.aqfile",
    blob: mockBlobRef,
    createdAt: new Date().toISOString(),
    file: {
      name: "example.pdf",
      size: 1024000,
      mimeType: "application/pdf",
    },
  };

  if (is(NetAltqAqfile.mainSchema, fileRecord)) {
    console.log("✓ Valid file record");
    console.log(`  File: ${fileRecord.file.name}`);
    console.log(`  Size: ${fileRecord.file.size} bytes`);
  } else {
    console.error("✗ Invalid record");
  }
}

// Example 2: Safe Parse with Error Details
console.log("\n=== Example 2: Safe Parse ===");
{
  const invalidRecord = {
    $type: "net.altq.aqfile",
    // Missing: blob
    createdAt: new Date().toISOString(),
    file: {
      name: "test.txt",
      size: "not a number", // Invalid type
    },
  };

  const result = safeParse(NetAltqAqfile.mainSchema, invalidRecord);

  if (result.ok) {
    console.log("✓ Valid:", result.value);
  } else {
    console.error("✗ Validation failed:", result.message);
    console.error("  Issues:", result.issues);
  }
}

// Example 3: Parse with Exception
console.log("\n=== Example 3: Parse (throws on error) ===");
{
  try {
    const mockBlobRef = {
      $type: "blob" as const,
      ref: { $link: "bafyreicontent" },
      mimeType: "video/mp4",
      size: 52428800,
    };

    const validRecord = {
      $type: "net.altq.aqfile",
      blob: mockBlobRef,
      createdAt: new Date().toISOString(),
      file: {
        name: "video.mp4",
        size: 52428800,
        mimeType: "video/mp4",
      },
    };

    const parsed = parse(NetAltqAqfile.mainSchema, validRecord);
    console.log("✓ Parsed successfully");
    console.log(`  File: ${parsed.file.name}`);
  } catch (error) {
    console.error("✗ Parse error:", error);
  }
}

// Example 4: Record with All Optional Fields
console.log("\n=== Example 4: Full Record with Optional Fields ===");
{
  const mockBlobRef = {
    $type: "blob" as const,
    ref: { $link: "bafyreicontent" },
    mimeType: "application/zip",
    size: 10485760,
  };

  const fullRecord: NetAltqAqfile.Main = {
    $type: "net.altq.aqfile",
    blob: mockBlobRef,
    createdAt: new Date().toISOString(),
    attribution: "did:plc:1234567890abcdef",
    file: {
      name: "archive.zip",
      size: 10485760,
      mimeType: "application/zip",
      modifiedAt: new Date("2025-01-15").toISOString(),
    },
    checksum: {
      algo: "sha256",
      hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
  };

  if (is(NetAltqAqfile.mainSchema, fullRecord)) {
    console.log("✓ Valid full record");
    console.log(`  File: ${fullRecord.file.name}`);
    console.log(`  Attribution: ${fullRecord.attribution}`);
    console.log(`  Checksum: ${fullRecord.checksum?.algo}`);
  }
}

// Example 5: Validating Nested Objects
console.log("\n=== Example 5: Validating Nested Objects ===");
{
  // Validate file metadata separately
  const fileMetadata: NetAltqAqfile.File = {
    name: "document.pdf",
    size: 2048576,
    mimeType: "application/pdf",
    modifiedAt: new Date().toISOString(),
  };

  if (is(NetAltqAqfile.fileSchema, fileMetadata)) {
    console.log("✓ Valid file metadata");
    console.log(`  Name: ${fileMetadata.name}`);
    console.log(`  Size: ${fileMetadata.size} bytes`);
  }

  // Validate checksum separately
  const checksum: NetAltqAqfile.Checksum = {
    algo: "sha512",
    hash: "abc123def456...",
  };

  if (is(NetAltqAqfile.checksumSchema, checksum)) {
    console.log("✓ Valid checksum");
    console.log(`  Algorithm: ${checksum.algo}`);
  }
}

// Example 6: Validation Constraints
console.log("\n=== Example 6: Testing Validation Constraints ===");
{
  const mockBlobRef = {
    $type: "blob" as const,
    ref: { $link: "bafyreicontent" },
    mimeType: "text/plain",
    size: 1000,
  };

  // Test: Name too long (max 512 chars)
  const tooLongName = {
    $type: "net.altq.aqfile",
    blob: mockBlobRef,
    createdAt: new Date().toISOString(),
    file: {
      name: "a".repeat(600), // Exceeds maxLength of 512
      size: 1000,
    },
  };

  const result1 = safeParse(NetAltqAqfile.mainSchema, tooLongName);
  if (!result1.ok) {
    console.log("✓ Correctly rejected: name too long");
    console.log(`  Error: ${result1.message}`);
  }

  // Test: Size too large (max 1GB)
  const tooLargeSize = {
    $type: "net.altq.aqfile",
    blob: mockBlobRef,
    createdAt: new Date().toISOString(),
    file: {
      name: "large.bin",
      size: 2000000000, // Exceeds maximum of 1000000000
    },
  };

  const result2 = safeParse(NetAltqAqfile.mainSchema, tooLargeSize);
  if (!result2.ok) {
    console.log("✓ Correctly rejected: size too large");
    console.log(`  Error: ${result2.message}`);
  }

  // Test: Hash too long (max 128 chars)
  const tooLongHash = {
    $type: "net.altq.aqfile",
    blob: mockBlobRef,
    createdAt: new Date().toISOString(),
    file: {
      name: "test.txt",
      size: 1000,
    },
    checksum: {
      algo: "sha256",
      hash: "x".repeat(200), // Exceeds maxLength of 128
    },
  };

  const result3 = safeParse(NetAltqAqfile.mainSchema, tooLongHash);
  if (!result3.ok) {
    console.log("✓ Correctly rejected: hash too long");
    console.log(`  Error: ${result3.message}`);
  }
}

// Example 7: Custom Validation Wrapper
console.log("\n=== Example 7: Custom Validation Function ===");

function validateAndLogFileRecord(data: unknown): data is NetAltqAqfile.Main {
  const result = safeParse(NetAltqAqfile.mainSchema, data);

  if (!result.ok) {
    console.error("Validation failed:");
    for (const issue of result.issues) {
      const path = issue.path?.length ? issue.path.join(".") : "root";
      console.error(`  - ${issue.code} at ${path}`);
    }
    return false;
  }

  // Additional business logic validation
  const record = result.value;

  if (record.file.size > 100_000_000) {
    console.warn("Warning: File size exceeds 100MB recommendation");
  }

  if (
    record.checksum &&
    !["sha256", "sha512", "blake3"].includes(record.checksum.algo)
  ) {
    console.warn(
      `Warning: Uncommon checksum algorithm: ${record.checksum.algo}`,
    );
  }

  console.log("✓ Record validated successfully");
  return true;
}

{
  const mockBlobRef = {
    $type: "blob" as const,
    ref: { $link: "bafyreicontent" },
    mimeType: "application/pdf",
    size: 1024,
  };

  const testRecord = {
    $type: "net.altq.aqfile",
    blob: mockBlobRef,
    createdAt: new Date().toISOString(),
    file: {
      name: "test.pdf",
      size: 1024,
    },
    checksum: {
      algo: "md5", // Uncommon algorithm
      hash: "abc123",
    },
  };

  validateAndLogFileRecord(testRecord);
}

console.log("\n=== Examples Complete ===");
