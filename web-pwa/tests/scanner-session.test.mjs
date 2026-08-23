import test from "node:test";
import assert from "node:assert/strict";
import { BARCODE_RELEASE_DELAY_MS, isNewContinuousBarcode, shouldReleaseContinuousBarcode } from "../client/src/js/scanner-session.js";

test("يمنع المسح المتواصل من إضافة الباركود نفسه مرارًا قبل إبعاده عن إطار الكاميرا", () => {
  assert.equal(isNewContinuousBarcode("", "628100000001"), true);
  assert.equal(isNewContinuousBarcode("628100000001", "628100000001"), false);
  assert.equal(isNewContinuousBarcode("628100000001", "628100000002"), true);
  assert.equal(isNewContinuousBarcode("628100000001", ""), false);
});

test("لا يحرر رمز المسح المتواصل إلا بعد غيابه المستمر عن الكاميرا", () => {
  assert.equal(shouldReleaseContinuousBarcode("628100000001", 10_000, 10_000 + BARCODE_RELEASE_DELAY_MS - 1), false);
  assert.equal(shouldReleaseContinuousBarcode("628100000001", 10_000, 10_000 + BARCODE_RELEASE_DELAY_MS), true);
  assert.equal(shouldReleaseContinuousBarcode("", 10_000, 20_000), false);
});
