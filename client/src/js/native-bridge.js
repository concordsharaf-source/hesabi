/* Native bridge for the Hesabi (\u062d\u0633\u0627\u0628\u064a) Android app.
   Detects the Capacitor native runtime and exposes typed wrappers around the
   HesabiScanner / HesabiContacts / HesabiFiles / HesabiApp plugins so the web
   app can use native barcode scanning, the system contact picker, MediaStore
   downloads, the Android share sheet, and the system print dialog without any
   browser-only API ever failing silently inside the APK WebView. */

const getCapacitor = () => {
  try { return typeof window !== "undefined" ? window.Capacitor || null : null; } catch { return null; }
};

export const isNativeAndroid = () => {
  const cap = getCapacitor();
  if (!cap) return false;
  try {
    if (typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) return true;
    return typeof cap.getPlatform === "function" && cap.getPlatform() === "android";
  } catch { return false; }
};

const plugin = (id) => {
  const cap = getCapacitor();
  const instance = cap?.Plugins?.[id] || null;
  return instance && typeof instance.isAvailable === "function" ? instance : null;
};

/* Scanner events: "barcode" | "scannerClosed" | "manualEntryRequested" | "permissionDenied" */
export const getNativeScanner = () => plugin("HesabiScanner");
export const getNativeContacts = () => plugin("HesabiContacts");
export const getNativeFiles = () => plugin("HesabiFiles");
export const getNativeApp = () => plugin("HesabiApp");

export const addNativeScannerListeners = ({ onBarcode, onClosed, onManualEntry, onPermissionDenied } = {}) => {
  const scanner = getNativeScanner();
  if (!scanner) return null;
  const handles = [];
  const safe = (handler) => (typeof handler === "function" ? handler : () => {});
  if (onBarcode) handles.push(scanner.addListener("barcode", safe(onBarcode)));
  if (onClosed) handles.push(scanner.addListener("scannerClosed", safe(onClosed)));
  if (onManualEntry) handles.push(scanner.addListener("manualEntryRequested", safe(onManualEntry)));
  if (onPermissionDenied) handles.push(scanner.addListener("permissionDenied", safe(onPermissionDenied)));
  return {
    remove: () => { handles.forEach((handle) => { try { handle?.remove?.(); } catch { /* already detached */ } }); },
  };
};

/* Blob/File -> base64 without native dependencies; handles both ArrayBuffer
   and string payloads so Excel (array), CSV/DOC/backup (string) all work. */
const toBase64 = async (data) => {
  const normalize = (value) => {
    if (typeof value === "string") return value;
    if (value instanceof ArrayBuffer) return value;
    if (ArrayBuffer.isView(value)) return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
    if (value instanceof Blob) return value;
    return String(value);
  };
  const raw = normalize(data);
  if (typeof raw === "string") {
    const bytes = new TextEncoder().encode(raw);
    let binary = "";
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
    }
    return btoa(binary);
  }
  const buffer = raw instanceof Blob ? await raw.arrayBuffer() : raw;
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
};

export const nativeSaveFile = async ({ data, filename, mimeType }) => {
  const files = getNativeFiles();
  if (!files) throw new Error("HesabiFiles unavailable");
  const base64 = await toBase64(data);
  return files.save({ data: base64, filename, mimeType: mimeType || "application/octet-stream" });
};

export const nativeShareFile = async ({ data, filename, mimeType, title }) => {
  const files = getNativeFiles();
  if (!files) throw new Error("HesabiFiles unavailable");
  const base64 = await toBase64(data);
  return files.share({ data: base64, filename, mimeType: mimeType || "application/octet-stream", title: title || filename });
};

export const nativeShareText = async ({ text, title }) => {
  const files = getNativeFiles();
  if (!files) throw new Error("HesabiFiles unavailable");
  return files.shareText({ text, title: title || "\u062d\u0633\u0627\u0628\u064a" });
};

export const nativePrintHtml = async ({ html, jobName }) => {
  const files = getNativeFiles();
  if (!files) throw new Error("HesabiPrint unavailable");
  return files.print({ html, jobName: jobName || "حسابي" });
};

export const nativePickContacts = async ({ props = ["name", "tel"], multiple = false } = {}) => {
  const contacts = getNativeContacts();
  if (!contacts) throw new Error("HesabiContacts unavailable");
  const result = await contacts.select({ props, multiple });
  // Shape like the web Contact Picker API: [{ name, tel: [numbers] }]
  const list = Array.isArray(result?.contacts) ? result.contacts : [];
  return list.map((contact) => ({ name: contact?.name || "", tel: Array.isArray(contact?.tel) ? contact.tel : [] }));
};

export const nativeExitApp = async () => {
  const app = getNativeApp();
  if (!app) return false;
  try { await app.exitApp(); return true; } catch { return false; }
};
