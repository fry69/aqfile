# New Commands: show and get

## Overview

Two new commands have been added to aqfile to enhance file inspection and
retrieval capabilities.

## `aqfile show <rkey>`

### Purpose

Display comprehensive metadata for an uploaded file record.

### Features

- Complete record information (URI, CID, creation time)
- File details (name, size, MIME type, modification time)
- Checksum information (algorithm and hash)
- Blob CID reference
- Direct links to external inspection tools:
  - **pdsls.dev**: AT Protocol record viewer
  - **atproto-browser**: Interactive AT Protocol browser

### Example Output

```
📄 File Record: 3m363biamao2d

URI:          at://did:plc:abc123.../net.altq.aqfile/3m363biamao2d
CID:          bafyreiabc123...
Created:      2025-10-14T15:47:58.497Z

File Information:
  Name:       document.pdf
  Size:       1048576 bytes
  MIME Type:  application/pdf
  Modified:   2025-10-14T15:47:47.429Z

Checksum:
  Algorithm:  sha256
  Hash:       f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2

Blob CID:     bafkreiabc123...

🔍 Inspect this record:
   https://pdsls.dev/at://did:plc:abc123.../net.altq.aqfile/3m363biamao2d
   https://atproto-browser.vercel.app/at/did:plc:abc123.../net.altq.aqfile/3m363biamao2d
```

### Use Cases

- Verify file metadata before downloading
- Get shareable inspection links
- Debug upload issues
- Check file integrity via checksum

---

## `aqfile get <rkey>`

### Purpose

Retrieve the actual file content from an uploaded record.

### Features

- Outputs to stdout by default (pipe-friendly)
- Optional `--output <file>` flag to save to a file
- Smart binary detection in interactive mode
- Warns before outputting binary content to terminal
- Preserves exact file content (byte-for-byte)

### Usage Examples

#### Output to stdout

```bash
# View text file
aqfile get 3m363biamao2d

# Pipe to another command
aqfile get 3m363biamao2d | grep "search term"

# View in pager
aqfile get 3m363biamao2d | less

# Compare with local file
diff <(aqfile get 3m363biamao2d) local-file.txt
```

#### Save to file

```bash
# Save with custom name
aqfile get 3m363biamao2d --output downloaded.pdf

# Save with original name (use show to get name first)
aqfile get 3m363biamao2d --output "$(aqfile show 3m363biamao2d | grep 'Name:' | awk '{print $2}')"
```

#### Binary File Handling

When outputting binary content to an interactive terminal, the tool will warn:

```
⚠️  Warning: This file appears to be binary content
   File: image.png
   MIME: image/png
   Size: 524288 bytes

   Binary output may corrupt your terminal.
   Use --output <file> to save to a file instead.

Continue anyway? (y/N):
```

In non-interactive mode (pipes, scripts), binary content is output without
prompts.

### Binary Detection

The tool detects binary content by:

1. Checking for null bytes (0x00) in the first 8KB
2. Counting non-printable characters
3. If >30% non-printable, considered binary

This prevents accidental terminal corruption while still allowing text files
with occasional control characters.

---

## Implementation Details

### New Interfaces

```typescript
interface ShowOptions {
  serviceUrl: string;
  handle: string;
  password: string;
  rkey: string;
}

interface GetOptions {
  serviceUrl: string;
  handle: string;
  password: string;
  rkey: string;
  outputPath?: string;
}
```

### Blob Retrieval

Files are retrieved using the AT Protocol blob sync endpoint:

```
GET /xrpc/com.atproto.sync.getBlob?did={did}&cid={cid}
```

### Error Handling

Both commands handle:

- Record not found errors
- Authentication failures
- Network errors
- Invalid blob references

---

## Testing

### Unit Tests

The existing test suite continues to pass (19 tests).

### E2E Tests

Added comprehensive e2e tests:

- `e2e - show command displays full metadata` - Verifies all metadata fields are
  displayed
- `e2e - get command retrieves file content` - Tests stdout output
- `e2e - get command with --output saves to file` - Tests file saving
- `e2e - get command handles binary content` - Tests binary file retrieval

All 15 e2e tests pass successfully.

---

## Documentation Updates

### README.md

- Added `show` command documentation with examples
- Added `get` command documentation with piping examples
- Updated help text and examples section

### Help Text

```
Usage:
  aqfile show <rkey>       Show detailed metadata for a file
  aqfile get <rkey>        Retrieve file content (outputs to stdout)

Options:
  --output <file>          Output file path (for get command)

Examples:
  aqfile show 3jxyz123abc
  aqfile get 3jxyz123abc --output downloaded.pdf
  aqfile get 3jxyz123abc | less
```

---

## Benefits

1. **Complete Workflow**: Users can now upload, inspect, list, retrieve, and
   delete files entirely through the CLI

2. **Inspection Tools Integration**: Direct links to pdsls.dev and
   atproto-browser help users explore the AT Protocol structure

3. **Pipe-Friendly**: The `get` command integrates seamlessly with Unix
   pipelines and workflows

4. **Safety First**: Binary detection prevents terminal corruption while still
   allowing power users to proceed

5. **Debugging Aid**: The `show` command provides all necessary information for
   troubleshooting uploads

---

## Future Enhancements

Potential improvements:

- `aqfile get --verify` - Verify checksum after download
- `aqfile show --json` - Output in JSON format for scripting
- Progress indicators for large file downloads
- Resume capability for interrupted downloads
