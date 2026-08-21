package com.hesabi.app.data.repository

import com.hesabi.app.data.dao.ProductDao
import com.hesabi.app.domain.model.Product

class ProductRepository(private val dao: ProductDao) {

    fun observeAll() = dao.observeAll()

    suspend fun getAll() = dao.getAll()

    suspend fun getById(id: Long) = dao.getById(id)

    fun observeById(id: Long) = dao.observeById(id)

    suspend fun getByBarcode(barcode: String) = dao.getByBarcode(barcode)

    suspend fun getByBarcodeOrInternalCode(code: String) =
        dao.getByBarcodeOrInternalCode(code)

    suspend fun search(query: String) = dao.search(query)

    fun observeLowStock() = dao.observeLowStock()

    suspend fun count() = dao.count()

    suspend fun insert(product: Product): Long = dao.insert(product)

    suspend fun update(product: Product) = dao.update(product)

    /**
     * Soft delete: يحفظ سلامة الفواتير السابقة.
     * لا يتم حذف المنتج نهائيًا أبدًا.
     */
    suspend fun softDelete(productId: Long) = dao.softDelete(productId)

    suspend fun restore(productId: Long) = dao.restore(productId)

    suspend fun countDeleted() = dao.countDeleted()
}
