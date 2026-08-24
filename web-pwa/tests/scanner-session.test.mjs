import test from "node:test";
import assert from "node:assert/strict";
import { BARCODE_RELEASE_DELAY_MS, CAMERA_SCAN_INTERVAL_MS, getCameraAssistOptions, getScannerCameraConstraints, isNewContinuousBarcode, shouldReleaseContinuousBarcode } from "../client/src/js/scanner-session.js";

test("يطلب الماسح الكاميرا الخلفية بدقة وإيقاع مناسبين للهواتف الضعيفة", () => {
  const constraints = getScannerCameraConstraints();
  assert.equal(constraints.audio, false);
  assert.equal(constraints.video.facingMode.ideal, "environment");
  assert.equal(constraints.video.width.ideal, 1280);
  assert.equal(constraints.video.height.ideal, 720);
  assert.equal(constraints.video.frameRate.ideal, 24);
  assert.ok(CAMERA_SCAN_INTERVAL_MS >= 80 && CAMERA_SCAN_INTERVAL_MS <= 200);
});

test("لا تظهر أدوات التكبير والإضاءة إلا حين تدعمها الكاميرا", () => {
  const full = getCameraAssistOptions({ zoom: { min: 1, max: 4, step: 0.25 }, torch: true, focusMode: ["continuous", "single-shot"] }, { zoom: 2 });
  assert.deepEqual(full, { canZoom: true, zoomMin: 1, zoomMax: 4, zoomStep: 0.25, zoomValue: 2, canUseTorch: true, canUseContinuousFocus: true });
  const basic = getCameraAssistOptions({}, {});
  assert.equal(basic.canZoom, false);
  assert.equal(basic.canUseTorch, false);
  assert.equal(basic.canUseContinuousFocus, false);
});

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
