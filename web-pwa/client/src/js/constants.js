export const BUSINESS_TYPES = [
  "بقالة",
  "سوبرماركت",
  "صيدلية",
  "ملابس",
  "جوالات",
  "قطع غيار",
  "مطعم",
  "كافيه",
  "متجر عام",
];

export const DEFAULT_CURRENCY_CODE = "YER";

export const CURRENCIES = [
  { code: "YER", label: "ريال يمني (ر.ي)", symbol: "ر.ي" },
  { code: "SAR", label: "ريال سعودي (ر.س)", symbol: "ر.س" },
  { code: "AED", label: "درهم إماراتي (د.إ)", symbol: "د.إ" },
  { code: "KWD", label: "دينار كويتي (د.ك)", symbol: "د.ك" },
  { code: "QAR", label: "ريال قطري (ر.ق)", symbol: "ر.ق" },
  { code: "EGP", label: "جنيه مصري (ج.م)", symbol: "ج.م" },
  { code: "USD", label: "دولار أمريكي ($)", symbol: "$" },
];

export const UNITS = ["حبة", "علبة", "كرتون", "كيلو", "جرام", "لتر", "متر"];

export const PAYMENT_METHODS = ["نقدي", "تحويل"];

export const ACCOUNT_ROLES = [
  { id: "admin", label: "أدمن" },
  { id: "cashier", label: "كاشير" },
];

export const EXPENSE_CATEGORIES = ["إيجار", "كهرباء", "ماء", "إنترنت", "رواتب", "نقل", "صيانة", "مشتريات", "تسويق", "مصروفات أخرى"];

export const NAV_ITEMS = [
  { id: "dashboard", label: "الرئيسية", icon: "grid" },
  { id: "products", label: "المنتجات", icon: "package" },
  { id: "inventory", label: "المخزون", icon: "layers" },
  { id: "sales", label: "المبيعات", icon: "cart" },
  { id: "invoices", label: "الفواتير", icon: "receipt" },
  { id: "customers", label: "العملاء", icon: "users" },
  { id: "customer-payments", label: "دفعات العملاء", icon: "wallet" },
  { id: "suppliers", label: "الموردون", icon: "users" },
  { id: "supplier-payments", label: "دفعات الموردين", icon: "wallet" },
  { id: "purchases", label: "المشتريات", icon: "truck" },
  { id: "expenses", label: "المصروفات", icon: "wallet" },
  { id: "cashbox", label: "الصندوق", icon: "wallet" },
  { id: "reports", label: "التقارير", icon: "chart" },
  { id: "accounts", label: "الحسابات", icon: "users" },
  { id: "settings", label: "الإعدادات", icon: "box" },
];
