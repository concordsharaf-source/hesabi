import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const target = process.argv[2] || "http://localhost:3000/";
const profile = await mkdtemp(join(tmpdir(), "hesabi-mobile-navigation-"));
const port = 9297;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chrome = spawn("chromium", ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=390,844", target], { stdio: "ignore" });

try {
  let page;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { page = (await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json())).find((item) => item.type === "page"); } catch { /* Browser is starting. */ }
    if (page?.webSocketDebuggerUrl) break;
    await sleep(150);
  }
  assert.ok(page?.webSocketDebuggerUrl, "تعذر فتح متصفح اختبار التنقل.");
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let commandId = 0;
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++commandId;
    const timer = setTimeout(() => reject(new Error(`انتهت مهلة ${method}.`)), 10_000);
    const onMessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      socket.removeEventListener("message", onMessage);
      clearTimeout(timer);
      if (message.error) { reject(new Error(message.error.message)); return; }
      if (message.result?.exceptionDetails) { reject(new Error(message.result.exceptionDetails.text)); return; }
      resolve(message.result);
    };
    socket.addEventListener("message", onMessage);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => (await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;
  const waitFor = async (selector) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)) return;
      await sleep(150);
    }
    throw new Error(`لم يظهر العنصر ${selector}.`);
  };
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await waitFor("#setup-form");
  await evaluate(`(() => { const form = document.querySelector('#setup-form'); form.elements.storeName.value = 'متجر اختبار'; form.requestSubmit(); })()`);
  await waitFor("#login-form");
  await evaluate(`(() => { const form = document.querySelector('#login-form'); form.elements.username.value = 'admin'; form.elements.pin.value = '1234'; form.requestSubmit(); })()`);
  await waitFor("#required-pin-form");
  await evaluate(`(() => { const form = document.querySelector('#required-pin-form'); form.elements.pin.value = '1234'; form.elements.pinConfirm.value = '1234'; form.requestSubmit(); })()`);
  await waitFor('[data-bottom-nav] [data-view="inventory"]');
  const storeNameInHeader = await evaluate(`document.querySelector('.topbar .eyebrow')?.textContent?.trim()`);
  assert.equal(storeNameInHeader, 'متجر اختبار');
  await evaluate(`document.querySelector('[data-action="account-session"]').click()`);
  await waitFor('#open-local-logout-confirm');
  await evaluate(`document.querySelector('#open-local-logout-confirm').click()`);
  await waitFor('#confirm-local-logout');
  await evaluate(`document.querySelector('#confirm-local-logout').click()`);
  await waitFor('#login-form');
  await evaluate(`(() => { window.__recoveryRequests = []; const originalFetch = window.fetch.bind(window); window.fetch = async (input, init) => { if (String(input).includes('formsubmit.co/ajax/')) { window.__recoveryRequests.push({ url: String(input), data: Object.fromEntries(init.body.entries()) }); return new Response(JSON.stringify({ success: 'true' }), { status: 200, headers: { 'Content-Type': 'application/json' } }); } return originalFetch(input, init); }; document.querySelector('[data-action="open-phone-recovery"]').click(); })()`);
  await waitFor('#phone-recovery-form');
  await evaluate(`(() => { const form = document.querySelector('#phone-recovery-form'); form.elements.phone.value = '777123456'; form.requestSubmit(); })()`);
  await waitFor('#login-form');
  const recoveryRequest = await evaluate(`window.__recoveryRequests[0]`);
  assert.equal(recoveryRequest.url, 'https://formsubmit.co/ajax/fc46f51ed31eb26af7d65edd8a313358');
  assert.equal(recoveryRequest.data.رقم_الجوال, '777123456');
  assert.match(recoveryRequest.data.التعليمات, /اتصل بصاحب الرقم/);
  await evaluate(`(() => { const form = document.querySelector('#login-form'); form.elements.username.value = 'admin'; form.elements.pin.value = '1234'; form.requestSubmit(); })()`);
  await waitFor('[data-bottom-nav] [data-view="inventory"]');
  await evaluate(`document.querySelector('[data-bottom-nav] [data-view="products"]').click()`);
  await waitFor('[data-action="new-product"]');
  await evaluate(`document.querySelector('[data-action="new-product"]').click()`);
  await waitFor('#product-form');
  await evaluate(`(() => { const date = new Date(); date.setDate(date.getDate() + 20); const expiry = date.toISOString().slice(0, 10); const form = document.querySelector('#product-form'); form.elements.name.value = 'منتج قريب الانتهاء'; form.elements.purchasePrice.value = '30'; form.elements.salePrice.value = '50'; form.elements.quantity.value = '5'; form.elements.minimumStock.value = '1'; form.elements.nearestExpiryDate.value = expiry; form.requestSubmit(); })()`);
  await waitFor('.product-card [data-action="open-product"]');
  await evaluate(`document.querySelector('.product-card [data-action="open-product"]').click()`);
  await waitFor('#product-form');
  await evaluate(`(() => { const date = new Date(); date.setDate(date.getDate() + 10); document.querySelector('#product-form').elements.nearestExpiryDate.value = date.toISOString().slice(0, 10); document.querySelector('#product-form').requestSubmit(); })()`);
  await waitFor('[data-bottom-nav] [data-view="inventory"]');
  let purchaseDialogOpened = false;
  for (let attempt = 0; attempt < 2 && !purchaseDialogOpened; attempt += 1) {
    await evaluate(`document.querySelector('[data-bottom-nav] [data-view="purchases"]')?.click()`);
    await waitFor('.topbar [data-action="new-purchase"]');
    await evaluate(`document.querySelector('.topbar [data-action="new-purchase"]').click()`);
    for (let check = 0; check < 20; check += 1) {
      if (await evaluate(`Boolean(document.querySelector('#purchase-product-search'))`)) { purchaseDialogOpened = true; break; }
      await sleep(150);
    }
  }
  assert.ok(purchaseDialogOpened, 'تعذر فتح فاتورة شراء جديدة لاختبار سعر بيع المنتج السابق.');
  await evaluate(`(() => { const search = document.querySelector('#purchase-product-search'); search.value = 'منتج قريب الانتهاء'; search.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await waitFor('[data-add-purchase-product]');
  await evaluate(`document.querySelector('[data-add-purchase-product]').click()`);
  await waitFor('[data-purchase-sale-price="0"]');
  const priorProductPurchaseLine = await evaluate(`(() => { const salePrice = document.querySelector('[data-purchase-sale-price="0"]'); const row = salePrice.closest('.purchase-line'); return { salePrice: salePrice.value, rowDisplay: getComputedStyle(row).display, fieldCount: row.querySelectorAll('label').length }; })()`);
  assert.deepEqual(priorProductPurchaseLine, { salePrice: '50', rowDisplay: 'grid', fieldCount: 7 });
  await evaluate(`document.querySelector('#dialog-backdrop [data-dialog-close]').click()`);
  await waitFor('[data-action="new-purchase"]');
  const result = await evaluate(`new Promise((resolve) => { const inventory = document.querySelector('[data-bottom-nav] [data-view="inventory"]'); inventory.click(); setTimeout(() => resolve({ active: document.querySelector('[data-bottom-nav] .is-active')?.dataset.view, title: document.querySelector('.workspace h1')?.textContent?.trim(), inventoryVisible: Boolean(document.querySelector('.inventory-list')), expiryAlertVisible: Boolean(document.querySelector('.expiry-inventory-alert')), expiryStatusVisible: Boolean(document.querySelector('.expiry-status')) }), 350); })`);
  assert.deepEqual(result, { active: "inventory", title: "المخزون", inventoryVisible: true, expiryAlertVisible: true, expiryStatusVisible: true });
  await evaluate(`document.querySelector('[data-bottom-nav] [data-view="settings"]').click()`);
  await waitFor('[data-action="move-mobile-nav"][data-id="inventory"][data-direction="-1"]');
  const darkNavigationColors = await evaluate(`(() => { document.documentElement.setAttribute('data-theme', 'dark'); const row = document.querySelector('.mobile-nav-settings__item'); const arrow = document.querySelector('.mobile-nav-settings__actions .icon-button:not(:disabled)'); const result = { text: getComputedStyle(row.querySelector('strong')).color, arrow: getComputedStyle(arrow).color, arrowBackground: getComputedStyle(arrow).backgroundImage }; document.documentElement.removeAttribute('data-theme'); return result; })()`);
  assert.deepEqual(darkNavigationColors, { text: 'rgb(255, 255, 255)', arrow: 'rgb(255, 244, 246)', arrowBackground: 'linear-gradient(145deg, rgb(196, 42, 71), rgb(132, 19, 43))' });
  const darkSettingsButtonColors = await evaluate(`(() => { document.documentElement.setAttribute('data-theme', 'dark'); const primary = document.querySelector('#settings-form .button--primary'); const secondary = document.querySelector('.mobile-nav-settings .button--secondary'); const result = { primaryColor: getComputedStyle(primary).color, primaryBackground: getComputedStyle(primary).backgroundImage, secondaryColor: getComputedStyle(secondary).color, secondaryBackground: getComputedStyle(secondary).backgroundColor }; document.documentElement.removeAttribute('data-theme'); return result; })()`);
  assert.deepEqual(darkSettingsButtonColors, { primaryColor: 'rgb(255, 255, 255)', primaryBackground: 'linear-gradient(145deg, rgb(33, 117, 95), rgb(22, 71, 59))', secondaryColor: 'rgb(244, 255, 248)', secondaryBackground: 'rgba(0, 0, 0, 0)' });
  const arrowDirections = await evaluate(`(() => { const previous = document.querySelector('[data-action="move-mobile-nav"][data-id="inventory"][data-direction="-1"] svg'); const next = document.querySelector('[data-action="move-mobile-nav"][data-id="inventory"][data-direction="1"] svg'); return { previous: getComputedStyle(previous).transform, next: getComputedStyle(next).transform }; })()`);
  assert.deepEqual(arrowDirections, { previous: 'matrix(-1, 0, 0, -1, 0, 0)', next: 'none' });
  const reordered = await evaluate(`new Promise((resolve) => { document.querySelector('[data-action="move-mobile-nav"][data-id="inventory"][data-direction="-1"]').click(); setTimeout(() => resolve({ order: [...document.querySelectorAll('[data-bottom-nav] [data-view]')].map((item) => item.dataset.view), settingRows: document.querySelectorAll('.mobile-nav-settings__item').length }), 350); })`);
  assert.equal(reordered.settingRows, 16);
  assert.ok(reordered.order.indexOf("inventory") < reordered.order.indexOf("products"), "يجب أن ينتقل المخزون خطوة للأمام بعد تغيير الترتيب.");
  await evaluate(`document.querySelector('[data-view="data-management"]').click()`);
  await waitFor('#restore-file');
  const dataManagement = await evaluate(`({ title: document.querySelector('.workspace h1')?.textContent?.trim(), exportVisible: Boolean(document.querySelector('[data-action="export-backup"]')), restoreVisible: Boolean(document.querySelector('#restore-file')), cloudVisible: Boolean(document.querySelector('.cloud-backup-card')) })`);
  assert.deepEqual(dataManagement, { title: "إدارة البيانات", exportVisible: true, restoreVisible: true, cloudVisible: true });
  const darkDangerButton = await evaluate(`(() => { document.documentElement.setAttribute('data-theme', 'dark'); const button = document.querySelector('.data-management-page .button--danger'); const result = { color: getComputedStyle(button).color, background: getComputedStyle(button).backgroundImage }; document.documentElement.removeAttribute('data-theme'); return result; })()`);
  assert.deepEqual(darkDangerButton, { color: 'rgb(255, 255, 255)', background: 'linear-gradient(145deg, rgb(196, 42, 71), rgb(132, 19, 43))' });
  const views = [["dashboard", "نظرة على يومك"], ["sales", "بيع جديد"], ["invoices", "الفواتير"], ["purchases", "المشتريات"], ["inventory", "المخزون"]];
  for (const [view, title] of views) {
    const viewResult = await evaluate(`new Promise((resolve) => { document.querySelector('[data-bottom-nav] [data-view="${view}"]').click(); setTimeout(() => resolve({ active: document.querySelector('[data-bottom-nav] .is-active')?.dataset.view, title: document.querySelector('.workspace h1')?.textContent?.trim() }), 250); })`);
    assert.deepEqual(viewResult, { active: view, title });
  }
  socket.close();
  console.log("اجتازت صفحات الرئيسية والمبيعات والفواتير والمشتريات والمخزون اختبار التنقل التفاعلي.");
} finally {
  chrome.kill("SIGTERM");
  await new Promise((resolve) => chrome.once("exit", resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
}
