package com.hesabi.app.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.hesabi.app.domain.model.CashMovement
import com.hesabi.app.domain.model.Customer
import com.hesabi.app.domain.model.CustomerTransaction
import com.hesabi.app.domain.model.SupplierTransaction
import kotlinx.coroutines.flow.Flow

@Dao
interface CustomerDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(customer: Customer): Long

    @Update
    suspend fun update(customer: Customer)

    @Query("SELECT * FROM customers WHERE isDeleted = 0 ORDER BY name ASC")
    fun observeAll(): Flow<List<Customer>>

    @Query("SELECT * FROM customers WHERE isDeleted = 0 AND id = :id")
    suspend fun getById(id: Long): Customer?

    @Query("SELECT * FROM customers WHERE isDeleted = 0 AND (name LIKE '%' || :query || '%' OR phone LIKE '%' || :query || '%')")
    suspend fun search(query: String): List<Customer>

    @Query("SELECT * FROM customers WHERE isDeleted = 0 ORDER BY name ASC")
    suspend fun getAll(): List<Customer>

    @Query("UPDATE customers SET isDeleted = 1 WHERE id = :id")
    suspend fun softDelete(id: Long)
}

@Dao
interface CashMovementDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(movement: CashMovement): Long

    @Query("SELECT * FROM cash_movements ORDER BY date DESC")
    fun observeAll(): Flow<List<CashMovement>>

    @Query("SELECT COALESCE(SUM(amount), 0) FROM cash_movements")
    fun observeBalance(): Flow<Long>

    @Query("SELECT COALESCE(SUM(amount), 0) FROM cash_movements")
    suspend fun getBalance(): Long

    @Query("SELECT COALESCE(SUM(amount), 0) FROM cash_movements WHERE date < :timestamp")
    suspend fun getBalanceBefore(timestamp: Long): Long

    @Query("SELECT * FROM cash_movements WHERE date >= :start AND date < :end ORDER BY date DESC")
    suspend fun getInRange(start: Long, end: Long): List<CashMovement>
}

@Dao
interface CustomerTransactionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(transaction: CustomerTransaction): Long

    @Query("SELECT * FROM customer_transactions WHERE customerId = :customerId ORDER BY date DESC")
    fun observeByCustomer(customerId: Long): Flow<List<CustomerTransaction>>

    @Query("SELECT COALESCE(SUM(remaining), 0) FROM customer_transactions WHERE customerId = :customerId")
    fun observeCustomerDebt(customerId: Long): Flow<Long>

    @Query("SELECT COALESCE(SUM(remaining), 0) FROM customer_transactions")
    fun observeTotalDebts(): Flow<Long>

    @Query("SELECT * FROM customer_transactions WHERE customerId = :customerId AND remaining > 0 ORDER BY date ASC")
    suspend fun getPendingInvoices(customerId: Long): List<CustomerTransaction>

    @Update
    suspend fun update(transaction: CustomerTransaction)
}

@Dao
interface SupplierTransactionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(transaction: SupplierTransaction): Long

    @Query("SELECT * FROM supplier_transactions WHERE supplierId = :supplierId ORDER BY date DESC")
    fun observeBySupplier(supplierId: Long): Flow<List<SupplierTransaction>>

    @Query("SELECT COALESCE(SUM(remaining), 0) FROM supplier_transactions WHERE supplierId = :supplierId")
    fun observeSupplierDebt(supplierId: Long): Flow<Long>

    @Query("SELECT COALESCE(SUM(remaining), 0) FROM supplier_transactions")
    fun observeTotalSupplierDebts(): Flow<Long>

    @Query("SELECT * FROM supplier_transactions WHERE supplierId = :supplierId AND remaining > 0 ORDER BY date ASC")
    suspend fun getPendingSupplierInvoices(supplierId: Long): List<SupplierTransaction>

    @Update
    suspend fun update(transaction: SupplierTransaction)
}
