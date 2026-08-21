package com.hesabi.app.domain

import com.hesabi.app.data.dao.ProductDao
import com.hesabi.app.data.dao.StockMovementDao
import com.hesabi.app.domain.model.MovementType
import com.hesabi.app.domain.model.StockMovement

/**
 * نتيجة تعديل المخزون اليدوي.
 */
sealed class AdjustmentResult {
    data object Success : AdjustmentResult()
    data class Failure(val message: String) : AdjustmentResult()
}

/**
 * منطق تعديل المخزون:
 * المستخدم يدخل الكمية الفعلية → يتم حساب الفرق → تسجيل ADJUSTMENT.
 * مثال: الحالية 20، الفعلية 18 → adjustment = -2، المخزون الجديد 18.
 */
class InventoryUseCase(
    private val productDao: ProductDao,
    private val movementDao: StockMovementDao
) {

    suspend fun adjustStock(
        productId: Long,
        actualQuantity: Double,
        reason: String
    ): AdjustmentResult {
        if (actualQuantity < 0) {
            return AdjustmentResult.Failure("الكمية الفعلية لا يمكن أن تكون سالبة")
        }

        val product = productDao.getById(productId)
            ?: return AdjustmentResult.Failure("المنتج غير موجود")

        val current = product.quantity
        val adjustment = SaleCalculator.adjustmentAmount(current, actualQuantity)

        if (adjustment == 0.0) {
            return AdjustmentResult.Success
        }

        val now = System.currentTimeMillis()
        val newQuantity = actualQuantity

        productDao.setQuantity(productId, newQuantity, now)

        movementDao.insert(
            StockMovement(
                productId = productId,
                type = MovementType.ADJUSTMENT,
                quantity = adjustment,
                previousQuantity = current,
                newQuantity = newQuantity,
                date = now,
                note = reason.ifBlank { "تعديل يدوي للمخزون" }
            )
        )

        return AdjustmentResult.Success
    }
}
