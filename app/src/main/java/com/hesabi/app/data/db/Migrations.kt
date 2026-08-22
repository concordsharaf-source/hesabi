package com.hesabi.app.data.db

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * مهاجرة 1 → 2 — إضافة المرحلة الثانية مع الحفاظ التام على بيانات المرحلة الأولى:
 *
 * - جدول suppliers (الموردون)
 * - جدول purchases + purchase_items (فواتير الشراء)
 * - جدول purchase_returns + purchase_return_items (مرتجعات الشراء)
 * - جدول sale_returns + sale_return_items (مرتجعات البيع)
 * - جدول expenses (المصروفات)
 * - عمود cost + referenceId على stock_movements (تكلفة الوحدة وقت الحركة ومعرّف العملية)
 * - عمود costPrice على sale_items (تكلفة الوحدة وقت البيع)
 */
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `suppliers` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `name` TEXT NOT NULL,
                `phone` TEXT,
                `address` TEXT,
                `notes` TEXT,
                `createdAt` INTEGER NOT NULL,
                `updatedAt` INTEGER NOT NULL,
                `isDeleted` INTEGER NOT NULL DEFAULT 0
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_suppliers_name` ON `suppliers` (`name`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `purchases` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `invoiceNumber` TEXT NOT NULL,
                `supplierId` INTEGER,
                `date` INTEGER NOT NULL,
                `subtotal` INTEGER NOT NULL,
                `total` INTEGER NOT NULL,
                `note` TEXT,
                `isDeleted` INTEGER NOT NULL DEFAULT 0
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_purchases_invoiceNumber` ON `purchases` (`invoiceNumber`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_purchases_date` ON `purchases` (`date`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_purchases_supplierId` ON `purchases` (`supplierId`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `purchase_items` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `purchaseId` INTEGER NOT NULL,
                `productId` INTEGER,
                `productName` TEXT NOT NULL,
                `barcode` TEXT,
                `unitPrice` INTEGER NOT NULL,
                `quantity` REAL NOT NULL,
                `unit` TEXT NOT NULL DEFAULT 'حبة',
                `itemTotal` INTEGER NOT NULL,
                FOREIGN KEY(`purchaseId`) REFERENCES `purchases`(`id`) ON DELETE CASCADE,
                FOREIGN KEY(`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_purchase_items_purchaseId` ON `purchase_items` (`purchaseId`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `purchase_returns` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `invoiceNumber` TEXT NOT NULL,
                `purchaseId` INTEGER,
                `supplierId` INTEGER,
                `date` INTEGER NOT NULL,
                `totalRefunded` INTEGER NOT NULL,
                `note` TEXT,
                `isDeleted` INTEGER NOT NULL DEFAULT 0
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_purchase_returns_invoiceNumber` ON `purchase_returns` (`invoiceNumber`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_purchase_returns_purchaseId` ON `purchase_returns` (`purchaseId`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `purchase_return_items` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `purchaseReturnId` INTEGER NOT NULL,
                `purchaseItemId` INTEGER,
                `productId` INTEGER,
                `productName` TEXT NOT NULL,
                `quantity` REAL NOT NULL,
                `unit` TEXT NOT NULL DEFAULT 'حبة',
                `unitPrice` INTEGER NOT NULL,
                `itemTotal` INTEGER NOT NULL,
                FOREIGN KEY(`purchaseReturnId`) REFERENCES `purchase_returns`(`id`) ON DELETE CASCADE,
                FOREIGN KEY(`purchaseItemId`) REFERENCES `purchase_items`(`id`) ON DELETE SET NULL
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_purchase_return_items_purchaseReturnId` ON `purchase_return_items` (`purchaseReturnId`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_purchase_return_items_purchaseItemId` ON `purchase_return_items` (`purchaseItemId`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `sale_returns` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `invoiceNumber` TEXT NOT NULL,
                `saleId` INTEGER,
                `date` INTEGER NOT NULL,
                `totalRefunded` INTEGER NOT NULL,
                `note` TEXT,
                `isDeleted` INTEGER NOT NULL DEFAULT 0
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_sale_returns_invoiceNumber` ON `sale_returns` (`invoiceNumber`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_sale_returns_saleId` ON `sale_returns` (`saleId`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `sale_return_items` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `saleReturnId` INTEGER NOT NULL,
                `saleItemId` INTEGER,
                `productId` INTEGER,
                `productName` TEXT NOT NULL,
                `quantity` REAL NOT NULL,
                `unit` TEXT NOT NULL DEFAULT 'حبة',
                `unitPrice` INTEGER NOT NULL,
                `itemTotal` INTEGER NOT NULL,
                FOREIGN KEY(`saleReturnId`) REFERENCES `sale_returns`(`id`) ON DELETE CASCADE,
                FOREIGN KEY(`saleItemId`) REFERENCES `sale_items`(`id`) ON DELETE SET NULL
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_sale_return_items_saleReturnId` ON `sale_return_items` (`saleReturnId`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_sale_return_items_saleItemId` ON `sale_return_items` (`saleItemId`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `expenses` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `amount` INTEGER NOT NULL,
                `type` TEXT NOT NULL,
                `description` TEXT NOT NULL,
                `date` INTEGER NOT NULL,
                `notes` TEXT,
                `isDeleted` INTEGER NOT NULL DEFAULT 0
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_expenses_type` ON `expenses` (`type`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_expenses_date` ON `expenses` (`date`)")

        // إضافات على الجداول القائمة — لا تلمس البيانات الموجودة
        db.execSQL("ALTER TABLE stock_movements ADD COLUMN cost INTEGER NOT NULL DEFAULT 0")
        db.execSQL("ALTER TABLE stock_movements ADD COLUMN referenceId INTEGER")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_stock_movements_type` ON `stock_movements` (`type`)")
        db.execSQL("ALTER TABLE sale_items ADD COLUMN costPrice INTEGER NOT NULL DEFAULT 0")
    }
}

/**
 * مهاجرة 2 → 3 — إضافة النظام المالي:
 * - جدول customers (العملاء)
 * - جدول cash_movements (حركة الصندوق)
 * - جدول customer_transactions (ديون ودفعات العملاء)
 * - تحديث sales: إضافة customerId و paymentType
 * - تحديث purchases: إضافة paidAmount و remaining و paymentType
 */
val MIGRATION_2_3 = object : Migration(2, 3) {
    override fun migrate(db: SupportSQLiteDatabase) {
        // 1. الجداول الجديدة
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `customers` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `name` TEXT NOT NULL,
                `phone` TEXT,
                `address` TEXT,
                `notes` TEXT,
                `createdAt` INTEGER NOT NULL,
                `updatedAt` INTEGER NOT NULL,
                `isDeleted` INTEGER NOT NULL DEFAULT 0
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_customers_name` ON `customers` (`name`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_customers_phone` ON `customers` (`phone`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `cash_movements` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `amount` INTEGER NOT NULL,
                `type` TEXT NOT NULL,
                `date` INTEGER NOT NULL,
                `description` TEXT NOT NULL,
                `referenceId` INTEGER,
                `note` TEXT
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_cash_movements_date` ON `cash_movements` (`date`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_cash_movements_type` ON `cash_movements` (`type`)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `customer_transactions` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                `customerId` INTEGER NOT NULL,
                `type` TEXT NOT NULL,
                `amount` INTEGER NOT NULL,
                `paid` INTEGER NOT NULL,
                `remaining` INTEGER NOT NULL,
                `date` INTEGER NOT NULL,
                `referenceId` INTEGER,
                `notes` TEXT,
                FOREIGN KEY(`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_customer_transactions_customerId` ON `customer_transactions` (`customerId`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_customer_transactions_date` ON `customer_transactions` (`date`)")

        // 2. تحديث الجداول القائمة
        // ملاحظة: Room لا يدعم إضافة أعمدة مع FK مباشرة عبر ALTER TABLE في SQLite بسهولة، 
        // لكن بما أننا نضيف customerId كاختياري، سنضيفه كعمود عادي.
        db.execSQL("ALTER TABLE sales ADD COLUMN customerId INTEGER")
        db.execSQL("ALTER TABLE sales ADD COLUMN paymentType TEXT NOT NULL DEFAULT 'CASH'")
        
        db.execSQL("ALTER TABLE purchases ADD COLUMN paidAmount INTEGER NOT NULL DEFAULT 0")
        db.execSQL("ALTER TABLE purchases ADD COLUMN remaining INTEGER NOT NULL DEFAULT 0")
        db.execSQL("ALTER TABLE purchases ADD COLUMN paymentType TEXT NOT NULL DEFAULT 'CASH_BOX'")
    }
}

/**
 * مهاجرة 3 → 4 — إضافة نظام المستخدمين والصلاحيات.
 */
val MIGRATION_3_4 = object : Migration(3, 4) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS `users` (
                `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, 
                `username` TEXT NOT NULL, 
                `passwordHash` TEXT NOT NULL, 
                `fullName` TEXT NOT NULL, 
                `role` TEXT NOT NULL, 
                `isActive` INTEGER NOT NULL, 
                `createdAt` INTEGER NOT NULL
            )
        """.trimIndent())
        db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_users_username` ON `users` (`username`)")
        
        // إضافة حقل الصندوق للمصروفات إذا لم يكن موجوداً
        // (تم التأكد من وجوده في الخطة السابقة ولكن للاحتياط)
        try {
            db.execSQL("ALTER TABLE `expenses` ADD COLUMN `isFromCashbox` INTEGER NOT NULL DEFAULT 1")
        } catch (e: Exception) {
            // العمود موجود مسبقاً
        }
    }
}
