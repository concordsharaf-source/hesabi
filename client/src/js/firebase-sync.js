import { getApp, getApps, initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence, signInAnonymously, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { createDeviceIdentity, createPairingCode, isPairingCodeUsable } from "./sync-domain.js";

const fallbackConfig = {
  apiKey: "AIzaSyDQxnFIU1RFSmzpuEcN8UroQO9WfjsQwZw",
  authDomain: "hesabi-backup.firebaseapp.com",
  projectId: "hesabi-backup",
  storageBucket: "hesabi-backup.firebasestorage.app",
  messagingSenderId: "1060015017841",
  appId: "1:1060015017841:web:b19a9d31e79cf0476c30d0",
};

const config = () => {
  try { return { ...fallbackConfig, ...(import.meta.env.VITE_FIREBASE_CONFIG_JSON ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG_JSON) : {}) }; }
  catch { return fallbackConfig; }
};

let servicesPromise;
async function services() {
  servicesPromise ||= (async () => {
    const app = getApps().length ? getApp() : initializeApp(config());
    const auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence);
    return { auth, firestore: getFirestore(app) };
  })();
  return servicesPromise;
}

const localKey = "hesabi-cloud-device";
const readIdentity = () => { try { return JSON.parse(localStorage.getItem(localKey) || "null"); } catch { return null; } };
const saveIdentity = (identity) => localStorage.setItem(localKey, JSON.stringify(identity));
const storeRef = (firestore, storeId) => doc(firestore, "stores", storeId);
const memberRef = (firestore, storeId, uid) => doc(firestore, "stores", storeId, "members", uid);
const pairingRef = (firestore, storeId, code) => doc(firestore, "stores", storeId, "pairings", code);
const operationRef = (firestore, storeId, operationId) => doc(firestore, "stores", storeId, "operations", operationId);
const directoryRef = (firestore, emailKey) => doc(firestore, "storeDirectory", emailKey);
const requestRef = (firestore, storeId, requestId) => doc(firestore, "stores", storeId, "pairRequests", requestId);
const emailKey = async (email) => { const bytes = new TextEncoder().encode(String(email || "").trim().toLowerCase()); const digest = await crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join(""); };

async function ensureAnonymousUser() {
  const { auth } = await services();
  if (!auth.currentUser) await signInAnonymously(auth);
  return auth.currentUser;
}

async function ensureOwnerUser() {
  const { auth } = await services();
  if (!auth.currentUser || auth.currentUser.isAnonymous) throw new Error("اربط حساب النسخ السحابية الموثق على جهاز الأدمن أولًا.");
  return auth.currentUser;
}

export async function createStoreWorkspace({ storeId, storeName, ownerAccount }) {
  const { firestore } = await services();
  const user = await ensureOwnerUser();
  const identity = createDeviceIdentity({ deviceId: `device_${user.uid}`, accountId: ownerAccount.id, accountName: ownerAccount.name, role: "admin", storeId });
  await setDoc(storeRef(firestore, storeId), { id: storeId, ownerUid: user.uid, ownerEmail: user.email || "", name: String(storeName || "حسابي").slice(0, 80), updatedAt: serverTimestamp() }, { merge: true });
  if (user.email) await setDoc(directoryRef(firestore, await emailKey(user.email)), { storeId, ownerUid: user.uid, ownerEmail: user.email, updatedAt: serverTimestamp() }, { merge: true });
  await setDoc(memberRef(firestore, storeId, user.uid), { ...identity, uid: user.uid, status: "active", updatedAt: serverTimestamp() }, { merge: true });
  saveIdentity(identity);
  return identity;
}

export async function createPairingInvite({ storeId, accountId, accountName, role, ttlMs = 10 * 60 * 1000 }) {
  const { firestore } = await services();
  const identity = readIdentity();
  if (!identity || identity.storeId !== storeId || identity.role !== "admin") throw new Error("يجب إنشاء مساحة المتجر من جهاز الأدمن أولًا.");
  const pairing = createPairingCode({ ttlMs });
  await setDoc(pairingRef(firestore, storeId, pairing.code), { ...pairing, storeId, accountId, accountName, role: role === "admin" ? "admin" : "cashier", createdBy: identity.deviceId });
  return { ...pairing, token: `${storeId}:${pairing.code}` };
}

export async function redeemPairingInvite(code) {
  const token = String(code || "").trim();
  const [storeId, actualCode] = token.split(":");
  if (!storeId || !/^\d{6}$/.test(actualCode || "")) throw new Error("رمز الاقتران غير صالح. استخدم الصيغة التي يعرضها الأدمن.");
  const { firestore } = await services();
  const user = await ensureAnonymousUser();
  let result;
  const stores = { storeId, actualCode };
  if (!stores.storeId) throw new Error("استخدم رمز الاقتران الكامل الذي يعرضه الأدمن.");
  const target = pairingRef(firestore, stores.storeId, stores.actualCode);
  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(target);
    const pairing = snapshot.exists() ? snapshot.data() : null;
    if (!isPairingCodeUsable(pairing)) throw new Error("رمز الاقتران منتهي أو مستخدم.");
    const identity = createDeviceIdentity({ deviceId: `device_${user.uid}`, accountId: pairing.accountId, accountName: pairing.accountName, role: pairing.role, storeId: stores.storeId });
    transaction.set(memberRef(firestore, stores.storeId, user.uid), { ...identity, uid: user.uid, status: "active", pairedAt: new Date().toISOString(), updatedAt: serverTimestamp() });
    transaction.update(target, { usedAt: new Date().toISOString(), usedBy: user.uid });
    result = identity;
  });
  const bootstrap = await getDocs(query(collection(firestore, "stores", stores.storeId, "operations"), orderBy("createdAt", "asc")));
  result.bootstrapChanges = bootstrap.docs.map((item) => ({ id: item.id, ...item.data() }));
  saveIdentity(result);
  return result;
}

export async function seedWorkspaceBackup(payload) {
  const identity = readIdentity(); if (!identity || identity.role !== "admin") throw new Error("يجب أن يكون الجهاز أدمن لتهيئة بيانات المتجر.");
  const stores = { ...(payload?.stores || {}) }; const changes = Object.entries(stores).flatMap(([store, records]) => Array.isArray(records) ? records.filter((record) => record?.id).map((record) => ({ id: `bootstrap:${store}:${record.id}`, store, recordId: record.id, type: "upsert", record, changedAt: record.updatedAt || record.createdAt || new Date().toISOString() })) : []);
  for (const change of changes) await pushSyncOperation(change);
  return changes.length;
}

export async function pushSyncOperation(change) {
  const identity = readIdentity();
  if (!identity || identity.revokedAt) throw new Error("هذا الجهاز غير مرتبط بمتجر سحابي.");
  const { firestore } = await services();
  await setDoc(operationRef(firestore, identity.storeId, change.id), { ...change, deviceId: identity.deviceId, accountId: identity.accountId, createdAt: serverTimestamp() }, { merge: false });
  return change.id;
}

export async function watchSyncOperations(onChange, onStatus = () => {}) {
  const identity = readIdentity();
  if (!identity || identity.revokedAt) return () => {};
  const { firestore } = await services();
  const operations = query(collection(firestore, "stores", identity.storeId, "operations"), orderBy("createdAt", "asc"));
  onStatus("connecting");
  return onSnapshot(operations, (snapshot) => {
    onStatus("online");
    snapshot.docChanges().filter((change) => change.type === "added").forEach((change) => {
      if (change.doc.data().deviceId !== identity.deviceId) onChange({ id: change.doc.id, ...change.doc.data() });
    });
  }, () => onStatus("offline"));
}

export async function requestAssistantDevice({ ownerEmail, accountName, role = "cashier" }) {
  const { firestore } = await services(); const user = await ensureAnonymousUser(); const directory = await getDoc(directoryRef(firestore, await emailKey(ownerEmail)));
  if (!directory.exists()) throw new Error("لم نجد متجرًا مرتبطًا بهذا البريد. يجب أن يربط الأدمن حساب النسخ السحابية مرة واحدة من جهازه أولًا.");
  const { storeId } = directory.data(); const requestId = `request_${user.uid}_${Date.now()}`;
  await setDoc(requestRef(firestore, storeId, requestId), { id: requestId, storeId, requesterUid: user.uid, accountName: String(accountName || "").trim().slice(0, 80), role: role === "admin" ? "admin" : "cashier", status: "pending", createdAt: serverTimestamp() });
  return { requestId, storeId, status: "pending" };
}

export async function approveAssistantRequest({ storeId, requestId, accountId, accountName, role }) {
  const { firestore } = await services(); const identity = readIdentity(); if (!identity || identity.storeId !== storeId || identity.role !== "admin") throw new Error("لا يملك هذا الجهاز صلاحية اعتماد الطلب.");
  const pairing = createPairingCode(); const request = requestRef(firestore, storeId, requestId);
  await runTransaction(firestore, async (transaction) => { const snapshot = await transaction.get(request); if (!snapshot.exists() || snapshot.data().status !== "pending") throw new Error("الطلب غير موجود أو تمت معالجته."); const data = snapshot.data(); transaction.set(pairingRef(firestore, storeId, pairing.code), { ...pairing, storeId, accountId: accountId || `account_${data.requesterUid}`, accountName: accountName || data.accountName, role: role || data.role, requesterUid: data.requesterUid, createdBy: identity.deviceId }); transaction.update(request, { status: "approved", approvedAt: new Date().toISOString(), pairingCode: pairing.code }); });
  return { ...pairing, token: `${storeId}:${pairing.code}` };
}

export async function watchAssistantRequests(storeId, onRequests, onError = () => {}) {
  const identity = readIdentity(); if (!identity || identity.storeId !== storeId || identity.role !== "admin") return () => {};
  const { firestore } = await services();
  return onSnapshot(query(collection(firestore, "stores", storeId, "pairRequests"), orderBy("createdAt", "desc")), (snapshot) => onRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError);
}

export async function getCloudDeviceIdentity() { return readIdentity(); }
export async function revokeCloudDevice() { localStorage.removeItem(localKey); const { auth } = await services(); if (auth.currentUser) await signOut(auth); }
export async function getCloudStoreMember(storeId, uid) { const { firestore } = await services(); const snapshot = await getDoc(memberRef(firestore, storeId, uid)); return snapshot.exists() ? snapshot.data() : null; }
