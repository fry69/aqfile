import type {} from "@atcute/lexicons";
import * as v from "@atcute/lexicons/validations";
import type {} from "@atcute/lexicons/ambient";

const _checksumSchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("net.altq.aqfile#checksum"),
  ),
  /**
   * Hash algorithm name.
   * @maxLength 32
   */
  algo: /*#__PURE__*/ v.constrain(
    /*#__PURE__*/ v.string<"blake3" | "sha256" | "sha512" | (string & {})>(),
    [/*#__PURE__*/ v.stringLength(0, 32)],
  ),
  /**
   * Hex or base64 encoded digest produced by the algorithm.
   * @maxLength 128
   */
  hash: /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.string(), [
    /*#__PURE__*/ v.stringLength(0, 128),
  ]),
});
const _fileSchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("net.altq.aqfile#file"),
  ),
  /**
   * MIME type, e.g. 'video/mp4'.
   * @maxLength 255
   */
  mimeType: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.string(), [
      /*#__PURE__*/ v.stringLength(0, 255),
    ]),
  ),
  /**
   * Client-side last-modified timestamp.
   */
  modifiedAt: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.datetimeString()),
  /**
   * User-visible filename.
   * @maxLength 512
   */
  name: /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.string(), [
    /*#__PURE__*/ v.stringLength(0, 512),
  ]),
  /**
   * File size in bytes.
   * @minimum 0
   * @maximum 1000000000
   */
  size: /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.integer(), [
    /*#__PURE__*/ v.integerRange(0, 1000000000),
  ]),
});
const _mainSchema = /*#__PURE__*/ v.record(
  /*#__PURE__*/ v.string(),
  /*#__PURE__*/ v.object({
    $type: /*#__PURE__*/ v.literal("net.altq.aqfile"),
    /**
     * Handle or DID of the account to attribute this upload to.
     */
    attribution: /*#__PURE__*/ v.optional(
      /*#__PURE__*/ v.actorIdentifierString(),
    ),
    /**
     * The uploaded blob reference. Note: Individual PDS instances may enforce lower size limits.
     * @accept *\/*
     * @maxSize 1000000000
     */
    blob: /*#__PURE__*/ v.blob(),
    /**
     * Optional cryptographic checksum for integrity verification.
     */
    get checksum() {
      return /*#__PURE__*/ v.optional(checksumSchema);
    },
    /**
     * Timestamp when this record was created.
     */
    createdAt: /*#__PURE__*/ v.datetimeString(),
    /**
     * Metadata about the file.
     */
    get file() {
      return fileSchema;
    },
  }),
);

type checksum$schematype = typeof _checksumSchema;
type file$schematype = typeof _fileSchema;
type main$schematype = typeof _mainSchema;

export interface checksumSchema extends checksum$schematype {}
export interface fileSchema extends file$schematype {}
export interface mainSchema extends main$schematype {}

export const checksumSchema = _checksumSchema as checksumSchema;
export const fileSchema = _fileSchema as fileSchema;
export const mainSchema = _mainSchema as mainSchema;

export interface Checksum extends v.InferInput<typeof checksumSchema> {}
export interface File extends v.InferInput<typeof fileSchema> {}
export interface Main extends v.InferInput<typeof mainSchema> {}

declare module "@atcute/lexicons/ambient" {
  interface Records {
    "net.altq.aqfile": mainSchema;
  }
}
