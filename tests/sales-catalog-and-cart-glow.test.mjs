/* يضمن حد قائمة المبيعات (40 صنفًا على الأقل) وتوهّج الأصناف المضافة للسلة،
   وأن الترتيب يعتمد على الأحدث بيعًا ثم الأكثر مبيعًا دون لمس منطق الحسابات. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appJs = await readFile(new URL("../client/src/js/app.js", import.meta.url), "utf8");
const css = await readFile(new URL("../client/src/style.css", import.meta.url), "utf8");
const salesMarkup = appJs.slice(appJs.indexOf("function salesMarkup() {"), appJs.indexOf("\nfunction cartLine(line) {"));

test("قائمة المبيعات تعرض 40 صنفًا على الأقل وترتّبها بالأحدث ثم الأكثر مبيعًا", () => {
  const limit = Number(appJs.match(/const SALES_CATALOG_LIMIT = (\d+);/)?.[1]);
  assert.ok(Number.isInteger(limit) && limit >= 40, `الحد يجب أن يكون 40 فأكثر، الحالي ${limit}`);
  assert.match(appJs, /\.slice\(0, SALES_CATALOG_LIMIT\)/, "يجب تطبيق الحد على نتائج المبيعات بدل رقم ثابت");
  assert.doesNotMatch(salesMarkup, /\.slice\(0, 7\)/, "عاد حد السبعة الأصناف القديم");
  assert.match(appJs, /function salesRankedProducts\(\)/, "ترتيب الأصناف يجب أن يكون في دالة مستقلة");
  assert.match(appJs, /if \(a\.lastSoldAt !== b\.lastSoldAt\) return a\.lastSoldAt < b\.lastSoldAt \? 1 : -1;/, "الأحدث بيعًا أولًا");
  assert.match(appJs, /if \(a\.sold !== b\.sold\) return b\.sold - a\.sold;/, "ثم الأكثر مبيعًا بالكمية");
  // الترتيب يقرأ فقط مما هو محمّل أصلًا في state — لا عملية قاعدة بيانات جديدة
  assert.doesNotMatch(appJs.slice(appJs.indexOf("function salesRankedProducts"), appJs.indexOf("function salesMarkup")), /db\.|await /, "الدالة يجب أن تكون نقية بلا I/O");
  // عند غياب سجل المبيعات يجب أن يسقط بأمان لكل المنتجات لا لقائمة فارغة
  assert.match(appJs, /if \(!Array\.isArray\(key\) \|\| !key\.length\) return products;/, "بدون سجل مبيعات تُعرض كل المنتجات");
});

test("الصنف المضاف للسلة الحالية يظهر حوله توهج ولا يختفي من القائمة", () => {
  assert.match(salesMarkup, /const cartProductIds = new Set\(state\.cart\.map\(\(line\) => line\.productId\)\);/, "مجموعة أصناف السلة");
  assert.match(salesMarkup, /inCart \? "is-in-cart"/, "الكلاس يُربط بوجود الصنف في السلة");
  assert.match(salesMarkup, /aria-pressed="\$\{inCart\}"/, "حالة الضغط معلَمة لقارئ الشاشة");
  assert.match(salesMarkup, /cartProductIds\.has\(product\.id\) && !shown\.has\(product\.id\)/, "الصنف المضاف يُدرج ولو كان خارج الحد");
  assert.match(css, /\.sale-product\.is-in-cart \{[^}]*box-shadow:/, "التوهج مرسوم بـ box-shadow");
  assert.match(css, /animation:hesabiCartHalo/, "نبض التوهج بطيء وخفيف");
  assert.match(css, /@keyframes hesabiCartHalo \{[\s\S]*?from \{ box-shadow:[\s\S]*?\} to \{ box-shadow:/, "التوهج يتنفس بين حالتين");
  assert.match(css, /\[data-theme="dark"\] \.sale-product\.is-in-cart/, "الوضع الداكن مغطى");
});

test("الترتيب محجوب عند البحث والتوهج لا يتعارض مع الوميض عند الإضافة", () => {
  assert.match(salesMarkup, /\.filter\(\(product\) => !query \|\|/, "البحث يبقى مطبّقًا قبل القطع");
  assert.match(salesMarkup, /if \(!query && matches\.length && cartProductIds\.size\) \{/, "إدراج أصناف السلة يعمل في وضع التصفح فقط");
  assert.match(salesMarkup, /\$\{isFlash \? "is-flash-added" : ""\}/, "وميض الإضافة الأصلي لم يُزل");
});
