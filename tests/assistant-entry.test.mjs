import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");

test("شاشة البداية تفصل دخول الجهاز المساعد عن فتح متجر جديد", () => {
  assert.match(app, /data-action="assistant-login"/);
  assert.match(app, /function openAssistantEntryDialog/);
  assert.match(app, /requestAssistantDevice/);
  assert.doesNotMatch(app, /crypto\.randomUUID/);
});

test("قواعد Firestore تحافظ على النسخ وتضيف حماية المتجر", () => {
  assert.match(rules, /match \/backupOwners\/{userId}/);
  assert.match(rules, /match \/storeDirectory\/{emailKey}/);
  assert.match(rules, /match \/stores\/{storeId}/);
  assert.match(rules, /match \/pairRequests\/{requestId}/);
  assert.match(rules, /match \/operations\/{operationId}/);
  assert.match(rules, /allow read, write: if false/);
});
