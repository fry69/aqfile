import { expect } from "@std/expect";

Deno.test("config - getConfigPath returns correct path based on OS", async () => {
  const { getConfigPath } = await import("../src/config.ts");
  const configPath = getConfigPath();

  expect(configPath).toContain("atfile");
  expect(configPath).toContain("config.json");

  if (Deno.build.os === "darwin") {
    expect(configPath).toContain("Library/Application Support");
  } else if (Deno.build.os === "linux") {
    expect(configPath).toContain(".config");
  }
});

Deno.test("config - mergeConfigs prioritizes later configs", async () => {
  const { mergeConfigs } = await import("../src/config.ts");

  const config1 = { service: "https://example1.com", identifier: "user1" };
  const config2 = { service: "https://example2.com" };
  const config3 = { password: "pass123" };

  const merged = mergeConfigs(config1, config2, config3);

  expect(merged.service).toBe("https://example2.com"); // overridden by config2
  expect(merged.identifier).toBe("user1"); // from config1
  expect(merged.password).toBe("pass123"); // from config3
});

Deno.test("config - loadEnvConfig reads environment variables", async () => {
  const { loadEnvConfig } = await import("../src/config.ts");

  // Set test env vars
  Deno.env.set("ATFILE_SERVICE", "https://test.example.com");
  Deno.env.set("ATFILE_USERNAME", "testuser");
  Deno.env.set("ATFILE_PASSWORD", "testpass");

  const config = loadEnvConfig();

  expect(config.service).toBe("https://test.example.com");
  expect(config.identifier).toBe("testuser");
  expect(config.password).toBe("testpass");

  // Clean up
  Deno.env.delete("ATFILE_SERVICE");
  Deno.env.delete("ATFILE_USERNAME");
  Deno.env.delete("ATFILE_PASSWORD");
});

Deno.test("config - loadConfig includes defaults", async () => {
  const { loadConfig } = await import("../src/config.ts");

  const config = await loadConfig();

  expect(config.service).toBe("https://bsky.social");
});

Deno.test("config - saveConfig and loadConfigFile work together", async () => {
  const { saveConfig, loadConfigFile, getConfigPath } = await import(
    "../src/config.ts"
  );

  const testConfig = {
    service: "https://test-pds.example.com",
    identifier: "test.user",
    password: "test-password-123",
  };

  // Save config
  await saveConfig(testConfig);

  // Load it back
  const loaded = await loadConfigFile();

  expect(loaded.service).toBe(testConfig.service);
  expect(loaded.identifier).toBe(testConfig.identifier);
  expect(loaded.password).toBe(testConfig.password);

  // Clean up - delete the test config file
  try {
    await Deno.remove(getConfigPath());
  } catch {
    // Ignore if it doesn't exist
  }
});
