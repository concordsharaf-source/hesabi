package com.hesabi.app.domain

import com.hesabi.app.data.dao.ProductDao
import com.hesabi.app.data.dao.PurchaseDao
import com.hesabi.app.data.dao.PurchaseReturnDao
import com.hesabi.app.data.dao.StockMovementDao
import com.hesabi.app.domain.model.MovementType
import com.hesabi.app.domain.model.PurchaseReturn
import com.hesabi.app.domain.model.PurchaseReturnItem
import com.hesabi.app.domain.model.StockMovement
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * نتيجة مرتجع الشراء.
 */
sealed class PurchaseReturnResult {
    data class Success(val purchaseReturn: PurchaseReturn, val invoiceNumber: String) : PurchaseReturnResult()
    data class Failure(val message: String) : PurchaseReturnResult()
}

/**
 * بند المرتجع — مرجع لبند الشراء الأصلي + الكمية المرتجعة الآن.
 */
data class PurchaseReturnItemInput(
    val purchaseItemId: Long,
    val productId: Long?,
    val productName: String,
    val quantity: Double,
    val unit: String,
    /** سعر الوحدة وقت المرتجع بوحدة العملة الصغرى */
    val unitPrice: Long
)

/**
 * محرك مرتجع الشراء:
 * 1. التحقق من وجود فاتورة الشراء
 * 2. حساب الكمية القابلة للرجوع لكل بند = المشتراة − المرتجعة سابقًا
 * 3. التحقق من الكميات المدخلة
 * 4. خصم المخزون (حركة PURCHASE_RETURN)
 * 5. إنشاء مرتجع + بنوده، وتسجيل المبلغ المسترد
 * رقم متسلسل PURR-000001
 */
class PurchaseReturnUseCase(
    private val purchaseDao: PurchaseDao,
    private val purchaseReturnDao: PurchaseReturnDao,
    private val productDao: ProductDao,
    private val movementDao: StockMovementDao
) {
    private val mutex = Mutex()

    /**
     * الكمية القابلة للرجوع من بند شراء معين:
     * الكمية المشتراة − مجموع المرتجع سابقًا من هذا البند.
     */
    suspend fun returnableQuantity(purchaseItemId: Long): Double {
        val item = purchaseDao.getItemsByItemId(purchaseItemId) ?: return 0.0
        val returned = purchaseReturnDao.sumReturnedForItem(purchaseItemId)
        return (item.quantity - returned).coerceAtLeast(0.0)
    }

    suspend fun execute(
        purchaseId: Long,
        items: List<PurchaseReturnItemInput>,
        note: String?
    ): PurchaseReturnResult {
        return mutex.withLock {
            val purchase = purchaseDao.getById(purchaseId)
                ?: return@withLock PurchaseReturnResult.Failure("فاتورة الشراء غير موجودة")

            val validItems = items.filter { it.quantity > 0 }
            if (validItems.isEmpty()) {
                return@withLock PurchaseReturnResult.Failure("حدد بندًا واحدًا على الأقل بكمية أكبر من صفر")
            }

            // التحقق من الكميات القابلة للرجوع
            for (item in validItems) {
                val returnable = returnableQuantity(item.purchaseItemId)
                if (item.quantity > returnable) {
                    return@withLock PurchaseReturnResult.Failure(
                        "${item.productName}: الكمية المرتجعة (${item.quantity}) أكبر من القابلة للرجوع ($returnable)"
                    )
                }
            }

            val now = System.currentTimeMillis()
            val invoiceNumber = String.format("PURR-%06d", purchaseReturnDao.maxInvoiceSequence() + 1)
            val totalRefunded = validItems.sumOf { it.unitPrice * it.quantity.toLong() }

            val returnId = purchaseReturnDao.insert(
                PurchaseReturn(
                    invoiceNumber = invoiceNumber,
                    purchaseId = purchaseId,
                    supplierId = purchase.supplierId,
                    date = now,
                    totalRefunded = totalRefunded,
                    note = note
                )
            )

            val movements = mutableListOf<StockMovement>()
            try {
                validItems.forEach { item ->
                    purchaseReturnDao.insertItems(
                        listOf(
                            PurchaseReturnItem(
                                purchaseReturnId = returnId,
                                purchaseItemId = item.purchaseItemId,
                                productId = item.productId,
                                productName = item.productName,
                                quantity = item.quantity,
                                unit = item.unit,
                                unitPrice = item.unitPrice,
                                itemTotal = item.unitPrice * item.quantity.toLong()
                            )
                        )
                    )

                    item.productId?.let { productId ->
                        val current = productDao.getById(productId)
                        if (current != null) {
                            val previous = current.quantity
                            val newQuantity = (previous - item.quantity).coerceAtLeast(0.0)
                            productDao.decreaseQuantity(productId, item.quantity, now)
                            movements.add(
                                StockMovement(
                                    productId = productId,
                                    type = MovementType.PURCHASE_RETURN,
                                    quantity = -item.quantity,
                                    previousQuantity = previous,
                                    newQuantity = newQuantity,
                                    cost = item.unitPrice,
                                    referenceId = returnId,
                                    date = now,
                                    note = "مرتجع شراء $invoiceNumber"
                                )
                            )
                        }
                    }
                }
                movementDao.insertAll(movements)
                val saved = purchaseReturnDao.getById(returnId)
                    ?: return@withLock PurchaseReturnResult.Success(
                        PurchaseReturn(
                            id = returnId,
                            invoiceNumber = invoiceNumber,
                            purchaseId = purchaseId,
                            supplierId = purchase.supplierId,
                            date = now,
                            totalRefunded = totalRefunded,
                            note = note
                        ),
                        invoiceNumber
                    )
                return@withLock PurchaseReturnResult.Success(saved, invoiceNumber)
            } catch (e: Exception) {
                return@withLock PurchaseReturnResult.Failure(
                    "فشل إتمام مرتجع الشراء: ${e.message ?: "خطأ غير معروف"}"
                )
            }
        }
    }
}
