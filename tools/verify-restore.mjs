import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:4183';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 430, height: 920 }, locale: 'ar-YE', serviceWorkers: 'block', acceptDownloads: true });
const page = await context.newPage();
const downloads = [], errors = [];
page.on('download', (d) => downloads.push(d.suggestedFilename()));
page.on('pageerror', (e) => errors.push(e.message.slice(0, 90)));
page.on('dialog', (d) => d.accept());
const ok = (t, c) => console.log(`${c ? '✔' : '✖'} ${t}`);
const pageState = () => page.evaluate(() => ({
  login: !!document.querySelector('#login-form'),
  toast: document.querySelector('[class*=toast]')?.innerText?.trim().slice(0, 110) || '',
  internalRows: document.querySelectorAll('[data-action="restore-local-backup"]').length,
}));
const goView = async (v) => { await page.evaluate((view) => { const el = [...document.querySelectorAll(`[data-action="navigate"][data-view="${view}"]`)].find((e) => e.offsetParent !== null); el?.click(); }, v); await page.waitForTimeout(1500); };
const openDataPanel = async () => {
  await goView('settings');
  for (let i = 0; i < 3; i += 1) {
    const opened = await page.evaluate(() => {
      const btn = document.querySelector('[data-action="toggle-report-panel"][data-panel="setData"]');
      if (!btn) return 'missing';
      if (btn.getAttribute('aria-expanded') === 'true') return 'open';
      btn.click(); return 'clicked';
    });
    if (opened === 'open') break;
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(800);
  return page.evaluate(() => document.querySelectorAll('[data-action="export-backup"]').length);
};
const login = async () => { await page.fill('input[name="username"]', 'admin').catch(() => {}); await page.locator('input[type="password"]').last().fill('1234').catch(() => {}); await page.locator('button:has-text("دخول")').first().click().catch(() => {}); await page.waitForTimeout(2600); };

await page.goto(BASE, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(900);
await page.locator('button:has-text("تسجيل جديد")').first().click(); await page.waitForTimeout(600);
await page.fill('input[name="storeName"]', 'بقالة الفحص'); await page.fill('input[name="username"]', 'admin');
await page.fill('input[name="accountName"]', 'أحمد'); await page.fill('input[name="pin"]', '1234'); await page.fill('input[name="pinConfirm"]', '1234');
await page.locator('button:has-text("إنشاء الحساب")').first().click(); await page.waitForTimeout(2400);
await login();

const exportButtons = await openDataPanel();
ok('صفحة إدارة البيانات تُفتح وفيه زر التصدير', exportButtons > 0);
const dl = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
await page.locator('[data-action="export-backup"]').first().click({ force: true });
const file = await dl;
if (file) await file.saveAs('/tmp/verify-backup.json');
ok('تصدير النسخة ينزّل ملف JSON', Boolean(file));
await page.waitForTimeout(800);

// (1) الاستعادة من ملف: بلا تنزيل قسري + الانتقال إلى صفحة الدخول
downloads.length = 0;
await page.setInputFiles('#restore-file', '/tmp/verify-backup.json');
await page.waitForTimeout(3800);
const s1 = await pageState();
ok('الاستعادة تنقل إلى صفحة تسجيل الدخول', s1.login);
ok('لا تنزيل قسري أثناء الاستعادة', downloads.length === 0);
ok('رسالة توضيحية للمستخدم', /تمت استعادة البيانات/.test(s1.toast));
console.log('   الرسالة:', s1.toast);

// (2) النسخ الداخلية: تُنشأ تلقائيًا وتُستعاد من الواجهة
await login();
await openDataPanel();
const before = await pageState();
ok('بطاقة النسخ الداخلية بها نسخة أمان', before.internalRows > 0);
await page.locator('[data-action="restore-local-backup"]').first().click({ force: true });
await page.waitForTimeout(3800);
const s2 = await pageState();
ok('الاستعادة من النسخة الداخلية تنقل إلى صفحة الدخول', s2.login);
console.log('   الرسالة:', s2.toast);

// (3) الدخول يعمل بعد الاستعادة
await login();
const after = await page.evaluate(() => ({ dashboard: /نظرة على يومك/.test(document.body.innerText), store: /بقالة الفحص/.test(document.body.innerText) }));
ok('الدخول بعد الاستعادة يفتح الرئيسية بنفس المتجر', after.dashboard && after.store);
console.log('\nأخطاء الصفحة:', errors.join(' | ') || 'لا شيء');
await page.screenshot({ path: '/home/user/preview/restore-after-fix.png' });
await browser.close();
