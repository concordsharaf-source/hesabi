package com.hesabi.app.domain

import com.hesabi.app.data.dao.ProductDao
import com.hesabi.app.data.dao.StockMovementDao
import com.hesabi.app.domain.model.MovementType
import com.hesabi.app.domain.model.Product
import com.hesabi.app.domain.model.StockMovement

/**
 * نتيجة إضافة/تعديل المنتج.
 */
sealed class ProductOperationResult {
    data class Success(val productId: Long) : ProductOperationResult()
    data class Failure(val message: String) : ProductOperationResult()
}

/**
 * مدخلات إضافة منتج جديد.
 */
data class AddProductInput(
    val name: String,
    val barcode: String?,
    val internalCode: String?,
    val purchasePriceMinorUnits: Long,
    val salePriceMinorUnits: Long,
    val openingQuantity: Double,
    val minQuantity: Double,
    val unit: String
)

/**
 * منطق إدارة المنتجات:
 * - إضافة منتج (مع تسجيل الكمية الافتتاحية في المخزون)
 * - تعديل المنتج (دون تغيير الكمية مباشرة)
 * - الحذف الآمن (Soft Delete)
 */
class ProductUseCase(
    private val productDao: ProductDao,
    private val movementDao: StockMovementDao
) {

    suspend fun addProduct(input: AddProductInput): ProductOperationResult {
        if (input.name.isBlank()) {
            return ProductOperationResult.Failure("اسم المنتج مطلوب")
        }
        if (input.salePriceMinorUnits < 0L) {
            return ProductOperationResult.Failure("سعر البيع يجب أن يكون صفرًا أو أكبر")
        }
        if (input.purchasePriceMinorUnits < 0L) {
            return ProductOperationResult.Failure("سعر الشراء يجب أن يكون صفرًا أو أكبر")
        }
        if (input.openingQuantity < 0) {
            return ProductOperationResult.Failure("الكمية الافتتاحية لا يمكن أن تكون سالبة")
        }
        if (!Units.isValid(input.unit)) {
            return ProductOperationResult.Failure("الوحدة المختارة غير صالحة")
        }

        // التحقق من عدم تكرار الباركود أو الكود الداخلي
        val code = input.barcode?.takeIf { it.isNotBlank() }
        val internal = input.internalCode?.takeIf { it.isNotBlank() }
        if (code != null && productDao.getByBarcodeOrInternalCode(code) != null) {
            return ProductOperationResult.Failure("هذا الباركود/الكود مستخدم لمنتج آخر")
        }

        val now = System.currentTimeMillis()
        val productId = productDao.insert(
            Product(
                name = input.name.trim(),
                barcode = code,
                internalCode = internal,
                purchasePrice = input.purchasePriceMinorUnits,
                salePrice = input.salePriceMinorUnits,
                quantity = input.openingQuantity,
                minQuantity = input.minQuantity,
                unit = input.unit,
                createdAt = now,
                updatedAt = now
            )
        )

        // تسجيل الكمية الافتتاحية في حركات المخزون
        if (input.openingQuantity > 0) {
            movementDao.insert(
                StockMovement(
                    productId = productId,
                    type = MovementType.INITIAL,
                    quantity = input.openingQuantity,
                    previousQuantity = 0.0,
                    newQuantity = input.openingQuantity,
                    date = now,
                    note = "كمية افتتاحية عند إنشاء المنتج"
                )
            )
        }

        return ProductOperationResult.Success(productId)
    }

    suspend fun updateProduct(product: Product): ProductOperationResult {
        if (product.name.isBlank()) {
            return ProductOperationResult.Failure("اسم المنتج مطلوب")
        }

        // التحقق من عدم تكرار الباركود أو الكود الداخلي مع منتج آخر
        val code = product.barcode?.takeIf { it.isNotBlank() }
        val internal = product.internalCode?.takeIf { it.isNotBlank() }
        val duplicate = code?.let { productDao.getByBarcodeOrInternalCode(it) }
            ?: internal?.let { productDao.getByBarcodeOrInternalCode(it) }
        if (duplicate != null && duplicate.id != product.id) {
            return ProductOperationResult.Failure("هذا الباركود/الكود مستخدم لمنتج آخر")
        }

        val now = System.currentTimeMillis()
        productDao.update(product.copy(updatedAt = now))
        return ProductOperationResult.Success(product.id)
    }

    /**
     * Soft delete — لا يؤثر على الفواتير السابقة.
     */
    suspend fun deleteProduct(productId: Long) {
        productDao.softDelete(productId)
    }

    /** هل المنتج مرتبط بفواتير سابقة؟ */
    suspend fun hasLinkedSales(productId: Long): Boolean =
        movementDao.countByProduct(productId) > 0

    suspend fun restoreProduct(productId: Long) {
        productDao.restore(productId)
    }

    object Units {
        private val valid = setOf(
            "حبة", "علبة", "كرتون", "كيلو", "جرام", "لتر", "متر"
        )

        fun isValid(unit: String): Boolean = unit in valid
    }
}
