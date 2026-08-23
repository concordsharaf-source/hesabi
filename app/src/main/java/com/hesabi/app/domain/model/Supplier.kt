package com.hesabi.app.domain.model

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * المورد — Soft Delete: لا يُحذف نهائيًا إذا كان مرتبطًا بفواتير شراء.
 */
@Entity(
    tableName = "suppliers",
    indices = [Index(value = ["name"])]
)
data class Supplier(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val phone: String? = null,
    val address: String? = null,
    val notes: String? = null,
    val balance: Long = 0L,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isDeleted: Boolean = false
)
