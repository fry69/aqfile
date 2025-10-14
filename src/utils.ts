/**
 * Utility functions for ATfile
 */

import * as crypto from "node:crypto";

export interface MachineFingerprint {
  $type: "blue.zio.atfile.finger#machine";
  app?: string;
  host?: string;
  id?: string;
  os?: string;
}

export interface FileChecksum {
  $type: "blue.zio.atfile.upload#checksum";
  algo?: string;
  hash?: string;
}

export interface FileMetadata {
  $type: "blue.zio.atfile.upload#file";
  name?: string;
  size?: number;
  mimeType?: string;
  modifiedAt?: string;
}

/**
 * Generate a machine fingerprint for upload tracking
 */
export function generateFingerprint(version: string): MachineFingerprint {
  const os = Deno.build.os;
  const hostname = Deno.hostname();
  const appName = `atfile-ts/${version}`;

  // Generate a consistent machine ID based on hostname and OS
  const machineId = crypto
    .createHash("sha256")
    .update(`${hostname}-${os}`)
    .digest("hex")
    .substring(0, 16);

  return {
    $type: "blue.zio.atfile.finger#machine",
    app: appName,
    host: hostname,
    id: machineId,
    os: os,
  };
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
    $type: "blue.zio.atfile.upload#checksum",
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
    $type: "blue.zio.atfile.upload#file",
    name: fileName,
    size: fileInfo.size,
    mimeType,
    modifiedAt: fileInfo.mtime?.toISOString() ?? new Date().toISOString(),
  };
}
