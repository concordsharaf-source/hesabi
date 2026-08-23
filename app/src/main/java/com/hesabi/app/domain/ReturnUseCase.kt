package com.hesabi.app.domain

import androidx.room.withTransaction
import com.hesabi.app.data.dao.CashMovementDao
import com.hesabi.app.data.dao.CustomerDao
import com.hesabi.app.data.dao.CustomerTransactionDao
import com.hesabi.app.data.dao.ProductDao
import com.hesabi.app.data.dao.PurchaseDao
import com.hesabi.app.data.dao.PurchaseReturnDao
import com.hesabi.app.data.dao.SaleDao
import com.hesabi.app.data.dao.SaleReturnDao
import com.hesabi.app.data.dao.StockMovementDao
import com.hesabi.app.data.dao.SupplierDao
import com.hesabi.app.data.dao.SupplierTransactionDao
import com.hesabi.app.data.db.AppDatabase
import com.hesabi.app.domain.model.CashMovement
import com.hesabi.app.domain.model.CashMovementType
import com.hesabi.app.domain.model.CustomerTransaction
import com.hesabi.app.domain.model.CustomerTransactionType
import com.hesabi.app.domain.model.MovementType
import com.hesabi.app.domain.model.SaleReturn
import com.hesabi.app.domain.model.SaleReturnItem
import com.hesabi.app.domain.model.StockMovement
import com.hesabi.app.domain.model.SupplierTransaction
import com.hesabi.app.domain.model.SupplierTransactionType
import com.hesabi.app.domain.model.PurchaseReturn
import com.hesabi.app.domain.model.PurchaseReturnItem

/**
 * UseCase لمعالجة مرتجعات البيع والشراء بشكل احترافي.
 * يضمن تحديث المخزون، الصندوق، ورصيد العميل/المورد.
 */
class ReturnUseCase(
    private val db: AppDatabase,
    private val saleDao: SaleDao,
    private val saleReturnDao: SaleReturnDao,
    private val purchaseDao: PurchaseDao,
    private val purchaseReturnDao: PurchaseReturnDao,
    private val productDao: ProductDao,
    private val stockMovementDao: StockMovementDao,
    private val cashMovementDao: CashMovementDao,
    private val customerDao: CustomerDao,
    private val customerTransactionDao: CustomerTransactionDao,
    private val supplierDao: SupplierDao,
    private val supplierTransactionDao: SupplierTransactionDao
) {

    /**
     * تنفيذ مرتجع بيع.
     * @param saleId معرف الفاتورة الأصلية
     * @param itemsToReturn قائمة البنود المراد إرجاعها (معرف بند البيع والكمية)
     * @param refundFromCashbox هل يتم رد المبلغ من الصندوق؟
     */
    suspend fun processSaleReturn(
        saleId: Long,
        itemsToReturn: List<Pair<Long, Double>>,
        refundFromCashbox: Boolean,
        note: String?
    ) = db.withTransaction {
        val sale = saleDao.getById(saleId) ?: return@withTransaction
        val now = System.currentTimeMillis()
        val invoiceNumber = String.format("SR-%06d", saleReturnDao.maxInvoiceSequence() + 1)

        var totalRefund = 0L
        val returnItems = mutableListOf<SaleReturnItem>()

        for ((itemId, qty) in itemsToReturn) {
            val saleItem = saleDao.getItemById(itemId) ?: continue
            val itemRefund = (saleItem.unitPrice * qty).toLong()
            totalRefund += itemRefund

            returnItems.add(
                SaleReturnItem(
                    saleReturnId = 0, // سيحدث بعد الإدراج
                    saleItemId = itemId,
                    productId = saleItem.productId,
                    productName = saleItem.productName,
                    quantity = qty,
                    unit = saleItem.unit,
                    unitPrice = saleItem.unitPrice,
                    itemTotal = itemRefund
                )
            )

            // 1. إعادة المنتج للمخزون
            saleItem.productId?.let { pid ->
                val product = productDao.getById(pid)
                if (product != null) {
                    val prevQty = product.quantity
                    val newQty = prevQty + qty
                    productDao.update(product.copy(quantity = newQty, updatedAt = now))

                    stockMovementDao.insert(
                        StockMovement(
                            productId = pid,
                            type = MovementType.SALE_RETURN,
                            quantity = qty,
                            previousQuantity = prevQty,
                            newQuantity = newQty,
                            cost = saleItem.costPrice,
                            referenceId = saleId,
                            date = now,
                            note = "مرتجع فاتورة $invoiceNumber"
                        )
                    )
                }
            }
        }

        // 2. حفظ رأس المرتجع
        val returnId = saleReturnDao.insert(
            SaleReturn(
                invoiceNumber = invoiceNumber,
                saleId = saleId,
                date = now,
                totalRefunded = totalRefund,
                note = note
            )
        )

        // 3. حفظ بنود المرتجع
        saleReturnDao.insertItems(returnItems.map { it.copy(saleReturnId = returnId) })

        // 4. معالجة المال
        if (refundFromCashbox) {
            cashMovementDao.insert(
                CashMovement(
                    amount = -totalRefund,
                    type = CashMovementType.ADJUSTMENT, // أو أضف SALE_RETURN للـ enum
                    description = "مرتجع بيع $invoiceNumber",
                    referenceId = returnId,
                    date = now
                )
            )
        } else if (sale.customerId != null) {
            // خصم من رصيد العميل (الدين)
            val customer = customerDao.getById(sale.customerId)
            if (customer != null) {
                customerDao.update(customer.copy(balance = customer.balance - totalRefund, updatedAt = now))
                customerTransactionDao.insert(
                    CustomerTransaction(
                        customerId = sale.customerId,
                        type = CustomerTransactionType.RETURN,
                        amount = -totalRefund,
                        paid = 0,
                        remaining = -totalRefund,
                        referenceId = returnId,
                        date = now,
                        notes = "مرتجع فاتورة $invoiceNumber"
                    )
                )
            }
        }
    }

    /**
     * تنفيذ مرتجع شراء.
     */
    suspend fun processPurchaseReturn(
        purchaseId: Long,
        itemsToReturn: List<Pair<Long, Double>>,
        returnToCashbox: Boolean,
        note: String?
    ) = db.withTransaction {
        val purchase = purchaseDao.getById(purchaseId) ?: return@withTransaction
        val now = System.currentTimeMillis()
        val invoiceNumber = String.format("PR-%06d", purchaseReturnDao.maxInvoiceSequence() + 1)

        var totalRefund = 0L
        val returnItems = mutableListOf<PurchaseReturnItem>()

        for ((itemId, qty) in itemsToReturn) {
            val purchaseItem = purchaseDao.getItemsByItemId(itemId) ?: continue
            val itemRefund = (purchaseItem.unitPrice * qty).toLong()
            totalRefund += itemRefund

            returnItems.add(
                PurchaseReturnItem(
                    purchaseReturnId = 0,
                    purchaseItemId = itemId,
                    productId = purchaseItem.productId,
                    productName = purchaseItem.productName,
                    quantity = qty,
                    unit = purchaseItem.unit,
                    unitPrice = purchaseItem.unitPrice,
                    itemTotal = itemRefund
                )
            )

            // 1. خصم المنتج من المخزون
            purchaseItem.productId?.let { pid ->
                val product = productDao.getById(pid)
                if (product != null) {
                    val prevQty = product.quantity
                    val newQty = (prevQty - qty).coerceAtLeast(0.0)
                    productDao.update(product.copy(quantity = newQty, updatedAt = now))

                    stockMovementDao.insert(
                        StockMovement(
                            productId = pid,
                            type = MovementType.PURCHASE_RETURN,
                            quantity = -qty,
                            previousQuantity = prevQty,
                            newQuantity = newQty,
                            cost = purchaseItem.unitPrice,
                            referenceId = purchaseId,
                            date = now,
                            note = "مرتجع شراء $invoiceNumber"
                        )
                    )
                }
            }
        }

        // 2. حفظ رأس المرتجع
        val returnId = purchaseReturnDao.insert(
            PurchaseReturn(
                invoiceNumber = invoiceNumber,
                purchaseId = purchaseId,
                date = now,
                totalRefunded = totalRefund,
                note = note
            )
        )

        // 3. حفظ بنود المرتجع
        purchaseReturnDao.insertItems(returnItems.map { it.copy(purchaseReturnId = returnId) })

        // 4. معالجة المال
        if (returnToCashbox) {
            cashMovementDao.insert(
                CashMovement(
                    amount = totalRefund,
                    type = CashMovementType.ADJUSTMENT, // أو أضف PURCHASE_RETURN للـ enum
                    description = "مرتجع شراء $invoiceNumber",
                    referenceId = returnId,
                    date = now
                )
            )
        } else if (purchase.supplierId != null) {
            // خصم من رصيد المورد (الدين الذي علينا له)
            val supplier = supplierDao.getById(purchase.supplierId)
            if (supplier != null) {
                supplierDao.updateBalance(supplier.id, supplier.balance - totalRefund, now)
                supplierTransactionDao.insert(
                    SupplierTransaction(
                        supplierId = purchase.supplierId,
                        type = SupplierTransactionType.RETURN,
                        amount = -totalRefund,
                        paid = 0,
                        remaining = -totalRefund,
                        referenceId = returnId,
                        date = now,
                        notes = "مرتجع شراء $invoiceNumber"
                    )
                )
            }
        }
    }
}
