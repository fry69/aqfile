# ATfile-ts Architecture

## Overview

Modern TypeScript reimplementation of ATfile using Deno runtime for uploading
files to AT Protocol PDS.

## Core Components

### 1. Main Entry Point (`src/main.ts`)

- CLI argument parsing using `@std/cli`
- Command routing (upload, config, help, version)
- Upload orchestration
- Error handling and user feedback

### 2. Configuration System (`src/config.ts`)

- Multi-source configuration loading (CLI args > env vars > config file >
  defaults)
- Platform-specific config paths (macOS, Linux, Windows)
- JSON config file management

### 3. Utilities (`src/utils.ts`)

- File checksum calculation (SHA256, MD5)
- Machine fingerprint generation
- File metadata extraction

### 4. Generated Lexicon Types (`src/lexicons/`)

- TypeScript types for `blue.zio.atfile` lexicon
- Generated from JSON schemas using `@atcute/lex-cli`
- Type-safe record structures

## Data Flow

```
User Command
    ↓
CLI Parser (@std/cli)
    ↓
Config Loader (merge CLI/env/file/defaults)
    ↓
File Reader (Deno.readFile)
    ↓
Parallel Processing:
    - Checksum calculation (crypto)
    - Metadata extraction (Deno.stat)
    - Fingerprint generation
    ↓
AT Protocol Agent (@atproto/api)
    ↓
Upload Blob → Create Record
    ↓
Output Result
```

## Record Structure

Following `blue.zio.atfile.upload` lexicon:

```typescript
{
  $type: "blue.zio.atfile.upload",
  blob: BlobRef,              // AT Protocol blob reference
  checksum: {                 // File integrity
    algo: "sha256",
    hash: "abc123..."
  },
  file: {                     // File metadata
    name: "document.pdf",
    size: 1024,
    mimeType: "application/pdf",
    modifiedAt: "2025-10-14T..."
  },
  finger: {                   // Upload origin
    $type: "blue.zio.atfile.finger#machine",
    app: "atfile-ts/0.1.0",
    host: "hostname",
    id: "machine-id-hash",
    os: "darwin"
  },
  createdAt: "2025-10-14T..."
}
```

## Testing

- `tests/main.test.ts` - Configuration system tests
- `tests/utils.test.ts` - Utility function tests
- Uses `@std/expect` for Jest-like assertions
- Comprehensive coverage of core functionality

## Dependencies

### Core

- `@atproto/api` - AT Protocol client
- `mime-types` - MIME type detection
- `node:crypto` - Checksum calculation

### Deno Standard Library

- `@std/cli` - Command-line parsing
- `@std/path` - Path manipulation
- `@std/expect` - Testing assertions
- `@std/fmt` - Code formatting
- `@std/semver` - Version handling

### Development

- `@atcute/lex-cli` - Lexicon code generation
- `@atcute/lexicons` - Lexicon validation

## Key Design Decisions

1. **Deno over Node.js**: Modern runtime, better security model, built-in
   tooling
2. **Configuration hierarchy**: CLI args override env vars override config file
   override defaults
3. **Deterministic fingerprints**: Machine ID based on hostname+OS for
   consistent tracking
4. **SHA256 checksums**: Strong integrity verification by default
5. **Comprehensive testing**: All utilities tested, easy to extend
6. **Type safety**: Generated types from lexicon schemas ensure correctness

## Future Enhancements

Potential improvements (not implemented in this version):

- File download/fetch functionality
- Encryption support (like original `upload-crypt`)
- Multiple file uploads
- Progress bars for large files
- Blob caching/deduplication
- Interactive configuration wizard
