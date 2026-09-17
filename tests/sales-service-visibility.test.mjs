/**
 * اختبارا طلبين في شاشة البيع:
 *
 * 1) خدمتا «شحن فوري» و«نقد مقابل تحويل» تظهران لنشاط البقالة والسوبرماركت فقط.
 *    هما النشاطان اللذان يبيعان رصيد اتصالات ويصرّفان الحوالات نقدًا للزبائن،
 *    بينما باقي الأنشطة (صيدلية، ملابس، جوالات، قطع غيار، مطعم، كافيه، متجر عام)
 *    لا تستفيد منهما فتُخفيان لتبقى شاشة البيع أخف.
 *
 * 2) الشريط السفلي الثابت يعرض إجمالي الفاتورة رقمًا وحده بلا رمز العملة، لأن
 *    مساحته ضيقة وخطه الرقمي كبير، والعملة تبقى ظاهرة في «إجمالي السلة» ونافذة
 *    إتمام البيع والفواتير والتقارير.
 *
 * الاختبارات ساكنة على نص الشيفرة (نمط بقية اختبارات القوالب في هذا المستودع):
 * تستخرج قالب salesMarkup وتفحص بنية الشروط لا مجرد وجود النصوص.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appJs = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");

/* قالب المبيعات وحده: من تعريف الدالة حتى بداية دالة cartLine. */
const salesMarkup = appJs.slice(appJs.indexOf("function salesMarkup() {"), appJs.indexOf("\nfunction cartLine(line) {"));
assert.ok(salesMarkup.length > 900, "تعذّر استخراج salesMarkup من app.js");

/* بلوك خانات الخدمات كما يُرسم فعلًا داخل القالب. */
const tilesBlock = salesMarkup.slice(
  salesMarkup.indexOf("${isPharmacy() || isGrocery()"),
  salesMarkup.indexOf('<div class="sale-matches">'),
);

test("isGrocery تشمل البقالة والسوبرماركت دون سواهما", () => {
  assert.match(
    appJs,
    /const isGrocery = \(\) => state\.settings\?\.businessType === "بقالة" \|\| state\.settings\?\.businessType === "سوبرماركت";/,
    "isGrocery لا تحصر النشاطين المطلوبين",
  );
});

test("خانتا الشحن والحوالة مربوطتان بشرط isGrocery لا معروضتان دائمًا", () => {
  assert.ok(tilesBlock.length > 200, "تعذّر استخراج بلوك خانات الخدمات — هل تغيّرت بنيته؟");
  assert.match(tilesBlock, /\$\{isGrocery\(\) \? `<button class="sales-service-tile sales-service-tile--topup"/, "خانة الشحن الفوري خارج شرط isGrocery");
  assert.match(tilesBlock, /data-service="instant-topup"/, "خانة الشحن الفوري مفقودة");
  assert.match(tilesBlock, /data-service="cash-transfer"/, "خانة نقد مقابل تحويل مفقودة");

  // الشرط يجب أن يغلّف الخانتين معًا: لا يظهر «شحن فوري» قبل فتح شرط isGrocery.
  const gateAt = tilesBlock.indexOf("${isGrocery() ? `");
  const topupAt = tilesBlock.indexOf('data-service="instant-topup"');
  const exchangeAt = tilesBlock.indexOf('data-service="cash-transfer"');
  assert.ok(gateAt > -1 && topupAt > gateAt, "خانة الشحن الفوري تسبق شرط isGrocery");
  assert.ok(exchangeAt > topupAt, "خانة نقد مقابل تحويل ليست بعد خانة الشحن");

  // الحاوية نفسها لا تُرسم فارغة لغير الصيدلية والبقالة، فتترك هامشًا سائبًا.
  assert.match(salesMarkup, /\$\{isPharmacy\(\) \|\| isGrocery\(\) \? `<div class="sales-service-tiles">/, "حاوية الخانات تُرسم حتى لو كانت فارغة");
});

test("خانة خدمات الصيدلية تبقى مستقلة عن شرط البقالة", () => {
  // الصيدلية ترى خانة «خدمات» وحدها بامتداد كامل، ولا ترى خانتَي الشحن والحوالة.
  assert.match(tilesBlock, /\$\{isPharmacy\(\) \? `<button class="sales-service-tile sales-service-tile--pharmacy"/, "خانة خدمات الصيدلية فقدت شرطها");
  const pharmacyAt = tilesBlock.indexOf("sales-service-tile--pharmacy");
  const gateAt = tilesBlock.indexOf("${isGrocery() ? `");
  assert.ok(pharmacyAt > -1 && pharmacyAt < gateAt, "ترتيب الخانات تغيّر: خدمات الصيدلية ثم خانتا البقالة");
});

test("addServiceLine ترفض الخدمتين لغير البقالة حتى لو وصلها الحدث", () => {
  const fn = appJs.slice(appJs.indexOf("function addServiceLine(serviceType)"), appJs.indexOf("function serviceCartLine(line)"));
  assert.ok(fn.length > 100, "تعذّر استخراج addServiceLine");
  assert.match(fn, /if \(!isGrocery\(\)\) \{ showToast\(/, "لا حارس من جهة المنطق — الإخفاء من جهة العرض وحده لا يكفي");
  // الحارس قبل الإضافة إلى السلة لا بعدها.
  const guardAt = fn.indexOf("if (!isGrocery())");
  const pushAt = fn.indexOf("state.cart.push(");
  assert.ok(guardAt > -1 && pushAt > guardAt, "الحارس يأتي بعد إضافة السطر إلى السلة");
});

test("الشريط السفلي يعرض الرقم بلا رمز العملة", () => {
  assert.match(salesMarkup, /const barTotal = money\(totals\.subtotal, \{ symbol: false \}\);/, "barTotal لا تُشتق من money بلا رمز");

  const barBlock = salesMarkup.slice(
    salesMarkup.indexOf('class="sales-total-bar"'),
    salesMarkup.indexOf('<section class="sales-bottom-action"'),
  );
  assert.ok(barBlock.length > 200, "تعذّر استخراج بلوك الشريط السفلي");
  assert.match(barBlock, /data-sales-total-bar dir="ltr">\$\{barTotal\}</, "قيمة الشريط لا تستخدم barTotal");
  assert.doesNotMatch(barBlock, />\$\{money\(/, "قيمة الشريط ما زالت تعرض رمز العملة");

  // money() نفسها ما زالت تُرجع العملة افتراضيًا حتى لا يتأثر أي موضع آخر.
  assert.match(appJs, /const money = \(value, \{ symbol = true \} = \{\}\) => \{/, "توقيع money تغيّر — الافتراضي يجب أن يبقى مع الرمز");
  assert.match(appJs, /return symbol \? `\$\{formatted\} \$\{currency\.symbol\}` : formatted;/, "money() لا تُرجع الرمز عند الافتراضي");

  // المواضع الأخرى في شاشة البيع تحتفظ بالعملة (إجمالي السلة ونافذة إتمام البيع).
  assert.match(salesMarkup, /data-cart-subtotal>\$\{money\(totals\.subtotal\)\}/, "إجمالي السلة فقد رمز العملة — المطلوب الشريط السفلي فقط");
  assert.match(appJs, /<span>الإجمالي النهائي<\/span><strong id="checkout-total">\$\{money\(initial\.total\)\}/, "نافذة إتمام البيع فقدت رمز العملة");
});
