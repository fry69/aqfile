# End-to-End Testing Guide

## Overview

The `aqfile` project includes comprehensive end-to-end (e2e) tests that verify
the complete workflow of uploading, listing, and deleting files against a real
AT Protocol PDS.

## Setup

### Prerequisites

1. Access to an AT Protocol PDS (e.g., https://altq.net or https://bsky.social)
2. Test account credentials

### Configuration

Create a `.env.e2e` file in the project root with your test credentials:

```bash
# PDS Configuration
AQFILE_SERVICE=https://altq.net

# Authentication
AQFILE_USERNAME=your-test-account.altq.net
AQFILE_PASSWORD=your-app-password
```

⚠️ **Important**: Use a dedicated test account, not your main account!

## Running E2E Tests

### Run Only E2E Tests

```bash
deno task test:e2e
```

### Run All Tests (Unit + E2E)

```bash
deno test -A
```

### Run Only Unit Tests (Skip E2E)

```bash
deno task test
```

## Test Coverage

The e2e test suite includes:

### 1. Upload Operations

- ✅ Upload small text files
- ✅ Upload files of various sizes (10B, 1KB, 10KB, 100KB)
- ✅ Verify checksum generation (SHA256)
- ✅ Verify file metadata (name, size, mimeType, modifiedAt)
- ✅ Handle optional fields correctly

### 2. List Operations

- ✅ List all uploaded files
- ✅ Display file metadata in table format
- ✅ Handle empty lists gracefully
- ✅ Verify record structure

### 3. Delete Operations

- ✅ Delete individual records by rkey
- ✅ Verify record removal from list
- ✅ Handle blob cleanup notifications
- ✅ Error handling for non-existent records

### 4. Type Safety

- ✅ TypeScript enforces size constraints (0-1GB)
- ✅ TypeScript enforces name length (max 512 chars)
- ✅ TypeScript enforces required fields
- ✅ Generated types from lexicon schemas

### 5. Error Conditions

- ✅ Missing required fields (compile-time error)
- ✅ Invalid record keys
- ✅ Authentication failures
- ✅ Network errors

## Test Structure

Each test follows this pattern:

```typescript
Deno.test({
  name: "e2e - test description",
  async fn() {
    // 1. Setup: Create agent and test data
    const agent = await createAgent();
    const testFile = await createTestFile("test.txt", "content");

    try {
      // 2. Execute: Perform the operation
      const result = await uploadTestFile(agent, testFile);

      // 3. Verify: Check results
      expect(result.uri).toBeTruthy();

      // 4. Cleanup: Delete test records
      await deleteTestRecord(agent, result.rkey);
    } finally {
      // 5. Teardown: Remove temp files
      await Deno.remove(testFile);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
```

## Helper Functions

The test suite provides several helper functions:

### `createAgent()`

Creates and logs in an ATP agent with test credentials.

### `createTestFile(name, content)`

Creates a temporary test file with specified content.

### `uploadTestFile(agent, filePath)`

Uploads a file and returns the record URI, CID, and rkey.

### `deleteTestRecord(agent, rkey)`

Deletes a record by its rkey.

## Manual Testing with CLI

You can also test manually using the CLI:

```bash
# Upload a file
deno task e2e upload test.txt

# List all files
deno task e2e list

# Delete a file (use rkey from list output)
deno task e2e delete 3m35jjrc5b62d
```

## Debugging

Enable debug output to see detailed information:

```bash
DEBUG=1 deno task e2e upload test.txt
```

This will show:

- Blob structure after upload
- Record data before creation
- Full error stack traces

## Test Isolation

- Tests clean up existing records before starting
- Each test creates and deletes its own test data
- Tests are independent and can run in any order
- Temporary files are automatically cleaned up

## Continuous Integration

The e2e tests can be run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  env:
    AQFILE_SERVICE: ${{ secrets.TEST_PDS_SERVICE }}
    AQFILE_USERNAME: ${{ secrets.TEST_USERNAME }}
    AQFILE_PASSWORD: ${{ secrets.TEST_PASSWORD }}
  run: deno task test:e2e
```

## Troubleshooting

### Authentication Failures

```
Error: Could not authenticate with PDS
```

**Solution**: Verify your credentials in `.env.e2e` are correct and the account
exists.

### Network Timeouts

```
Error: Connection timeout
```

**Solution**: Check your network connection and that the PDS URL is accessible.

### Record Not Found

```
Error: Record not found: 3m35jjrc5b62d
```

**Solution**: The record may have been deleted. Run `deno task e2e list` to see
available records.

### Permission Denied

```
Error: Permission denied
```

**Solution**: Ensure Deno has the necessary permissions: `-A` (allow all) or
specific flags.

## Best Practices

1. **Use Test Accounts**: Never use production accounts for testing
2. **Clean Up**: Always delete test records after testing
3. **Isolate Tests**: Each test should be independent
4. **Verify Thoroughly**: Check all aspects of the operation (record, blob,
   metadata)
5. **Handle Errors**: Test both success and failure paths
6. **Document Changes**: Update tests when lexicon changes

## Related Documentation

- [USAGE.md](./USAGE.md) - Schema validation usage
- [SCHEMAS.md](./SCHEMAS.md) - Quick schema reference
- [REFACTORING.md](./REFACTORING.md) - Schema integration details
- [README.md](../README.md) - Project overview
