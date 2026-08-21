package com.hesabi.app.domain

import com.hesabi.app.data.dao.ExpenseDao
import com.hesabi.app.domain.model.Expense
import com.hesabi.app.domain.model.ExpenseType
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/**
 * نتيجة إضافة مصروف.
 */
sealed class ExpenseResult {
    data class Success(val expense: Expense) : ExpenseResult()
    data class Failure(val message: String) : ExpenseResult()
}

/**
 * منطق المصروفات: إضافة/حذف/قائمة.
 */
class ExpenseUseCase(
    private val expenseDao: ExpenseDao
) {
    private val mutex = Mutex()

    suspend fun addExpense(
        amount: Long,
        type: ExpenseType,
        description: String,
        notes: String?,
        date: Long = System.currentTimeMillis()
    ): ExpenseResult {
        return mutex.withLock {
            if (description.isBlank()) {
                return@withLock ExpenseResult.Failure("أدخل وصفًا للمصروف")
            }
            if (amount <= 0L) {
                return@withLock ExpenseResult.Failure("المبلغ يجب أن يكون أكبر من صفر")
            }
            val expense = Expense(
                amount = amount,
                type = type,
                description = description.trim(),
                date = date,
                notes = notes
            )
            val id = expenseDao.insert(expense)
            ExpenseResult.Success(expense.copy(id = id))
        }
    }

    suspend fun deleteExpense(id: Long) {
        expenseDao.softDelete(id)
    }

    fun observeAll() = expenseDao.observeAll()

    suspend fun search(query: String) = expenseDao.search(query)

    suspend fun getInRange(dayStart: Long, dayEnd: Long) =
        expenseDao.getInRange(dayStart, dayEnd)

    suspend fun sumInRange(dayStart: Long, dayEnd: Long) =
        expenseDao.sumInRange(dayStart, dayEnd)
}
