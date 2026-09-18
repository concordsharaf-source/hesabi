/* جِلد الديسكتوب: طابع برامج سطح المكتب للخانات والقوائم المنسدلة والنوافذ والخط الرسمي. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.resolve(import.meta.dirname, "../client/src/style.css"), "utf8");
const skin = css.slice(css.indexOf("برامج سطح المكتب"));

test("الجلد محصور بالديسكتوب ويوحّد ارتفاع الخانات وزواياها المربعة", () => {
  assert.match(skin, /@media \(min-width: 960px\)/, "نقطة كسر الديسكتوب");
  assert.match(skin, /--desk-h: 30px/, "ارتفاع موحّد للخانات والأزرار");
  assert.match(skin, /--desk-rad: 3px/, "زوايا مربعة صغيرة");
  assert.match(skin, /input, select, textarea \{[^}]*border: 1px solid var\(--desk-line-strong\)/, "إطار رمادي واضح للخانات");
});

test("القوائم المنسدلة بشكل ComboBox رسمي بسهم مرسوم", () => {
  assert.match(skin, /select \{[^}]*appearance: none/, "إلغاء الشكل الافتراضي");
  assert.match(skin, /background-image:[\s\S]{0,200}?data:image\/svg\+xml[\s\S]{0,200}?M1 1l4 4 4-4/, "سهم القائمة مرسوم");
  assert.match(skin, /:root\[data-theme="dark"\] select/, "نسخة داكنة للسهم");
});

test("الحوارات نوافذ برنامج بترويسة مسطحة والخط الرسمي Cairo في عناصر التحكم", () => {
  assert.match(skin, /\.dialog__head \{[^}]*background: var\(--desk-head\)/, "ترويسة نافذة مسطحة");
  assert.match(skin, /button, input, select, textarea, \.button, \.icon-button, \.nav-item \{\s*font-family: "Cairo"/, "الخط الرسمي صراحةً");
});
