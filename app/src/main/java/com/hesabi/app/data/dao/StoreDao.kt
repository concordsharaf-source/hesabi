package com.hesabi.app.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.hesabi.app.domain.model.Store

@Dao
interface StoreDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(store: Store): Long

    @Query("SELECT * FROM store LIMIT 1")
    suspend fun getStore(): Store?
}
