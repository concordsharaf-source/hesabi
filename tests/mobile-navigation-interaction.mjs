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
  const result = await evaluate(`new Promise((resolve) => { const inventory = document.querySelector('[data-bottom-nav] [data-view="inventory"]'); inventory.click(); setTimeout(() => resolve({ active: document.querySelector('[data-bottom-nav] .is-active')?.dataset.view, title: document.querySelector('.workspace h1')?.textContent?.trim(), inventoryVisible: Boolean(document.querySelector('.inventory-list')), expiryAlertVisible: Boolean(document.querySelector('.expiry-inventory-alert')), expiryStatusVisible: Boolean(document.querySelector('.expiry-status')) }), 350); })`);
  assert.deepEqual(result, { active: "inventory", title: "المخزون", inventoryVisible: true, expiryAlertVisible: true, expiryStatusVisible: true });
  await evaluate(`document.querySelector('[data-bottom-nav] [data-view="settings"]').click()`);
  await waitFor('[data-action="move-mobile-nav"][data-id="inventory"][data-direction="-1"]');
  const reordered = await evaluate(`new Promise((resolve) => { document.querySelector('[data-action="move-mobile-nav"][data-id="inventory"][data-direction="-1"]').click(); setTimeout(() => resolve({ order: [...document.querySelectorAll('[data-bottom-nav] [data-view]')].map((item) => item.dataset.view), settingRows: document.querySelectorAll('.mobile-nav-settings__item').length }), 350); })`);
  assert.equal(reordered.settingRows, 16);
  assert.ok(reordered.order.indexOf("inventory") < reordered.order.indexOf("products"), "يجب أن ينتقل المخزون خطوة للأمام بعد تغيير الترتيب.");
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
