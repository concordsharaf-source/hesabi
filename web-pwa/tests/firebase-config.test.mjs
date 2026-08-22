import assert from "node:assert/strict";
import test from "node:test";

test("Firebase Web config parses and the API key reaches Firebase Auth", async () => {
  const rawConfig = process.env.VITE_FIREBASE_CONFIG_JSON;
  assert.ok(rawConfig, "VITE_FIREBASE_CONFIG_JSON must be configured");

  const config = JSON.parse(rawConfig);
  assert.equal(config.projectId, "hesabi-backup");
  assert.equal(config.authDomain, "hesabi-backup.firebaseapp.com");
  assert.ok(config.apiKey, "Firebase API key is required");
  assert.ok(config.appId, "Firebase app ID is required");

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    },
  );
  const body = await response.json();
  const reason = body?.error?.message ?? "";

  assert.notEqual(reason, "API_KEY_INVALID");
  assert.notEqual(reason, "INVALID_KEY_TYPE");
  assert.notEqual(reason, "PROJECT_NOT_FOUND");
  assert.ok(response.status === 400 || response.ok, `Unexpected Firebase response: ${response.status}`);
});
