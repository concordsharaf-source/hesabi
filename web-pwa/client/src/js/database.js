import { adjustmentDelta, calculateSaleTotals, canSell, invoiceNumber, nowIso, toNumber } from "./domain.js";

const DB_NAME = "hesabi-pwa";
const DB_VERSION = 1;
let databasePromise;

const requestAsPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("تعذر تنفيذ العملية المحلية."));
  });

const transactionDone = (transaction) =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("تعذر حفظ التغييرات."));
    transaction.onabort = () => reject(transaction.error || new Error("تم إلغاء العملية لحماية البيانات."));
  });

const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;

export const db = {
  async open() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error || new Error("تعذر فتح قاعدة البيانات المحلية."));
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("settings")) database.createObjectStore("settings", { keyPath: "id" });
        if (!database.objectStoreNames.contains("products")) {
          const products = database.createObjectStore("products", { keyPath: "id" });
          products.createIndex("name", "nameLower");
          products.createIndex("barcode", "barcode");
          products.createIndex("internalCode", "internalCode");
          products.createIndex("active", "isDeleted");
        }
        if (!database.objectStoreNames.contains("sales")) {
          const sales = database.createObjectStore("sales", { keyPath: "id" });
          sales.createIndex("date", "date");
          sales.createIndex("invoiceNumber", "invoiceNumber", { unique: true });
        }
        if (!database.objectStoreNames.contains("saleItems")) {
          const saleItems = database.createObjectStore("saleItems", { keyPath: "id" });
          saleItems.createIndex("saleId", "saleId");
          saleItems.createIndex("productId", "productId");
        }
        if (!database.objectStoreNames.contains("stockMovements")) {
          const movements = database.createObjectStore("stockMovements", { keyPath: "id" });
          movements.createIndex("productId", "productId");
          movements.createIndex("date", "date");
          movements.createIndex("type", "type");
        }
        if (!database.objectStoreNames.contains("meta")) database.createObjectStore("meta", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
    });
    return databasePromise;
  },

  async getSettings() {
    const database = await this.open();
    const transaction = database.transaction("settings", "readonly");
    return requestAsPromise(transaction.objectStore("settings").get("app"));
  },

  async saveSettings(values) {
    const database = await this.open();
    const transaction = database.transaction("settings", "readwrite");
    transaction.objectStore("settings").put({ id: "app", ...values, setupCompleted: true, updatedAt: nowIso() });
    await transactionDone(transaction);
  },

  async listProducts({ includeDeleted = false } = {}) {
    const database = await this.open();
    const transaction = database.transaction("products", "readonly");
    const products = await requestAsPromise(transaction.objectStore("products").getAll());
    return products
      .filter((product) => includeDeleted || !product.isDeleted)
      .sort((first, second) => first.name.localeCompare(second.name, "ar"));
  },

  async findProductByBarcode(barcode) {
    const database = await this.open();
    const transaction = database.transaction("products", "readonly");
    const product = await requestAsPromise(transaction.objectStore("products").index("barcode").get(barcode.trim()));
    return product && !product.isDeleted ? product : null;
  },

  async getProduct(productId) {
    const database = await this.open();
    const transaction = database.transaction("products", "readonly");
    return requestAsPromise(transaction.objectStore("products").get(productId));
  },

  async createProduct(values) {
    const database = await this.open();
    const transaction = database.transaction(["products", "stockMovements"], "readwrite");
    const createdAt = nowIso();
    const quantity = Math.max(0, toNumber(values.quantity));
    const product = {
      id: uid("product"),
      name: values.name.trim(),
      nameLower: values.name.trim().toLocaleLowerCase("ar"),
      barcode: values.barcode.trim(),
      internalCode: values.internalCode.trim(),
      purchasePrice: Math.max(0, toNumber(values.purchasePrice)),
      salePrice: Math.max(0, toNumber(values.salePrice)),
      quantity,
      minimumStock: Math.max(0, toNumber(values.minimumStock)),
      unit: values.unit,
      createdAt,
      updatedAt: createdAt,
      isDeleted: false,
    };
    transaction.objectStore("products").add(product);
    if (quantity > 0) {
      transaction.objectStore("stockMovements").add({
        id: uid("movement"), productId: product.id, type: "INITIAL", quantity,
        previousQuantity: 0, newQuantity: quantity, date: createdAt, note: "كمية افتتاحية",
      });
    }
    await transactionDone(transaction);
    return product;
  },

  async updateProduct(productId, values) {
    const database = await this.open();
    const transaction = database.transaction("products", "readwrite");
    const store = transaction.objectStore("products");
    const current = await requestAsPromise(store.get(productId));
    if (!current || current.isDeleted) throw new Error("المنتج غير متاح للتعديل.");
    const updated = {
      ...current,
      name: values.name.trim(), nameLower: values.name.trim().toLocaleLowerCase("ar"),
      barcode: values.barcode.trim(), internalCode: values.internalCode.trim(),
      purchasePrice: Math.max(0, toNumber(values.purchasePrice)), salePrice: Math.max(0, toNumber(values.salePrice)),
      minimumStock: Math.max(0, toNumber(values.minimumStock)), unit: values.unit, updatedAt: nowIso(),
    };
    store.put(updated);
    await transactionDone(transaction);
    return updated;
  },

  async softDeleteProduct(productId) {
    const database = await this.open();
    const transaction = database.transaction(["products", "saleItems"], "readwrite");
    const productStore = transaction.objectStore("products");
    const product = await requestAsPromise(productStore.get(productId));
    if (!product) throw new Error("المنتج غير موجود.");
    const linkedSales = await requestAsPromise(transaction.objectStore("saleItems").index("productId").count(productId));
    product.isDeleted = true;
    product.deletedAt = nowIso();
    product.deletionReason = linkedSales > 0 ? "مرتبط بفواتير" : "حذف من الكتالوج";
    productStore.put(product);
    await transactionDone(transaction);
    return { linkedSales };
  },

  async adjustStock(productId, newQuantity, note) {
    const database = await this.open();
    const transaction = database.transaction(["products", "stockMovements"], "readwrite");
    const products = transaction.objectStore("products");
    const product = await requestAsPromise(products.get(productId));
    const next = Math.max(0, toNumber(newQuantity));
    if (!product || product.isDeleted) throw new Error("المنتج غير متاح.");
    const previous = toNumber(product.quantity);
    product.quantity = next;
    product.updatedAt = nowIso();
    products.put(product);
    transaction.objectStore("stockMovements").add({
      id: uid("movement"), productId, type: "ADJUSTMENT", quantity: adjustmentDelta(previous, next),
      previousQuantity: previous, newQuantity: next, date: nowIso(), note: note.trim(),
    });
    await transactionDone(transaction);
    return product;
  },

  async completeSale({ items, discount, paidAmount, paymentMethod }) {
    if (!items.length) throw new Error("أضف منتجًا واحدًا على الأقل إلى السلة.");
    const database = await this.open();
    const transaction = database.transaction(["products", "sales", "saleItems", "stockMovements", "meta"], "readwrite");
    const products = transaction.objectStore("products");
    const resolvedItems = [];
    for (const line of items) {
      const product = await requestAsPromise(products.get(line.productId));
      if (!product || product.isDeleted) throw new Error("أحد منتجات السلة لم يعد متاحًا.");
      if (!canSell(product.quantity, line.quantity)) throw new Error(`الكمية المتوفرة غير كافية للمنتج: ${product.name}`);
      resolvedItems.push({ ...line, product });
    }
    const totals = calculateSaleTotals(resolvedItems.map((line) => ({ unitPrice: line.product.salePrice, quantity: line.quantity })), discount);
    const paid = Math.max(0, toNumber(paidAmount));
    if (paid < totals.total) throw new Error("المبلغ المدفوع أقل من الإجمالي النهائي.");
    const meta = transaction.objectStore("meta");
    const sequenceRecord = await requestAsPromise(meta.get("invoiceSequence"));
    const sequence = (sequenceRecord?.value || 0) + 1;
    const date = nowIso();
    const sale = {
      id: uid("sale"), invoiceNumber: invoiceNumber(sequence), date, subtotal: totals.subtotal,
      discount: totals.discount, total: totals.total, paidAmount: paid, paymentMethod,
    };
    transaction.objectStore("sales").add(sale);
    for (const line of resolvedItems) {
      const { product } = line;
      const previousQuantity = toNumber(product.quantity);
      const nextQuantity = previousQuantity - toNumber(line.quantity);
      products.put({ ...product, quantity: nextQuantity, updatedAt: date });
      transaction.objectStore("saleItems").add({
        id: uid("sale-item"), saleId: sale.id, productId: product.id, productName: product.name,
        unit: product.unit, quantity: toNumber(line.quantity), unitPrice: product.salePrice,
        total: Math.round(product.salePrice * toNumber(line.quantity) * 100) / 100,
      });
      transaction.objectStore("stockMovements").add({
        id: uid("movement"), productId: product.id, type: "SALE", quantity: -toNumber(line.quantity),
        previousQuantity, newQuantity: nextQuantity, date, note: `بيع ضمن الفاتورة ${sale.invoiceNumber}`,
      });
    }
    meta.put({ id: "invoiceSequence", value: sequence, updatedAt: date });
    await transactionDone(transaction);
    return sale;
  },

  async listSales() {
    const database = await this.open();
    const transaction = database.transaction("sales", "readonly");
    const sales = await requestAsPromise(transaction.objectStore("sales").getAll());
    return sales.sort((first, second) => new Date(second.date) - new Date(first.date));
  },

  async getInvoice(saleId) {
    const database = await this.open();
    const transaction = database.transaction(["sales", "saleItems"], "readonly");
    const sale = await requestAsPromise(transaction.objectStore("sales").get(saleId));
    const items = await requestAsPromise(transaction.objectStore("saleItems").index("saleId").getAll(saleId));
    return sale ? { ...sale, items } : null;
  },

  async getDashboard() {
    const [products, sales] = await Promise.all([this.listProducts(), this.listSales()]);
    const today = new Date().toDateString();
    const todaySales = sales.filter((sale) => new Date(sale.date).toDateString() === today);
    return {
      productCount: products.length,
      inventoryValue: products.reduce((sum, product) => sum + toNumber(product.quantity) * toNumber(product.purchasePrice), 0),
      lowStock: products.filter((product) => toNumber(product.quantity) <= toNumber(product.minimumStock)),
      todaySales: todaySales.reduce((sum, sale) => sum + toNumber(sale.total), 0),
      todayInvoiceCount: todaySales.length,
    };
  },
};
