package com.hesabi.app.domain.model

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * المنتج — يُخزن الأسعار والمخزون بوحدة العملة الصغرى (Long).
 *
 * Soft delete: عند حذف منتج مرتبط بفواتير سابقة
 * لا يُحذف نهائيًا بل يوضع علامة isDeleted = true.
 */
@Entity(
    tableName = "products",
    indices = [
        Index(value = ["barcode"]),
        Index(value = ["name"]),
        Index(value = ["internalCode"])
    ]
)
data class Product(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val barcode: String? = null,
    val internalCode: String? = null,
    /** سعر الشراء بوحدة العملة الصغرى */
    val purchasePrice: Long = 0L,
    /** سعر البيع بوحدة العملة الصغرى */
    val salePrice: Long = 0L,
    /** الكمية الحالية في المخزون */
    val quantity: Double = 0.0,
    /** الحد الأدنى للمخزون */
    val minQuantity: Double = 0.0,
    val unit: String = "حبة",
    /** مسار الصورة المحلية (اختياري) */
    val imagePath: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isDeleted: Boolean = false
)
