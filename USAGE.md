# ATfile-ts Usage Examples

This document demonstrates how to use atfile-ts.

## Basic Upload

Create a test file and upload it:

```bash
# Create a test file
echo "Hello from ATfile-ts!" > test.txt

# Upload it
deno run --allow-env --allow-net --allow-read src/main.ts upload test.txt
```

## Using Environment Variables

```bash
# Set credentials
export ATFILE_USERNAME="your.handle.bsky.social"
export ATFILE_PASSWORD="your-app-password"
export ATFILE_SERVICE="https://bsky.social"

# Upload
deno run --allow-env --allow-net --allow-read src/main.ts upload document.pdf
```

## Using a Config File

Create `~/.config/atfile/config.json` (Linux/Unix) or equivalent for your OS:

```json
{
  "service": "https://bsky.social",
  "identifier": "your.handle.bsky.social",
  "password": "your-app-password"
}
```

Then upload without setting environment variables:

```bash
deno run --allow-env --allow-read --allow-net src/main.ts upload image.png
```

## Check Configuration

See where config is stored and what values are set:

```bash
deno run --allow-env --allow-read src/main.ts config
```

## Upload to Custom PDS

```bash
deno run --allow-env --allow-net --allow-read src/main.ts upload \
  --service https://my-pds.example.com \
  --identifier alice.example.com \
  --password "app-password-here" \
  myfile.zip
```

## Install Globally

Install as a global command:

```bash
deno install --allow-env --allow-net --allow-read -n atfile src/main.ts

# Then use it directly
atfile upload document.pdf
atfile config
atfile help
```

## Development Testing

Run without installing:

```bash
# Show help
deno run src/main.ts help

# Check version
deno run src/main.ts version

# Run tests
deno task test

# Full validation
deno task check
```

## Expected Output

When uploading a file, you should see output like:

```
✓ Logged in as your.handle.bsky.social
⬆ Uploading test.txt (22 bytes, text/plain)...
✓ Blob uploaded: bafkreiabc123...
📝 Creating record in blue.zio.atfile.upload...
✓ Record created: at://did:plc:xyz.../blue.zio.atfile.upload/abc123
  CID: bafyreiabc123...

✓ Upload complete
```

## Notes

- Files are uploaded as blobs to the PDS
- A record is created in the `blue.zio.atfile.upload` collection
- The record includes:
  - Blob reference (CID)
  - File metadata (name, size, mime type, modified date)
  - Checksum (SHA256 by default)
  - Machine fingerprint (app, host, os, id)
- The PDS will anchor the blob so it won't be garbage collected
