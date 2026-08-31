export const CASHIER_ALLOWED_VIEWS = new Set(["sales", "invoices"]);

export const ADMIN_ACTIONS = new Set([
  "new-product", "open-product", "adjust-stock", "count-stock", "new-customer", "open-customer", "edit-customer", "delete-customer", "record-customer-payment", "new-supplier", "open-supplier", "open-supplier-account", "delete-supplier", "new-supplier-payment", "record-supplier-payment", "new-purchase", "open-purchase", "purchase-return", "sale-return", "new-expense", "new-cashier-salary-advance", "edit-expense", "delete-expense", "open-stock-history", "open-reorder-list", "new-cash-deposit", "new-cash-withdrawal", "deposit-incoming-transfer", "transfer-cashier-shift", "deduct-cashier-shortages", "save-periodic-inventory", "open-periodic-inventory", "clear-store-logo", "export-backup", "open-cloud-auth", "cloud-upload-backup", "cloud-refresh-backups", "cloud-restore-backup", "cloud-delete-backup", "cloud-signout", "export-report", "reset-data", "new-account", "open-account", "reset-account-pin", "delete-cashier-account", "move-mobile-nav", "reset-mobile-nav",
]);

export const isAdmin = (user) => user?.role === "admin";
export const canAccessView = (user, view) => isAdmin(user) || CASHIER_ALLOWED_VIEWS.has(view);
export const canUseAction = (user, action, { mode = "" } = {}) => Boolean(user) && (isAdmin(user) || (!ADMIN_ACTIONS.has(action) && !(action === "open-scanner" && mode === "product")));
