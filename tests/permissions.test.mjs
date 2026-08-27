import test from "node:test";
import assert from "node:assert/strict";
import { canAccessView, canUseAction } from "../client/src/js/permissions.js";

const admin = { role: "admin" };
const cashier = { role: "cashier" };

test("يصل الأدمن إلى الشاشات الإدارية والمالية", () => {
  assert.equal(canAccessView(admin, "dashboard"), true);
  assert.equal(canAccessView(admin, "reports"), true);
  assert.equal(canAccessView(admin, "settings"), true);
  assert.equal(canAccessView(admin, "accounts"), true);
});

test("يقتصر الكاشير على المبيعات والفواتير", () => {
  assert.equal(canAccessView(cashier, "sales"), true);
  assert.equal(canAccessView(cashier, "invoices"), true);
  assert.equal(canAccessView(cashier, "dashboard"), false);
  assert.equal(canAccessView(cashier, "products"), false);
  assert.equal(canAccessView(cashier, "reports"), false);
});

test("يقيّد الرفع والاستعادة السحابية بالأدمن فقط", () => {
  const cloudActions = ["open-cloud-auth", "cloud-upload-backup", "cloud-refresh-backups", "cloud-restore-backup", "cloud-delete-backup", "cloud-signout"];
  for (const action of cloudActions) {
    assert.equal(canUseAction(admin, action), true, `admin should use ${action}`);
    assert.equal(canUseAction(cashier, action), false, `cashier should not use ${action}`);
  }
});

test("يمنع الكاشير من إنشاء المنتجات والتقارير وإدارة الحسابات", () => {
  assert.equal(canUseAction(cashier, "new-product"), false);
  assert.equal(canUseAction(cashier, "export-report"), false);
  assert.equal(canUseAction(cashier, "new-account"), false);
  assert.equal(canUseAction(cashier, "cloud-upload-backup"), false);
  assert.equal(canUseAction(cashier, "cloud-restore-backup"), false);
  assert.equal(canUseAction(cashier, "open-scanner", { mode: "product" }), false);
  assert.equal(canUseAction(cashier, "checkout"), true);
  assert.equal(canUseAction(cashier, "open-invoice"), true);
});

test("يحصر الجرد الدوري واعتماد لقطاته في الأدمن", () => {
  assert.equal(canAccessView(admin, "periodic-inventory"), true);
  assert.equal(canAccessView(cashier, "periodic-inventory"), false);
  assert.equal(canUseAction(admin, "save-periodic-inventory"), true);
  assert.equal(canUseAction(admin, "open-periodic-inventory"), true);
  assert.equal(canUseAction(cashier, "save-periodic-inventory"), false);
  assert.equal(canUseAction(cashier, "open-periodic-inventory"), false);
});
