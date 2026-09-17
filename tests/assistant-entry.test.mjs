import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
const backup = await readFile(new URL("../client/src/js/firebase-backup.js", import.meta.url), "utf8");
const sync = await readFile(new URL("../client/src/js/firebase-sync.js", import.meta.url), "utf8");

test("منظومة رمز الاقتران أُزيلت من الواجهة وبقيت أساسات النسخ السحابي", () => {
  assert.doesNotMatch(app, /openAssistantEntryDialog/);
  assert.doesNotMatch(app, /openPairingInviteDialog/);
  assert.doesNotMatch(app, /approvePairingRequestFromUi/);
  assert.doesNotMatch(app, /repairCloudWorkspace/);
  assert.doesNotMatch(app, /data-action="pairing-invite"/);
  assert.doesNotMatch(app, /إنشاء رمز اقتران/);
  assert.doesNotMatch(app, /إصلاح ربط المتجر/);
  assert.doesNotMatch(app, /redeemPairingInvite/);
  assert.match(backup, /from \"firebase\/app\"/);
  assert.match(backup, /getAuth/);
  assert.match(sync, /from \"firebase\/app\"/);
  assert.match(sync, /import \{ getApp, getApps, initializeApp \} from "firebase\/app"/);
});

test("قواعد Firestore تحافظ على النسخ وتضيف حماية المتجر", () => {
  assert.match(rules, /match \/backupOwners\/{userId}/);
  assert.match(rules, /match \/storeDirectory\/{emailKey}/);
  assert.match(rules, /match \/stores\/{storeId}/);
  assert.match(rules, /match \/pairRequests\/{requestId}/);
  assert.match(rules, /match \/operations\/{operationId}/);
  assert.match(rules, /request\.resource\.data\.pairingCode is string/);
  assert.match(rules, /data\.usedAt == null/);
  assert.match(rules, /allow read, write: if false/);
});
