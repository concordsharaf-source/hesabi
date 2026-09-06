import { getDb } from "./db";
import { invoices } from "../drizzle/schema";
import type { InsertInvoice } from "../drizzle/schema";

/**
 * Create an invoice. If cashierId/cashierName not provided, fill from ctxUser when available.
 */
export async function createInvoice(data: Partial<InsertInvoice>, ctxUser?: { id?: number; name?: string }) {
  const payload: Partial<InsertInvoice> = { ...data };

  if (!payload.cashierId && ctxUser?.id) payload.cashierId = ctxUser.id as any;
  if (!payload.cashierName && ctxUser?.name) payload.cashierName = ctxUser.name as any;

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(invoices).values(payload as InsertInvoice);
  return result;
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(invoices).where(invoices.id.eq(id)).limit(1);
  return rows.length ? rows[0] : null;
}
