# Refactoring: Integration of Generated Lexicon Schemas

This document describes the refactoring performed to integrate the generated
TypeScript schemas from the `net.altq.aqfile` lexicon into the existing
codebase.

## Overview

The codebase has been updated to use the generated TypeScript schemas from
`@atcute/lex-cli` instead of manually defined interfaces. This ensures type
safety, runtime validation, and consistency with the lexicon specification.

## Changes Made

### 1. Fixed Collection Name (`src/main.ts`)

**Before:**

```typescript
const collection = "net.altq.aqfile.upload";
```

**After:**

```typescript
const collection = "net.altq.aqfile";
```

**Reason:** The collection name must match the lexicon NSID exactly. The
original `.upload` suffix was incorrect.

### 2. Replaced Hard-Coded Type Definitions (`src/utils.ts`)

**Before:**

```typescript
export interface FileChecksum {
  $type: "net.altq.aqfile#checksum";
  algo?: string;
  hash?: string;
}

export interface FileMetadata {
  $type: "net.altq.aqfile#file";
  name?: string;
  size?: number;
  mimeType?: string;
  modifiedAt?: string;
}
```

**After:**

```typescript
import type { NetAltqAqfile } from "./lexicons/index.ts";

// Use generated types from lexicon schemas instead of manually defining them
export type FileChecksum = NetAltqAqfile.Checksum;
export type FileMetadata = NetAltqAqfile.File;
```

**Benefits:**

- Single source of truth for type definitions
- Automatic updates when lexicon changes
- Compile-time guarantee that types match the schema
- No risk of drift between manual types and lexicon spec

### 3. Added Runtime Validation (`src/main.ts`)

**Before:**

```typescript
const record: Record<string, unknown> = {
  $type: collection,
  blob,
  checksum,
  createdAt: new Date().toISOString(),
  file: fileMetadata,
};

// No validation before creating record
const createRes = await agent.com.atproto.repo.createRecord({
  repo: did,
  collection,
  record,
});
```

**After:**

```typescript
import { safeParse } from "@atcute/lexicons";
import type { NetAltqAqfile } from "./lexicons/index.ts";
import { NetAltqAqfile as AqfileSchema } from "./lexicons/index.ts";

// Build the record with proper typing
const recordData: NetAltqAqfile.Main = {
  $type: "net.altq.aqfile",
  blob: blob as unknown as NetAltqAqfile.Main["blob"],
  checksum,
  createdAt: new Date().toISOString(),
  file: fileMetadata,
};

// Validate the record before creating it using the generated schema
const validationResult = safeParse(AqfileSchema.mainSchema, recordData);
if (!validationResult.ok) {
  const errorDetails = validationResult.issues
    ? JSON.stringify(validationResult.issues, null, 2)
    : validationResult.message;
  throw new Error(`Record validation failed: ${errorDetails}`);
}

const createRes = await agent.com.atproto.repo.createRecord({
  repo: did,
  collection,
  record: validationResult.value,
});
```

**Benefits:**

- Catches constraint violations before submitting to PDS
- Provides detailed error messages about what's wrong
- Ensures all required fields are present
- Validates string lengths (name: 512, hash: 128, etc.)
- Validates integer ranges (size: 0-1GB)

### 4. Updated Tests (`tests/utils.test.ts`)

Updated tests to handle optional fields properly:

**Before:**

```typescript
expect(checksum.hash?.length).toBe(64);
```

**After:**

```typescript
expect(checksum.hash.length).toBe(64);
```

The generated types properly reflect that required fields like `hash` and `algo`
are non-optional in the return types.

## Type Safety Improvements

### Compile-Time Safety

The generated types ensure that:

1. All required fields must be present
2. Field types match exactly (string, number, datetime, blob)
3. Nested objects (file, checksum) have correct structure
4. Optional fields are properly typed

### Runtime Validation

The `safeParse` function validates:

1. **String Length Constraints:**
   - `file.name`: max 512 characters
   - `checksum.algo`: max 32 characters
   - `checksum.hash`: max 128 characters
   - `file.mimeType`: max 255 characters

2. **Integer Range Constraints:**
   - `file.size`: 0 to 1,000,000,000 bytes (0-1GB)

3. **Format Constraints:**
   - `createdAt`: ISO 8601 datetime string
   - `attribution`: valid AT Protocol identifier (handle or DID)
   - `blob`: proper blob reference structure

4. **Required Fields:**
   - `blob` must be present
   - `createdAt` must be present
   - `file.name` must be present
   - `file.size` must be present

## Blob Type Handling

The blob returned by `@atproto/api`'s `uploadBlob()` is a `BlobRef` type, which
is structurally compatible with the lexicon's `Blob` type at runtime. However,
TypeScript requires an explicit cast:

```typescript
blob: blob as unknown as NetAltqAqfile.Main["blob"];
```

This is safe because both types have the same runtime structure (`ref`,
`mimeType`, `size`).

## Migration Guide

If you're maintaining similar code, follow these steps:

1. **Generate TypeScript schemas:**
   ```bash
   deno run --allow-read --allow-write npm:@atcute/lex-cli \
     --schema lexicons --output src/lexicons
   ```

2. **Replace manual type definitions:**
   - Import generated types:
     `import type { YourLexicon } from "./lexicons/index.ts"`
   - Replace interfaces with type aliases:
     `export type MyType = YourLexicon.SubType`

3. **Add validation:**
   - Import validation: `import { safeParse } from "@atcute/lexicons"`
   - Import schema:
     `import { YourLexicon as Schema } from "./lexicons/index.ts"`
   - Validate before creating records: `safeParse(Schema.mainSchema, record)`

4. **Update tests:**
   - Adjust expectations for optional fields
   - Test validation error cases
   - Verify constraints are enforced

## Testing

All tests pass after refactoring:

```bash
$ deno test --allow-read --allow-write --allow-env
ok | 11 passed | 0 failed (79ms)
```

Type checking confirms no type errors:

```bash
$ deno check src/main.ts src/utils.ts src/config.ts
Check file:///Users/fry/GitHub/fry69/aqfile/src/main.ts
Check file:///Users/fry/GitHub/fry69/aqfile/src/utils.ts
Check file:///Users/fry/GitHub/fry69/aqfile/src/config.ts
```

## Benefits Summary

1. **Single Source of Truth:** Lexicon JSON is the only place to define the
   schema
2. **Type Safety:** TypeScript ensures correct usage at compile time
3. **Runtime Safety:** Validation catches errors before submitting to PDS
4. **Maintainability:** Schema changes automatically propagate to code
5. **Documentation:** Generated types serve as inline documentation
6. **Error Messages:** Detailed validation errors help debugging
7. **Future-Proof:** Lexicon updates only require regenerating schemas

## Related Documentation

- [USAGE.md](./USAGE.md) - Comprehensive validation guide
- [SCHEMAS.md](./SCHEMAS.md) - Quick reference for schema usage
- [examples/validation.ts](../examples/validation.ts) - Working code examples
