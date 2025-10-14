[![JSR](https://jsr.io/badges/@fry69/aqfile)](https://jsr.io/@fry69/aqfile)
[![JSR Score](https://jsr.io/badges/@fry69/aqfile/score)](https://jsr.io/@fry69/aqfile/score)

# aqfile

Upload files to AT Protocol PDS with metadata and checksums.

## Features

- 📤 **Upload**: Upload files with automatic checksum calculation
- 📋 **List**: View all uploaded files in a formatted table
- 🗑️ **Delete**: Remove files and their associated blobs
- 🔒 **Type-Safe**: Generated TypeScript types from lexicon schemas
- ✅ **Validated**: Runtime schema validation before upload
- 📝 **Metadata**: Track file name, size, MIME type, and modification time

## Installation

```bash
deno install --global -A -n aqfile jsr:@fry69/aqfile
```

Or run directly:

```bash
deno run -A jsr:@fry69/aqfile upload file.txt
```

## Usage

### Upload a File

```bash
aqfile upload document.pdf
```

Uploads a file to your PDS with:

- Automatic MIME type detection
- SHA256 checksum calculation
- File metadata (name, size, modified time)

### List Uploaded Files

```bash
aqfile list
```

Displays all uploaded files in a formatted table:

```
RKEY          SIZE        MIME TYPE                    NAME
─────────────────────────────────────────────────────────────────────────────────────────
3m35jjrc5b62d 43B         text/plain                    test-upload.txt
3m36abc123de  1.2MB       application/pdf               document.pdf
```

### Delete a File

```bash
aqfile delete 3m35jjrc5b62d
```

Deletes the record and marks the blob for garbage collection. Use `aqfile list`
to find the rkey.

### Configuration

> **⚠️ Security Note**: Always use an **App Password**, never your account
> password! Generate one at: https://bsky.app/settings/app-passwords

#### Interactive Setup (Recommended)

The easiest way to configure `aqfile` is through the interactive setup:

```bash
aqfile config setup
```

This will prompt you for your service URL, handle, and app password, then save
the configuration for future use. You can also clear stored credentials with:

```bash
aqfile config clear
```

#### Environment Variables

```bash
export AQFILE_SERVICE=https://bsky.social
export AQFILE_HANDLE=alice.bsky.social
export AQFILE_APP_PASSWORD=your-app-password
```

#### Config File

Create a config file at:

- **Linux/Unix**: `~/.config/aqfile/config.json`
- **macOS**: `~/Library/Application Support/aqfile/config.json`
- **Windows**: `%APPDATA%\aqfile\config.json`

```json
{
  "service": "https://bsky.social",
  "handle": "alice.bsky.social",
  "password": "your-app-password"
}
```

#### Command-line Options

```bash
aqfile upload file.txt \
  --service https://my-pds.example.com \
  --handle alice.example.com \
  --app-password your-app-password
```

## Commands

### `aqfile upload <file>`

Upload a file to your PDS.

**Examples:**

```bash
# Upload with default config
aqfile upload photo.jpg

# Upload to specific PDS
aqfile upload video.mp4 --service https://my-pds.example.com

# Upload with inline credentials
aqfile upload data.json --handle alice.example.com --app-password your-app-password
```

### `aqfile list`

List all uploaded files.

**Output Format:**

- **RKEY**: Record key (use with `delete`)
- **SIZE**: File size (B, KB, MB, GB)
- **MIME TYPE**: Content type
- **NAME**: Original filename

### `aqfile delete <rkey>`

Delete a file record and its blob.

**Arguments:**

- `<rkey>`: Record key from `aqfile list`

**Note:** The blob will be garbage collected by the PDS when no other records
reference it.

### `aqfile config`

Show configuration file location and current settings.

### `aqfile help`

Display help information.

### `aqfile version`

Show version number.

## Lexicon Schema

`aqfile` uses the `net.altq.aqfile` lexicon to store file records:

```typescript
{
  $type: "net.altq.aqfile",
  blob: BlobRef,              // The uploaded file
  createdAt: string,          // ISO 8601 timestamp
  file: {
    name: string,             // Filename (max 512 chars)
    size: number,             // Size in bytes (max 1GB)
    mimeType?: string,        // MIME type (max 255 chars)
    modifiedAt?: string       // Last modified time
  },
  checksum?: {
    algo: string,             // "sha256", "sha512", or "blake3"
    hash: string              // Hex-encoded digest
  },
  attribution?: string        // Optional DID/handle
}
```

### Constraints

- **File size**: 0 to 1,000,000,000 bytes (1GB)
- **Filename length**: max 512 characters
- **MIME type length**: max 255 characters
- **Checksum algo**: max 32 characters
- **Checksum hash**: max 128 characters

## Development

### Setup

```bash
git clone https://github.com/fry69/aqfile.git
cd aqfile
```

### Run Tests

```bash
# Unit tests only
deno task test

# E2E tests (requires .env.e2e)
deno task test:e2e

# All tests
deno test -A
```

### Generate Lexicon Types

```bash
deno task lex
```

### Manual Testing

```bash
# Create .env.e2e with test credentials
# IMPORTANT: Use App Password from https://bsky.app/settings/app-passwords
echo 'AQFILE_SERVICE=https://altq.net' > .env.e2e
echo 'AQFILE_HANDLE=test.altq.net' >> .env.e2e
echo 'AQFILE_APP_PASSWORD=your-app-password' >> .env.e2e

# Test CLI
deno task e2e upload test.txt
deno task e2e list
deno task e2e delete <rkey>
```

## Documentation

- [E2E Testing Guide](./docs/E2E_TESTING.md) - Comprehensive testing
  documentation
- [Usage Guide](./docs/USAGE.md) - Schema validation usage
- [Schema Reference](./docs/SCHEMAS.md) - Quick reference
- [Refactoring Guide](./docs/REFACTORING.md) - Integration details

## Architecture

- **Runtime**: Deno
- **AT Protocol Client**: @atproto/api
- **Lexicon Validation**: @atcute/lexicons
- **Type Generation**: @atcute/lex-cli
- **CLI**: @std/cli parseArgs

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## Related Projects

- [AT Protocol](https://atproto.com/) - Decentralized social networking protocol
- [Bluesky](https://bsky.app/) - Social app built on AT Protocol
- [@atcute](https://github.com/mary-ext/atcute) - AT Protocol TypeScript
  utilities

## Support

- **Issues**: [GitHub Issues](https://github.com/fry69/aqfile/issues)
- **AT Protocol**: [atproto.com/docs](https://atproto.com/docs)
