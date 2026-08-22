package com.hesabi.app.domain

import com.hesabi.app.common.Money
import com.hesabi.app.domain.model.Product

/**
 * عنصر في سلة البيع
 */
data class CartItem(
    val product: Product,
    var quantity: Double,
    val unitPrice: Long // سعر البيع بوحدة العملة الصغرى وقت الإضافة للسلة
) {
    /** إجمالي هذا العنصر بوحدة العملة الصغرى */
    fun itemTotal(): Long = (unitPrice * quantity).toLong()
}

/**
 * نتائج التحقق من المخزون عند الإضافة للسلة أو إتمام البيع.
 */
sealed class StockCheckResult {
    data object Ok : StockCheckResult()
    data class Insufficient(
        val available: Double,
        val requested: Double,
        val productName: String
    ) : StockCheckResult()
}

/**
 * منطق الحسابات المالية الأساسي — قابل للاختبار (Unit Tests).
 *
 * جميع الحسابات تتم بوحدة العملة الصغرى (Long) لتجنب أخطاء التقريب.
 * القسمة على SCALE تتم مرة واحدة فقط عند العرض.
 */
object SaleCalculator {

    /**
     * الإجمالي قبل الخصم: مجموع (سعر الوحدة الصغرى × الكمية) لكل عنصر.
     * لا يستخدم Float أبدًا في الحساب.
     */
    fun calculateSubtotal(items: List<CartItem>): Long {
        var total = 0L
        for (item in items) {
            total += (item.unitPrice * item.quantity).toLong()
        }
        return total
    }

    /**
     * حساب الإجمالي النهائي مع تطبيق الخصم:
     * الإجمالي قبل الخصم - الخصم = الإجمالي النهائي
     *
     * لا يسمح بأن يكون الخصم أكبر من الإجمالي.
     */
    fun calculateFinal(subtotalMinorUnits: Long, discountMinorUnits: Long): FinalTotals {
        val discount = discountMinorUnits.coerceAtLeast(0L)
            .coerceAtMost(subtotalMinorUnits)
        val final = subtotalMinorUnits - discount
        return FinalTotals(
            subtotal = subtotalMinorUnits,
            discount = discount,
            final = final
        )
    }

    /**
     * حساب المبلغ المتبقي بعد الدفع.
     */
    fun calculateRemaining(finalTotal: Long, paid: Long): Long {
        val remaining = finalTotal - paid
        return remaining.coerceAtLeast(0L)
    }

    /**
     * التحقق من أن الكمية المطلوبة لا تتجاوز المخزون المتاح.
     */
    fun checkStock(available: Double, requested: Double, productName: String): StockCheckResult {
        return if (requested > 0 && requested <= available) {
            StockCheckResult.Ok
        } else {
            StockCheckResult.Insufficient(available, requested, productName)
        }
    }

    /**
     * حساب الكمية الجديدة بعد خصم كمية البيع.
     * لا يسمح بالمخزون السالب.
     */
    fun newQuantityAfterSale(current: Double, sold: Double): Double {
        require(sold >= 0) { "كمية البيع لا يمكن أن تكون سالبة" }
        return (current - sold).coerceAtLeast(0.0)
    }

    /**
     * حساب مقدار تعديل المخزون:
     * adjustment = الكمية الفعلية - الكمية الحالية
     * مثال: 20 → 18 يعطي adjustment = -2
     */
    fun adjustmentAmount(current: Double, actual: Double): Double = actual - current

    /**
     * القيمة الإجمالية للمخزون بوحدة العملة الصغرى:
     * مجموع (سعر الشراء الصغرى × الكمية) لكل منتج.
     */
    fun calculateInventoryValue(products: List<Product>): Long {
        var total = 0L
        for (product in products) {
            total += (product.purchasePrice * product.quantity).toLong()
        }
        return total
    }

    /**
     * تنسيق مبلغ بوحدة صغرى كنص مع رمز العملة.
     */
    fun formatMoney(minorUnits: Long, currencySymbol: String): String =
        Money.formatWithCurrency(minorUnits, currencySymbol)
}

data class FinalTotals(
    val subtotal: Long,
    val discount: Long,
    val final: Long
)
