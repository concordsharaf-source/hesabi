import test from "node:test";
import assert from "node:assert/strict";
import { isSecondBackPress } from "../client/src/js/navigation-guard.js";

test("يتطلب الخروج المقصود ضغط رجوع ثانٍ خلال مهلة التأكيد", () => {
  assert.equal(isSecondBackPress(12_000, 10_000), true);
  assert.equal(isSecondBackPress(10_000, 10_000), false);
  assert.equal(isSecondBackPress(9_999, 10_000), false);
});
