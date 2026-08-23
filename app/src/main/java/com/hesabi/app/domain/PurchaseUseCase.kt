package com.hesabi.app.domain

import com.hesabi.app.data.dao.ProductDao
import com.hesabi.app.data.dao.PurchaseDao
import com.hesabi.app.data.dao.StockMovementDao
import com.hesabi.app.domain.model.MovementType
import com.hesabi.app.domain.model.Product
import com.hesabi.app.domain.model.Purchase
import com.hesabi.app.data.dao.CashMovementDao
import com.hesabi.app.data.dao.SupplierDao
import com.hesabi.app.domain.model.CashMovement
import com.hesabi.app.domain.model.CashMovementType
import com.hesabi.app.domain.model.PurchaseItem
import com.hesabi.app.domain.model.PurchasePaymentType
import com.hesabi.app.domain.model.StockMovement
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * نتيجة إتمام فاتورة الشراء.
 */
sealed class PurchaseResult {
    data class Success(val purchase: Purchase, val invoiceNumber: String) : PurchaseResult()
    data class Failure(val message: String) : PurchaseResult()
}

/**
 * مدخلات فاتورة الشراء — قائمة بنود (منتج + كمية + سعر شراء).
 */
data class PurchaseItemInput(
    val productId: Long?,
    val productName: String,
    val barcode: String?,
    val quantity: Double,
    val unit: String,
    /** سعر الشراء للوحدة بوحدة العملة الصغرى */
    val unitPrice: Long
)

/**
 * محرك إتمام فاتورة الشراء — داخل Mutex واحد:
 * 1. التحقق من البنود والكميات
 * 2. إنشاء فاتورة شراء + بنودها (Snapshot)
 * 3. زيادة المخزون وتسجيل حركة PURCHASE لكل منتج
 * 4. تحديث متوسط تكلفة الشراء بـ المتوسط المرجح:
 *    avgCost = (التكلفة القديمة × الكمية القديمة + تكلفة الدفعة الجديدة) / الكمية الإجمالية
 * 5. رقم متسلسل PUR-000001
 */
class PurchaseUseCase(
    private val productDao: ProductDao,
    private val purchaseDao: PurchaseDao,
    private val movementDao: StockMovementDao,
    private val cashMovementDao: CashMovementDao,
    private val supplierDao: SupplierDao,
    private val supplierTransactionDao: com.hesabi.app.data.dao.SupplierTransactionDao
) {
    private val mutex = Mutex()

    suspend fun execute(
        items: List<PurchaseItemInput>,
        supplierId: Long?,
        note: String?,
        paidAmount: Long = 0L,
        remaining: Long = 0L,
        paymentType: PurchasePaymentType = PurchasePaymentType.CASH_BOX
    ): PurchaseResult {
        return mutex.withLock {
            val validItems = items.filter { it.quantity > 0 && it.unitPrice >= 0L }
            if (validItems.isEmpty()) {
                return@withLock PurchaseResult.Failure("أضف بندًا واحدًا على الأقل بكمية وسعر صالحين")
            }

            val now = System.currentTimeMillis()

            // قراءة المنتجات الحالية داخل القفل
            val currentProducts = validItems.mapNotNull { item ->
                item.productId?.let { productDao.getById(it) }
            }
            // المنتجات غير الموجودة في DB (أضيفت لأول مرة عبر فاتورة شراء مباشرة)
            val missingProductIds = validItems
                .mapNotNull { it.productId }
                .filter { id -> currentProducts.none { it.id == id } }

            if (missingProductIds.isNotEmpty()) {
                return@withLock PurchaseResult.Failure("بعض المنتجات غير موجودة في قاعدة البيانات")
            }

            // التحقق: كلفة موجبة لكل بند صالح
            val invalidPrices = validItems.filter { it.unitPrice <= 0L }
            if (invalidPrices.isNotEmpty()) {
                return@withLock PurchaseResult.Failure("سعر الشراء يجب أن يكون أكبر من صفر")
            }

            // إنشاء فاتورة الشراء
            val invoiceNumber = String.format("PUR-%06d", purchaseDao.maxInvoiceSequence() + 1)
            val subtotal = validItems.sumOf { (it.unitPrice * it.quantity).toLong() }

            val purchaseId = purchaseDao.insert(
                Purchase(
                    invoiceNumber = invoiceNumber,
                    supplierId = supplierId,
                    date = now,
                    subtotal = subtotal,
                    total = subtotal,
                    paidAmount = paidAmount,
                    remaining = remaining,
                    paymentType = paymentType,
                    note = note
                )
            )

            val movements = mutableListOf<StockMovement>()
            try {
                validItems.forEachIndexed { index, item ->
                    val existingProduct = currentProducts.getOrNull(index)
                    purchaseDao.insertItems(
                        listOf(
                            PurchaseItem(
                                purchaseId = purchaseId,
                                productId = item.productId,
                                productName = item.productName,
                                barcode = item.barcode,
                                unitPrice = item.unitPrice,
                                quantity = item.quantity,
                                unit = item.unit,
                                itemTotal = (item.unitPrice * item.quantity).toLong()
                            )
                        )
                    )

                    if (existingProduct != null) {
                        // تحديث متوسط تكلفة الشراء المرجح + زيادة المخزون
                        val oldQty = existingProduct.quantity
                        val newQty = oldQty + item.quantity
                        val newAverageCost = if (newQty > 0) {
                            val totalCost = (existingProduct.purchasePrice * oldQty).toLong() +
                                (item.unitPrice * item.quantity).toLong()
                            (totalCost / newQty).toLong()
                        } else 0L

                        val updatedProduct = existingProduct.copy(
                            purchasePrice = newAverageCost,
                            quantity = newQty,
                            updatedAt = now
                        )
                        productDao.update(updatedProduct)

                        movements.add(
                            StockMovement(
                                productId = item.productId!!,
                                type = MovementType.PURCHASE,
                                quantity = item.quantity,
                                previousQuantity = oldQty,
                                newQuantity = newQty,
                                cost = item.unitPrice,
                                referenceId = purchaseId,
                                date = now,
                                note = "فاتورة شراء $invoiceNumber"
                            )
                        )
                    } else if (item.productId != null) {
                        // منتج غير موجود (لا يمكن الوصول هنا بسبب التحقق أعلاه)
                    }
                }
                movementDao.insertAll(movements)

                // 4. تسجيل حركة الصندوق إذا كان الدفع من الصندوق
                if (paymentType == PurchasePaymentType.CASH_BOX && paidAmount > 0) {
                    cashMovementDao.insert(
                        CashMovement(
                            amount = -paidAmount,
                            type = CashMovementType.PURCHASE,
                            description = "فاتورة شراء $invoiceNumber",
                            referenceId = purchaseId,
                            date = now
                        )
                    )
                }

                // 5. تسجيل دين المورد إذا كان هناك متبقي
                if (remaining > 0 && supplierId != null) {
                    supplierTransactionDao.insert(
                        com.hesabi.app.domain.model.SupplierTransaction(
                            supplierId = supplierId,
                            type = com.hesabi.app.domain.model.SupplierTransactionType.PURCHASE,
                            amount = subtotal,
                            paid = paidAmount,
                            remaining = remaining,
                            referenceId = purchaseId,
                            date = now,
                            notes = "فاتورة شراء $invoiceNumber"
                        )
                    )
                }

                val saved = purchaseDao.getById(purchaseId)
                return@withLock if (saved != null) {
                    PurchaseResult.Success(saved, invoiceNumber)
                } else {
                    PurchaseResult.Success(
                        Purchase(
                            id = purchaseId,
                            invoiceNumber = invoiceNumber,
                            supplierId = supplierId,
                            date = now,
                            subtotal = subtotal,
                            total = subtotal,
                            paidAmount = paidAmount,
                            remaining = remaining,
                            paymentType = paymentType,
                            note = note
                        ),
                        invoiceNumber
                    )
                }
            } catch (e: Exception) {
                return@withLock PurchaseResult.Failure(
                    "فشل إتمام فاتورة الشراء: ${e.message ?: "خطأ غير معروف"}"
                )
            }
        }
    }
}
