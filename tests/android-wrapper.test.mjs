import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const exists = (path) => access(new URL(`../${path}`, import.meta.url)).then(() => true, () => false);

/* أصول الغلاف (android/app/src/main/assets/…) مولّدة بأمر `npx cap sync android` وليست في المستودع.
   عند غيابها نتخطى بدل الفشل حتى تبقى `pnpm test` صالحة قبل البناء، وتبقى مُلزِمة في CI
   لأن مهمة «غلاف أندرويد» تشغّل cap sync قبل الاختبارات. */

test("يحافظ غلاف Android على هوية حسابي وأصول الويب المحلية", async (t) => {
  const config = await read("capacitor.config.ts");
  const manifest = await read("android/app/src/main/AndroidManifest.xml");
  const activity = await read("android/app/src/main/java/com/hesabi/app/MainActivity.java");
  assert.match(config, /appId:\s*["']com\.hesabi\.app["']/);
  assert.match(config, /appName:\s*["']حسابي["']/);
  assert.match(config, /webDir:\s*["']dist\/public["']/);
  assert.match(manifest, /android:name="\.MainActivity"/);
  assert.match(activity, /package com\.hesabi\.app/);

  if (!await exists("android/app/src/main/assets/capacitor.config.json")) {
    t.skip("لم تُولَّد أصول الغلاف بعد — نفّذ pnpm build ثم npx cap sync android");
    return;
  }
  const nativeConfig = await read("android/app/src/main/assets/capacitor.config.json");
  assert.match(nativeConfig, /"appId"\s*:\s*"com\.hesabi\.app"/);
});

test("يضم غلاف Android نسخة الويب المبنية مع عامل الخدمة", async (t) => {
  if (!await exists("android/app/src/main/assets/public/index.html")) {
    t.skip("لم تُولَّد أصول الغلاف بعد — نفّذ pnpm build ثم npx cap sync android");
    return;
  }
  const shell = await read("android/app/src/main/assets/public/index.html");
  const worker = await read("android/app/src/main/assets/public/service-worker.js");
  const source = await read("client/public/service-worker.js");
  assert.match(shell, /<script[^>]+src=/);
  assert.match(shell, /\/assets\/[^"']+\.js/);
  // إصدار الكاش يُشتق من المصدر بدل تثبيت رقم حرفي، فلا ينكسر عند كل رفع إصدار
  assert.match(worker, /const CACHE_NAME = "hesabi-pwa-v\d+";/, "يجب أن يضم الغلاف تعريف إصدار كاش صريحًا");
  assert.equal(worker, source, "عامل الخدمة في غلاف Android يجب أن يبقى مطابقًا لمصدر client/public بدل نسخة مجمّدة");
});
