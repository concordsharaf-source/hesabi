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
  assert.match(worker, /hesabi-pwa-v3/);
  assert.doesNotMatch(worker, /manus-storage/);
  assert.match(worker, /event\.request\.mode === "navigate"/);
  assert.match(worker, /fetch\(event\.request\)/);
});
