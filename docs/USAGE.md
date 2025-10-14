# Using the net.altq.aqfile Lexicon Schema

This document explains how to use the generated TypeScript schemas for
validation, type safety, and interaction with AT Protocol.

## Schema Overview

The `net.altq.aqfile` lexicon defines a record type for uploading and tracking
binary blob files with metadata. It consists of:

- **Main Record**: The complete file record with blob reference
- **File Metadata**: Information about the file (name, size, MIME type, modified
  date)
- **Checksum**: Optional cryptographic verification data

## Importing the Schema

```typescript
import { is, parse, safeParse } from "@atcute/lexicons";
import { NetAltqAqfile } from "./lexicons/index.ts";

// Access the schemas
const mainSchema = NetAltqAqfile.mainSchema;
const fileSchema = NetAltqAqfile.fileSchema;
const checksumSchema = NetAltqAqfile.checksumSchema;
```

## Type Definitions

The generated types provide full TypeScript safety:

```typescript
// Type for the main record
type FileRecord = NetAltqAqfile.Main;

// Type for file metadata
type FileMetadata = NetAltqAqfile.File;

// Type for checksum
type ChecksumData = NetAltqAqfile.Checksum;
```

## Validation Examples

### 1. Type Guard (is)

Check if data conforms to the schema without throwing errors:

```typescript
import { is } from "@atcute/lexicons";

const data = {
  $type: "net.altq.aqfile",
  blob: {/* blob ref */},
  createdAt: new Date().toISOString(),
  file: {
    name: "example.pdf",
    size: 1024000,
  },
};

if (is(NetAltqAqfile.mainSchema, data)) {
  // TypeScript now knows data is a valid Main record
  console.log("Valid record!");
  console.log(data.file.name); // Type-safe access
}
```

### 2. Safe Parse (safeParse)

Validate and get detailed error information:

```typescript
import { safeParse } from "@atcute/lexicons";

const result = safeParse(NetAltqAqfile.mainSchema, data);

if (result.ok) {
  // Success - result.value contains the validated data
  console.log("Validated:", result.value);
} else {
  // Failure - result contains error details
  console.error("Validation failed:", result.message);
  console.error("Issues:", result.issues);

  // Or throw the error
  // result.throw();
}
```

### 3. Parse (parse)

Validate and throw on error:

```typescript
import { parse } from "@atcute/lexicons";

try {
  const validated = parse(NetAltqAqfile.mainSchema, data);
  console.log("Valid:", validated);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Validation error:", error.message);
    console.error("Issues:", error.issues);
  }
}
```

## Creating Records

### Basic Example

```typescript
import type { BlobRef } from "@atcute/lexicons";

const fileRecord: NetAltqAqfile.Main = {
  $type: "net.altq.aqfile",
  blob: blobRef, // From uploadBlob
  createdAt: new Date().toISOString(),
  file: {
    name: "document.pdf",
    size: 2048576, // 2 MB
    mimeType: "application/pdf",
  },
};

// Validate before using
if (is(NetAltqAqfile.mainSchema, fileRecord)) {
  // Safe to use
}
```

### With Optional Fields

```typescript
const fileWithChecksum: NetAltqAqfile.Main = {
  $type: "net.altq.aqfile",
  blob: blobRef,
  createdAt: new Date().toISOString(),
  attribution: "did:plc:1234567890abcdef",
  file: {
    name: "video.mp4",
    size: 52428800, // 50 MB
    mimeType: "video/mp4",
    modifiedAt: new Date("2025-01-01").toISOString(),
  },
  checksum: {
    algo: "sha256",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
};
```

## Validating Nested Objects

### File Metadata Only

```typescript
const fileMetadata: NetAltqAqfile.File = {
  name: "report.pdf",
  size: 1024000,
  mimeType: "application/pdf",
};

if (is(NetAltqAqfile.fileSchema, fileMetadata)) {
  console.log("Valid file metadata");
}
```

### Checksum Only

```typescript
const checksum: NetAltqAqfile.Checksum = {
  algo: "sha256",
  hash: "abc123...",
};

if (is(NetAltqAqfile.checksumSchema, checksum)) {
  console.log("Valid checksum");
}
```

## Integration with AT Protocol Client

### Creating a Record

```typescript
import { Agent, BlobRef } from "@atproto/api";

const agent = new Agent();
// ... authenticate ...

// Upload the blob first
const fileBuffer = await Deno.readFile("./example.pdf");
const uploadResponse = await agent.com.atproto.repo.uploadBlob(
  fileBuffer,
  { encoding: "application/pdf" },
);

const blobRef = uploadResponse.data.blob;

// Create the file record
const record: NetAltqAqfile.Main = {
  $type: "net.altq.aqfile",
  blob: blobRef,
  createdAt: new Date().toISOString(),
  file: {
    name: "example.pdf",
    size: fileBuffer.length,
    mimeType: "application/pdf",
  },
};

// Validate before creating
parse(NetAltqAqfile.mainSchema, record);

// Create the record
const createResponse = await agent.com.atproto.repo.createRecord({
  repo: agent.session.did,
  collection: "net.altq.aqfile",
  record: record,
});

console.log("Created:", createResponse.data.uri);
```

### Reading and Validating Records

```typescript
// Get a record
const getResponse = await agent.com.atproto.repo.getRecord({
  repo: "did:plc:xyz...",
  collection: "net.altq.aqfile",
  rkey: "3jzfcijpj2z2a",
});

// Validate the retrieved record
const result = safeParse(NetAltqAqfile.mainSchema, getResponse.data.value);

if (result.ok) {
  const fileRecord = result.value;
  console.log("File name:", fileRecord.file.name);
  console.log("File size:", fileRecord.file.size);

  if (fileRecord.checksum) {
    console.log(
      "Checksum:",
      fileRecord.checksum.algo,
      fileRecord.checksum.hash,
    );
  }
} else {
  console.error("Invalid record:", result.message);
}
```

## Error Handling

### Detailed Error Information

```typescript
const result = safeParse(NetAltqAqfile.mainSchema, invalidData);

if (!result.ok) {
  // Access the error message
  console.error(result.message);

  // Access detailed issues
  for (const issue of result.issues) {
    console.error("Issue:", {
      code: issue.code,
      path: issue.path,
      message: issue.message,
    });
  }
}
```

### Common Validation Errors

```typescript
// Missing required field
const missingBlob = {
  $type: "net.altq.aqfile",
  createdAt: new Date().toISOString(),
  file: { name: "test.txt", size: 100 },
  // Missing: blob
};
// Error: missing_value at .blob

// Invalid type
const invalidSize = {
  $type: "net.altq.aqfile",
  blob: blobRef,
  createdAt: new Date().toISOString(),
  file: { name: "test.txt", size: "invalid" }, // Should be integer
};
// Error: invalid_type at .file.size (expected integer)

// String too long
const longName = {
  $type: "net.altq.aqfile",
  blob: blobRef,
  createdAt: new Date().toISOString(),
  file: { name: "a".repeat(600), size: 100 }, // Max 512 chars
};
// Error: invalid_string_length at .file.name
```

## Best Practices

1. **Always Validate**: Validate data before creating records or after reading
   them
2. **Use Type Guards**: Use `is()` for quick checks, `safeParse()` for detailed
   errors
3. **Handle Errors**: Always handle validation errors gracefully
4. **TypeScript Types**: Let TypeScript infer types from the schemas for type
   safety
5. **Known Values**: Use known algorithm values (`sha256`, `sha512`, `blake3`)
   for checksums

## Advanced Usage

### Custom Validation Logic

```typescript
function validateFileRecord(data: unknown): data is NetAltqAqfile.Main {
  // First, schema validation
  if (!is(NetAltqAqfile.mainSchema, data)) {
    return false;
  }

  // Then, custom business logic
  if (data.file.size > 100000000) { // 100MB limit
    console.warn("File too large");
    return false;
  }

  if (
    data.checksum &&
    !["sha256", "sha512", "blake3"].includes(data.checksum.algo)
  ) {
    console.warn("Unknown checksum algorithm");
    return false;
  }

  return true;
}
```

### Batch Validation

```typescript
function validateMultipleRecords(records: unknown[]): NetAltqAqfile.Main[] {
  const valid: NetAltqAqfile.Main[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  for (let i = 0; i < records.length; i++) {
    const result = safeParse(NetAltqAqfile.mainSchema, records[i]);
    if (result.ok) {
      valid.push(result.value);
    } else {
      errors.push({ index: i, error: result.message });
    }
  }

  return valid;
}
```

## Schema Metadata

The schemas include metadata that can be accessed:

```typescript
// Schema type
console.log(mainSchema.type); // 'record'

// For debugging/introspection
console.log(mainSchema.key); // Record key type

// Access nested schemas
const objectSchema = mainSchema.object;
console.log(objectSchema.shape); // Access object properties
```

## Ambient Module Declaration

The schema automatically extends the `@atcute/lexicons/ambient` module:

```typescript
declare module "@atcute/lexicons/ambient" {
  interface Records {
    "net.altq.aqfile": mainSchema;
  }
}
```

This allows type-safe record lookups in AT Protocol clients that support it.
