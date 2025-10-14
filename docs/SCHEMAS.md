# Using the Generated TypeScript Schemas

Your `net.altq.aqfile` lexicon has been successfully generated and is ready to
use! The generated TypeScript code in `src/lexicons/types/net/altq/aqfile.ts`
provides full type safety and runtime validation using `@atcute/lexicons`.

## Quick Summary

✅ **Yes, you can use the generated TypeScript schema for validation!**

The generated code works with `@atcute/lexicons` validation functions:

- **`is()`** - Type guard for quick validation
- **`parse()`** - Parse and validate (throws on error)
- **`safeParse()`** - Parse with error details (no throw)

## What You Get

### 1. **Type-Safe Schemas**

```typescript
import { NetAltqAqfile } from "./src/lexicons/index.ts";

// Access the schemas
NetAltqAqfile.mainSchema; // Record schema
NetAltqAqfile.fileSchema; // File metadata schema
NetAltqAqfile.checksumSchema; // Checksum schema
```

### 2. **TypeScript Types**

```typescript
type FileRecord = NetAltqAqfile.Main;
type FileMetadata = NetAltqAqfile.File;
type ChecksumData = NetAltqAqfile.Checksum;
```

### 3. **Runtime Validation**

```typescript
import { is, parse, safeParse } from "@atcute/lexicons";

// Type guard
if (is(NetAltqAqfile.mainSchema, data)) {
  // data is now typed as NetAltqAqfile.Main
}

// Parse with errors
const result = safeParse(NetAltqAqfile.mainSchema, data);
if (result.ok) {
  console.log("Valid:", result.value);
} else {
  console.error("Invalid:", result.message, result.issues);
}

// Parse (throws on error)
const validated = parse(NetAltqAqfile.mainSchema, data);
```

## Files Created

- **`src/lexicons/types/net/altq/aqfile.ts`** - Generated schemas
- **`src/lexicons/index.ts`** - Re-exports for easy importing
- **`docs/USAGE.md`** - Comprehensive usage guide
- **`examples/validation.ts`** - Working examples

## Key Features

### ✅ Validation Rules from Your Lexicon

All constraints from your JSON schema are enforced:

- **String lengths**: `name` (max 512), `algo` (max 32), `hash` (max 128)
- **Integer ranges**: `size` (0 to 1GB)
- **Required fields**: `blob`, `createdAt`, `file.name`, `file.size`
- **Optional fields**: `attribution`, `checksum`, `file.mimeType`,
  `file.modifiedAt`
- **Format validation**: `createdAt` (datetime), `attribution` (DID/handle)
- **Known values**: Checksum algorithms (`sha256`, `sha512`, `blake3`)

### ✅ Type Safety

TypeScript knows the exact shape of your data:

```typescript
const record: NetAltqAqfile.Main = {
  $type: "net.altq.aqfile",
  blob: blobRef,
  createdAt: new Date().toISOString(),
  file: {
    name: "example.pdf",
    size: 1024000,
  },
  // TypeScript will error if you forget required fields
  // or add fields with wrong types
};
```

### ✅ Detailed Error Messages

When validation fails, you get helpful error information:

```typescript
const result = safeParse(NetAltqAqfile.mainSchema, invalidData);
if (!result.ok) {
  console.log(result.message);
  // "invalid_type at .file.size (expected integer)"

  console.log(result.issues);
  // [{ code: 'invalid_type', expected: 'integer', path: ['file', 'size'] }]
}
```

## Try It Out

Run the examples to see it in action:

```bash
deno run -A examples/validation.ts
```

This will demonstrate:

1. Type guard validation
2. Safe parsing with error details
3. Parsing that throws on error
4. Records with all optional fields
5. Validating nested objects
6. Testing validation constraints
7. Custom validation logic

## Integration with AT Protocol

The schemas work seamlessly with AT Protocol clients:

```typescript
import { Agent } from "@atproto/api";

// Create record after validation
const record: NetAltqAqfile.Main = {/* ... */};
parse(NetAltqAqfile.mainSchema, record); // Validate first!

await agent.com.atproto.repo.createRecord({
  repo: agent.session.did,
  collection: "net.altq.aqfile",
  record: record,
});
```

## Next Steps

1. **Read the full documentation**: See `docs/USAGE.md` for comprehensive
   examples
2. **Run the examples**: Try `deno run -A examples/validation.ts`
3. **Integrate into your app**: Import the schemas and start validating!

## Schema Generation

The schemas are automatically generated from your JSON lexicon using
`@atcute/lex-cli`:

```bash
deno task lex
```

This reads `lexicons/net/altq/aqfile.json` and generates TypeScript code
following the configuration in `lex.config.ts`.

## Support

- **atcute documentation**: https://github.com/mary-ext/atcute
- **AT Protocol lexicon spec**: https://atproto.com/specs/lexicon
- **Validation library**: `@atcute/lexicons/validations`

---

**Summary**: Your generated TypeScript schemas provide full type safety and
runtime validation for your `net.altq.aqfile` lexicon. They're ready to use with
both `@atcute/lexicons` validation functions and AT Protocol clients! 🎉
