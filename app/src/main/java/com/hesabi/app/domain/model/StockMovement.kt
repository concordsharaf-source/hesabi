package com.hesabi.app.domain.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * أنواع حركة المخزون.
 */
enum class MovementType(val label: String) {
    /** كمية افتتاحية عند إنشاء المنتج */
    INITIAL("افتتاحي"),
    /** إضافة بسبب فاتورة شراء */
    PURCHASE("شراء"),
    /** خصم بسبب عملية بيع */
    SALE("بيع"),
    /** تعديل يدوي للمخزون */
    ADJUSTMENT("تعديل"),
    /** خصم بسبب مرتجع إلى المورد */
    PURCHASE_RETURN("مرتجع شراء"),
    /** إضافة بسبب مرتجع من العميل */
    SALE_RETURN("مرتجع بيع")
}

/**
 * حركة المخزون — كل تغيير في كمية المنتج يُسجل بحركة واضحة.
 */
@Entity(
    tableName = "stock_movements",
    indices = [Index(value = ["productId"]), Index(value = ["type"])],
    foreignKeys = [
        ForeignKey(
            entity = Product::class,
            parentColumns = ["id"],
            childColumns = ["productId"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class StockMovement(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val productId: Long = 0,
    val type: MovementType = MovementType.ADJUSTMENT,
    /** الكمية المضافة أو المخصومة (سالبة عند الخصم) */
    val quantity: Double = 0.0,
    /** الكمية قبل الحركة */
    val previousQuantity: Double = 0.0,
    /** الكمية بعد الحركة */
    val newQuantity: Double = 0.0,
    /** تكلفة الوحدة وقت الحركة بوحدة العملة الصغرى (لحساب تكلفة المخزون) */
    val cost: Long = 0L,
    /** معرّف العملية المرجعية (فاتورة شراء/بيع/مرتجع) */
    val referenceId: Long? = null,
    val date: Long = System.currentTimeMillis(),
    val note: String? = null
)
