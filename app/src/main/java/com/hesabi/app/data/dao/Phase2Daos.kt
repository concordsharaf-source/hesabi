package com.hesabi.app.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
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
 * DAO الموردون — Soft Delete: لا حذف نهائي.
 */
@Dao
interface SupplierDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(supplier: Supplier): Long

    @Query("UPDATE suppliers SET name = :name, phone = :phone, address = :address, notes = :notes, updatedAt = :now WHERE id = :id")
    suspend fun update(id: Long, name: String, phone: String?, address: String?, notes: String?, now: Long)

    @Query("SELECT * FROM suppliers WHERE isDeleted = 0 ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<Supplier>>

    @Query("SELECT * FROM suppliers WHERE isDeleted = 0 ORDER BY updatedAt DESC")
    suspend fun getAll(): List<Supplier>

    @Query("SELECT * FROM suppliers WHERE isDeleted = 0 AND id = :id")
    suspend fun getById(id: Long): Supplier?

    @Query("""
        SELECT * FROM suppliers WHERE isDeleted = 0
        AND (name LIKE '%' || :query || '%' OR phone LIKE '%' || :query || '%')
        ORDER BY updatedAt DESC
    """)
    suspend fun search(query: String): List<Supplier>

    @Query("UPDATE suppliers SET isDeleted = 1 WHERE id = :id")
    suspend fun softDelete(id: Long)

    /** هل المورد مرتبط بفواتير شراء؟ لمنع الحذف النهائي */
    @Query("SELECT COUNT(*) FROM purchases WHERE supplierId = :id AND isDeleted = 0")
    suspend fun countPurchases(id: Long): Long
}

/**
 * DAO فواتير الشراء.
 */
@Dao
interface PurchaseDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(purchase: Purchase): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItems(items: List<PurchaseItem>): List<Long>

    @Query("SELECT * FROM purchases WHERE isDeleted = 0 ORDER BY date DESC")
    fun observeAll(): Flow<List<Purchase>>

    @Query("SELECT * FROM purchases WHERE isDeleted = 0 ORDER BY date DESC")
    suspend fun getAll(): List<Purchase>

    @Query("SELECT * FROM purchases WHERE isDeleted = 0 AND id = :id")
    suspend fun getById(id: Long): Purchase?

    @Query("SELECT * FROM purchases WHERE isDeleted = 0 AND invoiceNumber = :invoiceNumber")
    suspend fun getByInvoiceNumber(invoiceNumber: String): Purchase?

    @Query("SELECT * FROM purchases WHERE isDeleted = 0 AND supplierId = :supplierId ORDER BY date DESC")
    suspend fun getBySupplier(supplierId: Long): List<Purchase>

    /** إجمالي المشتريات في فترة معينة */
    @Query("""
        SELECT COALESCE(SUM(total), 0) FROM purchases WHERE isDeleted = 0
        AND date >= :dayStart AND date < :dayEnd
    """)
    suspend fun sumTotalsInRange(dayStart: Long, dayEnd: Long): Long

    /** بنود فواتير في فترة (لحساب التكلفة) */
    @Query("""
        SELECT pi.* FROM purchase_items pi
        INNER JOIN purchases p ON p.id = pi.purchaseId
        WHERE p.isDeleted = 0
        AND p.date >= :dayStart AND p.date < :dayEnd
    """)
    suspend fun getItemsInRange(dayStart: Long, dayEnd: Long): List<PurchaseItem>

    @Query("SELECT * FROM purchase_items WHERE purchaseId = :purchaseId")
    suspend fun getItemsForPurchase(purchaseId: Long): List<PurchaseItem>

    /** بند شراء واحد بالـ id — للمرتجعات */
    @Query("SELECT * FROM purchase_items WHERE id = :id")
    suspend fun getItemsByItemId(id: Long): PurchaseItem?

    @Query("""
        SELECT pi.*, p.supplierId, p.invoiceNumber AS purchaseInvoiceNumber
        FROM purchase_items pi
        INNER JOIN purchases p ON p.id = pi.purchaseId
        WHERE p.isDeleted = 0 AND pi.productId = :productId
        ORDER BY p.date ASC
    """)
    suspend fun getItemsByProduct(productId: Long): List<PurchaseItem>

    /**
     * آخر رقم تسلسلي لفواتير الشراء (PUR-000001).
     */
    @Query("SELECT COALESCE(MAX(CAST(SUBSTR(invoiceNumber, 5) AS INTEGER)), 0) FROM purchases")
    suspend fun maxInvoiceSequence(): Long
}

/**
 * DAO مرتجعات الشراء.
 */
@Dao
interface PurchaseReturnDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(purchaseReturn: PurchaseReturn): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItems(items: List<PurchaseReturnItem>): List<Long>

    @Query("SELECT * FROM purchase_returns WHERE isDeleted = 0 ORDER BY date DESC")
    fun observeAll(): Flow<List<PurchaseReturn>>

    @Query("SELECT * FROM purchase_returns WHERE isDeleted = 0 ORDER BY date DESC")
    suspend fun getAll(): List<PurchaseReturn>

    @Query("SELECT * FROM purchase_returns WHERE isDeleted = 0 AND id = :id")
    suspend fun getById(id: Long): PurchaseReturn?

    @Query("SELECT * FROM purchase_returns WHERE isDeleted = 0 AND purchaseId = :purchaseId ORDER BY date ASC")
    suspend fun getByPurchase(purchaseId: Long): List<PurchaseReturn>

    @Query("SELECT * FROM purchase_return_items WHERE purchaseReturnId = :purchaseReturnId")
    suspend fun getItems(purchaseReturnId: Long): List<PurchaseReturnItem>

    /** مجموع الكميات المرتجعة من بند شراء معين — لمنع تجاوز القابل للرجوع */
    @Query("SELECT COALESCE(SUM(quantity), 0) FROM purchase_return_items WHERE purchaseItemId = :purchaseItemId")
    suspend fun sumReturnedForItem(purchaseItemId: Long): Double

    /** إجمالي المرتجعات لفاتورة شراء معينة */
    @Query("""
        SELECT COALESCE(SUM(totalRefunded), 0) FROM purchase_returns
        WHERE isDeleted = 0 AND purchaseId = :purchaseId
    """)
    suspend fun sumRefundsForPurchase(purchaseId: Long): Long

    /** المبلغ المرتجع من مورد في فترة */
    @Query("""
        SELECT COALESCE(SUM(totalRefunded), 0) FROM purchase_returns WHERE isDeleted = 0
        AND date >= :dayStart AND date < :dayEnd
    """)
    suspend fun sumRefundsInRange(dayStart: Long, dayEnd: Long): Long

    /** آخر رقم تسلسلي (PURR-000001) */
    @Query("SELECT COALESCE(MAX(CAST(SUBSTR(invoiceNumber, 6) AS INTEGER)), 0) FROM purchase_returns")
    suspend fun maxInvoiceSequence(): Long
}

/**
 * DAO مرتجعات البيع.
 */
@Dao
interface SaleReturnDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(saleReturn: SaleReturn): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItems(items: List<SaleReturnItem>): List<Long>

    @Query("SELECT * FROM sale_returns WHERE isDeleted = 0 ORDER BY date DESC")
    fun observeAll(): Flow<List<SaleReturn>>

    @Query("SELECT * FROM sale_returns WHERE isDeleted = 0 ORDER BY date DESC")
    suspend fun getAll(): List<SaleReturn>

    @Query("SELECT * FROM sale_returns WHERE isDeleted = 0 AND id = :id")
    suspend fun getById(id: Long): SaleReturn?

    @Query("SELECT * FROM sale_returns WHERE isDeleted = 0 AND saleId = :saleId ORDER BY date ASC")
    suspend fun getBySale(saleId: Long): List<SaleReturn>

    @Query("SELECT * FROM sale_return_items WHERE saleReturnId = :saleReturnId")
    suspend fun getItems(saleReturnId: Long): List<SaleReturnItem>

    /** مجموع الكميات المرتجعة من بند بيع معين — لمنع تجاوز القابل للإرجاع */
    @Query("SELECT COALESCE(SUM(quantity), 0) FROM sale_return_items WHERE saleItemId = :saleItemId")
    suspend fun sumReturnedForItem(saleItemId: Long): Double

    /** إجمالي المرتجعات لفاتورة بيع معينة */
    @Query("""
        SELECT COALESCE(SUM(totalRefunded), 0) FROM sale_returns
        WHERE isDeleted = 0 AND saleId = :saleId
    """)
    suspend fun sumRefundsForSale(saleId: Long): Long

    /** المبلغ المسترد للعملاء في فترة */
    @Query("""
        SELECT COALESCE(SUM(totalRefunded), 0) FROM sale_returns WHERE isDeleted = 0
        AND date >= :dayStart AND date < :dayEnd
    """)
    suspend fun sumRefundsInRange(dayStart: Long, dayEnd: Long): Long

    /** آخر رقم تسلسلي (SR-000001) */
    @Query("SELECT COALESCE(MAX(CAST(SUBSTR(invoiceNumber, 4) AS INTEGER)), 0) FROM sale_returns")
    suspend fun maxInvoiceSequence(): Long
}

/**
 * DAO المصروفات.
 */
@Dao
interface ExpenseDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(expense: Expense): Long

    @Query("SELECT * FROM expenses WHERE isDeleted = 0 ORDER BY date DESC")
    fun observeAll(): Flow<List<Expense>>

    @Query("SELECT * FROM expenses WHERE isDeleted = 0 ORDER BY date DESC")
    suspend fun getAll(): List<Expense>

    @Query("SELECT * FROM expenses WHERE isDeleted = 0 AND id = :id")
    suspend fun getById(id: Long): Expense?

    @Query("""
        SELECT * FROM expenses WHERE isDeleted = 0
        AND (description LIKE '%' || :query || '%' OR notes LIKE '%' || :query || '%')
        ORDER BY date DESC
    """)
    suspend fun search(query: String): List<Expense>

    @Query("SELECT * FROM expenses WHERE isDeleted = 0 AND date >= :dayStart AND date < :dayEnd ORDER BY date DESC")
    suspend fun getInRange(dayStart: Long, dayEnd: Long): List<Expense>

    @Query("""
        SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE isDeleted = 0
        AND date >= :dayStart AND date < :dayEnd
    """)
    suspend fun sumInRange(dayStart: Long, dayEnd: Long): Long

    @Query("UPDATE expenses SET isDeleted = 1 WHERE id = :id")
    suspend fun softDelete(id: Long)
}
