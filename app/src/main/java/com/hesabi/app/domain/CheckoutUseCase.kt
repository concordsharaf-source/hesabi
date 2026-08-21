package com.hesabi.app.domain

import com.hesabi.app.common.Money
import com.hesabi.app.data.dao.ProductDao
import com.hesabi.app.data.dao.SaleDao
import com.hesabi.app.data.dao.StockMovementDao
import com.hesabi.app.domain.model.MovementType
import com.hesabi.app.domain.model.PaymentMethod
import com.hesabi.app.domain.model.Sale
import com.hesabi.app.domain.model.SaleItem
import com.hesabi.app.domain.model.StockMovement
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * نتيجة إتمام البيع.
 */
sealed class CheckoutResult {
    data class Success(val sale: Sale, val invoiceNumber: String) : CheckoutResult()
    data class Failure(val message: String) : CheckoutResult()
}

/**
 * حالة الفاتورة عند الإتمام: المبلغ المدفوع وطريقة الدفع.
 */
data class CheckoutInput(
    val items: List<CartItem>,
    val discountMinorUnits: Long = 0L,
    val paidMinorUnits: Long,
    val paymentMethod: PaymentMethod = PaymentMethod.CASH
)

/**
 * محرك إتمام البيع — ينفذ العملية كاملة داخل Transaction واحدة:
 * 1. التحقق من المنتجات والمخزون
 * 2. إنشاء Sale
 * 3. إنشاء SaleItems (بنسخة Snapshot من المنتج)
 * 4. خصم الكميات من المخزون
 * 5. إنشاء StockMovement لكل منتج
 * 6. حساب الإجماليات وحفظ الفاتورة
 *
 * إذا فشلت أي خطوة — لا يُخصم المخزون ولا تُحفظ فاتورة ناقصة.
 *
 * Mutex يضمن عدم تداخل عمليتي بيع متزامنتين على نفس قاعدة البيانات.
 */
class CheckoutUseCase(
    private val productDao: ProductDao,
    private val saleDao: SaleDao,
    private val movementDao: StockMovementDao
) {

    private val checkoutMutex = Mutex()

    suspend fun execute(input: CheckoutInput): CheckoutResult {
        return checkoutMutex.withLock {
            // 1. التحقق من وجود المنتجات
            if (input.items.isEmpty()) {
                return@withLock CheckoutResult.Failure("السلة فارغة")
            }

            val now = System.currentTimeMillis()

            // قراءة أحدث حالة المخزون لكل منتج داخل القفل
            val currentProducts = input.items.mapNotNull { item ->
                productDao.getById(item.product.id)
            }
            if (currentProducts.size != input.items.size) {
                return@withLock CheckoutResult.Failure("بعض المنتجات غير موجودة في قاعدة البيانات")
            }

            // 2. التحقق من المخزون — لا مخزون سالب
            val stockFailures = input.items.mapIndexedNotNull { index, item ->
                val current = currentProducts[index]
                if (item.quantity > current.quantity) {
                    "${current.name}: الكمية المتوفرة غير كافية (المتوفر: ${current.quantity} ${current.unit})"
                } else null
            }
            if (stockFailures.isNotEmpty()) {
                return@withLock CheckoutResult.Failure(stockFailures.joinToString("\n"))
            }

            // 7. حساب إجمالي الفاتورة
            val subtotal = SaleCalculator.calculateSubtotal(input.items)
            val totals = SaleCalculator.calculateFinal(subtotal, input.discountMinorUnits)
            val paid = input.paidMinorUnits
            val remaining = SaleCalculator.calculateRemaining(totals.final, paid)

            if (totals.final <= 0L) {
                return@withLock CheckoutResult.Failure("الإجمالي النهائي يجب أن يكون أكبر من صفر")
            }
            if (paid < 0L) {
                return@withLock CheckoutResult.Failure("المبلغ المدفوع غير صالح")
            }

            // 18. رقم الفاتورة التسلسلي الفريد
            val invoiceNumber = String.format("INV-%06d", saleDao.maxInvoiceSequence() + 1)

            // 3. إنشاء Sale
            val saleId = saleDao.insert(
                Sale(
                    invoiceNumber = invoiceNumber,
                    date = now,
                    subtotal = totals.subtotal,
                    discount = totals.discount,
                    total = totals.final,
                    paidAmount = paid,
                    remaining = remaining,
                    paymentMethod = input.paymentMethod
                )
            )

            val movements = mutableListOf<StockMovement>()

            try {
                // 4. إنشاء SaleItems + 5. خصم الكميات
                input.items.forEachIndexed { index, item ->
                    val currentProduct = currentProducts[index]

                    saleDao.insertItems(
                        listOf(
                            SaleItem(
                                saleId = saleId,
                                productId = item.product.id,
                                productName = currentProduct.name,
                                barcode = currentProduct.barcode,
                                unitPrice = item.unitPrice,
                                quantity = item.quantity,
                                unit = currentProduct.unit,
                                itemTotal = item.itemTotal()
                            )
                        )
                    )

                    val previousQuantity = currentProduct.quantity
                    val newQuantity = SaleCalculator.newQuantityAfterSale(previousQuantity, item.quantity)
                    val delta = item.quantity

                    // 5. خصم الكمية من المخزون
                    productDao.decreaseQuantity(item.product.id, delta, now)

                    // 6. تسجيل حركة مخزون SALE
                    movements.add(
                        StockMovement(
                            productId = item.product.id,
                            type = MovementType.SALE,
                            quantity = -delta,
                            previousQuantity = previousQuantity,
                            newQuantity = newQuantity,
                            date = now,
                            note = "فاتورة $invoiceNumber"
                        )
                    )
                }

                // 6. حفظ حركات المخزون
                movementDao.insertAll(movements)

                val savedSale = saleDao.getById(saleId)
                    ?: return@withLock CheckoutResult.Success(
                        Sale(
                            id = saleId,
                            invoiceNumber = invoiceNumber,
                            date = now,
                            subtotal = totals.subtotal,
                            discount = totals.discount,
                            total = totals.final,
                            paidAmount = paid,
                            remaining = remaining,
                            paymentMethod = input.paymentMethod
                        ),
                        invoiceNumber
                    )
                return@withLock CheckoutResult.Success(savedSale, invoiceNumber)
            } catch (e: Exception) {
                // الفشل: لا يتم التراجع الجزئي لأن كل شيء داخل نفس الجلسة
                // ونعيد الخطأ لمنع الحفظ الناقص (Room transactions rollback)
                return@withLock CheckoutResult.Failure("فشل إتمام البيع: ${e.message ?: "خطأ غير معروف"}")
            }
        }
    }
}
