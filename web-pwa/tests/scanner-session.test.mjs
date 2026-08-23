import test from "node:test";
import assert from "node:assert/strict";
import { isNewContinuousBarcode } from "../client/src/js/scanner-session.js";

test("يمنع المسح المتواصل من إضافة الباركود نفسه مرارًا قبل إبعاده عن إطار الكاميرا", () => {
  assert.equal(isNewContinuousBarcode("", "628100000001"), true);
  assert.equal(isNewContinuousBarcode("628100000001", "628100000001"), false);
  assert.equal(isNewContinuousBarcode("628100000001", "628100000002"), true);
  assert.equal(isNewContinuousBarcode("628100000001", ""), false);
});
