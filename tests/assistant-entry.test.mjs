import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
const backup = await readFile(new URL("../client/src/js/firebase-backup.js", import.meta.url), "utf8");
const sync = await readFile(new URL("../client/src/js/firebase-sync.js", import.meta.url), "utf8");
const alerts = await readFile(new URL("../client/src/js/push-alerts.js", import.meta.url), "utf8");

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

test("قواعد Firestore تحافظ على النسخ وتحصر صلاحيات المتجر", () => {
  assert.match(rules, /match \/backupOwners\/{userId}/);
  assert.match(rules, /match \/stores\/{storeId}/);
  assert.match(rules, /match \/operations\/{operationId}/);
  assert.match(rules, /match \/push\/config \{/);
  assert.match(rules, /match \/push\/sender \{/);
  assert.match(rules, /allow read, write: if false/);

  /* منظومة رمز الاقتران ودليل البريد أُلغيتا نهائيًا — لا بقايا لهما في القواعد. */
  assert.doesNotMatch(rules, /pairings/);
  assert.doesNotMatch(rules, /pairRequests/);
  assert.doesNotMatch(rules, /storeDirectory/);
  assert.doesNotMatch(sync, /createPairingInvite|redeemPairingInvite|requestAssistantDevice|approveAssistantRequest/);
});

test("لا تصعيد صلاحيات: عضوية الأدمن الذاتية مشروطة بمتجر غير مطالب به", () => {
  const membersBlock = rules.slice(rules.indexOf("match /members/{uid} {"), rules.indexOf("match /operations/{operationId} {"));
  assert.match(membersBlock, /storeUnclaimed\(storeId\)/, "الإنشاء الذاتي مشروط بمتجر بلا مالك");
  assert.match(membersBlock, /request\.resource\.data\.role == 'admin' && ownsStore\(storeId\)/, "دور أدمن فقط لمالك المتجر");
  assert.match(membersBlock, /request\.resource\.data\.uid == uid/, "لا كتابة عضوية على حساب غيرك");
  assert.match(membersBlock, /request\.resource\.data\.storeId == storeId/, "لا تسميم متجر آخر");
  assert.match(rules, /function storeUnclaimed\(storeId\) \{/, "الدالة المساعدة معرّفة");
});

test("السرّ الخاص لـ VAPID معزول عن بقية الأعضاء", () => {
  const senderBlock = rules.slice(rules.indexOf("match /push/sender {"), rules.indexOf("match /pushDevices/{uid} {"));
  assert.match(senderBlock, /allow read, write: if admin\(storeId\) \|\| ownsStore\(storeId\);/, "sender للأدمن/المالك فقط");

  const configBlock = rules.slice(rules.indexOf("match /push/config {"), rules.indexOf("match /push/sender {"));
  assert.match(configBlock, /allow read: if member\(storeId\);/, "config يبقى مقروءًا للأعضاء (مفتاح عام فقط)");

  /* الكود لا يقرأ السرّ الخاص إلا عبر push/sender. */
  assert.match(sync, /push", "sender"/);
  assert.doesNotMatch(alerts, /resolveVapid\(/, "لم تبقَ دالة القراءة الموحّدة القديمة");
  assert.match(alerts, /resolveSendVapid\(storeId\)/);
  assert.match(alerts, /if \(!vapid\?\.privateKey\)/, "الإرسال يشترط وجود السرّ الخاص");
});
