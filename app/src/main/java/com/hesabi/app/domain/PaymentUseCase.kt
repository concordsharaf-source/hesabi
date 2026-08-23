package com.hesabi.app.domain

import androidx.room.withTransaction
import com.hesabi.app.data.dao.CashMovementDao
import com.hesabi.app.data.dao.CustomerDao
import com.hesabi.app.data.dao.CustomerTransactionDao
import com.hesabi.app.data.dao.SupplierDao
import com.hesabi.app.data.dao.SupplierTransactionDao
import com.hesabi.app.data.db.AppDatabase
import com.hesabi.app.domain.model.CashMovement
import com.hesabi.app.domain.model.CashMovementType
import com.hesabi.app.domain.model.CustomerTransaction
import com.hesabi.app.domain.model.CustomerTransactionType
import com.hesabi.app.domain.model.SupplierTransaction
import com.hesabi.app.domain.model.SupplierTransactionType

/**
 * UseCase لمعالجة الدفعات المالية بنظام FIFO (First In, First Out).
 * يوزع المبلغ المدفوع على أقدم الفواتير المستحقة أولاً.
 */
class PaymentUseCase(
    private val db: AppDatabase,
    private val customerDao: CustomerDao,
    private val customerTransactionDao: CustomerTransactionDao,
    private val supplierDao: SupplierDao,
    private val supplierTransactionDao: SupplierTransactionDao,
    private val cashMovementDao: CashMovementDao
) {

    /**
     * تسجيل دفعة من عميل وتوزيعها على فواتيره الآجلة.
     */
    suspend fun recordCustomerPayment(customerId: Long, amount: Long, note: String?) = db.withTransaction {
        val customer = customerDao.getById(customerId) ?: return@withTransaction
        
        // 1. تسجيل حركة الصندوق (دخل)
        cashMovementDao.insert(
            CashMovement(
                amount = amount,
                type = CashMovementType.CUSTOMER_PAYMENT,
                description = "دفعة من العميل: ${customer.name}",
                referenceId = customerId,
                note = note
            )
        )

        // 2. توزيع المبلغ على الفواتير بنظام FIFO
        var remainingPayment = amount
        val pendingInvoices = customerTransactionDao.getPendingInvoices(customerId)

        for (invoice in pendingInvoices) {
            if (remainingPayment <= 0) break
            
            val paymentForThisInvoice = minOf(remainingPayment, invoice.remaining)
            val updatedInvoice = invoice.copy(
                paid = invoice.paid + paymentForThisInvoice,
                remaining = invoice.remaining - paymentForThisInvoice
            )
            customerTransactionDao.update(updatedInvoice)
            remainingPayment -= paymentForThisInvoice
        }

        // 3. تحديث رصيد العميل الإجمالي
        val updatedCustomer = customer.copy(
            balance = customer.balance - amount,
            updatedAt = System.currentTimeMillis()
        )
        customerDao.update(updatedCustomer)

        // إذا كان هناك مبلغ زائد، يمكن تسجيله كدفعة مقدمة (اختياري، هنا نعتبره تسديد للرصيد الإجمالي)
    }

    /**
     * تسجيل دفعة لمورد وتوزيعها على فواتير الشراء الآجلة.
     */
    suspend fun recordSupplierPayment(supplierId: Long, amount: Long, note: String?) = db.withTransaction {
        val supplier = supplierDao.getById(supplierId) ?: return@withTransaction

        // 1. تسجيل حركة الصندوق (خرج)
        cashMovementDao.insert(
            CashMovement(
                amount = -amount,
                type = CashMovementType.SUPPLIER_PAYMENT,
                description = "دفعة للمورد: ${supplier.name}",
                referenceId = supplierId,
                note = note
            )
        )

        // 2. توزيع المبلغ بنظام FIFO
        var remainingPayment = amount
        val pendingInvoices = supplierTransactionDao.getPendingSupplierInvoices(supplierId)

        for (invoice in pendingInvoices) {
            if (remainingPayment <= 0) break
            
            val paymentForThisInvoice = minOf(remainingPayment, invoice.remaining)
            val updatedInvoice = invoice.copy(
                paid = invoice.paid + paymentForThisInvoice,
                remaining = invoice.remaining - paymentForThisInvoice
            )
            supplierTransactionDao.update(updatedInvoice)
            remainingPayment -= paymentForThisInvoice
        }

        // 3. تحديث رصيد المورد الإجمالي
        val updatedSupplier = supplier.copy(
            balance = supplier.balance - amount,
            updatedAt = System.currentTimeMillis()
        )
        supplierDao.updateBalance(updatedSupplier.id, updatedSupplier.balance, updatedSupplier.updatedAt)
    }
}
