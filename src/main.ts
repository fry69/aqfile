// atfile-poc.ts
// PoC: upload a file to an AT Protocol PDS and create a repo record referencing it.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import mime from "mime-types";
import { AtpAgent } from "@atproto/api";

async function uploadAndCreateRecord(
  serviceUrl: string,
  identifier: string,
  password: string,
  filePath: string,
) {
  // 1) init agent
  const agent = new AtpAgent({ service: serviceUrl });

  // 2) login (you can also use app-passwords / sessions instead)
  await agent.login({
    identifier,
    password,
  });
  console.log("Logged in."); // agent now authenticated

  // 3) read file and detect mime type
  const data = fs.readFileSync(filePath);
  const mimeType = mime.lookup(filePath) || "application/octet-stream";
  const fileName = path.basename(filePath);
  const size = fs.statSync(filePath).size;

  // 4) upload blob
  // `agent.uploadBlob` is the recommended nicety; it wraps the com.atproto.repo.uploadBlob call.
  // It returns an object containing `data.blob` with the blob ref (CID) and metadata.
  console.log(`Uploading ${fileName} (${size} bytes, ${mimeType})...`);
  const uploadRes = await agent.uploadBlob(data, { encoding: mimeType });
  const blob = uploadRes.data?.blob;
  if (!blob) throw new Error("uploadBlob returned no blob.");
  console.log("Uploaded blob:", blob.ref?.["$link"] ?? "(no link in response)");

  // 5) create a record that references the blob, anchoring it.
  // Replace `collection` and `record` with the exact lexicon you want.
  // Example below uses a hypothetical collection name and record structure.
  // For ATFile, replace `collection` and `record` fields with the exact `blue.zio.atfile` schema fields.
  const did = agent.session?.did ?? (agent as any).did; // best-effort DID extraction
  if (!did) throw new Error("Could not determine repo DID from agent session.");

  // === IMPORTANT: adapt the shape below to match the blue.zio.atfile lexicon ===
  // Example record uses:
  //  - $type set to the lexicon NSID,
  //  - file metadata fields, and
  //  - the blob reference (a blob object).
  const collection = "blue.zio.atfile.file"; // <-- change to the real collection NSID if different
  const recordBody = {
    $type: "blue.zio.atfile.file", // <-- change to the lexicon main type if different
    filename: fileName,
    size,
    mimeType,
    // include the blob reference object the PDS returned (this is the standard pattern)
    blob: blob,
    createdAt: new Date().toISOString(),
    // any other fields required by the lexicon...
  };

  console.log("Creating repo record in", collection, "...");
  const createRes = await agent.com.atproto.repo.createRecord({
    did,
    collection,
    record: recordBody,
  });

  console.log("Created record:", createRes.data);
  console.log("Record URI:", createRes.data?.uri);
  console.log("Record CID:", createRes.data?.cid);

  return {
    blob,
    record: createRes.data,
  };
}

// CLI runner
if (require.main === module) {
  (async () => {
    const [, , maybeFile] = process.argv;
    if (!maybeFile) {
      console.error("Usage: node atfile-poc.js /path/to/file");
      process.exit(2);
    }
    const filePath = maybeFile;
    const SERVICE = process.env.SERVICE || "https://bsky.social";
    const IDENTIFIER = process.env.IDENTIFIER || process.env.ATFILE_USERNAME;
    const PASSWORD = process.env.PASSWORD || process.env.ATFILE_PASSWORD;
    if (!IDENTIFIER || !PASSWORD) {
      console.error(
        "Set IDENTIFIER and PASSWORD env vars (or ATFILE_USERNAME / ATFILE_PASSWORD).",
      );
      process.exit(2);
    }

    try {
      await uploadAndCreateRecord(SERVICE, IDENTIFIER, PASSWORD, filePath);
      console.log("Done.");
    } catch (err) {
      console.error("Error:", err);
      process.exit(1);
    }
  })();
}
