/**
 * Utility functions for Aqfile
 */

import * as crypto from "node:crypto";

export interface FileChecksum {
  $type: "net.altq.aqfile#checksum";
  algo?: string;
  hash?: string;
}

export interface FileMetadata {
  $type: "net.altq.aqfile#file";
  name?: string;
  size?: number;
  mimeType?: string;
  modifiedAt?: string;
}

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
