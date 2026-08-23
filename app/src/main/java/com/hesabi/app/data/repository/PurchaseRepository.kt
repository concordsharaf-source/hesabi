package com.hesabi.app.data.repository

import com.hesabi.app.data.dao.ExpenseDao
import com.hesabi.app.data.dao.PurchaseDao
import com.hesabi.app.data.dao.PurchaseReturnDao
import com.hesabi.app.data.dao.SaleReturnDao
import com.hesabi.app.data.dao.SupplierDao
import com.hesabi.app.domain.model.Expense
import com.hesabi.app.domain.model.Purchase
import com.hesabi.app.domain.model.PurchaseItem
import com.hesabi.app.domain.model.PurchaseReturn
import com.hesabi.app.domain.model.PurchaseReturnItem
import com.hesabi.app.domain.model.SaleReturn
import com.hesabi.app.domain.model.SaleReturnItem
import com.hesabi.app.domain.model.Supplier
import kotlinx.coroutines.flow.Flow

/**
 * مستودع المشتريات والموردين والمصروفات والمرتجعات — المرحلة الثانية.
 */
class PurchaseRepository(
    val supplierDao: SupplierDao,
    private val purchaseDao: PurchaseDao,
    private val purchaseReturnDao: PurchaseReturnDao,
    private val saleReturnDao: SaleReturnDao,
    private val expenseDao: ExpenseDao
) {
    // ============ الموردون ============
    fun observeSuppliers(): Flow<List<Supplier>> = supplierDao.observeAll()
    suspend fun getAllSuppliers(): List<Supplier> = supplierDao.getAll()
    suspend fun getSupplier(id: Long): Supplier? = supplierDao.getById(id)
    suspend fun searchSuppliers(query: String): List<Supplier> = supplierDao.search(query)
    suspend fun insertSupplier(supplier: Supplier): Long = supplierDao.insert(supplier)
    suspend fun updateSupplier(id: Long, name: String, phone: String?, address: String?, notes: String?) {
        supplierDao.update(id, name, phone, address, notes, System.currentTimeMillis())
    }
    suspend fun softDeleteSupplier(id: Long): Boolean {
        if (supplierDao.countPurchases(id) > 0) return false
        supplierDao.softDelete(id)
        return true
    }

    // ============ فواتير الشراء ============
    fun observePurchases(): Flow<List<Purchase>> = purchaseDao.observeAll()
    suspend fun getAllPurchases(): List<Purchase> = purchaseDao.getAll()
    suspend fun getPurchase(id: Long): Purchase? = purchaseDao.getById(id)
    suspend fun getPurchaseItems(purchaseId: Long): List<PurchaseItem> =
        purchaseDao.getItemsForPurchase(purchaseId)
    suspend fun getPurchasesBySupplier(supplierId: Long): List<Purchase> =
        purchaseDao.getBySupplier(supplierId)
    suspend fun getPurchaseItemsByProduct(productId: Long): List<PurchaseItem> =
        purchaseDao.getItemsByProduct(productId)
    suspend fun insertPurchase(purchase: Purchase): Long = purchaseDao.insert(purchase)
    suspend fun insertPurchaseItems(items: List<PurchaseItem>): List<Long> =
        purchaseDao.insertItems(items)
    suspend fun maxPurchaseSequence(): Long = purchaseDao.maxInvoiceSequence()

    // ============ مرتجعات الشراء ============
    fun observePurchaseReturns(): Flow<List<PurchaseReturn>> =
        purchaseReturnDao.observeAll()
    suspend fun getPurchaseReturns(purchaseId: Long): List<PurchaseReturn> =
        purchaseReturnDao.getByPurchase(purchaseId)
    suspend fun getPurchaseReturnItems(purchaseReturnId: Long): List<PurchaseReturnItem> =
        purchaseReturnDao.getItems(purchaseReturnId)
    suspend fun getAllPurchaseReturns(): List<PurchaseReturn> =
        purchaseReturnDao.getAll()
    suspend fun insertPurchaseReturn(purchaseReturn: PurchaseReturn): Long =
        purchaseReturnDao.insert(purchaseReturn)
    suspend fun insertPurchaseReturnItems(items: List<PurchaseReturnItem>): List<Long> =
        purchaseReturnDao.insertItems(items)
    suspend fun maxPurchaseReturnSequence(): Long =
        purchaseReturnDao.maxInvoiceSequence()
    suspend fun sumPurchaseReturnsFor(purchaseId: Long): Long =
        purchaseReturnDao.sumRefundsForPurchase(purchaseId)

    // ============ مرتجعات البيع ============
    fun observeSaleReturns(): Flow<List<SaleReturn>> = saleReturnDao.observeAll()
    suspend fun getSaleReturns(saleId: Long): List<SaleReturn> = saleReturnDao.getBySale(saleId)
    suspend fun getSaleReturnItems(saleReturnId: Long): List<SaleReturnItem> =
        saleReturnDao.getItems(saleReturnId)
    suspend fun getAllSaleReturns(): List<SaleReturn> = saleReturnDao.getAll()
    suspend fun insertSaleReturn(saleReturn: SaleReturn): Long = saleReturnDao.insert(saleReturn)
    suspend fun insertSaleReturnItems(items: List<SaleReturnItem>): List<Long> =
        saleReturnDao.insertItems(items)
    suspend fun maxSaleReturnSequence(): Long = saleReturnDao.maxInvoiceSequence()
    suspend fun sumSaleReturnsFor(saleId: Long): Long = saleReturnDao.sumRefundsForSale(saleId)

    // ============ المصروفات ============
    fun observeExpenses(): Flow<List<Expense>> = expenseDao.observeAll()
    suspend fun getAllExpenses(): List<Expense> = expenseDao.getAll()
    suspend fun getExpensesInRange(dayStart: Long, dayEnd: Long): List<Expense> =
        expenseDao.getInRange(dayStart, dayEnd)
    suspend fun searchExpenses(query: String): List<Expense> = expenseDao.search(query)
    suspend fun insertExpense(expense: Expense): Long = expenseDao.insert(expense)
    suspend fun sumExpensesInRange(dayStart: Long, dayEnd: Long): Long =
        expenseDao.sumInRange(dayStart, dayEnd)
    suspend fun softDeleteExpense(id: Long) {
        expenseDao.softDelete(id)
    }
}
