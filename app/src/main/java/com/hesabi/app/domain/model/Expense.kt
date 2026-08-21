package com.hesabi.app.domain.model

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * أنواع المصروفات — قابلة للتوسع لاحقًا.
 */
enum class ExpenseType(val label: String) {
    RENT("إيجار"),
    ELECTRICITY("كهرباء"),
    WATER("ماء"),
    INTERNET("إنترنت"),
    SALARIES("رواتب"),
    TRANSPORT("نقل"),
    MAINTENANCE("صيانة"),
    OTHER_PURCHASES("مشتريات أخرى"),
    GENERAL("مصروفات عامة")
}

/**
 * المصروف — المبلغ بوحدة العملة الصغرى (Long).
 */
@Entity(
    tableName = "expenses",
    indices = [Index(value = ["type"]), Index(value = ["date"])]
)
data class Expense(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    /** المبلغ بوحدة العملة الصغرى */
    val amount: Long = 0L,
    val type: ExpenseType = ExpenseType.GENERAL,
    val description: String,
    val date: Long = System.currentTimeMillis(),
    val notes: String? = null,
    val isDeleted: Boolean = false
)
