package com.hesabi.app.data.repository

import com.hesabi.app.data.dao.SaleDao
import com.hesabi.app.data.dao.StockMovementDao
import com.hesabi.app.domain.model.MovementType
import com.hesabi.app.domain.model.Sale
import com.hesabi.app.domain.model.SaleItem
import com.hesabi.app.domain.model.StockMovement
import kotlinx.coroutines.flow.Flow

class SaleRepository(
    private val saleDao: SaleDao,
    private val movementDao: StockMovementDao
) {

    fun observeAll(): Flow<List<Sale>> = saleDao.observeAll()

    suspend fun getById(id: Long) = saleDao.getById(id)

    suspend fun getAll() = saleDao.getAll()

    suspend fun count() = saleDao.count()

    suspend fun getTodaySales(dayStart: Long, dayEnd: Long) =
        saleDao.getTodaySales(dayStart, dayEnd)

    suspend fun countToday(dayStart: Long, dayEnd: Long) =
        saleDao.countToday(dayStart, dayEnd)

    suspend fun sumTodayTotals(dayStart: Long, dayEnd: Long) =
        saleDao.sumTodayTotals(dayStart, dayEnd)

    suspend fun getItemsForSale(saleId: Long) =
        saleDao.getItemsForSale(saleId)

    suspend fun getItemsInRange(dayStart: Long, dayEnd: Long) =
        saleDao.getItemsInRange(dayStart, dayEnd)

    /**
     * إنشاء رقم فاتورة تسلسلي جديد: INV-000001, INV-000002 ...
     * لا يتكرر الرقم أبدًا لأنه يعتمد على أقصى رقم تسلسلي موجود.
     */
    suspend fun generateInvoiceNumber(): String {
        val next = saleDao.maxInvoiceSequence() + 1
        return String.format("INV-%06d", next)
    }

    suspend fun insertSale(sale: Sale): Long = saleDao.insert(sale)

    suspend fun insertSaleItems(items: List<SaleItem>) =
        saleDao.insertItems(items)

    suspend fun recordMovement(movement: StockMovement): Long =
        movementDao.insert(movement)

    suspend fun recordMovements(movements: List<StockMovement>) =
        movementDao.insertAll(movements)

    fun observeMovements(productId: Long) = movementDao.observeByProduct(productId)

    suspend fun getMovements(productId: Long) =
        movementDao.getByProduct(productId)

    suspend fun countMovements(productId: Long) =
        movementDao.countByProduct(productId)
}
