import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("يحتوي التطبيق أخطاء العرض والإجراءات ويحافظ على طريق للتعافي دون حذف بيانات المستخدم", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8"),
    readFile(new URL("../client/src/style.css", import.meta.url), "utf8"),
  ]);
  assert.match(app, /function renderApplication\(\)/);
  assert.match(app, /function renderRecovery\(error\)/);
  assert.match(app, /function render\(\) \{\s*try \{ renderApplication\(\); \}/);
  assert.match(app, /function installRuntimeGuards\(\)/);
  assert.match(app, /window\.addEventListener\("unhandledrejection"/);
  assert.match(app, /async function handleAction\(event\) \{\s*try \{ await handleActionUnsafe\(event\); \}/);
  assert.match(app, /state\.lastStableView = state\.view/);
  assert.match(app, /لم نحذف أي بيانات محلية/);
  assert.match(styles, /\.runtime-recovery \{/);
});
