/* كتالوج التقارير المرحّل من APK إلى Hesabi. يعتمد على بيانات Hesabi المحلية ولا يفتح اتصالًا خارجيًا. */
export const APK_REPORT_TYPES = [
  ["itemBalance", "أرصدة المخزون"],
  ["itemMovement", "حركة الأصناف"],
  ["revenueItem", "المبيعات حسب الصنف"],
  ["revenueCustomer", "المبيعات حسب العميل"],
  ["dailyDocuments", "الوثائق اليومية"],
  ["dailyTransactions", "العمليات اليومية"],
  ["moneyBalance", "حركة الصندوق"],
  ["accountsTotal", "إجمالي الحسابات"],
  ["accountBalance", "أرصدة الحسابات"],
  ["currency", "حركة العملات والتحويلات"],
];

const n = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const money = (helpers, value) => helpers.money(value);
const date = (helpers, value) => helpers.dateTime(value);
const inRange = (value, from, to) => {
  const key = String(value || "").slice(0, 10);
  return (!from || key >= from) && (!to || key <= to);
};

export function getApkReportRows(type, state, helpers) {
  const from = state.reportFrom || "";
  const to = state.reportTo || "";
  const sales = (state.sales || []).filter((item) => inRange(item.date, from, to));
  const purchases = (state.purchases || []).filter((item) => inRange(item.date, from, to));
  if (type === "itemBalance") return [["الصنف", "الباركود", "الكمية", "قيمة التكلفة"], ...(state.products || []).filter((item) => !item.isDeleted).map((item) => [item.name, item.barcode || "—", `${helpers.amount(item.quantity)} ${item.unit || ""}`.trim(), money(helpers, n(item.quantity) * n(item.purchasePrice))])];
  if (type === "itemMovement") return [["التاريخ", "الصنف", "نوع الحركة", "الكمية"], ...(state.stockMovements || []).filter((item) => inRange(item.date, from, to)).map((item) => [date(helpers, item.date), (state.products || []).find((p) => p.id === item.productId)?.name || "صنف محذوف", item.type || item.reason || "حركة مخزون", helpers.amount(item.quantity ?? item.delta ?? 0)])];
  if (type === "revenueItem") {
    const totals = new Map();
    sales.flatMap((sale) => sale.items || sale.lines || []).forEach((item) => { const key = item.productName || item.name || item.productId || "غير محدد"; const row = totals.get(key) || { quantity: 0, total: 0 }; row.quantity += n(item.quantity); row.total += n(item.total ?? n(item.unitPrice) * n(item.quantity)); totals.set(key, row); });
    return [["الصنف", "الكمية المباعة", "إجمالي المبيعات"], ...Array.from(totals, ([name, row]) => [name, helpers.amount(row.quantity), money(helpers, row.total)])];
  }
  if (type === "revenueCustomer") {
    const totals = new Map();
    sales.forEach((sale) => { const key = sale.customerName || "عميل نقدي"; totals.set(key, n(totals.get(key)) + n(sale.total)); });
    return [["العميل", "عدد الفواتير", "إجمالي المبيعات"], ...Array.from(totals, ([name, total]) => [name, String(sales.filter((sale) => (sale.customerName || "عميل نقدي") === name).length), money(helpers, total)])];
  }
  if (type === "dailyDocuments") return [["التاريخ", "فواتير البيع", "فواتير الشراء", "الإجمالي"], ...Array.from(new Set([...sales, ...purchases].map((item) => String(item.date || "").slice(0, 10)))).sort().map((day) => { const ss = sales.filter((item) => String(item.date).startsWith(day)); const pp = purchases.filter((item) => String(item.date).startsWith(day)); return [day, String(ss.length), String(pp.length), money(helpers, ss.reduce((sum, item) => sum + n(item.total), 0))]; })];
  if (type === "dailyTransactions") return [["التاريخ", "المصدر", "البيان", "المبلغ"], ...(state.cashMovements || []).filter((item) => inRange(item.date, from, to)).map((item) => [date(helpers, item.date), "الصندوق", item.notes || (item.type === "inflow" ? "وارد" : "صادر"), money(helpers, item.amount)])];
  if (type === "moneyBalance") return [["التاريخ", "البيان", "وارد", "صادر"], ...(state.cashMovements || []).filter((item) => inRange(item.date, from, to)).map((item) => [date(helpers, item.date), item.notes || "حركة صندوق", item.type === "inflow" ? money(helpers, item.amount) : "", item.type !== "inflow" ? money(helpers, item.amount) : ""]), ["", "الرصيد الختامي", "", money(helpers, state.cashbox?.closingBalance || 0)]];
  if (type === "accountsTotal") return [["نوع الحساب", "عدد الحسابات", "الرصيد"], ["العملاء", String((state.customers || []).length), money(helpers, (state.customers || []).reduce((sum, item) => sum + n(item.balance), 0))], ["الموردون", String((state.suppliers || []).length), money(helpers, (state.suppliers || []).reduce((sum, item) => sum + n(item.balance), 0))]];
  if (type === "accountBalance") return [["الحساب", "النوع", "الرصيد"], ...(state.customers || []).map((item) => [item.name, "عميل", money(helpers, item.balance)]), ...(state.suppliers || []).map((item) => [item.name, "مورد", money(helpers, item.balance)])];
  if (type === "currency") return [["التاريخ", "البيان", "القيمة"], ...(state.transferVaultDeposits || []).filter((item) => inRange(item.date, from, to)).map((item) => [date(helpers, item.date), item.notes || "تحويل", money(helpers, item.amount)])];
  return null;
}
