-- Migration: add cashierId and cashierName to invoices
ALTER TABLE invoices
  ADD COLUMN cashierId INT NULL,
  ADD COLUMN cashierName VARCHAR(255) NULL,
  ADD CONSTRAINT fk_invoices_cashier FOREIGN KEY (cashierId) REFERENCES users(id) ON DELETE SET NULL;
