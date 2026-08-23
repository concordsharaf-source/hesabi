package com.hesabi.app.domain.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * العميل — لإدارة المبيعات الآجلة والديون.
 */
@Entity(
    tableName = "customers",
    indices = [Index(value = ["name"]), Index(value = ["phone"])]
)
data class Customer(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val phone: String? = null,
    val address: String? = null,
    val notes: String? = null,
    val balance: Long = 0L,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isDeleted: Boolean = false
)

/**
 * نوع حركة الصندوق.
 */
enum class CashMovementType(val label: String) {
    SALE("بيع"),
    PURCHASE("شراء"),
    EXPENSE("مصروف"),
    CUSTOMER_PAYMENT("دفعة عميل"),
    SUPPLIER_PAYMENT("دفعة مورد"),
    ADJUSTMENT("تسوية"),
    OPENING_BALANCE("رصيد افتتاحي")
}

/**
 * حركة الصندوق (Cash Flow) — تتبع كل قرش يدخل أو يخرج من الكاش.
 */
@Entity(
    tableName = "cash_movements",
    indices = [Index(value = ["date"]), Index(value = ["type"])]
)
data class CashMovement(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val amount: Long, // موجب للدخل، سالب للخرج
    val type: CashMovementType,
    val date: Long = System.currentTimeMillis(),
    val description: String,
    val referenceId: Long? = null, // معرّف الفاتورة أو المصروف
    val note: String? = null
)

/**
 * نوع حركة حساب العميل.
 */
enum class CustomerTransactionType {
    SALE,       // بيع آجل (يزيد الدين)
    PAYMENT,    // تسديد دفعة (ينقص الدين)
    RETURN      // مرتجع مبيعات (ينقص الدين)
}

/**
 * سجل ديون ودفعات العملاء.
 */
@Entity(
    tableName = "customer_transactions",
    indices = [Index(value = ["customerId"]), Index(value = ["date"])],
    foreignKeys = [
        ForeignKey(
            entity = Customer::class,
            parentColumns = ["id"],
            childColumns = ["customerId"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class CustomerTransaction(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val customerId: Long,
    val type: CustomerTransactionType,
    val amount: Long, // المبلغ الكلي للعملية
    val paid: Long,   // المبلغ المدفوع
    val remaining: Long, // المتبقي (الدين)
    val date: Long = System.currentTimeMillis(),
    val referenceId: Long? = null, // معرّف فاتورة البيع
    val notes: String? = null
)

/**
 * نوع حركة حساب المورد.
 */
enum class SupplierTransactionType {
    PURCHASE,   // شراء آجل (يزيد الدين للمورد)
    PAYMENT,    // تسديد دفعة للمورد (ينقص الدين)
    RETURN      // مرتجع مشتريات (ينقص الدين)
}

/**
 * سجل ديون ودفعات الموردين.
 */
@Entity(
    tableName = "supplier_transactions",
    indices = [Index(value = ["supplierId"]), Index(value = ["date"])],
    foreignKeys = [
        ForeignKey(
            entity = Supplier::class,
            parentColumns = ["id"],
            childColumns = ["supplierId"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class SupplierTransaction(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val supplierId: Long,
    val type: SupplierTransactionType,
    val amount: Long,    // المبلغ الكلي للعملية
    val paid: Long,      // المبلغ المدفوع
    val remaining: Long, // المتبقي (الدين للمورد)
    val date: Long = System.currentTimeMillis(),
    val referenceId: Long? = null, // معرّف فاتورة الشراء
    val notes: String? = null
)

/**
 * نوع دفع المشتريات.
 */
enum class PurchasePaymentType {
    CASH_BOX,      // نقداً من الصندوق
    CASH_OUTSIDE,   // نقداً من خارج الصندوق (مال شخصي)
    DEBT           // آجل (دين للمورد)
}

/**
 * نوع البيع.
 */
enum class SalePaymentType {
    CASH,   // نقدي
    CREDIT  // آجل
}

/**
 * دور المستخدم في النظام.
 */
enum class UserRole(val label: String) {
    ADMIN("مدير"),
    CASHIER("كاشير")
}

/**
 * المستخدم — للتحكم في الصلاحيات.
 */
@Entity(
    tableName = "users",
    indices = [Index(value = ["username"], unique = true)]
)
data class User(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val username: String,
    val passwordHash: String,
    val passwordSalt: String = "",
    val fullName: String,
    val role: UserRole = UserRole.CASHIER,
    val mustChangePassword: Boolean = false,
    val isActive: Boolean = true,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
