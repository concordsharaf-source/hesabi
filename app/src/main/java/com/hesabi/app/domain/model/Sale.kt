package com.hesabi.app.domain.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * الفاتورة (عملية بيع)
 * المبالغ بوحدة العملة الصغرى (Long) لتجنب أخطاء التقريب.
 */
@Entity(
    tableName = "sales",
    indices = [Index(value = ["invoiceNumber"]), Index(value = ["date"]), Index(value = ["customerId"])],
    foreignKeys = [
        ForeignKey(
            entity = Customer::class,
            parentColumns = ["id"],
            childColumns = ["customerId"],
            onDelete = ForeignKey.SET_NULL
        )
    ]
)
data class Sale(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val invoiceNumber: String,
    val customerId: Long? = null,
    val date: Long = System.currentTimeMillis(),
    val subtotal: Long = 0L,
    val discount: Long = 0L,
    val total: Long = 0L,
    val paidAmount: Long = 0L,
    val remaining: Long = 0L,
    val paymentMethod: PaymentMethod = PaymentMethod.CASH,
    val paymentType: SalePaymentType = SalePaymentType.CASH,
    val returnedTotal: Long = 0L,
    val isDeleted: Boolean = false
)

enum class PaymentMethod(val label: String) {
    CASH("نقدي"),
    TRANSFER("تحويل")
}

/**
 * عنصر الفاتورة — يحفظSnapshot من المنتج وقت البيع
 * حتى لا تتأثر الفاتورة بتعديل المنتج لاحقًا.
 */
@Entity(
    tableName = "sale_items",
    indices = [Index(value = ["saleId"]), Index(value = ["productId"])],
    foreignKeys = [
        ForeignKey(
            entity = Sale::class,
            parentColumns = ["id"],
            childColumns = ["saleId"],
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
data class SaleItem(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val saleId: Long = 0,
    val productId: Long? = null,
    /** نسخة من اسم المنتج وقت البيع */
    val productName: String,
    val barcode: String? = null,
    /** سعر الوحدة وقت البيع بوحدة العملة الصغرى */
    val unitPrice: Long = 0L,
    val quantity: Double = 0.0,
    val unit: String = "حبة",
    /** الإجمالي لهذا العنصر بوحدة العملة الصغرى */
    val itemTotal: Long = 0L,
    /** تكلفة الوحدة وقت البيع بوحدة العملة الصغرى — لا تتغير بتعديل المنتج لاحقًا */
    val costPrice: Long = 0L,
    val returnedQuantity: Double = 0.0
)
