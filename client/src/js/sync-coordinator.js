import { diffBackupPayloads, mergeRemoteChanges } from "./sync-domain.js";
import { getCloudDeviceIdentity, pushSyncOperation, watchSyncOperations } from "./firebase-sync.js";

const MUTATING_METHODS = new Set([
  "saveSettings", "saveStoreLogoDataUrl", "createAccount", "updateAccount", "changeAccountPin", "resetAccountPinByAdmin",
  "createProduct", "updateProduct", "softDeleteProduct", "adjustStock", "createSupplier", "updateSupplier", "softDeleteSupplier",
  "createPurchase", "createPurchaseReturn", "createSale", "createSaleReturn", "createExpense", "updateExpense", "deleteExpense",
  "createCustomer", "updateCustomer", "softDeleteCustomer", "createCustomerPayment", "createSupplierPayment", "createCashMovement",
  "startCashierShift", "closeCashierShift", "transferCashierShiftToVault", "deductCashierShortage", "savePeriodicInventory", "depositIncomingTransferToVault",
]);

let installed = false;
let unsubscribe = null;
let beforePayload = null;
let applyingRemote = false;

export async function installSyncCoordinator(db, { onStatus = () => {}, onRemoteApplied = () => {} } = {}) {
  if (!installed) {
    installed = true;
    for (const method of MUTATING_METHODS) {
      if (typeof db[method] !== "function") continue;
      const original = db[method].bind(db);
      db[method] = async (...args) => {
        if (applyingRemote) return original(...args);
        const before = await db.exportBackup();
        const result = await original(...args);
        try {
          const after = await db.exportBackup();
          beforePayload = after;
          for (const change of diffBackupPayloads(before, after)) await pushSyncOperation(change);
        } catch (error) {
          onStatus("pending");
          console.warn("[Hesabi sync queue]", error);
        }
        return result;
      };
    }
  }
  const identity = await getCloudDeviceIdentity();
  if (!identity || identity.revokedAt) { onStatus("local"); return () => {}; }
  if (unsubscribe) unsubscribe();
  beforePayload ||= await db.exportBackup();
  unsubscribe = await watchSyncOperations(async (change) => {
    if (!beforePayload) beforePayload = await db.exportBackup();
    const merged = mergeRemoteChanges(beforePayload, [change]);
    applyingRemote = true;
    try { await db.restoreBackup(merged); beforePayload = merged; onRemoteApplied(change); }
    finally { applyingRemote = false; }
  }, onStatus);
  return () => { if (unsubscribe) unsubscribe(); unsubscribe = null; };
}

export function resetSyncCoordinator() { if (unsubscribe) unsubscribe(); unsubscribe = null; beforePayload = null; installed = false; }
