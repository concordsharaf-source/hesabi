package com.hesabi.app

import android.app.Application
import com.hesabi.app.data.repository.ProductRepository
import com.hesabi.app.data.repository.PurchaseRepository
import com.hesabi.app.data.repository.SaleRepository
import com.hesabi.app.data.repository.StoreRepository
import com.hesabi.app.di.DatabaseProvider
import com.hesabi.app.data.dao.ExpenseDao
import com.hesabi.app.data.dao.SaleDao
import com.hesabi.app.data.dao.StockMovementDao
import com.hesabi.app.domain.CheckoutUseCase
import com.hesabi.app.domain.ExpenseUseCase
import com.hesabi.app.domain.InventoryUseCase
import com.hesabi.app.domain.ProductUseCase
import com.hesabi.app.domain.ProfitUseCase
import com.hesabi.app.domain.PurchaseReturnUseCase
import com.hesabi.app.domain.PurchaseUseCase
import com.hesabi.app.domain.SaleReturnUseCase
import com.hesabi.app.domain.SettingsUseCase

/**
 * فئة التطبيق — تنشيء المكونات الأساسية (Repositories + UseCases)
 * لتكون متاحة لكل الـ ViewModels.
 */
class HesabiApp : Application() {

    lateinit var storeRepository: StoreRepository
        private set
    lateinit var productRepository: ProductRepository
        private set
    lateinit var saleRepository: SaleRepository
        private set

    lateinit var settingsUseCase: SettingsUseCase
        private set
    lateinit var productUseCase: ProductUseCase
        private set
    lateinit var inventoryUseCase: InventoryUseCase
        private set
    lateinit var checkoutUseCase: CheckoutUseCase
        private set
    lateinit var movementDao: StockMovementDao
        private set
    lateinit var saleDao: SaleDao
        private set
    lateinit var expenseDao: ExpenseDao
        private set

    // المرحلة الثانية: الموردون، المشتريات، المرتجعات، المصروفات، الأرباح
    lateinit var purchaseRepository: PurchaseRepository
        private set
    lateinit var purchaseUseCase: PurchaseUseCase
        private set
    lateinit var purchaseReturnUseCase: PurchaseReturnUseCase
        private set
    lateinit var saleReturnUseCase: SaleReturnUseCase
        private set
    lateinit var expenseUseCase: ExpenseUseCase
        private set
    lateinit var profitUseCase: ProfitUseCase
        private set

    override fun onCreate() {
        super.onCreate()
        val db = DatabaseProvider.get(this)
        storeRepository = StoreRepository(db.storeDao())
        productRepository = ProductRepository(db.productDao())
        saleRepository = SaleRepository(db.saleDao(), db.stockMovementDao())

        settingsUseCase = SettingsUseCase(storeRepository)
        productUseCase = ProductUseCase(db.productDao(), db.stockMovementDao())
        inventoryUseCase = InventoryUseCase(db.productDao(), db.stockMovementDao())
        checkoutUseCase = CheckoutUseCase(db.productDao(), db.saleDao(), db.stockMovementDao())
        movementDao = db.stockMovementDao()
        saleDao = db.saleDao()
        expenseDao = db.expenseDao()

        purchaseRepository = PurchaseRepository(
            db.supplierDao(),
            db.purchaseDao(),
            db.purchaseReturnDao(),
            db.saleReturnDao(),
            db.expenseDao()
        )
        purchaseUseCase = PurchaseUseCase(db.productDao(), db.purchaseDao(), db.stockMovementDao())
        purchaseReturnUseCase = PurchaseReturnUseCase(
            db.purchaseDao(), db.purchaseReturnDao(), db.productDao(), db.stockMovementDao()
        )
        saleReturnUseCase = SaleReturnUseCase(
            db.saleDao(), db.saleReturnDao(), db.productDao(), db.stockMovementDao()
        )
        expenseUseCase = ExpenseUseCase(db.expenseDao())
        profitUseCase = ProfitUseCase(
            db.saleDao(),
            db.saleReturnDao(),
            db.purchaseDao(),
            db.purchaseReturnDao(),
            db.expenseDao()
        )
    }
}
