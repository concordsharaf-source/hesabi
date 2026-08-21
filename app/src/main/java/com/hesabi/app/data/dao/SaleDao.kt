package com.hesabi.app.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.hesabi.app.domain.model.Sale
import com.hesabi.app.domain.model.SaleItem
import kotlinx.coroutines.flow.Flow

@Dao
interface SaleDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(sale: Sale): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertItems(items: List<SaleItem>): List<Long>

    @Query("SELECT * FROM sales WHERE isDeleted = 0 ORDER BY date DESC")
    fun observeAll(): Flow<List<Sale>>

    @Query("SELECT * FROM sales WHERE isDeleted = 0 ORDER BY date DESC")
    suspend fun getAll(): List<Sale>

    @Query("SELECT * FROM sales WHERE isDeleted = 0 AND id = :id")
    suspend fun getById(id: Long): Sale?

    @Query("SELECT * FROM sales WHERE isDeleted = 0 AND invoiceNumber = :invoiceNumber")
    suspend fun getByInvoiceNumber(invoiceNumber: String): Sale?

    @Query("SELECT COUNT(*) FROM sales WHERE isDeleted = 0")
    suspend fun count(): Long

    /** فواتير اليوم */
    @Query("""
        SELECT * FROM sales WHERE isDeleted = 0
        AND date >= :dayStart AND date < :dayEnd
        ORDER BY date DESC
    """)
    suspend fun getTodaySales(dayStart: Long, dayEnd: Long): List<Sale>

    @Query("""
        SELECT COUNT(*) FROM sales WHERE isDeleted = 0
        AND date >= :dayStart AND date < :dayEnd
    """)
    suspend fun countToday(dayStart: Long, dayEnd: Long): Long

    /** إجمالي مبيعات اليوم بوحدة العملة الصغرى */
    @Query("""
        SELECT COALESCE(SUM(total), 0) FROM sales WHERE isDeleted = 0
        AND date >= :dayStart AND date < :dayEnd
    """)
    suspend fun sumTodayTotals(dayStart: Long, dayEnd: Long): Long

    @Query("SELECT * FROM sale_items WHERE saleId = :saleId")
    suspend fun getItemsForSale(saleId: Long): List<SaleItem>

    /** بند فاتورة بيع واحد بالـ id — للمرتجعات */
    @Query("SELECT * FROM sale_items WHERE id = :id")
    suspend fun getItemById(id: Long): SaleItem?

    /** بنود فواتير البيع في فترة (لحساب تكلفة البضاعة المباعة) */
    @Query("""
        SELECT si.* FROM sale_items si
        INNER JOIN sales s ON s.id = si.saleId
        WHERE s.isDeleted = 0
        AND s.date >= :dayStart AND s.date < :dayEnd
    """)
    suspend fun getItemsInRange(dayStart: Long, dayEnd: Long): List<SaleItem>

    /** إجمالي فواتير البيع في فترة بوحدة العملة الصغرى */
    @Query("""
        SELECT COALESCE(SUM(total), 0) FROM sales WHERE isDeleted = 0
        AND date >= :dayStart AND date < :dayEnd
    """)
    suspend fun sumTotalsInRange(dayStart: Long, dayEnd: Long): Long

    /**
     * آخر رقم تسلسلي للفواتير لإنشاء رقم جديد متسلسل.
     * يضمن عدم تكرار أرقام الفواتير حتى مع الحذف.
     */
    @Query("SELECT COALESCE(MAX(CAST(SUBSTR(invoiceNumber, 5) AS INTEGER)), 0) FROM sales")
    suspend fun maxInvoiceSequence(): Long
}
