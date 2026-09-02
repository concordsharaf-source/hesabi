import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PDF_ARABIC_FONT_URL = "https://hesabipwa-2r9mmdzn.manus.space/manus-storage/NotoNaskhArabic-Regular_2c8d8205.ttf";
const toNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
let canvasArabicFontPromise;
const waitWithTimeout = (promise, timeout = 3_000) => Promise.race([promise, new Promise((resolve) => window.setTimeout(resolve, timeout))]);

async function loadCanvasArabicFont() {
  if (!canvasArabicFontPromise) {
    const loadFont = new FontFace("HesabiArabicPdf", `url(${PDF_ARABIC_FONT_URL})`, { style: "normal", weight: "100 900", display: "block" }).load().then((font) => {
      document.fonts.add(font);
      return font;
    }).catch(() => null);
    canvasArabicFontPromise = waitWithTimeout(loadFont);
  }
  return canvasArabicFontPromise;
}

function createPdfStage(html, page) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const stage = document.createElement("article");
  stage.dir = parsed.documentElement.dir || "rtl";
  stage.lang = parsed.documentElement.lang || "ar";
  stage.dataset.pdfStage = "true";
  stage.style.cssText = `position:fixed;top:0;left:0;width:${page === "thermal" ? "80mm" : "210mm"};min-height:20mm;padding:0;background:#fff;color:#111;z-index:2147483647;pointer-events:none;overflow:visible;`;
  stage.innerHTML = `${[...parsed.head.querySelectorAll("style")].map((style) => style.outerHTML).join("")}${parsed.body.innerHTML}`;
  document.body.appendChild(stage);
  return stage;
}

async function waitForPdfStage(stage) {
  if (!stage.textContent.trim()) throw new Error("لا يوجد محتوى صالح لإنشاء ملف PDF.");
  if (document.fonts?.ready) await waitWithTimeout(document.fonts.ready);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (stage.getBoundingClientRect().height < 1 || stage.scrollHeight < 1) throw new Error("تعذر تجهيز محتوى الفاتورة للطباعة.");
}

function downloadPdfFile(file) {
  const url = URL.createObjectURL(file);
  const anchor = Object.assign(document.createElement("a"), { href: url, download: file.name });
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function canSharePdfFile(file) {
  if (typeof navigator.share !== "function") return false;
  try { return typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }); } catch { return false; }
}

async function fileOrDownload(file, title) {
  if (canSharePdfFile(file)) {
    try {
      await navigator.share({ title, files: [file] });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") throw error;
    }
  }
  downloadPdfFile(file);
  return "downloaded";
}

async function loadStoreLogoImage(logoDataUrl) {
  if (!/^data:image\/(?:png|jpeg|webp);base64,/i.test(String(logoDataUrl || ""))) return null;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = logoDataUrl;
  });
}

function drawStoreLogo(context, image, centerX, centerY, boxSize) {
  if (!image?.naturalWidth || !image?.naturalHeight) return;
  const scale = Math.min(boxSize / image.naturalWidth, boxSize / image.naturalHeight);
  const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
  context.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
}

const PDF_FOOTER_TITLE = "تم إصدار هذه الفاتورة من حسابي";
const PDF_FOOTER_DESIGN = "تصميم شرف غالب قحطان · الجمهورية اليمنية · +967770388100";
const PDF_FOOTER_EMAIL = "concordsharaf@gmail.com";
function drawStoreDetails(context, { storeInfo = {}, right, top, width = 210 * 12 }) {
  const details = [
    storeInfo.storePhone ? `هاتف: ${storeInfo.storePhone}` : "",
    storeInfo.storeAddress ? `العنوان: ${storeInfo.storeAddress}` : "",
    storeInfo.storeEmail ? `البريد: ${storeInfo.storeEmail}` : "",
    storeInfo.taxNumber ? `الضريبي/السجل: ${storeInfo.taxNumber}` : "",
  ].filter(Boolean);
  if (!details.length) return;
  context.save();
  context.direction = "rtl"; context.textAlign = "right"; context.textBaseline = "middle"; context.fillStyle = "#52645b";
  context.font = '400 17px "HesabiArabicPdf", Tahoma, Arial, sans-serif';
  details.slice(0, 4).forEach((value, index) => context.fillText(value, right, top + index * 6.5 * 12, width - 30 * 12));
  context.restore();
}

function drawPdfFooter(context, { center, width, height, y = height - 22 * 12 }) {
  const left = 14 * 12;
  const right = width - left;
  const footerY = Math.min(y, height - 25 * 12);
  context.save();
  context.strokeStyle = "#b9cbc1";
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(left, footerY - 12 * 12); context.lineTo(right, footerY - 12 * 12); context.stroke();
  context.direction = "rtl"; context.textAlign = "center"; context.textBaseline = "middle";
  context.fillStyle = "#52645b";
  context.font = '400 21px "HesabiArabicPdf", Tahoma, Arial, sans-serif';
  context.fillText(PDF_FOOTER_TITLE, center, footerY - 7 * 12);
  context.font = '400 16px "HesabiArabicPdf", Tahoma, Arial, sans-serif';
  context.fillText(PDF_FOOTER_DESIGN, center, footerY);
  context.direction = "ltr";
  context.font = '400 15px "HesabiArabicPdf", Tahoma, Arial, sans-serif';
  context.fillText(PDF_FOOTER_EMAIL, center, footerY + 6 * 12);
  context.restore();
}

function drawThermalInvoiceCanvas({ invoice, customer, storeName, storeInfo, logoImage, formatMoney, formatAmount, formatDateTime, paymentLabel }) {
  const mm = 12;
  const width = 80 * mm;
  const details = invoice.customerName ? 1 + Number(Boolean(customer?.phone)) + Number(Boolean(customer?.address)) : 0;
  const height = Math.max(1420, (160 + details * 11 + Math.max(1, invoice.items?.length || 0) * 20 + (logoImage ? 17 : 0) + (toNumber(invoice.deliveryFee) > 0 ? 9 : 0)) * mm);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#111111";
  context.direction = "rtl";
  context.textBaseline = "middle";
  const right = 76 * mm;
  const left = 4 * mm;
  const center = 40 * mm;
  let y = 9 * mm;
  const text = (value, x, align = "right", size = 28, weight = 400, direction = "rtl") => {
    context.direction = direction;
    context.textAlign = align;
    context.font = `${weight} ${size}px "HesabiArabicPdf", Tahoma, Arial, sans-serif`;
    context.fillText(String(value ?? ""), x, y);
  };
  const divider = () => {
    context.save(); context.strokeStyle = "#444"; context.setLineDash([6, 5]); context.beginPath(); context.moveTo(left, y); context.lineTo(right, y); context.stroke(); context.restore();
  };
  const pair = (label, value, options = {}) => {
    text(label, right, "right", options.labelSize || 27, options.bold ? 700 : 400);
    text(value, left, "left", options.valueSize || 27, options.bold ? 700 : 400, options.ltr ? "ltr" : "rtl");
    y += options.gap || 6.5 * mm;
  };
  if (logoImage) { drawStoreLogo(context, logoImage, center, y + 7 * mm, 14 * mm); y += 17 * mm; }
  text(storeName || "حسابي", center, "center", 44, 700); y += 8 * mm;
  text("فاتورة بيع", right, "right", 30, 700); text(invoice.invoiceNumber, left, "left", 27, 700, "ltr"); y += 6 * mm;
  text(formatDateTime(invoice.date), center, "center", 20); y += 7 * mm;
  context.fillStyle = "#f7f7f7"; context.strokeStyle = "#111"; context.lineWidth = 1.5; context.roundRect(left, y - 5 * mm, right - left, 12 * mm, 6); context.fill(); context.stroke(); context.fillStyle = "#111";
  pair("الكاشير المنفذ", invoice.cashierName || "الأدمن", { gap: 6.5 * mm });
  y += 1 * mm;
  if (invoice.customerName) {
    const cardHeight = (8 + details * 8) * mm;
    context.fillStyle = "#f7f7f7"; context.strokeStyle = "#111"; context.lineWidth = 1.5; context.roundRect(left, y - 5 * mm, right - left, cardHeight, 6); context.fill(); context.stroke(); context.fillStyle = "#111";
    text("بيانات العميل", right - 2 * mm, "right", 30, 700); y += 7 * mm;
    pair("الاسم", invoice.customerName, { gap: 6.5 * mm });
    if (customer?.phone) pair("الهاتف", customer.phone, { ltr: true, gap: 6.5 * mm });
    if (customer?.address) pair("العنوان", customer.address, { gap: 6.5 * mm });
    y += 2 * mm;
  }
  divider(); y += 6 * mm;
  for (const item of invoice.items || []) {
    text(item.productName, right, "right", 30, 700); text(formatMoney(item.total), left, "left", 28, 700, "ltr"); y += 6 * mm;
    text(`${formatAmount(item.quantity)} ${item.unit} × ${formatMoney(item.unitPrice)}`, right, "right", 22); y += 8 * mm;
  }
  divider(); y += 7 * mm;
  pair("الإجمالي قبل الخصم", formatMoney(invoice.subtotal));
  pair("الخصم", formatMoney(invoice.discount));
  if (toNumber(invoice.deliveryFee) > 0) pair(`التوصيل · ${invoice.deliveryChargeType === "customer" ? "على العميل ضمن الفاتورة" : "حساب المحل"}`, formatMoney(invoice.deliveryFee));
  context.strokeStyle = "#111"; context.beginPath(); context.moveTo(left, y - 4 * mm); context.lineTo(right, y - 4 * mm); context.stroke();
  pair("الإجمالي", formatMoney(invoice.total), { bold: true, labelSize: 32, valueSize: 32, gap: 7.5 * mm });
  pair("طريقة السداد", paymentLabel);
  pair("حالة السداد", invoice.paymentStatus || (invoice.paymentType === "آجل" ? "آجل" : "مدفوعة"));
  pair("المدفوع", formatMoney(invoice.paidAmount));
  if (invoice.paymentType === "آجل") pair("المتبقي", formatMoney(invoice.remainingAmount));
  y += 3 * mm;
  text("شكرًا لتعاملكم معنا", center, "center", 22);
  drawPdfFooter(context, { center, width, height, y: height - 17 * mm });
  return canvas;
}

function drawPurchaseInvoiceCanvas({ purchase, supplier, storeName, storeInfo, logoImage, formatMoney, formatAmount, formatDateTime }) {
  const mm = 12;
  const width = 210 * mm;
  const left = 14 * mm;
  const right = 196 * mm;
  const center = width / 2;
  const fontScale = 3;
  const lineHeight = 8 * mm;
  const itemHeight = 48 * mm;
  const items = purchase.items || [];
  const height = Math.max(297 * mm, (72 + Math.max(1, items.length) * 48 + 105) * mm);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.textBaseline = "middle";
  context.direction = "rtl";
  const text = (value, x, y, align = "right", size = 26, weight = 400, direction = "rtl", color = "#172e27") => {
    context.direction = direction;
    context.textAlign = align;
    context.font = `${weight} ${Math.round(size * fontScale)}px "HesabiArabicPdf", "Noto Naskh Arabic", Tahoma, Arial, sans-serif`;
    context.fillStyle = color;
    context.fillText(String(value ?? ""), x, y);
  };
  const wrapped = (value, x, y, maxWidth, options = {}) => {
    const words = String(value ?? "").split(/\s+/).filter(Boolean);
    const rows = [];
    let current = "";
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (current && context.measureText(next).width > maxWidth) { rows.push(current); current = word; } else current = next;
    });
    if (current || !rows.length) rows.push(current);
    rows.slice(0, options.maxRows || 3).forEach((row, index) => text(row, x, y + index * (options.lineHeight || 6.5 * mm), options.align || "right", options.size || 22, options.weight || 400, options.direction || "rtl", options.color || "#172e27"));
    return Math.min(rows.length, options.maxRows || 3);
  };
  const rule = (y, color = "#b9cbc1") => { context.strokeStyle = color; context.lineWidth = 2; context.beginPath(); context.moveTo(left, y); context.lineTo(right, y); context.stroke(); };
  const box = (top, boxHeight, fill = "#f1f7f3") => { context.fillStyle = fill; context.strokeStyle = "#c4d5cc"; context.lineWidth = 2; context.beginPath(); context.roundRect(left, top, right - left, boxHeight, 10); context.fill(); context.stroke(); };
  const pair = (label, value, y, options = {}) => { text(label, right - 5 * mm, y, "right", options.labelSize || 24, options.labelWeight || 600); text(value, left + 5 * mm, y, "left", options.valueSize || 25, options.valueWeight || 700, options.ltr ? "ltr" : "rtl", options.color || "#172e27"); };

  let y = 17 * mm;
  if (logoImage) drawStoreLogo(context, logoImage, center, y + 8 * mm, 22 * mm);
  text(storeName || "حسابي", center, y + 24 * mm, "center", 48, 700, "rtl", "#174c3f");
  drawStoreDetails(context, { storeInfo, right, top: y + 2 * mm, width });
  text("فاتورة شراء", center, y + 34 * mm, "center", 32, 700, "rtl", "#52645b");
  text(`رقم الفاتورة: ${purchase.invoiceNumber || "—"}`, left, y + 7 * mm, "left", 25, 700, "ltr", "#172e27");
  text(formatDateTime(purchase.date), left, y + 17 * mm, "left", 22, 400, "ltr", "#52645b");
  y += 43 * mm;

  const supplierLines = [
    ["اسم المورد", purchase.supplierName || "بدون مورد", false],
    ["الهاتف", supplier?.phone || purchase.supplierPhone || "غير متوفر", true],
    ["العنوان", supplier?.address || purchase.supplierAddress || "غير متوفر", false],
  ];
  const supplierRows = supplierLines.filter(([, value], index) => index === 0 || value !== "غير متوفر");
  const supplierBoxHeight = (supplierRows.length * 8 + 10) * mm;
  box(y, supplierBoxHeight);
  text("بيانات المورد", right - 5 * mm, y + 8 * mm, "right", 29, 700, "rtl", "#174c3f");
  y += 16 * mm;
  supplierRows.forEach(([label, value, ltr]) => { pair(label, value, y, { ltr, valueSize: 23 }); y += lineHeight; });
  y += 7 * mm;

  const tableTop = y;
  context.fillStyle = "#174c3f";
  context.fillRect(left, tableTop, right - left, 12 * mm);
  text("الصنف", right - 5 * mm, tableTop + 6 * mm, "right", 24, 700, "rtl", "#ffffff");
  text("الكمية", 132 * mm, tableTop + 6 * mm, "right", 24, 700, "rtl", "#ffffff");
  text("سعر الشراء", 101 * mm, tableTop + 6 * mm, "right", 24, 700, "rtl", "#ffffff");
  text("سعر البيع", 69 * mm, tableTop + 6 * mm, "right", 24, 700, "rtl", "#ffffff");
  text("الإجمالي", left + 5 * mm, tableTop + 6 * mm, "left", 24, 700, "rtl", "#ffffff");
  y += 12 * mm;
  items.forEach((item, index) => {
    if (index % 2 === 0) { context.fillStyle = "#f5faf7"; context.fillRect(left, y, right - left, itemHeight); }
    context.save();
    context.font = `700 ${23 * fontScale}px "HesabiArabicPdf", "Noto Naskh Arabic", Tahoma, Arial, sans-serif`;
    const itemNameRows = wrapped(item.productName || "", right - 5 * mm, y + 7 * mm, 62 * mm, { size: 23, weight: 700, maxRows: 2 });
    context.restore();
    text(`${formatAmount(item.quantity)} ${item.unit || ""}`, 132 * mm, y + 8 * mm, "right", 22, 600, "rtl");
    text(formatMoney(item.unitCost), 101 * mm, y + 8 * mm, "right", 22, 600, "ltr");
    text(formatMoney(item.salePrice ?? 0), 69 * mm, y + 8 * mm, "right", 22, 700, "ltr", "#174c3f");
    text(formatMoney(item.total), left + 5 * mm, y + 8 * mm, "left", 22, 700, "ltr");
    let detailY = y + (itemNameRows > 1 ? 18 : 15) * mm;
    const purchaseDetails = [
      item.packageQuantity ? `العبوات: ${formatAmount(item.packageQuantity)} ${item.packageUnit || "عبوة"}` : "",
      item.unitsPerPackage ? `الوحدات/العبوة: ${formatAmount(item.unitsPerPackage)}` : "",
      item.packageCost !== undefined ? `سعر العبوة: ${formatMoney(item.packageCost)}` : "",

      item.batchNumber ? `التشغيلة: ${item.batchNumber}` : "",
      item.productionDate ? `الإنتاج: ${item.productionDate}` : "",
      item.expiryDate ? `الانتهاء: ${item.expiryDate}` : "",
      toNumber(item.returnedQuantity) ? `المرتجع: ${formatAmount(item.returnedQuantity)}` : "",
    ].filter(Boolean).join(" · ");
    if (purchaseDetails) { context.font = `400 ${19 * fontScale}px "HesabiArabicPdf", "Noto Naskh Arabic", Tahoma, Arial, sans-serif`; wrapped(purchaseDetails, right - 5 * mm, detailY, right - left - 10 * mm, { size: 19, maxRows: 2, lineHeight: 7 * mm, color: "#52645b" }); }
    y += itemHeight;
    rule(y);
  });
  y += 9 * mm;

  const summaryTop = y;
  const summaryRows = [
    ["الإجمالي قبل الخصم", formatMoney(purchase.subtotal ?? purchase.total), false],
    ["الخصم", formatMoney(purchase.discount || 0), false],
    ["إجمالي الفاتورة", formatMoney(purchase.total), true],
    ["إجمالي المرتجعات", formatMoney(purchase.returnedTotal || 0), false],
    ["طريقة الدفع", purchase.paymentType || "نقدي", false],
    ["وسيلة الدفع", purchase.paymentMethod || "نقدي", false],
    ["حالة السداد", purchase.paymentStatus || "مدفوعة", false],
    ["المبلغ المدفوع", formatMoney(purchase.paidAmount), false],
    ["المتبقي", formatMoney(purchase.remainingAmount), false],
  ];
  const summaryHeight = (summaryRows.length * 8 + 10) * mm;
  box(summaryTop, summaryHeight, "#f8fbf9");
  y += 10 * mm;
  summaryRows.forEach(([label, value, strong]) => { pair(label, value, y, { bold: strong, labelSize: strong ? 28 : 22, valueSize: strong ? 30 : 23, ltr: !/[ء-ي]/.test(value) }); y += lineHeight; if (strong) rule(y - 4 * mm, "#174c3f"); });
  y += 5 * mm;
  if (purchase.notes) { text("ملاحظات", right, y, "right", 24, 700, "rtl", "#174c3f"); y += 7 * mm; context.font = `400 ${21 * fontScale}px "HesabiArabicPdf", "Noto Naskh Arabic", Tahoma, Arial, sans-serif`; wrapped(purchase.notes, right, y, right - left, { size: 21, maxRows: 3, lineHeight: 7 * mm, color: "#52645b" }); y += 22 * mm; }
  drawPdfFooter(context, { center, width, height, y: height - 17 * mm });
  return canvas;
}

function drawCustomerAccountCanvas({ account, storeName, storeInfo, logoImage, formatMoney, formatDateTime }) {
  const mm = 12;
  const width = 210 * mm;
  const rows = account.transactions || [];
  const height = Math.max(297 * mm, (140 + Math.max(1, rows.length) * 16) * mm);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#172e27";
  context.direction = "rtl";
  context.textBaseline = "middle";
  const right = 196 * mm;
  const left = 14 * mm;
  const text = (value, x, y, align = "right", size = 28, weight = 400, direction = "rtl", color = "#172e27") => {
    context.direction = direction;
    context.textAlign = align;
    context.font = `${weight} ${size}px "HesabiArabicPdf", Tahoma, Arial, sans-serif`;
    context.fillStyle = color;
    context.fillText(String(value ?? ""), x, y);
  };
  const line = (fromX, fromY, toX, toY, color = "#d9e0d7", widthPx = 2) => { context.strokeStyle = color; context.lineWidth = widthPx; context.beginPath(); context.moveTo(fromX, fromY); context.lineTo(toX, toY); context.stroke(); };
  let y = 19 * mm;
  if (logoImage) drawStoreLogo(context, logoImage, center, y + 8 * mm, 22 * mm);
  text(storeName || "حسابي", center, y + 24 * mm, "center", 56, 700, "rtl", "#174c3f");
  drawStoreDetails(context, { storeInfo, right, top: y + 2 * mm, width });
  y += 33 * mm;
  text("كشف حساب مديونية عميل", center, y, "center", 38, 600, "rtl", "#52645b");
  y += 10 * mm;
  text(`تاريخ الإنشاء: ${formatDateTime(new Date().toISOString())}`, right, y, "right", 26, 400, "rtl", "#52645b");
  y += 11 * mm;

  const cardTop = y - 6 * mm;
  const hasPhone = Boolean(account.customer?.phone);
  const hasAddress = Boolean(account.customer?.address);
  const cardHeight = (hasPhone && hasAddress ? 50 : hasPhone || hasAddress ? 39 : 30) * mm;
  context.fillStyle = "#edf6f0";
  context.strokeStyle = "#1f6b59";
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(left, cardTop, right - left, cardHeight, 12);
  context.fill(); context.stroke();
  text("بيانات العميل", right - 5 * mm, y + 2 * mm, "right", 38, 700, "rtl", "#174c3f");
  y += 12 * mm;
  const detail = (label, value, ltr = false) => { text(label, right - 5 * mm, y, "right", 30, 600, "rtl", "#52645b"); text(value, left + 5 * mm, y, "left", 34, 700, ltr ? "ltr" : "rtl"); y += 10 * mm; };
  detail("الاسم", account.customer?.name || "");
  if (hasPhone) detail("الهاتف", account.customer.phone, true);
  if (hasAddress) detail("العنوان", account.customer.address);
  y = cardTop + cardHeight + 13 * mm;

  const summary = [
    ["إجمالي المبيعات الآجلة", formatMoney(account.totalSales), "#f4f6f1", "#172e27"],
    ["إجمالي المسدد", formatMoney(account.totalPaid), "#f4f6f1", "#172e27"],
    ["الرصيد المستحق", formatMoney(account.balance), "#1f6b59", "#ffffff"],
  ];
  const boxGap = 4 * mm;
  const boxWidth = (right - left - boxGap * 2) / 3;
  summary.forEach(([label, value, background, color], index) => {
    const x = right - (index + 1) * boxWidth - index * boxGap;
    context.fillStyle = background; context.strokeStyle = background === "#1f6b59" ? "#1f6b59" : "#d9e0d7"; context.lineWidth = 2; context.beginPath(); context.roundRect(x, y, boxWidth, 29 * mm, 10); context.fill(); context.stroke();
    text(label, x + boxWidth - 4 * mm, y + 9 * mm, "right", 25, 600, "rtl", color);
    text(value, x + boxWidth - 4 * mm, y + 20 * mm, "right", 34, 700, "rtl", color);
  });
  y += 41 * mm;
  text("تفاصيل العمليات", right, y, "right", 40, 700, "rtl", "#174c3f");
  y += 9 * mm;
  const columns = [right, 151 * mm, 105 * mm, 59 * mm, left];
  context.fillStyle = "#f4f6f1"; context.fillRect(left, y - 6 * mm, right - left, 12 * mm);
  ["العملية", "التاريخ", "المرجع", "القيمة", "الرصيد بعد العملية"].forEach((label, index) => text(label, columns[index] - (index ? 3 * mm : 0), y, index === 4 ? "left" : "right", 23, 700, "rtl", "#52645b"));
  y += 12 * mm;
  if (!rows.length) { text("لا توجد عمليات مسجلة.", right, y, "right", 30, 400, "rtl", "#52645b"); y += 14 * mm; }
  rows.forEach((transaction) => {
    text(transaction.typeLabel || transaction.type || "", columns[0], y, "right", 26, 700);
    text(formatDateTime(transaction.date), columns[1], y, "right", 20, 400, "rtl", "#52645b");
    text(transaction.invoiceNumber || "—", columns[2], y, "right", 22, 600, "ltr", "#52645b");
    text(formatMoney(transaction.amount), columns[3], y, "right", 24, 700, "ltr", Number(transaction.amount) < 0 ? "#a74340" : "#172e27");
    text(formatMoney(transaction.remainingAmount), columns[4], y, "left", 24, 700, "ltr");
    y += 10 * mm;
    line(left, y - 5 * mm, right, y - 5 * mm);
  });
  y += 7 * mm;
  drawPdfFooter(context, { center: width / 2, width, height, y: height - 17 * mm });
  return canvas;
}

function drawReportCanvas({ rows, storeName, storeInfo, logoImage, from, to }) {
  const mm = 12;
  const width = 210 * mm;
  const dataRows = rows.slice(1);
  const height = Math.max(297 * mm, (92 + Math.max(1, dataRows.length) * 19) * mm);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.direction = "rtl";
  context.textBaseline = "middle";
  const right = 196 * mm;
  const left = 14 * mm;
  const text = (value, x, y, align = "right", size = 28, weight = 400, color = "#172e27", direction = "rtl") => {
    context.direction = direction;
    context.textAlign = align;
    context.font = `${weight} ${size}px "HesabiArabicPdf", Tahoma, Arial, sans-serif`;
    context.fillStyle = color;
    context.fillText(String(value ?? ""), x, y);
  };
  let y = 20 * mm;
  if (logoImage) drawStoreLogo(context, logoImage, left + 13 * mm, y, 22 * mm);
  text(storeName || "حسابي", right, y, "right", 70, 700, "#174c3f");
  y += 9 * mm;
  text("تقرير مالي وتحليلي", right, y, "right", 46, 700, "#172e27");
  y += 9 * mm;
  text(`الفترة: ${from || "بداية السجل"} إلى ${to || "اليوم"}`, right, y, "right", 32, 400, "#52645b");
  y += 10 * mm;
  context.strokeStyle = "#1f6b59";
  context.lineWidth = 3;
  context.beginPath(); context.moveTo(left, y); context.lineTo(right, y); context.stroke();
  y += 11 * mm;
  context.fillStyle = "#e8f2ee";
  context.fillRect(left, y - 7 * mm, right - left, 14 * mm);
  const columnCount = Math.max(2, rows[0]?.length || 2);
  const columnX = Array.from({ length: columnCount }, (_, index) => right - 5 * mm - index * ((right - left - 10 * mm) / Math.max(1, columnCount - 1)));
  rows[0]?.forEach((value, index) => text(value, columnX[index], y, index === 0 ? "right" : "center", 34, 700, "#145d4d"));
  y += 19 * mm;
  dataRows.forEach((row, index) => {
    if (index % 2 === 1) { context.fillStyle = "#f8fbfa"; context.fillRect(left, y - 9 * mm, right - left, 18 * mm); }
    row.forEach((value, columnIndex) => text(value, columnX[columnIndex], y, columnIndex === 0 ? "right" : "center", 31, columnIndex === 0 ? 600 : 700, /^[-−]/.test(String(value)) ? "#a74340" : "#172e27", columnIndex === 0 ? "rtl" : "ltr"));
    context.strokeStyle = "#cad8d3"; context.lineWidth = 1.5; context.beginPath(); context.moveTo(left, y + 9 * mm); context.lineTo(right, y + 9 * mm); context.stroke();
    y += 19 * mm;
  });
  y += 7 * mm;
  drawPdfFooter(context, { center: width / 2, width, height, y: height - 17 * mm });
  return canvas;
}

function createA4PdfFromCanvas(canvas) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pixelsPerMm = canvas.width / pageWidth;
  const pageHeightPx = Math.max(1, Math.ceil(pageHeight * pixelsPerMm));
  for (let offsetY = 0; offsetY < canvas.height; offsetY += pageHeightPx) {
    if (offsetY) pdf.addPage();
    const sliceHeight = Math.min(pageHeightPx, canvas.height - offsetY);
    const slice = document.createElement("canvas");
    slice.width = canvas.width; slice.height = sliceHeight;
    slice.getContext("2d").drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageWidth, sliceHeight / pixelsPerMm, undefined, "FAST");
  }
  return pdf;
}

export async function createPdfFileFromHtml({ html, filename, page = "a4" }) {
  const stage = createPdfStage(html, page);
  try {
    await waitForPdfStage(stage);
    const canvas = await html2canvas(stage, { scale: Math.max(3, window.devicePixelRatio || 1), useCORS: true, backgroundColor: "#ffffff", logging: false, windowWidth: stage.scrollWidth, windowHeight: stage.scrollHeight });
    if (canvas.width < 2 || canvas.height < 2) throw new Error("تعذر رسم محتوى الفاتورة لملف PDF.");
    const thermalWidth = 80;
    const thermalHeight = Math.max(40, (canvas.height * thermalWidth) / canvas.width);
    const pdf = new jsPDF({ unit: "mm", format: page === "thermal" ? [thermalWidth, thermalHeight] : "a4", orientation: "portrait", compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pixelsPerMm = canvas.width / pageWidth;
    const pageHeightPx = Math.max(1, Math.floor(pageHeight * pixelsPerMm));
    const addSlice = (offsetY, sliceHeight) => { const slice = document.createElement("canvas"); slice.width = canvas.width; slice.height = sliceHeight; slice.getContext("2d").drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight); pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageWidth, sliceHeight / pixelsPerMm, undefined, "FAST"); };
    if (page === "thermal") addSlice(0, canvas.height);
    else for (let offsetY = 0; offsetY < canvas.height; offsetY += pageHeightPx) { if (offsetY) pdf.addPage(); addSlice(offsetY, Math.min(pageHeightPx, canvas.height - offsetY)); }
    const blob = pdf.output("blob");
    if (!blob || blob.size < 800) throw new Error("تعذر إنشاء ملف PDF كامل المحتوى.");
    return new File([blob], filename, { type: "application/pdf" });
  } finally {
    stage.remove();
  }
}

const escapePdfValue = (value) => String(value ?? "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" }[character]));

export async function createThermalInvoicePdfFile({ invoice, customer, storeName, storeInfo, logoDataUrl, formatMoney, formatAmount, formatDateTime, paymentLabel, filename }) {
  await loadCanvasArabicFont();
  const logoImage = await loadStoreLogoImage(logoDataUrl);
  const canvas = drawThermalInvoiceCanvas({ invoice, customer, storeName, storeInfo, logoImage, formatMoney, formatAmount, formatDateTime, paymentLabel });
  const thermalWidth = 80;
  const thermalHeight = (canvas.height * thermalWidth) / canvas.width;
  const pdf = new jsPDF({ unit: "mm", format: [thermalWidth, thermalHeight], orientation: "portrait", compress: true });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, thermalWidth, thermalHeight, undefined, "FAST");
  const blob = pdf.output("blob");
  if (!blob || blob.size < 800) throw new Error("تعذر إنشاء ملف PDF واضح للفواتير.");
  return new File([blob], filename, { type: "application/pdf" });
}

export async function createPurchaseInvoicePdfFile({ purchase, supplier, storeName, storeInfo, logoDataUrl, formatMoney, formatAmount, formatDateTime, filename }) {
  await loadCanvasArabicFont();
  const logoImage = await loadStoreLogoImage(logoDataUrl);
  const pdf = createA4PdfFromCanvas(drawPurchaseInvoiceCanvas({ purchase, supplier, storeName, storeInfo, logoImage, formatMoney, formatAmount, formatDateTime }));
  const blob = pdf.output("blob");
  if (!blob || blob.size < 800) throw new Error("تعذر إنشاء ملف PDF واضح لفاتورة الشراء.");
  return new File([blob], filename, { type: "application/pdf" });
}

export async function createCustomerAccountPdfFile({ account, storeName, storeInfo, logoDataUrl, formatMoney, formatDateTime, filename }) {
  await loadCanvasArabicFont();
  const logoImage = await loadStoreLogoImage(logoDataUrl);
  const pdf = createA4PdfFromCanvas(drawCustomerAccountCanvas({ account, storeName, storeInfo, logoImage, formatMoney, formatDateTime }));
  const blob = pdf.output("blob");
  if (!blob || blob.size < 800) throw new Error("تعذر إنشاء ملف PDF واضح لكشف الحساب.");
  return new File([blob], filename, { type: "application/pdf" });
}

export async function createReportPdfFile({ rows, storeName, storeInfo, logoDataUrl, from, to, filename }) {
  await loadCanvasArabicFont();
  const logoImage = await loadStoreLogoImage(logoDataUrl);
  const pdf = createA4PdfFromCanvas(drawReportCanvas({ rows, storeName, storeInfo, logoImage, from, to }));
  const blob = pdf.output("blob");
  if (!blob || blob.size < 800) throw new Error("تعذر إنشاء تقرير PDF عربي واضح.");
  return new File([blob], filename, { type: "application/pdf" });
}

export async function shareOrDownloadPdf({ html, filename, title, page = "a4" }) { return fileOrDownload(await createPdfFileFromHtml({ html, filename, page }), title); }
export async function shareOrDownloadInvoicePdf(options) { return fileOrDownload(await createThermalInvoicePdfFile(options), options.title); }
export async function shareOrDownloadPurchaseInvoicePdf(options) { return fileOrDownload(await createPurchaseInvoicePdfFile(options), options.title); }
export async function shareOrDownloadCustomerAccountPdf(options) { return fileOrDownload(await createCustomerAccountPdfFile(options), options.title); }

export function printHtmlDocument({ html, target, features }) {
  if (window.__TAURI_INTERNALS__ || window.__TAURI__) {
    const frame = document.createElement("iframe");
    frame.title = target || "print";
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;";
    document.body.appendChild(frame);
    const printWindow = frame.contentWindow;
    const cleanup = () => window.setTimeout(() => frame.remove(), 500);
    frame.onload = () => { printWindow?.focus(); printWindow?.print(); cleanup(); };
    frame.srcdoc = html;
    return true;
  }
  const popup = window.open("", target, features);
  if (!popup) return false;
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 180);
  return true;
}
