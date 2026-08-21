export const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const invoiceNumber = (sequence) => `INV-${String(sequence).padStart(6, "0")}`;

export const stockStatus = (quantity, minimumStock) => {
  if (toNumber(quantity) <= 0) return "نافد";
  if (toNumber(quantity) <= toNumber(minimumStock)) return "منخفض";
  return "متوفر";
};

export const canSell = (available, requested) =>
  toNumber(requested) > 0 && toNumber(requested) <= toNumber(available);

export const adjustmentDelta = (previousQuantity, newQuantity) =>
  toNumber(newQuantity) - toNumber(previousQuantity);

export const calculateSaleTotals = (items, discount = 0) => {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + toNumber(item.unitPrice) * toNumber(item.quantity), 0),
  );
  const safeDiscount = Math.min(Math.max(roundMoney(discount), 0), subtotal);
  return { subtotal, discount: safeDiscount, total: roundMoney(subtotal - safeDiscount) };
};

export const dateKey = (date = new Date()) => {
  const local = new Date(date);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
};

export const nowIso = () => new Date().toISOString();
