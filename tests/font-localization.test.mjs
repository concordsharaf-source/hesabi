/**
 * توطين الخطوط: لا اعتماد على نطاقات خارجية في الخط.
 *
 * السبب عملي لا جمالي: التطبيق يُستخدم من اليمن، وخطوط جوجل قد تكون بطيئة أو غير
 * قابلة للوصول، وكان فشل التحميل يُسقط الواجهة والطباعة إلى Tahoma/Arial — أي أن
 * شكل الفاتورة المطبوعة كان رهين اتصال خارجي.
 *
 * ما يُختبر هنا:
 * 1) لا مرجع لـfonts.googleapis.com أو fonts.gstatic.com في أي مصدر يُشحن.
 * 2) ملف الخط المحلي موجود وبنيته صحيحة (خط متغيّر بمجموعتين فرعيتين).
 * 3) index.html يحمّل الخط محليًا بلا preconnect خارجي.
 * 4) وحدة font-assets تعمل في Node (بلا document) وفي المتصفح معًا.
 * 5) قوالب الطباعة الأربعة تحقن رابط الخط المطلق لا مسارًا نسبيًا.
 */
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const EXTERNAL_FONT_HOSTS = /fonts\.googleapis\.com|fonts\.gstatic\.com/;

const read = (rel) => readFile(new URL(rel, import.meta.url), "utf8");

const indexHtml = await read("../client/index.html");
const styleCss = await read("../client/src/style.css");
const fontAssets = await read("../client/src/js/font-assets.js");
const cairoCss = await read("../client/public/fonts/cairo.css");

const printModules = {
  "فاتورة حرارية": "../client/src/js/invoice-print.js",
  "كشف حساب العميل": "../client/src/js/customer-account-print.js",
  "فاتورة شراء": "../client/src/js/purchase-invoice-print.js",
  "التقارير الرسمية": "../client/src/js/report-template.js",
};

test("لا مرجع لخطوط خارجية في أي مصدر يُشحن", async () => {
  assert.doesNotMatch(indexHtml, EXTERNAL_FONT_HOSTS, "index.html ما زال يستورد خطوط جوجل");
  // style.css يذكر النطاق في تعليق يشرح السبب، فلا نفحص نصه بل نفحص أنه لا يستورده.
  assert.doesNotMatch(styleCss, /@import\s+url\(\s*["']?https?:/, "style.css ما زال يستورد CSS خارجيًا");

  for (const [label, rel] of Object.entries(printModules)) {
    const source = await read(rel);
    assert.doesNotMatch(source, EXTERNAL_FONT_HOSTS, `قالب ${label} ما زال يستورد خطوط جوجل`);
  }

  const pdfExport = await read("../client/src/js/pdf-export.js");
  assert.doesNotMatch(pdfExport, EXTERNAL_FONT_HOSTS, "pdf-export.js يشير إلى خطوط خارجية");
});

test("ملفا الخط المحليان موجودان وبنيتهما woff2 سليمة", async () => {
  const arabic = /url\("\/fonts\/(cairo-var-arabic_[0-9a-f]{8}\.woff2)"\)/.exec(cairoCss);
  const latin = /url\("\/fonts\/(cairo-var-latin_[0-9a-f]{8}\.woff2)"\)/.exec(cairoCss);
  assert.ok(arabic, "لا إعلان لمجموعة Cairo العربية في cairo.css");
  assert.ok(latin, "لا إعلان لمجموعة Cairo اللاتينية في cairo.css");

  for (const [, file] of [arabic, latin]) {
    const info = await stat(new URL(`../client/public/fonts/${file}`, import.meta.url));
    assert.ok(info.size > 10_000, `${file} أصغر من أن يكون خطًا كاملًا (${info.size} بايت)`);
    const bytes = await readFile(new URL(`../client/public/fonts/${file}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString("latin1"), "wOF2", `${file} ليس بصيغة woff2`);
  }

  // خط متغيّر: مدى أوزان واحد يغطي كل الأوزان المستخدمة (400–900) بدل ملف لكل وزن.
  const weights = cairoCss.match(/font-weight:\s*100 900/g) || [];
  assert.equal(weights.length, 2, "يجب إعلان مدى الأوزان 100 900 مرتين (عربية + لاتينية)");
  assert.doesNotMatch(cairoCss, /font-weight:\s*(400|500|600|700|800|900)\s*;/, "إعلان وزن منفرد يُلغي فائدة الخط المتغيّر");

  // unicode-range هو ما يبقي المتصفح ينزّل مجموعة واحدة فقط.
  assert.match(cairoCss, /unicode-range:\s*U\+0600-06FF/, "المجموعة العربية بلا نطاق U+0600-06FF");
  assert.match(cairoCss, /unicode-range:\s*U\+0000-00FF/, "المجموعة اللاتينية بلا نطاق أساسي");
  assert.match(cairoCss, /font-display:\s*swap/g, "بلا font-display: swap سيحجب النص حتى تحميل الخط");
});

test("index.html يحمّل الخط محليًا وبلا preconnect خارجي", () => {
  assert.match(indexHtml, /<link href="\.\/fonts\/cairo\.css" rel="stylesheet" \/>/, "رابط الخط المحلي مفقود");
  assert.doesNotMatch(indexHtml, /<link rel="preconnect"/, "بقي preconnect لنطاق خارجي لم يعد مستخدمًا");
});

test("style.css لا يستورد الخط خارجيًا (index.html يتكفل به)", () => {
  assert.doesNotMatch(styleCss, /@import/, "style.css ما زال فيه @import — التحميل مزدوج مع index.html");
  assert.match(styleCss, /font-family:"Cairo", sans-serif/, "تعريف عائلة الخط في :root تغيّر");
});

test("font-assets تعمل في Node بلا document وترجع مسارًا من الجذر", async () => {
  assert.equal(typeof globalThis.document, "undefined", "الافتراض أن الاختبار يعمل بلا document لم يعد قائمًا");
  const { CAIRO_FONT_CSS_URL, NOTO_NASKH_ARABIC_FONT_URL } = await import("../client/src/js/font-assets.js");
  assert.equal(CAIRO_FONT_CSS_URL, "/fonts/cairo.css");
  assert.equal(NOTO_NASKH_ARABIC_FONT_URL, "/assets/NotoNaskhArabic-Regular_2c8d8205.ttf");
  assert.match(fontAssets, /typeof document !== "undefined" && document\.baseURI/, "الحارس من غياب document مفقود — سيسقط الاستيراد في Node");
});

test("قوالب الطباعة تحقن رابط الخط المطلق لا مسارًا نسبيًا", async () => {
  for (const [label, rel] of Object.entries(printModules)) {
    const source = await read(rel);
    assert.match(source, /import \{ CAIRO_FONT_CSS_URL \} from "\.\/font-assets\.js";/, `قالب ${label} لا يستورد رابط الخط`);
    assert.match(source, /@import url\("\$\{CAIRO_FONT_CSS_URL\}"\);/, `قالب ${label} لا يحقن الرابط في @import`);
  }
});

test("الخط يُحلّ مطلقًا في المستند المنفصل: سبب استعمال document.baseURI", () => {
  // نوافذ الطباعة about:blank وiframe srcdoc لا تحلّ المسارات النسبية ضد التطبيق،
  // لذلك الرابط المطلق شرط لا تفضيل. نفحص أن pdf-export يستعمل الوحدة نفسها.
  assert.match(fontAssets, /new URL\(path, document\.baseURI\)\.href/, "الحل المطلق عبر document.baseURI مفقود");
  return read("../client/src/js/pdf-export.js").then((pdfExport) => {
    assert.match(pdfExport, /import \{ NOTO_NASKH_ARABIC_FONT_URL \} from "\.\/font-assets\.js";/, "pdf-export.js لم يعد يستعمل الوحدة الموحّدة");
    assert.match(pdfExport, /const PDF_ARABIC_FONT_URL = NOTO_NASKH_ARABIC_FONT_URL;/, "تعريف خط PDF المحلي تغيّر");
    assert.doesNotMatch(pdfExport, /new URL\("assets\/NotoNaskhArabic/, "بقي تعريف مكرر لخط PDF خارج الوحدة");
  });
});

test("قالب كشف الحساب المُنتَج يحوي رابط الخط المحلي فعلًا", async () => {
  const { renderCustomerAccountHtml } = await import("../client/src/js/customer-account-print.js");
  const html = renderCustomerAccountHtml({
    account: { customer: { name: "أحمد العميل", phone: "777123456", address: "صنعاء" }, totalSales: 80, totalPaid: 40, balance: 40, transactions: [] },
    storeName: "بقالة الاختبار", formatMoney: (value) => `${value} ر.ي`, formatDateTime: () => "23 أغسطس 2026", escapeHtml: (value) => String(value),
  });
  assert.match(html, /@import url\("\/fonts\/cairo\.css"\)/, "الخط المحلي لم يُحقن في HTML المطبوع");
  assert.doesNotMatch(html, EXTERNAL_FONT_HOSTS, "HTML المطبوع ما زال يشير إلى خطوط خارجية");
});
