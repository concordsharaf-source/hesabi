package com.hesabi.app.domain.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * فاتورة الشراء — المبالغ بوحدة العملة الصغرى (Long).
 * رقم متسلسل PUR-000001 لا يتكرر حتى مع الحذف.
 */
@Entity(
    tableName = "purchases",
    indices = [Index(value = ["invoiceNumber"]), Index(value = ["date"]), Index(value = ["supplierId"])],
    foreignKeys = [
        ForeignKey(
            entity = Supplier::class,
            parentColumns = ["id"],
            childColumns = ["supplierId"],
            onDelete = ForeignKey.SET_NULL // الحفاظ على الفاتورة عند حذف المورد (Soft Delete)
        )
    ]
)
data class Purchase(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val invoiceNumber: String,
    val supplierId: Long? = null,
    val date: Long = System.currentTimeMillis(),
    val subtotal: Long = 0L,
    val total: Long = 0L,
    val paidAmount: Long = 0L,
    val remaining: Long = 0L,
    val paymentType: PurchasePaymentType = PurchasePaymentType.CASH_BOX,
    val note: String? = null,
    val isDeleted: Boolean = false
)

/**
 * بند فاتورة الشراء — Snapshot من المنتج وقت الشراء.
 * يحفظ سعر الشراء وقت العملية حتى لا تتأثر الفاتورة بتعديل المنتج لاحقًا.
 */
@Entity(
    tableName = "purchase_items",
    indices = [Index(value = ["purchaseId"]), Index(value = ["productId"])],
    foreignKeys = [
        ForeignKey(
            entity = Purchase::class,
            parentColumns = ["id"],
            childColumns = ["purchaseId"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = Product::class,
            parentColumns = ["id"],
            childColumns = ["productId"],
            onDelete = ForeignKey.SET_NULL
        )
    ]
)
data class PurchaseItem(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val purchaseId: Long = 0,
    val productId: Long? = null,
    /** نسخة من اسم المنتج وقت الشراء */
    val productName: String,
    val barcode: String? = null,
    /** سعر الشراء للوحدة بوحدة العملة الصغرى */
    val unitPrice: Long = 0L,
    val quantity: Double = 0.0,
    val unit: String = "حبة",
    /** الإجمالي لهذا البند بوحدة العملة الصغرى */
    val itemTotal: Long = 0L
)
