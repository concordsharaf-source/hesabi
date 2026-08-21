package com.hesabi.app.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import com.hesabi.app.data.dao.ProductDao
import com.hesabi.app.data.dao.SaleDao
import com.hesabi.app.data.dao.StockMovementDao
import com.hesabi.app.data.dao.StoreDao
import com.hesabi.app.domain.model.MovementType
import com.hesabi.app.domain.model.PaymentMethod
import com.hesabi.app.domain.model.Product
import com.hesabi.app.domain.model.Sale
import com.hesabi.app.domain.model.SaleItem
import com.hesabi.app.domain.model.StockMovement
import com.hesabi.app.domain.model.Store

@Database(
    entities = [
        Store::class,
        Product::class,
        Sale::class,
        SaleItem::class,
        StockMovement::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun storeDao(): StoreDao
    abstract fun productDao(): ProductDao
    abstract fun saleDao(): SaleDao
    abstract fun stockMovementDao(): StockMovementDao
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
}
