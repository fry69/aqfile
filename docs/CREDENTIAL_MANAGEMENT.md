# Credential Management and Naming Improvements

## Summary of Changes

This update streamlines the CLI with improved naming conventions, interactive
setup, and better credential management.

## Naming Changes

### Previous vs New Names

| Concept       | Old Name                | New CLI Flag     | New Code Variable | New Env Variable      |
| ------------- | ----------------------- | ---------------- | ----------------- | --------------------- |
| User identity | `identifier`/`username` | `--handle`       | `handle`          | `AQFILE_HANDLE`       |
| App password  | `password`              | `--app-password` | `password`        | `AQFILE_APP_PASSWORD` |
| PDS server    | `service`               | `--service`      | `service`         | `AQFILE_SERVICE`      |

### Rationale

- **`handle`**: More user-friendly and aligns with AT Protocol terminology.
  Users know their "handle" (alice.bsky.social). Still accepts DIDs.
- **`app-password`**: Explicitly indicates this should be an App Password, not
  an account password, reducing security risks.
- **`service`**: Kept unchanged as it's clear and established.

## New Features

### 1. Interactive Setup

```bash
aqfile config setup
```

- Prompts for service URL, handle, and app password
- Shows link to generate App Password
- Offers to save credentials to config file
- Only works in interactive terminals (TTY)

### 2. Auto-prompt for Missing Credentials

When running upload/list/delete without credentials:

- If in an interactive terminal: offers to set up credentials
- If non-interactive: shows error with helpful guidance
- If CLI args provided: asks if user wants to save them

### 3. Clear Stored Credentials

```bash
aqfile config clear
```

Removes the config file, clearing all stored credentials.

### 4. Improved Help

- Shows all credential options with descriptions
- Emphasizes App Password requirement
- Links to App Password generation page
- Shows config file location and format

## Updated Commands

### Config Command

```bash
# Show current config
aqfile config

# Set up credentials interactively
aqfile config setup

# Clear stored credentials
aqfile config clear
```

### Upload/List/Delete Commands

Now support the new naming:

```bash
# Using new flags
aqfile upload file.txt --handle alice.bsky.social --app-password xyz

# Using environment variables
export AQFILE_HANDLE="alice.bsky.social"
export AQFILE_APP_PASSWORD="your-app-password"
aqfile upload file.txt

# Interactive setup on first use
aqfile upload file.txt  # Will prompt for credentials if missing
```

## Code Changes

### Modified Files

1. **src/config.ts**
   - Renamed `Config` interface properties
   - Updated `loadEnvConfig()` to use new env var names
   - Updated `mergeConfigs()` for new property names
   - Added `clearConfig()` function
   - Added `isInteractive()` helper
   - Added `promptForConfig()` for interactive setup
   - Added `promptToSave()` for save confirmation

2. **src/main.ts**
   - Updated all interfaces (UploadOptions, DeleteOptions, ListOptions)
   - Changed CLI arg parsing to use new names
   - Updated `uploadFile()`, `listRecords()`, `deleteRecord()` functions
   - Enhanced `showHelp()` with detailed options
   - Added interactive prompts in upload command
   - Added `config setup` and `config clear` subcommands
   - Improved error messages with helpful guidance

3. **tests/main.test.ts**
   - Updated all tests to use new property names
   - Changed env variable names in tests

## Migration Guide

### For Users

#### Environment Variables

```bash
# OLD
export AQFILE_USERNAME="alice.bsky.social"
export AQFILE_PASSWORD="password"

# NEW
export AQFILE_HANDLE="alice.bsky.social"
export AQFILE_APP_PASSWORD="app-password-here"
```

#### Config File

```json
// OLD
{
  "service": "https://bsky.social",
  "identifier": "alice.bsky.social",
  "password": "password"
}

// NEW
{
  "service": "https://bsky.social",
  "handle": "alice.bsky.social",
  "password": "app-password-here"
}
```

Users can run `aqfile config setup` to easily migrate or create new config.

### For Developers

All interfaces and function signatures have been updated. Search and replace:

- `identifier` → `handle`
- `password` → `password` (unchanged internally)
- `AQFILE_USERNAME` → `AQFILE_HANDLE`
- `AQFILE_PASSWORD` → `AQFILE_APP_PASSWORD`

## Security Improvements

1. **Explicit App Password naming**: The `--app-password` flag and
   `AQFILE_APP_PASSWORD` env var make it clear that account passwords should
   never be used.

2. **Help text warnings**: Multiple warnings in help text and during interactive
   setup emphasize using App Passwords.

3. **Generation link**: Direct link to https://bsky.app/settings/app-passwords
   provided throughout.

## Testing

All existing tests pass with updated naming. New features tested:

- ✅ Config merge with new property names
- ✅ Environment variable loading with new names
- ✅ Config save/load with new properties
- ✅ Type checking passes
- ✅ Help text displays correctly

## Breaking Changes

⚠️ **BREAKING**: Environment variable and config file property names have
changed.

Users will need to update:

1. Environment variables (if using)
2. Config file format (if exists)
3. CI/CD configurations

The easiest migration path is to run `aqfile config setup` which will create a
new config with the correct format.
