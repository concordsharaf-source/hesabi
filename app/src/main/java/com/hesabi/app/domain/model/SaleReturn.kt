package com.hesabi.app.domain.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * مرتجع بيع — إرجاع منتجات من العميل إلى فاتورة بيع سابقة.
 * رقم متسلسل SR-000001.
 */
@Entity(
    tableName = "sale_returns",
    indices = [Index(value = ["invoiceNumber"]), Index(value = ["saleId"])],
    foreignKeys = [
        ForeignKey(
            entity = Sale::class,
            parentColumns = ["id"],
            childColumns = ["saleId"],
            onDelete = ForeignKey.SET_NULL
        )
    ]
)
data class SaleReturn(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val invoiceNumber: String,
    val saleId: Long? = null,
    val date: Long = System.currentTimeMillis(),
    /** المبلغ المسترد للعميل بوحدة العملة الصغرى */
    val totalRefunded: Long = 0L,
    val note: String? = null,
    val isDeleted: Boolean = false
)

/**
 * بند مرتجع البيع — مرجع لبند الفاتورة الأصلي.
 * لا يسمح بإرجاع كمية أكبر من (الكمية المباعة − الكمية المرتجعة سابقًا).
 */
@Entity(
    tableName = "sale_return_items",
    indices = [Index(value = ["saleReturnId"]), Index(value = ["saleItemId"])],
    foreignKeys = [
        ForeignKey(
            entity = SaleReturn::class,
            parentColumns = ["id"],
            childColumns = ["saleReturnId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = SaleItem::class,
            parentColumns = ["id"],
            childColumns = ["saleItemId"],
            onDelete = ForeignKey.SET_NULL
        )
    ]
)
data class SaleReturnItem(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val saleReturnId: Long = 0,
    val saleItemId: Long? = null,
    val productId: Long? = null,
    val productName: String,
    /** الكمية المرتجعة في هذا البند */
    val quantity: Double = 0.0,
    val unit: String = "حبة",
    /** سعر الوحدة وقت المرتجع بوحدة العملة الصغرى */
    val unitPrice: Long = 0L,
    val itemTotal: Long = 0L
)
