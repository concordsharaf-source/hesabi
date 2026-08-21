package com.hesabi.app.domain

import com.hesabi.app.data.dao.ProductDao
import com.hesabi.app.data.dao.SaleDao
import com.hesabi.app.data.dao.SaleReturnDao
import com.hesabi.app.data.dao.StockMovementDao
import com.hesabi.app.domain.model.MovementType
import com.hesabi.app.domain.model.SaleReturn
import com.hesabi.app.domain.model.SaleReturnItem
import com.hesabi.app.domain.model.StockMovement
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * نتيجة مرتجع البيع.
 */
sealed class SaleReturnResult {
    data class Success(val saleReturn: SaleReturn, val invoiceNumber: String) : SaleReturnResult()
    data class Failure(val message: String) : SaleReturnResult()
}

/**
 * بند مرتجع البيع — مرجع لبند الفاتورة الأصلية + الكمية المرتجعة الآن.
 */
data class SaleReturnItemInput(
    val saleItemId: Long,
    val productId: Long?,
    val productName: String,
    val quantity: Double,
    val unit: String,
    /** سعر الوحدة وقت المرتجع بوحدة العملة الصغرى */
    val unitPrice: Long
)

/**
 * محرك مرتجع البيع:
 * 1. التحقق من وجود فاتورة البيع
 * 2. حساب الكمية القابلة للإرجاع لكل بند = المباعة − المرتجعة سابقًا
 * 3. التحقق من الكميات المدخلة
 * 4. زيادة المخزون (حركة SALE_RETURN)
 * 5. إنشاء المرتجع + بنوده، وتسجيل المبلغ المسترد للعميل
 * رقم متسلسل SR-000001
 */
class SaleReturnUseCase(
    private val saleDao: SaleDao,
    private val saleReturnDao: SaleReturnDao,
    private val productDao: ProductDao,
    private val movementDao: StockMovementDao
) {
    private val mutex = Mutex()

    /**
     * الكمية القابلة للإرجاع من بند بيع معين:
     * الكمية المباعة − مجموع المرتجع سابقًا من هذا البند.
     */
    suspend fun returnableQuantity(saleItemId: Long): Double {
        val item = saleDao.getItemById(saleItemId) ?: return 0.0
        val returned = saleReturnDao.sumReturnedForItem(saleItemId)
        return (item.quantity - returned).coerceAtLeast(0.0)
    }

    suspend fun execute(
        saleId: Long,
        items: List<SaleReturnItemInput>,
        note: String?
    ): SaleReturnResult {
        return mutex.withLock {
            val sale = saleDao.getById(saleId)
                ?: return@withLock SaleReturnResult.Failure("فاتورة البيع غير موجودة")

            val validItems = items.filter { it.quantity > 0 }
            if (validItems.isEmpty()) {
                return@withLock SaleReturnResult.Failure("حدد بندًا واحدًا على الأقل بكمية أكبر من صفر")
            }

            // التحقق من الكميات القابلة للإرجاع
            for (item in validItems) {
                val returnable = returnableQuantity(item.saleItemId)
                if (item.quantity > returnable) {
                    return@withLock SaleReturnResult.Failure(
                        "${item.productName}: الكمية المرتجعة (${item.quantity}) أكبر من القابلة للإرجاع ($returnable)"
                    )
                }
            }

            val now = System.currentTimeMillis()
            val invoiceNumber = String.format("SR-%06d", saleReturnDao.maxInvoiceSequence() + 1)
            val totalRefunded = validItems.sumOf { it.unitPrice * it.quantity.toLong() }

            val returnId = saleReturnDao.insert(
                SaleReturn(
                    invoiceNumber = invoiceNumber,
                    saleId = saleId,
                    date = now,
                    totalRefunded = totalRefunded,
                    note = note
                )
            )

            val movements = mutableListOf<StockMovement>()
            try {
                validItems.forEach { item ->
                    saleReturnDao.insertItems(
                        listOf(
                            SaleReturnItem(
                                saleReturnId = returnId,
                                saleItemId = item.saleItemId,
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
                            val newQuantity = previous + item.quantity
                            productDao.setQuantity(productId, newQuantity, now)
                            movements.add(
                                StockMovement(
                                    productId = productId,
                                    type = MovementType.SALE_RETURN,
                                    quantity = item.quantity,
                                    previousQuantity = previous,
                                    newQuantity = newQuantity,
                                    cost = item.unitPrice,
                                    referenceId = returnId,
                                    date = now,
                                    note = "مرتجع بيع $invoiceNumber"
                                )
                            )
                        }
                    }
                }
                movementDao.insertAll(movements)
                val saved = saleReturnDao.getById(returnId)
                    ?: return@withLock SaleReturnResult.Success(
                        SaleReturn(
                            id = returnId,
                            invoiceNumber = invoiceNumber,
                            saleId = saleId,
                            date = now,
                            totalRefunded = totalRefunded,
                            note = note
                        ),
                        invoiceNumber
                    )
                return@withLock SaleReturnResult.Success(saved, invoiceNumber)
            } catch (e: Exception) {
                return@withLock SaleReturnResult.Failure(
                    "فشل إتمام مرتجع البيع: ${e.message ?: "خطأ غير معروف"}"
                )
            }
        }
    }
}
