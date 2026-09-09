import test from "node:test";
import assert from "node:assert/strict";
import { resolveSwipeTarget } from "../client/src/js/swipe-navigation.js";

const order = ["dashboard", "sales", "purchases", "products", "reports"];

test("السحب لليسار ينتقل إلى التالي في ترتيب الشريط (RTL)", () => {
  assert.equal(resolveSwipeTarget({ order, current: "sales", deltaX: -120, deltaY: 5 }), "purchases");
});

test("السحب لليمين ينتقل إلى السابق", () => {
  assert.equal(resolveSwipeTarget({ order, current: "sales", deltaX: 120, deltaY: 5 }), "dashboard");
});

test("يتوقف عند طرفي القائمة دون التفاف", () => {
  assert.equal(resolveSwipeTarget({ order, current: "dashboard", deltaX: 120, deltaY: 0 }), null);
  assert.equal(resolveSwipeTarget({ order, current: "reports", deltaX: -120, deltaY: 0 }), null);
});

test("يتجاهل السحب القصير أو الرأسي أو المائل", () => {
  assert.equal(resolveSwipeTarget({ order, current: "sales", deltaX: -30, deltaY: 4 }), null, "قصير");
  assert.equal(resolveSwipeTarget({ order, current: "sales", deltaX: -10, deltaY: 140 }), null, "رأسي");
  assert.equal(resolveSwipeTarget({ order, current: "sales", deltaX: -80, deltaY: 70 }), null, "مائل");
});

test("يتجاهل السحب البطيء جدًا", () => {
  assert.equal(resolveSwipeTarget({ order, current: "sales", deltaX: -150, deltaY: 5, durationMs: 1600 }), null);
});

test("يحترم الترتيب المخصص للمستخدم", () => {
  const custom = ["reports", "dashboard", "sales"];
  assert.equal(resolveSwipeTarget({ order: custom, current: "reports", deltaX: -100, deltaY: 0 }), "dashboard");
});

test("لا ينتقل إذا كانت الصفحة الحالية خارج الشريط", () => {
  assert.equal(resolveSwipeTarget({ order, current: "settings", deltaX: -120, deltaY: 0 }), null);
});
