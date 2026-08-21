package com.hesabi.app.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.hesabi.app.domain.model.StockMovement
import kotlinx.coroutines.flow.Flow

@Dao
interface StockMovementDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(movement: StockMovement): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(movements: List<StockMovement>): List<Long>

    @Query("SELECT * FROM stock_movements WHERE productId = :productId ORDER BY date DESC")
    fun observeByProduct(productId: Long): Flow<List<StockMovement>>

    @Query("SELECT * FROM stock_movements WHERE productId = :productId ORDER BY date DESC")
    suspend fun getByProduct(productId: Long): List<StockMovement>

    @Query("SELECT COUNT(*) FROM stock_movements WHERE productId = :productId")
    suspend fun countByProduct(productId: Long): Long
}
