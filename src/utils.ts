/**
 * Utility functions for Aqfile
 */

import * as crypto from "node:crypto";
import type { NetAltqAqfile } from "./lexicons/index.ts";

// Use generated types from lexicon schemas instead of manually defining them
export type FileChecksum = NetAltqAqfile.Checksum;
export type FileMetadata = NetAltqAqfile.File;

/**
 * Calculate checksums for a file
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
 * Get file metadata
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
