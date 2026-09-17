/* حارس مصطلحات: واجهات المستخدم والمستندات تعرض «نوع الكمية» بدل «عبوة» في التسميات.
   قيم الوحدات المخزنة (قوائم الوحدات) تبقى كما هي حفاظًا على سلامة البيانات القديمة. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const FORBIDDEN_LABELS = ["نوع العبوة", "سعر العبوة", "بالعبوة", "العبوات:", "عدد العبوات", "حبات/عبوة"];
const SOURCES = [
  "client/src/js/app.js",
  "client/src/js/pdf-export.js",
  "client/src/js/purchase-invoice-print.js",
  "client/src/js/barcode-file.js",
  "client/src/js/database.js",
];

test("لا تظهر تسميات العبوة القديمة في ملفات الواجهة والمستندات", () => {
  for (const rel of SOURCES) {
    const src = read(rel);
    for (const label of FORBIDDEN_LABELS) {
      assert.ok(!src.includes(label), `${rel} ما زال يحتوي التسمية القديمة: ${label}`);
    }
  }
});

test("التسمية الجديدة «نوع الكمية» موجودة في المواضع الرئيسية", () => {
  assert.ok(read("client/src/js/app.js").includes("نوع الكمية"), "نوع الكمية في app.js");
  assert.ok(read("client/src/js/pdf-export.js").includes("نوع الكمية"), "نوع الكمية في pdf-export.js");
  assert.ok(read("client/src/js/purchase-invoice-print.js") !== "" && !read("client/src/js/purchase-invoice-print.js").includes("|| \"عبوة\""), "لا سقوط حرًا لكلمة عبوة في قالب فاتورة الشراء");
  assert.ok(read("client/src/js/barcode-file.js").includes("نوع الكمية"), "نوع الكمية في أعمدة Excel");
});

test("قيم الوحدات المخزنة دون تغيير: عبوة تبقى وحدة صالحة في القوائم", () => {
  assert.ok(read("client/src/js/constants.js").includes("\"عبوة\""), "وحدة عبوة باقية في قوائم القطاعات");
  assert.ok(read("client/src/js/database.js").includes("\"عبوة\""), "وحدة عبوة باقية في PRODUCT_UNITS");
});
