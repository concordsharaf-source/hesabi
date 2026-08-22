/* اتجاه التصميم: دفتر التاجر الهادئ — حسابات مالية ومخزنية صريحة قابلة للاختبار. */
export const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const roundMoney = (value) => Math.round(toNumber(value) * 100) / 100;
export const invoiceNumber = (sequence) => `INV-${String(sequence).padStart(6, "0")}`;
export const purchaseNumber = (sequence) => `PUR-${String(sequence).padStart(6, "0")}`;
export const saleReturnNumber = (sequence) => `SRT-${String(sequence).padStart(6, "0")}`;
export const purchaseReturnNumber = (sequence) => `PRT-${String(sequence).padStart(6, "0")}`;

export const stockStatus = (quantity, minimumStock) => {
  if (toNumber(quantity) <= 0) return "نافد";
  if (toNumber(quantity) <= toNumber(minimumStock)) return "منخفض";
  return "متوفر";
};

export const canSell = (available, requested) => toNumber(requested) > 0 && toNumber(requested) <= toNumber(available);
export const canReturn = (original, alreadyReturned, requested) => toNumber(requested) > 0 && toNumber(requested) <= toNumber(original) - toNumber(alreadyReturned);
export const adjustmentDelta = (previousQuantity, newQuantity) => toNumber(newQuantity) - toNumber(previousQuantity);

export const calculateSaleTotals = (items, discount = 0) => {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + toNumber(item.unitPrice) * toNumber(item.quantity), 0));
  const safeDiscount = Math.min(Math.max(roundMoney(discount), 0), subtotal);
  return { subtotal, discount: safeDiscount, total: roundMoney(subtotal - safeDiscount) };
};

export const calculatePurchaseTotals = (items) => roundMoney(items.reduce((sum, item) => sum + toNumber(item.unitCost) * toNumber(item.quantity), 0));

export const remainingAmount = (total, paid) => roundMoney(Math.max(0, toNumber(total) - Math.min(Math.max(0, toNumber(paid)), toNumber(total))));
export const paymentStatus = (total, paid) => {
  const remaining = remainingAmount(total, paid);
  if (remaining === 0) return "مدفوعة";
  return toNumber(paid) > 0 ? "مدفوعة جزئيًا" : "غير مدفوعة";
};
export const canRegisterPayment = (balance, paid) => toNumber(paid) > 0 && toNumber(paid) <= toNumber(balance);

export const calculateCashBalance = ({
  openingBalance = 0,
  cashSales = 0,
  customerPayments = 0,
  purchaseReturns = 0,
  deposits = 0,
  saleReturns = 0,
  cashPurchases = 0,
  supplierPayments = 0,
  expenses = 0,
  withdrawals = 0,
} = {}) => {
  const inflows = roundMoney(toNumber(openingBalance) + toNumber(cashSales) + toNumber(customerPayments) + toNumber(purchaseReturns) + toNumber(deposits));
  const outflows = roundMoney(toNumber(saleReturns) + toNumber(cashPurchases) + toNumber(supplierPayments) + toNumber(expenses) + toNumber(withdrawals));
  return { inflows, outflows, closingBalance: roundMoney(inflows - outflows) };
};

export const calculateProfit = ({ sales = 0, costOfGoods = 0, expenses = 0, salesReturns = 0, returnCosts = 0 }) => {
  const netSales = roundMoney(toNumber(sales) - toNumber(salesReturns));
  const netCostOfGoods = roundMoney(toNumber(costOfGoods) - toNumber(returnCosts));
  const grossProfit = roundMoney(netSales - netCostOfGoods);
  return { netSales, netCostOfGoods, grossProfit, netProfit: roundMoney(grossProfit - toNumber(expenses)) };
};

export const dateKey = (date = new Date()) => {
  const local = new Date(date);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
};

export const isWithinDateRange = (value, from, to) => {
  const key = dateKey(value);
  return (!from || key >= from) && (!to || key <= to);
};

export const nowIso = () => new Date().toISOString();
