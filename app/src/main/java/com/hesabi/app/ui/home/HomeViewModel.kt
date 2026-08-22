package com.hesabi.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hesabi.app.HesabiApp
import com.hesabi.app.domain.SaleCalculator
import com.hesabi.app.domain.model.Store
import com.hesabi.app.util.endOfDay
import com.hesabi.app.util.startOfDay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

import com.hesabi.app.domain.model.UserRole

data class HomeUiState(
    val store: Store? = null,
    val todaySalesTotal: Long = 0L,
    val todayInvoiceCount: Long = 0L,
    val productCount: Long = 0L,
    val inventoryValue: Long = 0L,
    val lowStockCount: Int = 0,
    val currencySymbol: String = "",
    // المرحلة الثانية: مشتريات اليوم ومصروفاته وصافي الربح اليومي
    val todayNetPurchases: Long = 0L,
    val todayExpenses: Long = 0L,
    val todayNetProfit: Long = 0L,
    val userRole: UserRole = UserRole.ADMIN // افتراضي أدمن حتى نطبق تسجيل الدخول
)

/**
 * ViewModel الصفحة الرئيسية — Dashboard.
 * تعرض: مبيعات اليوم، عدد فواتير اليوم، عدد المنتجات، قيمة المخزون، المنتجات منخفضة المخزون.
 */
class HomeViewModel(app: HesabiApp) : ViewModel() {

    private val settingsUseCase = app.settingsUseCase
    private val productRepository = app.productRepository
    private val saleRepository = app.saleRepository

    private val trigger = MutableStateFlow(System.currentTimeMillis())

        // قراءة بيانات المتجر مرة واحدة عند إنشاء الـ ViewModel (بدون runBlocking)
    private val storeHolder = MutableStateFlow<Store?>(null)

    // المرحلة الثانية
    private val purchaseRepository = app.purchaseRepository
    private val purchases = app.purchaseRepository.observePurchases()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    private val purchaseReturns = app.purchaseRepository.observePurchaseReturns()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    private val expenses = app.purchaseRepository.observeExpenses()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    init {
        viewModelScope.launch {
            storeHolder.value = runCatching { settingsUseCase.getStore() }.getOrNull()
        }
    }

    private val itemsInRange = trigger.map { now ->
        val dayStart = startOfDay(now)
        val dayEnd = endOfDay(now)
        saleRepository.getItemsInRange(dayStart, dayEnd)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    val state: StateFlow<HomeUiState> = combine(
        productRepository.observeAll(),
        saleRepository.observeAll(),
        purchases,
        purchaseReturns,
        expenses,
        trigger,
        storeHolder,
        itemsInRange
    ) { values: Array<Any?> ->
        @Suppress("UNCHECKED_CAST")
        val products = values[0] as List<com.hesabi.app.domain.model.Product>
        @Suppress("UNCHECKED_CAST")
        val sales = values[1] as List<com.hesabi.app.domain.model.Sale>
        @Suppress("UNCHECKED_CAST")
        val purchasesList = values[2] as List<com.hesabi.app.domain.model.Purchase>
        @Suppress("UNCHECKED_CAST")
        val purchaseReturnsList = values[3] as List<com.hesabi.app.domain.model.PurchaseReturn>
        @Suppress("UNCHECKED_CAST")
        val expensesList = values[4] as List<com.hesabi.app.domain.model.Expense>
        val now = values[5] as Long
        val store = values[6] as Store?
        @Suppress("UNCHECKED_CAST")
        val todayItems = values[7] as List<com.hesabi.app.domain.model.SaleItem>
        val dayStart = startOfDay(now)
        val dayEnd = endOfDay(now)
        val todaySales = sales.filter { it.date in dayStart..dayEnd }
        val todayTotal = todaySales.sumOf { it.total }

        // المرحلة الثانية: مشتريات اليوم ومصروفاته
        val todayPurchases = purchasesList.filter { it.date in dayStart..dayEnd }
        val todayPurchaseTotal = todayPurchases.sumOf { it.total }
        val todayPurchaseReturns = purchaseReturnsList.filter { it.date in dayStart..dayEnd }
            .sumOf { it.totalRefunded }
        val todayNetPurchases = (todayPurchaseTotal - todayPurchaseReturns).coerceAtLeast(0L)
        val todayExpenseTotal = expensesList.filter { it.date in dayStart..dayEnd }.sumOf { it.amount }

        // صافي الربح اليومي التقديري: إجمالي الفواتير − تكلفة بنود فواتير اليوم − المصروفات
        val todayCostOfSales = todayItems.sumOf { it.costPrice * it.quantity.toLong() }
        val todayNetProfit = todayTotal - todayCostOfSales - todayExpenseTotal
        HomeUiState(
            store = store,
            todaySalesTotal = todayTotal,
            todayInvoiceCount = todaySales.size.toLong(),
            productCount = products.size.toLong(),
            inventoryValue = SaleCalculator.calculateInventoryValue(products),
            lowStockCount = products.count { it.quantity <= it.minQuantity && it.quantity > 0 },
            currencySymbol = store?.currencySymbol ?: "",
            todayNetPurchases = todayNetPurchases,
            todayExpenses = todayExpenseTotal,
            todayNetProfit = todayNetProfit
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = HomeUiState()
    )

    /** إعادة تحميل الإحصائيات */
    fun refresh() {
        trigger.value = System.currentTimeMillis()
    }
}
