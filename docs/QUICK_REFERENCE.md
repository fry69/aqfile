# aqfile Quick Reference

## Installation

```bash
deno install -A -n aqfile jsr:@fry69/aqfile
```

## Quick Start

```bash
# Setup (one time)
export AQFILE_SERVICE=https://bsky.social
export AQFILE_USERNAME=your.handle
export AQFILE_PASSWORD=your-app-password

# Upload a file
aqfile upload document.pdf

# List all files
aqfile list

# Delete a file
aqfile delete <rkey>
```

## Commands

| Command         | Description    | Example                       |
| --------------- | -------------- | ----------------------------- |
| `upload <file>` | Upload a file  | `aqfile upload photo.jpg`     |
| `list`          | List all files | `aqfile list`                 |
| `delete <rkey>` | Delete a file  | `aqfile delete 3m35jjrc5b62d` |
| `config`        | Show config    | `aqfile config`               |
| `help`          | Show help      | `aqfile help`                 |
| `version`       | Show version   | `aqfile version`              |

## Configuration

### Environment Variables

```bash
AQFILE_SERVICE=https://bsky.social
AQFILE_USERNAME=alice.bsky.social
AQFILE_PASSWORD=your-app-password
```

### Config File

**Location:**

- macOS: `~/Library/Application Support/aqfile/config.json`
- Linux: `~/.config/aqfile/config.json`
- Windows: `%APPDATA%\aqfile\config.json`

**Content:**

```json
{
  "service": "https://bsky.social",
  "identifier": "alice.bsky.social",
  "password": "your-app-password"
}
```

## Options

All commands support these options:

```bash
--service, -s <url>          PDS service URL
--identifier, -i <handle>    Your handle or DID
--password, -p <password>    Your app password
```

## Development

### Run Tests

```bash
# Unit tests only
deno task test

# E2E tests (needs .env.e2e)
deno task test:e2e

# All tests
deno test -A
```

### Setup E2E Testing

```bash
# Create .env.e2e
cat > .env.e2e << EOF
AQFILE_SERVICE=https://altq.net
AQFILE_USERNAME=test.altq.net
AQFILE_PASSWORD=your-test-password
EOF

# Run E2E tests
deno task test:e2e
```

### Manual CLI Testing

```bash
# Use e2e credentials
deno task e2e upload test.txt
deno task e2e list
deno task e2e delete <rkey>
```

### Generate Types

```bash
deno task lex
```

## Common Tasks

### Upload and List

```bash
aqfile upload report.pdf
aqfile list
```

### Upload Multiple Files

```bash
for file in *.jpg; do
  aqfile upload "$file"
done
```

### Clean Up All Files

```bash
# Get all rkeys and delete
aqfile list | tail -n +4 | awk '{print $1}' | while read rkey; do
  aqfile delete "$rkey"
done
```

### Upload with Debug

```bash
DEBUG=1 aqfile upload test.txt
```

## File Format

Records follow `net.altq.aqfile` lexicon:

```typescript
{
  blob: BlobRef               // Uploaded file
  createdAt: string           // ISO 8601 timestamp
  file: {
    name: string              // Max 512 chars
    size: number              // 0-1GB
    mimeType?: string         // Max 255 chars
    modifiedAt?: string       // ISO 8601
  }
  checksum?: {
    algo: string              // "sha256", "sha512", "blake3"
    hash: string              // Hex digest
  }
}
```

## Constraints

- Max file size: 1 GB
- Max filename: 512 chars
- Max MIME type: 255 chars
- Checksum algos: sha256, sha512, blake3

## Troubleshooting

### Authentication Error

```bash
# Check credentials
aqfile config

# Test login
aqfile list
```

### File Not Found

```bash
# Use absolute or relative path
aqfile upload ./path/to/file.txt
aqfile upload ~/Documents/file.txt
```

### Record Not Found

```bash
# List to get current rkeys
aqfile list

# Use exact rkey from list output
aqfile delete 3m35jjrc5b62d
```

### Permission Denied

```bash
# Ensure permissions are set
deno run --allow-read --allow-write --allow-net --allow-env ./src/main.ts
```

## Documentation

- [README.md](../README.md) - Full documentation
- [E2E_TESTING.md](./E2E_TESTING.md) - Testing guide
- [USAGE.md](./USAGE.md) - Schema validation
- [SCHEMAS.md](./SCHEMAS.md) - Schema reference

## Support

- GitHub Issues: https://github.com/fry69/aqfile/issues
- AT Protocol Docs: https://atproto.com/docs

## License

MIT License
