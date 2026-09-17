/**
 * منع تسريب بيئة النشر إلى الحزمة المشحونة للمتصفح.
 *
 * Vercel يحقن تلقائيًا متغيراته ببادئة VITE_ (معرّف المشروع، معرّف المستودع،
 * المالك، اسم صاحب الالتزام، رسالة الالتزام، رابط النشر…)، وفيت ينسخ كل ما
 * بادئته VITE_ إلى الحزمة. فكانت 19 متغيرًا لا يستخدمها التطبيق تُشحن لكل زائر.
 *
 * والأثر العملي أخطر من الخصوصية: رسالة الالتزام ضمن محتوى الحزمة، فأي دفع كان
 * يغيّر اسم index-*.js حتى لو لم تتغير الشيفرة — يُبطل كاش المتصفح وعامل الخدمة
 * بلا سبب، ويجعل التحقق من النشر بمقارنة أسماء الحزم غير ذي معنى.
 *
 * يُفحص هنا أن vite.config.ts ما زال يعرّف المتغيرين المستعملين فعلًا لكل مفتاح
 * على حدة، وأنه لا يقع في فخّين مجرَّبين: تعريف كائن import.meta.env كاملًا
 * (لا يمنع حقن فيت)، أو إفراغ envPrefix (يمنع تحميل .env أصلًا فيُسقط المتغيرين).
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const viteConfig = await readFile(new URL("../vite.config.ts", import.meta.url), "utf8");

/* المتغييران اللذان تستعملهما الشيفرة فعلًا — أي تغيير في هذه القائمة يجب أن
   يرافقه تغيير في مواضع الاستعمال. */
const ALLOWED = ["VITE_PUSH_VAPID_PUBLIC_KEY", "VITE_FIREBASE_CONFIG_JSON"];

test("مواضع استعمال import.meta.env في الشيفرة محصورة في المتغيرات المسموحة", async () => {
  const sources = {
    "app.js": "../client/src/js/app.js",
    "firebase-sync.js": "../client/src/js/firebase-sync.js",
    "firebase-backup.js": "../client/src/js/firebase-backup.js",
    "install-gate.js": "../client/src/js/install-gate.js",
    "main.js": "../client/src/main.js",
  };
  const used = new Set();
  for (const [label, rel] of Object.entries(sources)) {
    const source = await readFile(new URL(rel, import.meta.url), "utf8");
    for (const match of source.matchAll(/import\.meta\.env\??\.([A-Z_]+)/g)) used.add(match[1]);
    // DEV وPROD من مفاتيح فيت القياسية ولا تحمل بيانات نشر
    assert.doesNotMatch(
      source,
      /import\.meta\.env\??\.VITE_VERCEL/,
      `${label} يستعمل متغير Vercel مباشرةً`,
    );
  }
  const custom = [...used].filter((key) => key.startsWith("VITE_"));
  assert.deepEqual(
    custom.sort(),
    [...ALLOWED].sort(),
    "قائمة المتغيرات المستعملة تغيّرت — حدّث ALLOWED_ENV_KEYS في vite.config.ts وهذه القائمة معًا",
  );
});

test("vite.config.ts يعرّف كل متغير مسموح على حده", () => {
  assert.match(viteConfig, /const ALLOWED_ENV_KEYS = \["VITE_PUSH_VAPID_PUBLIC_KEY", "VITE_FIREBASE_CONFIG_JSON"\];/, "قائمة ALLOWED_ENV_KEYS تغيّرت أو فُقدت");
  assert.match(viteConfig, /exposed\[`import\.meta\.env\.\$\{key\}`\] = JSON\.stringify\(process\.env\[key\] \?\? ""\);/, "التعريف لكل مفتاح على حده مفقود");
  assert.match(viteConfig, /define: definePublicEnv\(\),/, "define لا يستعمل دالة التصفية");
});

test("لا يقع في الفخّين المجرَّبين", () => {
  // الفخ الأول: تعريف الكائن كاملًا — فيت يحقن متغيراته داخله فلا تمنع التسريب.
  assert.doesNotMatch(viteConfig, /"import\.meta\.env":/, "عاد تعريف كائن import.meta.env كاملًا — هذا لا يمنع حقن فيت لمتغيرات Vercel");
  // الفخ الثاني: إفراغ envPrefix — يمنع تحميل .env فيُسقط المتغيرين المسموحين صامتًا.
  assert.doesNotMatch(viteConfig, /envPrefix:\s*\[\s*\]/, "envPrefix مُفرَغ — سيسقط VITE_FIREBASE_CONFIG_JSON وVITE_PUSH_VAPID_PUBLIC_KEY من الحزمة");
});

test("لا متغيرات Vercel في أي مصدر يُشحن", async () => {
  const files = [
    "../client/index.html",
    "../client/src/style.css",
    "../client/src/main.js",
    "../client/src/js/app.js",
    "../client/src/js/pdf-export.js",
    "../client/src/js/firebase-sync.js",
    "../client/src/js/firebase-backup.js",
  ];
  for (const rel of files) {
    const source = await readFile(new URL(rel, import.meta.url), "utf8");
    assert.doesNotMatch(source, /VITE_VERCEL/, `${rel} يشير إلى متغيرات Vercel`);
  }
});
