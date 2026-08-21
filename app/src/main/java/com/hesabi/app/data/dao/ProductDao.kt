package com.hesabi.app.data.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.hesabi.app.domain.model.Product
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(product: Product): Long

    @Update
    suspend fun update(product: Product)

    @Delete
    suspend fun delete(product: Product)

    @Query("SELECT * FROM products WHERE isDeleted = 0 ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<Product>>

    @Query("SELECT * FROM products WHERE isDeleted = 0 ORDER BY updatedAt DESC")
    suspend fun getAll(): List<Product>

    @Query("SELECT * FROM products WHERE isDeleted = 0 AND id = :id")
    suspend fun getById(id: Long): Product?

    @Query("SELECT * FROM products WHERE isDeleted = 0 AND id = :id")
    fun observeById(id: Long): Flow<Product?>

    @Query("SELECT * FROM products WHERE isDeleted = 0 AND barcode = :barcode")
    suspend fun getByBarcode(barcode: String): Product?

    @Query("SELECT * FROM products WHERE isDeleted = 0 AND (barcode = :code OR internalCode = :code)")
    suspend fun getByBarcodeOrInternalCode(code: String): Product?

    @Query("""
        SELECT * FROM products WHERE isDeleted = 0
        AND (
            name LIKE '%' || :query || '%'
            OR barcode LIKE '%' || :query || '%'
            OR internalCode LIKE '%' || :query || '%'
        )
        ORDER BY updatedAt DESC
    """)
    suspend fun search(query: String): List<Product>

    /** المنتجات منخفضة المخزون أو النافدة */
    @Query("SELECT * FROM products WHERE isDeleted = 0 AND quantity <= minQuantity AND quantity > 0 ORDER BY quantity ASC")
    fun observeLowStock(): Flow<List<Product>>

    @Query("SELECT * FROM products WHERE isDeleted = 0 AND quantity <= 0")
    suspend fun getOutOfStock(): List<Product>

    @Query("SELECT COUNT(*) FROM products WHERE isDeleted = 0")
    suspend fun count(): Long

    /**
     * خصم الكمية من المخزون (لعملية بيع).
     * لا يسمح بالمخزون السالب — الإجراء يُفحص قبل الاستدعاء.
     */
    @Query("UPDATE products SET quantity = quantity - :amount, updatedAt = :now WHERE id = :productId")
    suspend fun decreaseQuantity(productId: Long, amount: Double, now: Long)

    @Query("UPDATE products SET quantity = :newQuantity, updatedAt = :now WHERE id = :productId")
    suspend fun setQuantity(productId: Long, newQuantity: Double, now: Long)

    /**
     * Soft delete: ضع علامة الحذف.
     * الحذف النهائي يُمنع نهائيًا لمنع إفساد الفواتير السابقة.
     */
    @Query("UPDATE products SET isDeleted = 1 WHERE id = :productId")
    suspend fun softDelete(productId: Long)

    @Query("UPDATE products SET isDeleted = 0 WHERE id = :productId")
    suspend fun restore(productId: Long)

    @Query("SELECT COUNT(*) FROM products WHERE isDeleted = 1")
    suspend fun countDeleted(): Long
}
