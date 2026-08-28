import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import * as invoicesService from "./invoices";
import { z } from "zod";

const createInvoiceSchema = z.object({
  number: z.string(),
  total: z.string(),
  customerName: z.string().optional(),
  cashierId: z.number().int().optional(),
  cashierName: z.string().optional(),
});

export const invoicesRouter = router({
  create: protectedProcedure
    .input(createInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      const created = await invoicesService.createInvoice(input as any, { id: ctx.user?.id, name: ctx.user?.name });
      return created;
    }),

  get: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      return await invoicesService.getInvoiceById(input.id);
    }),
});
