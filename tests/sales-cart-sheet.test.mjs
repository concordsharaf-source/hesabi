/**
 * اختبار ورقة سلة البيع في صفحة المبيعات (الهاتف): السلة مثبّتة في الأسفل وتُرفع بكامل الشاشة.
 * كل Assertions على المصدر: القياس المرئي الحقيقي (أين يقف زر الدفع، وهل الرفع يعمل بالإصبع)
 * يُختبَر في متصفح Chromium — سكربت التحقق مذكور في ملخص الجولة.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appJs = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
const sheet = appJs.slice(appJs.indexOf("/* ===== سلة البيع كورقة سفلية"), appJs.indexOf("const SALES_CATALOG_LIMIT"));
const salesMarkup = appJs.slice(appJs.indexOf("function salesMarkup() {"), appJs.indexOf("\nfunction cartLine(line) {"));

assert.ok(sheet.length > 900, "تعذّر استخراج طبقة الورقة من app.js");

test("الورقة شكل خالص: لا تكتب على السلة ولا تلمس الحسابات ولا تنتظر شيئًا", () => {
  assert.doesNotMatch(sheet, /state\.cart\s*=[^=]/, "طبقة الورقة تكتب على السلة");
  assert.doesNotMatch(sheet, /\bdb\.(save|create|update|delete|adjust)/, "طبقة الورقة تكتب في القاعدة");
  assert.doesNotMatch(sheet, /await |\.then\(/, "طبقة الورقة أصبحت غير متزامنة — يجب أن تبقى قياسًا فوريًا");
  assert.doesNotMatch(sheet, /dispatchEvent|showToast\(|calculateSaleTotals/, "طبقة الورقة تُطلق أحداثًا أو تعيد حساب الإجماليات");
  assert.match(sheet, /panel\.style\.setProperty\("--sales-sheet-h"/, "لم تعد الورقة تضبط ارتفاعها بخاصية CSS");
});

test("الحجم محسوب من شريط التنقّل الحقيقي لا من رقم ثابت، مع حالة فارغة أصغر", () => {
  assert.match(sheet, /querySelector\("\.bottom-nav"\)\?\.getBoundingClientRect\(\)\.height/, "ارتفاع الشريط السفلي مقروء من DOM");
  assert.match(sheet, /SALES_SHEET_PEEK_RATIO = 0\.46/, "النصف السفلي محجوز للسلة");
  assert.match(sheet, /SALES_SHEET_EMPTY_PEEK = \d+/, "السلة الفارغة تنكمّش لشريط");
  assert.match(sheet, /state\.cart\.length \? viewport \* SALES_SHEET_PEEK_RATIO : SALES_SHEET_EMPTY_PEEK/, "الاختيار بين الحجمين حسب السلة");
  assert.match(sheet, /Math\.min\(full, peek\)/, "peek لا يتجاوز ارتفاع الشاشة أبدًا");
  assert.match(sheet, /visualViewport\?\.height \|\| window\.innerHeight/, "قياس Viewport يعتمد dvh الفعلي (شريط كروم متغيّر)");
  // النقطتان الوحيدتان: التصاق بلا حالة وسطى، وحدّ أدنى يمنع اختفاء الزر
  assert.match(sheet, /const SALES_SHEET_SNAP = ([0-9.]+);/, "عتبة الالتصاق مفقودة");
  assert.ok(Number(/const SALES_SHEET_SNAP = ([0-9.]+);/.exec(sheet)[1]) > 0.2, "العتبة منخفضة جدًا فتُفتح السلة بلا قصد");
  assert.match(sheet, /const SALES_SHEET_FLICK = ([0-9.]+);/, "كشف الدفعة السريعة مفقود");
  assert.match(sheet, /Math\.max\(260, viewport - nav - SALES_SHEET_EDGE \* 2\)/, "الارتفاع الكامل لا يزاحم شريط التنقّل");
  assert.match(sheet, /Math\.max\(120,\s*bar,\s*Math\.round\(/, "الارتفاع المصغّر له حدّ أدنى مقيس فلا يختفي زر الدفع");
});

test("السحب من المقبض وحده — والنقرة تبقى تعمل", () => {
  assert.match(sheet, /closest\?\.\("\.cart-sheet__handle"\)/, "البداية ليست من المقبض فقط");
  assert.match(sheet, /event\.pointerType === "mouse"/, "السحب بالماوس معطّل (النقرة تتكفّل)");
  assert.match(sheet, /if \(drag\.moved < 8\) \{[\s\S]{0,120}applySalesSheetGeometry\(\);/, "النقرة تُفسَّر سحبًا — كان يجب تمريرها للزر");
  assert.match(sheet, /commitSalesSheet\(wantsFull \? "full" : "peek"\)/, "لا قرار التصاق عند التحرير");
  assert.match(sheet, /classList\.add\("is-dragging"\)/, "لا إلغاء للانتقال أثناء السحب");
  assert.match(sheet, /key === "Escape" && state\.salesSheet === "full"/, "Escape لا يُغلق الورقة");
  assert.match(sheet, /window\.addEventListener\("resize", onResize\)/, "لا إعادة قياس عند تغيّر الحجم");
  assert.match(sheet, /salesSheetGesturesInstalled/, "لا حماية من تكرار ربط المستمعات مع كل رسم");
});

test("لا إعادة رسم عند التبديل: الحالة تُطبَّق مباشرة وتبقى قائمة التمرير محفوظة", () => {
  const commit = sheet.slice(sheet.indexOf("function commitSalesSheet(mode) {"));
  const commitBody = commit.slice(0, commit.indexOf("\n}\n") + 3);
  assert.ok(commitBody.length > 300, "تعذّر استخراج جسم commitSalesSheet");
  assert.match(commitBody, /applySalesSheetGeometry\(\)/, "التبديل لا يطبّق الهندسة");
  assert.doesNotMatch(commitBody, /\brender\(\)/, "التبديل يعيد رسم الصفحة كله — يفقد موضع التمرير ويكسر الحركة");
  assert.doesNotMatch(commitBody, /await |setTimeout\(/, "التبديل صار غير متزامن");
  assert.match(sheet, /handle\.setAttribute\("aria-expanded"/, "حالة التوسّع لا تُبلّغ قارئ الشاشة");
  assert.match(appJs, /if \(action === "toggle-sales-sheet"\) \{ commitSalesSheet\(state\.salesSheet === "full" \? "peek" : "full"\); return; \}/, "زر المقبض غير موصول بالإجراء");
});

test("الوسوم: مقبض داخل اللوحة، ومُختبئ على الشاشات الأكبر", () => {
  assert.match(salesMarkup, /class="cart-panel cart-sheet"/, "اللوحة لم تعد تحمل هوية الورقة");
  assert.match(salesMarkup, /data-sheet="\$\{state\.salesSheet === "full" \? "full" : "peek"\}"/, "سمة الحالة مفقودة");
  assert.match(salesMarkup, /data-cart-empty="\$\{state\.cart\.length \? "0" : "1"\}"/, "سمة السلة الفارغة مفقودة");
  assert.match(salesMarkup, /class="cart-sheet__handle" type="button" data-action="toggle-sales-sheet"/, "المقبض ليس زرًا حقيقيًا");
  assert.match(salesMarkup, /aria-label="\$\{state\.salesSheet === "full" \? "تصغير سلة البيع"/, "المقبض بلا وسم مقروء");
  assert.match(salesMarkup, /<span class="cart-sheet__grip" aria-hidden="true">/, "المقبض البصري يزدحم على قارئ الشاشة");
});

test("CSS: الطبقة fixة فوق شريط التنقّل، وحصرها في الكلاس لا في الوسائط", () => {
  assert.match(css, /\.cart-sheet__handle \{\n\s*display: none;/, "المقبض ظاهر على سطح المكتب");
  const panel = /\/\* ===== سلة البيع كورقة سفلية[\s\S]*$/.exec(css)?.[0] || "";
  assert.ok(panel.length > 900, "لم يُعثر على كتلة CSS الخاصة بالورقة");
  assert.match(panel, /\.cart-sheet\.is-sheet-mobile \{\n\s*position: fixed;/, "الورقة ليست مثبتة");
  assert.match(panel, /bottom: calc\(var\(--sales-sheet-nav, 0px\) \+ 8px \+ env\(safe-area-inset-bottom\)\);/, "الورقة تزاحم شريط التنقّل أو الأمان السفلي");
  assert.match(panel, /height: var\(--sales-sheet-h, 46vh\);\n\s*height: var\(--sales-sheet-h, 46svh\);/, "لا تسلسل احتياطي لـ svh (webview قديم)");
  assert.match(panel, /min-height: 0;/, "min-height:380px القديم يمنع انكماش السلة الفارغة");
  assert.match(panel, /\.cart-sheet\.is-sheet-mobile\.is-dragging \{ transition: none; \}/, "لا تعطيل للانتقال أثناء السحب ⇒ حركة متقطّعة");
  assert.match(panel, /overscroll-behavior: contain;/, "تمرير قائمة السلة سيمرّر الصفحة خلفها");
  assert.match(panel, /\[data-cart-empty="1"\]\[data-sheet="peek"\] \.cart-lines \{ display: none; \}/, "السلة الفارغة لا تنكمش فعلًا");
  assert.match(panel, /html\.is-sales-sheet-open body \{ overflow: hidden; \}/, "الصفحة تتمرّر خلف الورقة المفتوحة");
  assert.match(panel, /html\.is-sales-sheet-mobile \.sales-layout \{ padding-bottom: var\(--sales-sheet-reserve, 0px\); \}/, "لا حجز لمساحة السلة أسفل القائمة");
  assert.match(panel, /font-size: 10px;\n\s*font-weight: 800;/, "تسميات المقبض ليست بخط الواجهة نفسه");
});

test("أرضية peek مقيسة من DOM: الإجمالي وزر الدفع لا يُقصّان أبدًا", () => {
  const bar = sheet.slice(sheet.indexOf("function salesSheetBarHeight"));
  const barBody = bar.slice(0, bar.indexOf("\n}\n") + 3);
  assert.match(barBody, /\.cart-sheet__handle[\s\S]*\.cart-panel__head[\s\S]*\.cart-total/, "أرضية الارتفاع يجب أن تجمع المقبض والرأس والإجمالي");
  assert.match(barBody, /offsetHeight/, "الأرضية لا تُقاس من DOM");
  assert.match(barBody, /pad \+ shown\.reduce\(\(sum, height\) => sum \+ height, 0\)/, "الأرضية لا تجمع ارتفاعات الأجزاء المقاسة");
  const geo = sheet.slice(sheet.indexOf("function salesSheetGeometry"), sheet.indexOf("function applySalesSheetGeometry"));
  assert.match(geo, /Math\.max\(120,\s*bar/, "peek لا يحترم الأرضية المقيسة");
  assert.match(geo, /salesSheetBarHeight\(/, "الهندسة لا تسأل عن الأرضية");
  // أثناء السحب لا يجوز أن ينزل الحد عن الأرضية، وإلا قُصّ الإجمالي في منتصف الحركة
  const gestures = sheet.slice(sheet.indexOf("function installSalesSheetGestures"));
  assert.match(gestures, /salesSheetGeometry\(panel\)/, "حدود السحب تُحسب بلا اللوحة نفسها");
});

test("لا انزلاق في التخطيط الأكبر: لا قاعدة وسائط تُفعّل الورقة على الحاسوب", () => {
  const block = /\/\* ===== سلة البيع كورقة سفلية[\s\S]*$/.exec(css)[0];
  assert.doesNotMatch(block, /@media \((?:max|min)-width/, "ورقة الهاتف مفُعّلة بوسائط عرض — تتعارض مع عمود السلة الجانبي من 600px");
  assert.match(appJs, /window\.matchMedia\?\.\("\(max-width: 599px\)"\)\.matches/, "البوابة الوحيدة ليست مطابقة عرض الهاتف");
});
