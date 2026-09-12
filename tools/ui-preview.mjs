import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = 'http://127.0.0.1:4199';
mkdirSync('/home/user/preview', { recursive: true });
const browser = await chromium.launch();

async function openApp({ width = 390, height = 844, theme = 'light' } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 2, locale: 'ar-YE',
    colorScheme: theme, serviceWorkers: 'block',
  });
  const page = await context.newPage();
  await page.addInitScript(`try { localStorage.setItem('hesabi-theme', '${theme}'); } catch {}`);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  return { context, page };
}

/** ينشئ المتجر من شاشة التهيئة كما يفعل المستخدم فعلاً */
async function setupStore(page) {
  const start = page.locator('button:has-text("تسجيل جديد")').first();
  if (await start.count()) { await start.click().catch(() => {}); await page.waitForTimeout(900); }
  await page.fill('input[name="storeName"]', 'بقالة النور').catch(() => {});
  await page.fill('input[name="username"]', 'admin').catch(() => {});
  await page.fill('input[name="accountName"]', 'أحمد').catch(() => {});
  await page.fill('input[name="pin"]', '1234').catch(() => {});
  await page.fill('input[name="pinConfirm"]', '1234').catch(() => {});
  const submit = page.locator('button:has-text("إنشاء الحساب")').first();
  if (await submit.count()) { await submit.click(); await page.waitForTimeout(2500); }
  // أي خطوة تالية بعد إنشاء الحساب
  for (let i = 0; i < 3; i += 1) {
    const next = page.locator('button:has-text("التالي"), button:has-text("متابعة"), button:has-text("بدء الاستخدام"), button:has-text("إتمام")').first();
    if (await next.count() && await next.isVisible().catch(() => false)) {
      await next.click().catch(() => {});
      await page.waitForTimeout(1500);
    } else break;
  }
}

async function shot(page, name, { full = false, settle = 900 } = {}) {
  await page.waitForTimeout(settle);
  await page.screenshot({ path: `/home/user/preview/${name}.png`, fullPage: full });
  const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 260);
  console.log(`── ${name} ──\n${text}\n`);
}

/** يسجّل الدخول بالحساب المُنشأ */
async function login(page) {
  const user = page.locator('input[name="username"]').first();
  if (await user.count() && await user.isVisible().catch(() => false)) {
    await user.fill('admin');
    const pin = page.locator('input[name="pin"], input[type="password"]').last();
    await pin.fill('1234');
    const submit = page.locator('button:has-text("دخول إلى حسابي"), button:has-text("دخول")').first();
    if (await submit.count()) { await submit.click(); await page.waitForTimeout(2500); }
  }
}

const { context, page } = await openApp({});
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
await setupStore(page);
await login(page);
await shot(page, '09-after-login', { full: true });
await shot(page, '10-home-light');

/** تنقّل إلى شاشة بالنقر على أول عنصر ظاهر يحمل data-view */
async function goTo(page, view) {
  const clicked = await page.evaluate((target) => {
    const elements = [...document.querySelectorAll(`[data-action="navigate"][data-view="${target}"]`)];
    const visible = elements.find((el) => el.offsetParent !== null);
    if (!visible) return false;
    visible.click();
    return true;
  }, view);
  await page.waitForTimeout(1400);
  return clicked;
}

const screens = [
  ['dashboard', '11-home'], ['sales', '12-sales'], ['products', '13-products'],
  ['inventory', '14-inventory'], ['purchases', '15-purchases'], ['customers', '16-customers'],
  ['suppliers', '17-suppliers'], ['cashbox', '18-cashbox'], ['reports', '19-reports'],
  ['settings', '20-settings'],
];
for (const [view, file] of screens) {
  const ok = await goTo(page, view);
  console.log(ok ? `→ ${view}` : `(تعذّر الانتقال إلى ${view})`);
  await shot(page, `${file}-light`, { settle: 900 });
}

// الوضع الداكن على نفس المتجر (شاشتان مهمّتان)
await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
await page.waitForTimeout(800);
await goTo(page, 'dashboard');
await shot(page, '21-home-dark');
await goTo(page, 'sales');
await shot(page, '22-sales-dark');

// سطح المكتب: نفس النافذة بحجم أكبر (نفس بيانات المتجر)
await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
await page.setViewportSize({ width: 1280, height: 900 });
await goTo(page, 'dashboard');
await shot(page, '23-home-desktop', { settle: 1200, full: true });
await goTo(page, 'products');
await shot(page, '24-products-desktop', { settle: 1000 });
await goTo(page, 'reports');
await shot(page, '25-reports-desktop', { settle: 1000 });
await context.close();
await browser.close();
console.log('انتهت الصور');
