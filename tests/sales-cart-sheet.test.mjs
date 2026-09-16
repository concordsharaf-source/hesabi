/**
 * اختبار سلة البيع في صفحة المبيعات (الهاتف): السلة تجلس في نهاية الصفحة ويصل إليها
 * التمرير كأي قسم عادي، وشريط ثابت أسفل الشاشة يعرض إجمالي الفاتورة بالخط الرقمي
 * الكبير ويقفز إلى السلة عند الضغط. كل Assertions على المصدر.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appJs = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
const salesMarkup = appJs.slice(appJs.indexOf("function salesMarkup() {"), appJs.indexOf("\nfunction cartLine(line) {"));
const barBlock = /\/\* ===== سلة البيع داخل صفحة المبيعات[\s\S]*?(?=\n\/\* =====|$)/.exec(css)?.[0] || "";

assert.ok(salesMarkup.length > 900, "تعذّر استخراج salesMarkup من app.js");
assert.ok(barBlock.length > 300, "تعذّر استخراج بلوك شريط الإجمالي من style.css");

test("لا بقايا من الورقة السفلية القديمة: السلة صارت داخل تدفّق الصفحة", () => {
  assert.doesNotMatch(appJs, /salesSheet|SALES_SHEET|commitSalesSheet|applySalesSheetGeometry|installSalesSheetGestures/, "بقايا منطق الورقة القديمة في app.js");
  assert.doesNotMatch(css, /is-sheet-mobile|is-sales-sheet|cart-sheet__handle|--sales-sheet-h/, "بقايا CSS للورقة القديمة");
  assert.doesNotMatch(salesMarkup, /toggle-sales-sheet|close-sales-sheet|cart-sheet__grip/, "قالب المبيعات ما زال يرسم مقبض الورقة");
  // السلة عنصر عادي بمعرّف يُقفز إليه
  assert.match(salesMarkup, /<aside class="cart-panel" id="sales-cart" data-cart-empty=/, "السلة ليست عنصرًا عاديًا بمعرّف sales-cart");
});

test("شريط الإجمالي الثابت: يظهر في صفحة المبيعات فقط ويعرض الإجمالي بالخط الرقمي", () => {
  assert.match(salesMarkup, /class="sales-total-bar" role="group"/, "لا شريط إجمالي في قالب المبيعات");
  assert.match(salesMarkup, /sales-total-bar__jump" type="button" data-action="scroll-to-cart"/, "زر الانتقال إلى السلة مفقود من الشريط");
  assert.match(salesMarkup, /data-sales-total-bar dir="ltr">\$\{money\(totals\.subtotal\)\}/, "الشريط لا يعرض إجمالي السلة");
  // مخفي افتراضيًا ويُفعّل فقط حين تكون صفحة المبيعات هي المعروضة
  assert.match(css, /\.sales-total-bar \{ display: none; \}/, "الشريط ليس مخفيًا افتراضيًا خارج صفحة المبيعات");
  assert.match(barBlock, /html\.is-sales-page \.sales-total-bar \{\n  position: fixed;/, "الشريط ليس مثبّتًا أسفل الشاشة");
  assert.match(appJs, /classList\.toggle\("is-sales-page", state\.view === "sales"\)/, "طبقة is-sales-page لا تُدار مع كل رسم — الشريط سيبقى بعد مغادرة المبيعات");
  // الخط الرقمي نفسه المستخدم في السلة وبحجم كبير واضح
  assert.match(barBlock, /\.sales-total-bar__value \{[^}]*font-family: "DS-Digital", "Courier New", monospace;[^}]*font-size: clamp\(32px, 9vw, 46px\)/, "أرقام الشريط ليست بخط DS-Digital الكبير");
  assert.match(barBlock, /font-variant-numeric: tabular-nums/, "أرقام الشريط غير ثابتة العرض — ستهتز مع كل تحديث");
});

test("هندسة الشريط: فوق شريط التنقّل، تحت أزرار الطبقات العائمة، ولا يغطي آخر الصفحة", () => {
  // شريط التنقّل السفلي ارتفاعه 74px وطبقته 20 — الشريط يجلس فوقه مباشرة وبطبقة أعلى بواحدة
  assert.match(barBlock, /bottom: 74px;/, "الشريط لا يجلس فوق شريط التنقّل السفلي");
  const z = Number(/html\.is-sales-page \.sales-total-bar \{[\s\S]*?z-index: (\d+);/.exec(barBlock)?.[1] || 0);
  assert.ok(z > 20, `طبقة الشريط (${z}) تحت شريط التنقّل (20)`);
  assert.ok(z < 31, `طبقة الشريط (${z}) فوق الزر العائم (31) — تتعارض الطبقات`);
  // الهاتف فقط: من 600px تظهر السلة عمودًا جانبيًا لاصقًا
  assert.match(barBlock, /@media \(min-width: 600px\) \{ html\.is-sales-page \.sales-total-bar \{ display: none; \} \}/, "الشريط يظهر على الحاسوب حيث السلة لاصقة جانبًا");
  // متّسع أسفل الصفحة كي لا يغطي الشريطُ آخرَ الأقسام، والزر العائم «بيع» يُخفى داخل صفحته
  assert.match(barBlock, /html\.is-sales-page \.workspace \{ padding-bottom: calc\(\d+px \+ env\(safe-area-inset-bottom\)\); \}/, "لا متّسع أسفل الصفحة — الشريط يغطي زر إتمام البيع");
  assert.match(barBlock, /html\.is-sales-page \.sales-scanner-fab \{ display: none; \}/, "الزر العائم «بيع» يزاحم الشريط داخل صفحة المبيعات");
  // مدخل الماسح في شريط بحث المبيعات يبقى (الإخفاء يخصّ الزر العائم وحده)
  assert.match(salesMarkup, /data-action="open-scanner" data-mode="sale"/, "لا مدخل مسح في صفحة المبيعات بعد إخفاء الزر العائم");
});

test("الضغط على الشريط يقفز إلى السلة أسفل الصفحة بلا أي أثر محاسبي", () => {
  assert.match(appJs, /if \(action === "scroll-to-cart"\) \{ root\.querySelector\("#sales-cart"\)\?\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\); return; \}/, "إجراء scroll-to-cart مفقود أو تغيّر");
  const handler = /if \(action === "scroll-to-cart"\)[^\n]*/.exec(appJs)[0];
  assert.doesNotMatch(handler, /state\.cart|db\.|render/, "إجراء القفز إلى السلة يلمس الحالة أو القاعدة أو يعيد الرسم");
});

test("لا قفزة إلى أعلى الصفحة: تصيير يحفظ الموضع للسلة وخانات الطي", () => {
  const helper = appJs.slice(appJs.indexOf("function renderKeepingScroll() {"), appJs.indexOf("function render() {"));
  assert.ok(helper.length > 250 && helper.length < 1400, "تعذّر استخراج renderKeepingScroll");
  assert.match(helper, /const y = Math\.round\(window\.scrollY \|\| document\.documentElement\.scrollTop \|\| 0\);/, "موضع النافذة لا يُؤخذ قبل التصيير");
  assert.match(helper, /window\.scrollTo\(x, y\)/, "موضع النافذة لا يُعاد");
  assert.match(helper, /querySelector\("\.cart-lines"\)\?\.scrollTop \|\| 0/, "تمرير قائمة الأسطر داخل السلة لا يُحفظ");
  assert.match(helper, /list\.scrollTop = innerTop/, "قائمة الأسطر تعود لأعلى القائمة مع كل ضغطة");
  const cartStart = appJs.indexOf("function changeCart(productId, delta) {");
  const cart = appJs.slice(cartStart, appJs.indexOf("\n}\n", cartStart) + 3);
  assert.match(cart, /renderKeepingScroll\(\)/, "الضغط على + أو − يعيد التصيير الكامل ويهدر موضع المستخدم");
  assert.doesNotMatch(cart, /[^a-zA-Z]render\(\)/, "changeCart ما زال يستدعي render مباشرة");
  assert.match(appJs, /if \(action === "cart-remove"\)[\s\S]{0,200}renderKeepingScroll\(\)/, "حذف سطر يعيد التصيير بقفزة للأعلى");
  const add = appJs.slice(appJs.indexOf("function addToCart("), appJs.indexOf("function addToCart(") + 1600);
  assert.match(add, /renderKeepingScroll\(\)/, "إضافة منتج من منتصف القائمة تُرجع المستخدم إلى أعلاها");
});

test("أرقام السلة بالخط الرقمي كما كانت: الإجمالي وزر الدفع", () => {
  assert.match(css, /@font-face[\s\S]{0,180}font-family: "DS-Digital"[\s\S]{0,180}ds-digital\.woff/);
  assert.match(css, /\[data-cart-subtotal\][\s\S]{0,240}font-size: clamp\(26px, 4vw, 38px\)[\s\S]{0,160}font-family: "DS-Digital"/);
  assert.match(css, /\.checkout-launch[\s\S]{0,260}font-family: "DS-Digital"/);
});

test("سلة البيع على الشاشات الواسعة لاصقة والإجمالي لا يغيب مع التمرير", () => {
  assert.match(css, /\.cart-panel \{ position:sticky/, "السلة لم تعد لاصقة على الشاشات الواسعة");
  assert.match(css, /\.cart-panel \.cart-lines \{ flex:1 1 auto; min-height:0; overflow-y:auto/, "قائمة الأسطر لا تتمرّر داخل السلة اللاصقة");
});
