# Smart Service URL Handling

## Overview

The `aqfile` CLI automatically normalizes and validates service URLs for
convenience and security. This feature works consistently across all
configuration sources: command-line arguments, environment variables, and config
files.

## Features

### 1. **Automatic HTTPS Protocol**

If you omit the protocol, `https://` is automatically added:

```bash
# These are equivalent:
aqfile upload file.txt --service bsky.social
aqfile upload file.txt --service https://bsky.social
```

**Examples:**

- `bsky.social` → `https://bsky.social`
- `my-pds.example.com` → `https://my-pds.example.com`
- `localhost:3000` → `https://localhost:3000`

### 2. **HTTP Protocol Warning (Interactive Mode)**

When running in an interactive terminal (TTY), if you specify `http://`, you'll
be prompted to convert to `https://`:

```bash
$ aqfile upload file.txt --service http://example.com

⚠️  Warning: Insecure HTTP protocol detected!
   AT Protocol services should use HTTPS for security.

Convert to HTTPS? (y/n) [y]: y
✓ Using: https://example.com
```

**Why?** AT Protocol requires HTTPS for security. Unencrypted HTTP connections
expose your credentials and data.

### 3. **HTTP Protocol Rejection (Non-Interactive Mode)**

In non-interactive environments (CI/CD, scripts), `http://` URLs are rejected
with an error:

```bash
$ echo "file" | aqfile upload file.txt --service http://example.com
Error: HTTP protocol is not supported. AT Protocol requires HTTPS for security.
Please use https:// instead.
```

### 4. **URL Validation**

All URLs are validated before use:

```bash
$ aqfile upload file.txt --service "not a valid url"
Error: Invalid service URL: "not a valid url".
Please provide a valid URL (e.g., "https://bsky.social").
```

## Consistency Across All Sources

URL normalization works the same way regardless of how you provide the service
URL:

### Command Line

```bash
# Auto-add https://
aqfile upload file.txt --service bsky.social

# Prompt for http:// conversion (interactive)
aqfile upload file.txt --service http://example.com
```

### Environment Variables

```bash
# Auto-add https://
export AQFILE_SERVICE="bsky.social"
aqfile upload file.txt

# Reject http:// (non-interactive by default)
export AQFILE_SERVICE="http://example.com"
aqfile upload file.txt  # Error in non-interactive mode
```

### Config File

```json
{
  "service": "bsky.social",
  "handle": "alice.bsky.social",
  "password": "your-app-password"
}
```

The service URL in the config file is normalized when loaded.

### Interactive Setup

```bash
$ aqfile config setup

🔧 aqfile Configuration Setup
================================

PDS service URL [https://bsky.social]: example.com
# Automatically normalized to: https://example.com

Your handle (e.g., alice.bsky.social): alice.example.com
...
```

## URL Components Support

The normalization handles various URL components correctly:

### Ports

```bash
--service localhost:3000    # → https://localhost:3000
--service example.com:8080  # → https://example.com:8080
```

### Paths

```bash
--service bsky.social/path  # → https://bsky.social/path
```

### Query Parameters

```bash
--service example.com?param=value  # → https://example.com?param=value
```

### Already Complete URLs

```bash
--service https://bsky.social  # → https://bsky.social (unchanged)
```

## Security Considerations

### Why HTTPS is Required

1. **Credential Protection**: Your app password is transmitted during
   authentication
2. **Data Privacy**: File uploads and metadata are sensitive
3. **Man-in-the-Middle Prevention**: HTTPS prevents credential interception
4. **AT Protocol Compliance**: The protocol requires secure connections

### Development/Testing

If you're running a local PDS for development:

```bash
# Use HTTPS with self-signed certificates
--service https://localhost:3000

# Or set up a reverse proxy with proper HTTPS
--service https://local-pds.test
```

**Never use HTTP**, even in development, especially if using real credentials.

## Error Messages

### HTTP in Non-Interactive Mode

```
Error: HTTP protocol is not supported. AT Protocol requires HTTPS for security.
Please use https:// instead.
```

**Solution**: Change `http://` to `https://`

### Invalid URL Format

```
Error: Invalid service URL: "invalid-url".
Please provide a valid URL (e.g., "https://bsky.social").
```

**Solution**: Provide a valid domain name or URL

### Interactive HTTP Conversion Declined

```
Error: HTTP protocol is not supported. AT Protocol requires HTTPS for security.
```

**Solution**: Accept the HTTPS conversion when prompted, or manually specify
`https://`

## Implementation Details

### When Normalization Occurs

URL normalization happens once during configuration loading, before any API
calls:

1. Config file is loaded
2. Environment variables are read
3. CLI arguments are parsed
4. All sources are merged
5. **Service URL is normalized** ← happens here
6. Configuration is used for API calls

### Interactive Detection

Interactive mode is detected using `Deno.stdin.isTerminal()`:

- **TTY (interactive)**: Prompts user for HTTP → HTTPS conversion
- **Non-TTY (scripted)**: Rejects HTTP with error

### Functions

```typescript
// From src/config.ts

/**
 * Normalize and validate a service URL
 * @param url - The URL to normalize (may be undefined)
 * @param interactive - Whether in interactive terminal (auto-detected)
 * @returns Normalized URL or undefined
 * @throws Error if invalid or uses HTTP in non-interactive mode
 */
export async function normalizeServiceUrl(
  url: string | undefined,
  interactive = isInteractive(),
): Promise<string | undefined>;
```

## Testing

Comprehensive tests cover all scenarios:

```bash
# Run URL normalization tests
deno test tests/url.test.ts

# Tests cover:
# - Auto-adding https://
# - Preserving existing https://
# - Rejecting http:// in non-interactive mode
# - URL validation
# - Whitespace trimming
# - Ports and paths
```

## Migration Notes

This feature was added in version 0.1.1. Existing configurations will
automatically benefit from URL normalization without any changes needed.

If you have `http://` URLs in your config:

1. **Interactive use**: You'll be prompted to convert on first use
2. **Non-interactive use**: Update your config/env vars to use `https://`

## Examples

### Common Use Cases

```bash
# Simple domain (most common)
aqfile upload file.txt --service bsky.social

# Custom PDS
aqfile upload file.txt --service my-pds.example.com

# Local development
aqfile upload file.txt --service https://localhost:3000

# With port
aqfile upload file.txt --service custom-pds.com:8443

# Already has https:// (no change)
aqfile upload file.txt --service https://bsky.social
```

### In Scripts

```bash
#!/bin/bash
# Script automatically handles URL normalization

export AQFILE_SERVICE="bsky.social"  # Auto-adds https://
export AQFILE_HANDLE="alice.bsky.social"
export AQFILE_APP_PASSWORD="$APP_PASSWORD"

aqfile upload "$1"
```

### In CI/CD

```yaml
# GitHub Actions example
- name: Upload file
  env:
    AQFILE_SERVICE: bsky.social # Auto-normalized
    AQFILE_HANDLE: ${{ secrets.HANDLE }}
    AQFILE_APP_PASSWORD: ${{ secrets.APP_PASSWORD }}
  run: aqfile upload artifact.zip
```
