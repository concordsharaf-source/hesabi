import test from "node:test";
import assert from "node:assert/strict";
import { getExitGuardAction, leaveAfterExitConfirmation } from "../client/src/js/navigation-guard.js";

test("يختار حارس الرجوع نافذة التأكيد أو إغلاق النافذة أو السماح بالخروج المقصود", () => {
  assert.equal(getExitGuardAction(), "confirm-exit");
  assert.equal(getExitGuardAction({ hasOpenOverlay: true }), "close-overlay");
  assert.equal(getExitGuardAction({ exitAllowed: true }), "allow-exit");
});

test("اختيار نعم للخروج ينفذ رجوعًا فوريًا ثم رجوعًا مؤجلًا للسماح بمغادرة التطبيق", () => {
  let backCalls = 0;
  let scheduled;
  leaveAfterExitConfirmation(
    () => { backCalls += 1; },
    (callback, delay) => { scheduled = { callback, delay }; },
  );
  assert.equal(backCalls, 1);
  assert.equal(scheduled.delay, 70);
  scheduled.callback();
  assert.equal(backCalls, 2);
});
