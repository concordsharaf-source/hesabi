package com.hesabi.app.domain.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * مرتجع شراء — إرجاع منتجات إلى المورد من فاتورة شراء سابقة.
 * رقم متسلسل PURR-000001.
 */
@Entity(
    tableName = "purchase_returns",
    indices = [Index(value = ["invoiceNumber"]), Index(value = ["purchaseId"])],
    foreignKeys = [
        ForeignKey(
            entity = Purchase::class,
            parentColumns = ["id"],
            childColumns = ["purchaseId"],
            onDelete = ForeignKey.SET_NULL
        ),
        ForeignKey(
            entity = Supplier::class,
            parentColumns = ["id"],
            childColumns = ["supplierId"],
            onDelete = ForeignKey.SET_NULL
        )
    ]
)
data class PurchaseReturn(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val invoiceNumber: String,
    val purchaseId: Long? = null,
    val supplierId: Long? = null,
    val date: Long = System.currentTimeMillis(),
    /** المبلغ المسترد من المورد بوحدة العملة الصغرى */
    val totalRefunded: Long = 0L,
    val note: String? = null,
    val isDeleted: Boolean = false
)

/**
 * بند المرتجع — مرجع لبند الشراء الأصلي.
 * لا يسمح بإرجاع كمية أكبر من (الكمية المشتراة − الكمية المرتجعة سابقًا).
 */
@Entity(
    tableName = "purchase_return_items",
    indices = [Index(value = ["purchaseReturnId"]), Index(value = ["purchaseItemId"])],
    foreignKeys = [
        ForeignKey(
            entity = PurchaseReturn::class,
            parentColumns = ["id"],
            childColumns = ["purchaseReturnId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = PurchaseItem::class,
            parentColumns = ["id"],
            childColumns = ["purchaseItemId"],
            onDelete = ForeignKey.SET_NULL
        )
    ]
)
data class PurchaseReturnItem(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val purchaseReturnId: Long = 0,
    val purchaseItemId: Long? = null,
    val productId: Long? = null,
    val productName: String,
    /** الكمية المرتجعة في هذا البند */
    val quantity: Double = 0.0,
    val unit: String = "حبة",
    /** سعر الوحدة وقت المرتجع بوحدة العملة الصغرى */
    val unitPrice: Long = 0L,
    val itemTotal: Long = 0L
)
