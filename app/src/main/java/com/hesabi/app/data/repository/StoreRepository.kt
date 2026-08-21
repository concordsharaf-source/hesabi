package com.hesabi.app.data.repository

import com.hesabi.app.data.dao.StoreDao
import com.hesabi.app.domain.model.Store

class StoreRepository(private val dao: StoreDao) {

    suspend fun save(store: Store) {
        val existing = dao.getStore()
        if (existing != null) {
            dao.insert(store.copy(id = existing.id))
        } else {
            dao.insert(store)
        }
    }

    suspend fun getStore(): Store? = dao.getStore()
}
