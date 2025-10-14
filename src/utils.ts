/**
 * Utility functions for file operations
 *
 * This module provides utilities for:
 * - Calculating file checksums (SHA256, MD5, etc.)
 * - Extracting file metadata (size, modification time, MIME type)
 *
 * All types are derived from the `net.altq.aqfile` lexicon schema.
 *
 * @module
 *
 * @example
 * ```ts
 * import { calculateChecksum, getFileMetadata } from "./utils.ts";
 *
 * // Calculate SHA256 checksum
 * const data = await Deno.readFile("example.txt");
 * const checksum = calculateChecksum(data, "sha256");
 *
 * // Get file metadata
 * const metadata = await getFileMetadata(
 *   "example.txt",
 *   "example.txt",
 *   "text/plain"
 * );
 * ```
 */

import * as crypto from "node:crypto";
import type { NetAltqAqfile } from "./types.ts";

/**
 * File checksum structure from the lexicon schema
 */
export type FileChecksum = NetAltqAqfile.Checksum;

/**
 * File metadata structure from the lexicon schema
 */
export type FileMetadata = NetAltqAqfile.File;

/**
 * Calculate a cryptographic checksum for file data
 *
 * Computes a hash of the provided data using the specified algorithm
 * and returns it in the `net.altq.aqfile#checksum` format.
 *
 * @param data - File data as a byte array
 * @param algo - Hash algorithm to use (default: "sha256"). Supports any algorithm
 *   available in Node.js crypto: "sha256", "sha512", "md5", "sha1", etc.
 * @returns A checksum object with algorithm and hex-encoded hash
 *
 * @example
 * ```ts
 * // Calculate SHA256 checksum
 * const data = await Deno.readFile("example.txt");
 * const checksum = calculateChecksum(data);
 * console.log(checksum);
 * // {
 * //   $type: "net.altq.aqfile#checksum",
 * //   algo: "sha256",
 * //   hash: "2c26b46b68ffc68ff99b453c1d30413413422d706..."
 * // }
 *
 * // Use a different algorithm
 * const md5sum = calculateChecksum(data, "md5");
 * ```
 */
export function calculateChecksum(
  data: Uint8Array,
  algo = "sha256",
): FileChecksum {
  const hash = crypto.createHash(algo);
  hash.update(data);
  const digest = hash.digest("hex");

  return {
    $type: "net.altq.aqfile#checksum",
    algo,
    hash: digest,
  };
}

/**
 * Extract metadata from a file
 *
 * Retrieves file system information and combines it with provided metadata
 * to create a complete `net.altq.aqfile#file` record. This includes the file
 * name, size, MIME type, and modification timestamp.
 *
 * @param filePath - Absolute or relative path to the file on disk
 * @param fileName - Display name for the file (can differ from the on-disk name)
 * @param mimeType - MIME type of the file (e.g., "text/plain", "image/png")
 * @returns A promise resolving to a file metadata object
 * @throws {Deno.errors.NotFound} If the file doesn't exist
 * @throws {Deno.errors.PermissionDenied} If lacking read permissions
 *
 * @example
 * ```ts
 * // Get metadata for a text file
 * const metadata = await getFileMetadata(
 *   "./docs/readme.txt",
 *   "README.txt",
 *   "text/plain"
 * );
 * console.log(metadata);
 * // {
 * //   $type: "net.altq.aqfile#file",
 * //   name: "README.txt",
 * //   size: 1234,
 * //   mimeType: "text/plain",
 * //   modifiedAt: "2024-01-15T10:30:00.000Z"
 * // }
 * ```
 */
export async function getFileMetadata(
  filePath: string,
  fileName: string,
  mimeType: string,
): Promise<FileMetadata> {
  const fileInfo = await Deno.stat(filePath);

  return {
    $type: "net.altq.aqfile#file",
    name: fileName,
    size: fileInfo.size,
    mimeType,
    modifiedAt: fileInfo.mtime?.toISOString() ?? new Date().toISOString(),
  };
}
