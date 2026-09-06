import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("يجعل التطبيق الوضع الداكن هو الافتراضي مع حفظ اختيار المستخدم الصريح", async () => {
  const [app, index] = await Promise.all([
    read("client/src/js/app.js"),
    read("client/index.html"),
  ]);
  // الافتراضي عند غياب تفضيل محفوظ: داكن (يُعكس فقط عند اختيار الفاتح صراحة).
  assert.match(app, /dataset\.theme = state\.settings\?\.theme === "light" \? "light" : "dark"/);
  assert.match(app, /const dark = state\.settings\?\.theme !== "light"/);
  assert.match(app, /state\.settings\?\.theme === "light" \? "dark" : "light"/);
  // الزر يعرض أيقونة الشمس في الداكن (للتبديل إلى الفاتح) والعكس صحيح.
  assert.match(app, /\$\{icon\(dark \? "sun" : "moon", 19\)\}/);
  // صفحة الإقلاع تبدأ داكنة قبل تحميل الإعدادات لمنع وميض الشاشة الفاتحة.
  assert.match(index, /<html lang="ar" dir="rtl" data-theme="dark">/);
  assert.match(index, /<meta name="theme-color" content="#101D18" \/>/);
});

test("يوحّد غلاف الأندرويد الإقلاع مع الوضع الداكن الافتراضي", async () => {
  const [styles, colors, capacitorConfig, splashDefault] = await Promise.all([
    read("android/app/src/main/res/values/styles.xml"),
    read("android/app/src/main/res/values/colors.xml"),
    read("capacitor.config.ts"),
    readFile(new URL("../android/app/src/main/res/drawable-port-xhdpi/splash.png", import.meta.url)),
  ]);
  assert.match(colors, /<color name="launchBackground">#101D18<\/color>/);
  assert.match(styles, /<item name="android:windowBackground">@color\/launchBackground<\/item>/);
  // WebView يرسم خلفية داكنة قبل تحميل الواجهة فلا وميض أبيض.
  assert.match(capacitorConfig, /backgroundColor: "#101D18"/);
  assert.ok(splashDefault.length > 1000, "شاشة البداية يجب أن تكون صورة فعلية");
});

test("يرفع عامل الخدمة رقم الكاش مع تغيّر أصول الواجهة الداكنة", async () => {
  const worker = await read("client/public/service-worker.js");
  const manifest = JSON.parse(await readFile(new URL("../client/public/manifest.json", import.meta.url), "utf8"));
  assert.match(worker, /hesabi-pwa-v30/);
  assert.equal(manifest.theme_color, "#101D18");
  assert.equal(manifest.background_color, "#101D18");
});
