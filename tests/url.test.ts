import { expect } from "@std/expect";
import { assertRejects } from "@std/assert";

Deno.test("normalizeServiceUrl - adds https:// when protocol is missing", async () => {
  const { normalizeServiceUrl } = await import("../src/config.ts");

  const result = await normalizeServiceUrl("bsky.social", false);
  expect(result).toBe("https://bsky.social");
});

Deno.test("normalizeServiceUrl - preserves https:// when present", async () => {
  const { normalizeServiceUrl } = await import("../src/config.ts");

  const result = await normalizeServiceUrl("https://bsky.social", false);
  expect(result).toBe("https://bsky.social");
});

Deno.test("normalizeServiceUrl - returns undefined for undefined input", async () => {
  const { normalizeServiceUrl } = await import("../src/config.ts");

  const result = await normalizeServiceUrl(undefined, false);
  expect(result).toBeUndefined();
});

Deno.test("normalizeServiceUrl - rejects http:// in non-interactive mode", async () => {
  const { normalizeServiceUrl } = await import("../src/config.ts");

  await assertRejects(
    async () => await normalizeServiceUrl("http://example.com", false),
    Error,
    "HTTP protocol is not supported",
  );
});

Deno.test("normalizeServiceUrl - validates URL format", async () => {
  const { normalizeServiceUrl } = await import("../src/config.ts");

  await assertRejects(
    async () => await normalizeServiceUrl("not a valid url!", false),
    Error,
    "Invalid service URL",
  );
});

Deno.test("normalizeServiceUrl - handles URLs with paths", async () => {
  const { normalizeServiceUrl } = await import("../src/config.ts");

  const result = await normalizeServiceUrl("bsky.social/path", false);
  expect(result).toBe("https://bsky.social/path");
});

Deno.test("normalizeServiceUrl - handles URLs with ports", async () => {
  const { normalizeServiceUrl } = await import("../src/config.ts");

  const result = await normalizeServiceUrl("localhost:3000", false);
  expect(result).toBe("https://localhost:3000");
});

Deno.test("normalizeServiceUrl - trims whitespace", async () => {
  const { normalizeServiceUrl } = await import("../src/config.ts");

  const result = await normalizeServiceUrl("  bsky.social  ", false);
  expect(result).toBe("https://bsky.social");
});
