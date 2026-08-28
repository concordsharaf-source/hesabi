import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("يتضمن ملف PWA هوية ونطاقًا وأيقونات صالحة للتثبيت الخارجي", async () => {
  const manifest = JSON.parse(await readFile(new URL("../client/public/manifest.json", import.meta.url), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.icons.length, 2);
  assert.deepEqual(manifest.icons.map((icon) => icon.sizes), ["192x192", "512x512"]);
  assert.ok(manifest.icons.every((icon) => icon.src.startsWith("https://")));
});

test("لا يربط عامل الخدمة تخزينه الابتدائي بمسار خاص بنطاق Manus", async () => {
  const worker = await readFile(new URL("../client/public/service-worker.js", import.meta.url), "utf8");
  const main = await readFile(new URL("../client/src/main.js", import.meta.url), "utf8");
  assert.match(worker, /hesabi-pwa-v24/);
  assert.doesNotMatch(worker, /https:\/\/hesabipwa-2r9mmdzn\.manus\.space/);
  assert.match(worker, /event\.request\.mode === "navigate"/);
  assert.match(worker, /fetch\(event\.request\)/);
  assert.match(worker, /cacheApplicationShell/);
  assert.match(worker, /referencedAssetUrls/);
  assert.match(worker, /url\\\(/);
  assert.match(worker, /\(\?:=\|:\)/);
  assert.match(worker, /pendingUrls/);
  assert.match(worker, /isTextAsset/);
  assert.match(worker, /fetch\(event\.request, \{ cache: "no-store" \}\)/);
  assert.match(worker, /\.catch\(\(\) => caches\.match\(SCOPE_PATH\)\.then\(\(cached\) => cached \|\| Response\.error\(\)\)\)/);
  assert.match(worker, /cache: "no-store"/);
  assert.match(main, /navigator\.serviceWorker\.register\("\/service-worker\.js"\)/);
});

test("يستمر التطبيق محليًا بعد أول تحميل عبر كاش الواجهة والأصول", async () => {
  const worker = await readFile(new URL("../client/public/service-worker.js", import.meta.url), "utf8");
  assert.match(worker, /const APP_SHELL = \[SCOPE_PATH, `\$\{SCOPE_PATH\}manifest\.json`, `\$\{SCOPE_PATH\}service-worker\.js`\]/);
  assert.match(worker, /pendingUrls\.push\(\.\.\.discoveredUrls/);
  assert.match(worker, /if \(event\.request\.mode === "navigate"\)/);
  assert.match(worker, /fetch\(event\.request, \{ cache: "no-store" \}\)/);
  assert.match(worker, /cached \|\| Response\.error\(\)/);
  assert.match(worker, /cache\.put\(event\.request, response\.clone\(\)\)/);
});
