package com.hesabi.app.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import com.hesabi.app.data.dao.ExpenseDao
import com.hesabi.app.data.dao.ProductDao
import com.hesabi.app.data.dao.PurchaseDao
import com.hesabi.app.data.dao.PurchaseReturnDao
import com.hesabi.app.data.dao.SaleDao
import com.hesabi.app.data.dao.SaleReturnDao
import com.hesabi.app.data.dao.StockMovementDao
import com.hesabi.app.data.dao.StoreDao
import com.hesabi.app.data.dao.SupplierDao
import com.hesabi.app.data.dao.CustomerDao
import com.hesabi.app.data.dao.CashMovementDao
import com.hesabi.app.data.dao.CustomerTransactionDao
import com.hesabi.app.domain.model.Expense
import com.hesabi.app.domain.model.ExpenseType
import com.hesabi.app.domain.model.MovementType
import com.hesabi.app.domain.model.PaymentMethod
import com.hesabi.app.domain.model.Product
import com.hesabi.app.domain.model.Purchase
import com.hesabi.app.domain.model.PurchaseItem
import com.hesabi.app.domain.model.PurchaseReturn
import com.hesabi.app.domain.model.PurchaseReturnItem
import com.hesabi.app.domain.model.Sale
import com.hesabi.app.domain.model.SaleItem
import com.hesabi.app.domain.model.SaleReturn
import com.hesabi.app.domain.model.SaleReturnItem
import com.hesabi.app.domain.model.StockMovement
import com.hesabi.app.domain.model.Store
import com.hesabi.app.domain.model.Supplier
import com.hesabi.app.domain.model.Customer
import com.hesabi.app.domain.model.CashMovement
import com.hesabi.app.domain.model.CustomerTransaction
import com.hesabi.app.domain.model.CashMovementType
import com.hesabi.app.domain.model.CustomerTransactionType
import com.hesabi.app.domain.model.PurchasePaymentType
import com.hesabi.app.domain.model.SalePaymentType
import com.hesabi.app.domain.model.User
import com.hesabi.app.domain.model.UserRole
import com.hesabi.app.data.dao.UserDao

@Database(
    entities = [
        Store::class,
        Product::class,
        Sale::class,
        SaleItem::class,
        StockMovement::class,
        Supplier::class,
        Purchase::class,
        PurchaseItem::class,
        PurchaseReturn::class,
        PurchaseReturnItem::class,
        SaleReturn::class,
        SaleReturnItem::class,
        Expense::class,
        Customer::class,
        CashMovement::class,
        CustomerTransaction::class,
        User::class
    ],
    version = 4,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun storeDao(): StoreDao
    abstract fun productDao(): ProductDao
    abstract fun saleDao(): SaleDao
    abstract fun stockMovementDao(): StockMovementDao
    abstract fun supplierDao(): SupplierDao
    abstract fun purchaseDao(): PurchaseDao
    abstract fun purchaseReturnDao(): PurchaseReturnDao
    abstract fun saleReturnDao(): SaleReturnDao
    abstract fun expenseDao(): ExpenseDao
    abstract fun customerDao(): CustomerDao
    abstract fun cashMovementDao(): CashMovementDao
    abstract fun customerTransactionDao(): CustomerTransactionDao
    abstract fun userDao(): UserDao
}

class Converters {

    @TypeConverter
    fun paymentMethodToValue(method: PaymentMethod): String = method.name

    @TypeConverter
    fun valueToPaymentMethod(value: String): PaymentMethod =
        runCatching { PaymentMethod.valueOf(value) }.getOrDefault(PaymentMethod.CASH)

    @TypeConverter
    fun movementTypeToValue(type: MovementType): String = type.name

    @TypeConverter
    fun valueToMovementType(value: String): MovementType =
        runCatching { MovementType.valueOf(value) }.getOrDefault(MovementType.ADJUSTMENT)

    @TypeConverter
    fun expenseTypeToValue(type: ExpenseType): String = type.name

    @TypeConverter
    fun valueToExpenseType(value: String): ExpenseType =
        runCatching { ExpenseType.valueOf(value) }.getOrDefault(ExpenseType.GENERAL)

    @TypeConverter
    fun cashMovementTypeToValue(type: CashMovementType): String = type.name

    @TypeConverter
    fun valueToCashMovementType(value: String): CashMovementType =
        runCatching { CashMovementType.valueOf(value) }.getOrDefault(CashMovementType.ADJUSTMENT)

    @TypeConverter
    fun customerTransactionTypeToValue(type: CustomerTransactionType): String = type.name

    @TypeConverter
    fun valueToCustomerTransactionType(value: String): CustomerTransactionType =
        runCatching { CustomerTransactionType.valueOf(value) }.getOrDefault(CustomerTransactionType.SALE)

    @TypeConverter
    fun purchasePaymentTypeToValue(type: PurchasePaymentType): String = type.name

    @TypeConverter
    fun valueToPurchasePaymentType(value: String): PurchasePaymentType =
        runCatching { PurchasePaymentType.valueOf(value) }.getOrDefault(PurchasePaymentType.CASH_BOX)

    @TypeConverter
    fun salePaymentTypeToValue(type: SalePaymentType): String = type.name

    @TypeConverter
    fun valueToSalePaymentType(value: String): SalePaymentType =
        runCatching { SalePaymentType.valueOf(value) }.getOrDefault(SalePaymentType.CASH)

    @TypeConverter
    fun userRoleToValue(role: UserRole): String = role.name

    @TypeConverter
    fun valueToUserRole(value: String): UserRole =
        runCatching { UserRole.valueOf(value) }.getOrDefault(UserRole.CASHIER)
}
