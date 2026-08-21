package com.hesabi.app.domain

import com.hesabi.app.data.dao.ExpenseDao
import com.hesabi.app.data.dao.PurchaseDao
import com.hesabi.app.data.dao.PurchaseReturnDao
import com.hesabi.app.data.dao.SaleDao
import com.hesabi.app.data.dao.SaleReturnDao

/**
 * ملخص الربح لفترة معينة — بوحدة العملة الصغرى (Long).
 *
 * الإيرادات: إجمالي فواتير البيع − مرتجعات البيع
 * تكلفة البضاعة المباعة: مجموع (سعر الشراء × الكمية) لكل بند بيع (من snapshot وقت البيع)
 * المصروفات: مجموع المصروفات
 * إجمالي الربح = الإيرادات − تكلفة البضاعة
 * صافي الربح = إجمالي الربح − المصروفات
 */
data class ProfitSummary(
    val revenue: Long,
    val salesRefunds: Long,
    val netRevenue: Long,
    val costOfGoodsSold: Long,
    val grossProfit: Long,
    val expenses: Long,
    val netProfit: Long
)

/**
 * ملخص الشراء لفترة معينة.
 */
data class PurchasingSummary(
    val purchases: Long,
    val purchaseReturns: Long,
    val netPurchases: Long
)

/**
 * منطق الأرباح والتقارير.
 */
class ProfitUseCase(
    private val saleDao: SaleDao,
    private val saleReturnDao: SaleReturnDao,
    private val purchaseDao: PurchaseDao,
    private val purchaseReturnDao: PurchaseReturnDao,
    private val expenseDao: ExpenseDao
) {
    /**
     * ملخص الربح في فترة [dayStart, dayEnd).
     */
    suspend fun calculateProfit(dayStart: Long, dayEnd: Long): ProfitSummary {
        // الإيرادات
        val salesTotal = saleDao.sumTotalsInRange(dayStart, dayEnd)
        val saleRefunds = saleReturnDao.sumRefundsInRange(dayStart, dayEnd)
        val netRevenue = (salesTotal - saleRefunds).coerceAtLeast(0L)

        // تكلفة البضاعة المباعة: بنود فواتير البيع في الفترة
        val saleItems = saleDao.getItemsInRange(dayStart, dayEnd)
        val costOfGoodsSold = saleItems.sumOf { item -> item.costPrice * item.quantity.toLong() }

        // المصروفات
        val expenses = expenseDao.sumInRange(dayStart, dayEnd)

        val grossProfit = netRevenue - costOfGoodsSold
        val netProfit = grossProfit - expenses

        return ProfitSummary(
            revenue = salesTotal,
            salesRefunds = saleRefunds,
            netRevenue = netRevenue,
            costOfGoodsSold = costOfGoodsSold,
            grossProfit = grossProfit,
            expenses = expenses,
            netProfit = netProfit
        )
    }

    /**
     * ملخص المشتريات في فترة [dayStart, dayEnd).
     */
    suspend fun calculatePurchases(dayStart: Long, dayEnd: Long): PurchasingSummary {
        val purchases = purchaseDao.sumTotalsInRange(dayStart, dayEnd)
        val returns = purchaseReturnDao.sumRefundsInRange(dayStart, dayEnd)
        return PurchasingSummary(
            purchases = purchases,
            purchaseReturns = returns,
            netPurchases = (purchases - returns).coerceAtLeast(0L)
        )
    }
}
