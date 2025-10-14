# ATfile-ts

Modern TypeScript reimplementation of ATfile using Deno runtime.

Upload binary files to AT Protocol PDS using the `blue.zio.atfile` lexicon.

## Requirements

- Deno 2.x or later
- AT Protocol account (Bluesky, etc.)

## Installation

```bash
deno install --allow-env --allow-net --allow-read -n atfile src/main.ts
```

## Usage

```bash
# Show help
atfile help

# Check version
atfile version

# Show config location
atfile config

# Upload a file
atfile upload <file>

# With custom PDS
atfile upload <file> --service https://my-pds.example.com
```

## Configuration

Set credentials via environment variables:

```bash
export ATFILE_SERVICE="https://bsky.social"
export ATFILE_USERNAME="your.handle"
export ATFILE_PASSWORD="your-app-password"
```

Or create a config file at:

- Linux/Unix: `~/.config/atfile/config.json`
- macOS: `~/Library/Application Support/atfile/config.json`
- Windows: `%APPDATA%\atfile\config.json`

```json
{
  "service": "https://bsky.social",
  "identifier": "your.handle",
  "password": "your-app-password"
}
```

## Development

```bash
# Type check
deno check src/main.ts

# Run tests
deno task test

# Format and lint
deno fmt
deno lint

# Full check
deno task check
```

## License

MIT
