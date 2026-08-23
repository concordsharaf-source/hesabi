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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

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
    lateinit var customerDao: com.hesabi.app.data.dao.CustomerDao
        private set
    lateinit var cashMovementDao: com.hesabi.app.data.dao.CashMovementDao
        private set
    lateinit var customerTransactionDao: com.hesabi.app.data.dao.CustomerTransactionDao
        private set
    lateinit var supplierTransactionDao: com.hesabi.app.data.dao.SupplierTransactionDao
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
    lateinit var userRepository: com.hesabi.app.data.repository.UserRepository
        private set
    lateinit var authUseCase: com.hesabi.app.domain.AuthUseCase
        private set
    lateinit var paymentUseCase: com.hesabi.app.domain.PaymentUseCase
        private set
    lateinit var professionalReturnUseCase: com.hesabi.app.domain.ReturnUseCase
        private set
    
    lateinit var db: com.hesabi.app.data.db.AppDatabase
        private set
    
    lateinit var stockMovementDao: com.hesabi.app.data.dao.StockMovementDao
        private set
    
    lateinit var returnUseCase: com.hesabi.app.domain.ReturnUseCase
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
        checkoutUseCase = CheckoutUseCase(
            db.productDao(),
            db.saleDao(),
            db.stockMovementDao(),
            db.cashMovementDao(),
            db.customerTransactionDao(),
            db.customerDao()
        )
        movementDao = db.stockMovementDao()
        saleDao = db.saleDao()
        expenseDao = db.expenseDao()
        customerDao = db.customerDao()
        cashMovementDao = db.cashMovementDao()
        customerTransactionDao = db.customerTransactionDao()
        supplierTransactionDao = db.supplierTransactionDao()

        purchaseRepository = PurchaseRepository(
            db.supplierDao(),
            db.purchaseDao(),
            db.purchaseReturnDao(),
            db.saleReturnDao(),
            db.expenseDao()
        )
        purchaseUseCase = PurchaseUseCase(
            db.productDao(),
            db.purchaseDao(),
            db.stockMovementDao(),
            db.cashMovementDao(),
            db.supplierDao(),
            db.supplierTransactionDao()
        )
        purchaseReturnUseCase = PurchaseReturnUseCase(
            db.purchaseDao(), db.purchaseReturnDao(), db.productDao(), db.stockMovementDao()
        )
        saleReturnUseCase = SaleReturnUseCase(
            db.saleDao(), db.saleReturnDao(), db.productDao(), db.stockMovementDao()
        )
        expenseUseCase = ExpenseUseCase(db.expenseDao(), db.cashMovementDao())
        profitUseCase = ProfitUseCase(
            db.saleDao(),
            db.saleReturnDao(),
            db.purchaseDao(),
            db.purchaseReturnDao(),
            db.expenseDao()
        )
        userRepository = com.hesabi.app.data.repository.UserRepository(db.userDao())
        authUseCase = com.hesabi.app.domain.AuthUseCase(userRepository)
        
        paymentUseCase = com.hesabi.app.domain.PaymentUseCase(
            db = db,
            customerDao = db.customerDao(),
            customerTransactionDao = db.customerTransactionDao(),
            supplierDao = db.supplierDao(),
            supplierTransactionDao = db.supplierTransactionDao(),
            cashMovementDao = db.cashMovementDao()
        )

        professionalReturnUseCase = com.hesabi.app.domain.ReturnUseCase(
            db = db,
            saleDao = db.saleDao(),
            saleReturnDao = db.saleReturnDao(),
            purchaseDao = db.purchaseDao(),
            purchaseReturnDao = db.purchaseReturnDao(),
            productDao = db.productDao(),
            stockMovementDao = db.stockMovementDao(),
            cashMovementDao = db.cashMovementDao(),
            customerDao = db.customerDao(),
            customerTransactionDao = db.customerTransactionDao(),
            supplierDao = db.supplierDao(),
            supplierTransactionDao = db.supplierTransactionDao()
        )
        this.db = db
        this.stockMovementDao = db.stockMovementDao()
        this.returnUseCase = professionalReturnUseCase

        // إنشاء أول مدير تلقائياً إذا كان النظام فارغاً
        CoroutineScope(Dispatchers.IO + SupervisorJob()).launch {
            userRepository.createFirstAdminIfNeeded()
        }
    }
}
