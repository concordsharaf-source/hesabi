-- Migration: fill cashierName from users when cashierId exists
UPDATE invoices i
JOIN users u ON i.cashierId = u.id
SET i.cashierName = u.name
WHERE i.cashierName IS NULL AND i.cashierId IS NOT NULL;
