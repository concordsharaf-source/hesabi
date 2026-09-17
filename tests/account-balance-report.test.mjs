/* دلالات أرصدة الحسابات: الرصيد الموجب للعميل دينٌ عليه («عليه») لا له،
   والموجب للمورد مستحق له، وأعمدة مدينة/دائنة في «إجمالي الحسابات» من دفتر المحل. */
import test from "node:test";
import assert from "node:assert/strict";
import { getApkReportRows } from "../client/src/js/apk-report-catalog.js";

const helpers = { money: (v) => `M${v}`, amount: (v) => `A${v}`, dateTime: (v) => `D${v}` };
const state = {
  customers: [
    { name: "عميل مدين", phone: "777", address: "صنعاء", balance: 5000 },
    { name: "عميل له مقدم", phone: "778", address: "صنعاء", balance: -2000 },
    { name: "عميل متزن", phone: "779", address: "صنعاء", balance: 0 },
  ],
  suppliers: [
    { name: "مورد مستحق له", phone: "711", address: "صنعاء", balance: 7000 },
    { name: "مورد عليه مقدم", phone: "712", address: "صنعاء", balance: -1000 },
  ],
};

const rowOf = (rows, name) => rows.find((row) => row[1] === name);

test("حالة حساب العميل المدين: عليه رصيد مستحق لا له", () => {
  const rows = getApkReportRows("accountBalance", state, helpers);
  assert.equal(rowOf(rows, "عميل مدين")[5], "عليه رصيد مستحق");
  assert.equal(rowOf(rows, "عميل له مقدم")[5], "له رصيد دائن");
  assert.equal(rowOf(rows, "عميل متزن")[5], "متزن");
  assert.ok(!rows.some((row) => row[5] === "له رصيد مستحق"), "لا تظهر الحالة المعكوسة القديمة للعملاء");
});

test("حالة حساب المورد: الموجب مستحق له والسالب عليه", () => {
  const rows = getApkReportRows("accountBalance", state, helpers);
  assert.equal(rowOf(rows, "مورد مستحق له")[5], "مستحق له");
  assert.equal(rowOf(rows, "مورد عليه مقدم")[5], "عليه رصيد");
});

test("إجمالي الحسابات: أعمدة مدينة/دائنة من دفتر المحل للعملاء والموردين", () => {
  const rows = getApkReportRows("accountsTotal", state, helpers);
  const customersRow = rows.find((row) => row[0] === "العملاء");
  const suppliersRow = rows.find((row) => row[0] === "الموردون");
  /* العميل الموجب ذمم لنا (مدين) والسالب مقدم لنا (دائن) */
  assert.equal(customersRow[3], "M5000");
  assert.equal(customersRow[4], "M2000");
  /* المورد الموجب التزام علينا (دائن) والسالب مقدم له عندنا (مدين) */
  assert.equal(suppliersRow[3], "M1000");
  assert.equal(suppliersRow[4], "M7000");
});
