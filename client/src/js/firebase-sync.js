import { getApp, getApps, initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence, signInAnonymously, signOut } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { createDeviceIdentity } from "./sync-domain.js";

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
const deviceKey = "hesabi-cloud-device-id";
const readIdentity = () => { try { return JSON.parse(localStorage.getItem(localKey) || "null"); } catch { return null; } };
const saveIdentity = (identity) => localStorage.setItem(localKey, JSON.stringify(identity));
const readDeviceId = () => { let value = localStorage.getItem(deviceKey); if (!value) { value = `device_${crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`; localStorage.setItem(deviceKey, value); } return value; };
const storeRef = (firestore, storeId) => doc(firestore, "stores", storeId);
const memberRef = (firestore, storeId, uid) => doc(firestore, "stores", storeId, "members", uid);
const operationRef = (firestore, storeId, operationId) => doc(firestore, "stores", storeId, "operations", operationId);
const pushConfigRef = (firestore, storeId) => doc(firestore, "stores", storeId, "push", "config");
/* السرّ الخاص لـ VAPID في مستند منفصل مقروء للأدمن فقط — لا يصل إليه الكاشير. */
const pushSenderRef = (firestore, storeId) => doc(firestore, "stores", storeId, "push", "sender");
const pushDeviceRef = (firestore, storeId, uid) => doc(firestore, "stores", storeId, "pushDevices", uid);

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
  const deviceId = readDeviceId();
  /* المستخدم الجديد ليس عضوًا بعد، فقواعد الأمان ترفض قراءة مستند المتجر قبل إنشائه.
     نعامل رفض القراءة كمتجر غير موجود بدل إفشال الربط برسالة Missing or insufficient permissions. */
  let existingOwnerDeviceId = "";
  try { const existingStore = await getDoc(storeRef(firestore, storeId)); existingOwnerDeviceId = existingStore.exists() ? existingStore.data().ownerDeviceId : ""; }
  catch (error) { if (error?.code !== "permission-denied") throw error; }
  const isOwnerDevice = !existingOwnerDeviceId || existingOwnerDeviceId === deviceId;
  /* كل الأجهزة الداخلة بنفس البريد تشترك في مستند عضوية واحد (نفس uid)؛
     نعيد استخدام deviceId المسجل فيه حتى تقبل قواعد الأمان دفعات كل الأجهزة،
     ونميز كل جهاز فعليًا بحقل originId المحلي. */
  let existingMemberDeviceId = "";
  try { const existingMember = await getDoc(memberRef(firestore, storeId, user.uid)); existingMemberDeviceId = existingMember.exists() ? existingMember.data().deviceId : ""; }
  catch (error) { if (error?.code !== "permission-denied") throw error; }
  const identity = { ...createDeviceIdentity({ deviceId: existingMemberDeviceId || deviceId, accountId: ownerAccount.id, accountName: ownerAccount.name, role: "admin", storeId }), isOwnerDevice, originId: deviceId };
  await setDoc(storeRef(firestore, storeId), { id: storeId, ownerUid: user.uid, ownerEmail: user.email || "", name: String(storeName || "حسابي").slice(0, 80), ownerDeviceId: existingOwnerDeviceId || deviceId, updatedAt: serverTimestamp() }, { merge: true });
  await setDoc(memberRef(firestore, storeId, user.uid), { ...identity, uid: user.uid, status: "active", updatedAt: serverTimestamp() }, { merge: true });
  saveIdentity(identity);
  return identity;
}

export async function adoptStoreMembership({ storeId, accountId, accountName, role = "cashier" }) {
  const { auth, firestore } = await services();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error("سجل الدخول ببريد وكلمة سر المتجر أولًا من الإعدادات > البيانات.");
  const snapshot = await getDoc(memberRef(firestore, storeId, user.uid));
  if (!snapshot.exists()) throw new Error("لم نجد مساحة متجر لهذا البريد. اربط جهاز الأدمن بالبريد نفسه مرة واحدة أولًا.");
  const member = snapshot.data();
  if (member.status !== "active") throw new Error("عضوية هذا البريد موقوفة.");
  const identity = { ...createDeviceIdentity({ deviceId: member.deviceId, accountId, accountName, role, storeId }), isOwnerDevice: false, originId: readDeviceId() };
  saveIdentity(identity);
  return identity;
}

export async function pushSyncOperation(change) {
  const identity = readIdentity();
  if (!identity || identity.revokedAt) throw new Error("هذا الجهاز غير مرتبط بمتجر سحابي.");
  const { firestore } = await services();
  await setDoc(operationRef(firestore, identity.storeId, change.id), { ...change, deviceId: identity.deviceId, origin: identity.originId || identity.deviceId, accountId: identity.accountId, createdAt: serverTimestamp() }, { merge: false });
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
    const localOrigin = identity.originId || identity.deviceId;
    snapshot.docChanges().filter((change) => change.type === "added").forEach((change) => {
      const data = change.doc.data();
      if ((data.origin || data.deviceId) !== localOrigin) onChange({ id: change.doc.id, ...data });
    });
  }, () => onStatus("offline"));
}

/* ============================ إشعارات Web Push ============================
 * سجلّ أجهزة المتجر: مفتاح VAPID للمتجر + اشتراك كل جهاز. الغرض أن يصل تنبيه
 * العملية الواحدة إلى كل أجهزة نفس المتجر (نفس الإيميل) والتطبيق مغلق، لأن
 * التسليم يمشي عبر مزوّد دفع المتصفح (fcm.googleapis.com على أندرويد).
 * ملاحظة صراحةً: لا خادم عندنا في بناء PWA/APK، فالجهاز نفسه هو المُرسِل.
 */

/* ============================ إشعارات Web Push ============================
 * سجلّ أجهزة المتجر: مفتاح VAPID للمتجر + اشتراك كل جهاز. الغرض أن يصل تنبيه
 * العملية الواحدة إلى كل أجهزة نفس المتجر (نفس الإيميل) والتطبيق مغلق، لأن
 * التسليم يمشي عبر مزوّد دفع المتصفح (fcm.googleapis.com على أندرويد).
 * ملاحظة صراحةً: لا خادم عندنا في بناء PWA/APK، فالجهاز نفسه هو المُرسِل.
 *
 * فصل المفاتيح (إصلاح أمني):
 *   stores/{id}/push/config  → المفتاح العام + subject فقط، يقرأه كل عضو (يلزم للاشتراك).
 *   stores/{id}/push/sender  → السرّ الخاص، لا يقرأه ولا يكتبه إلا الأدمن/المالك.
 * قبل الفصل كان السرّ الخاص داخل config المقروء لكل عضو، فأي كاشير يستطيع
 * انتحال المتجر وإرسال إشعارات مزيّفة إلى كل الأجهزة.
 */

const VAPID_PUBLIC_FIELDS = ["publicKey", "subject", "createdAt", "createdBy"];
let vapidCacheStore = "";
let vapidCacheValue = null;

const rememberVapid = (storeId, value) => { vapidCacheStore = storeId; vapidCacheValue = value; return value; };
const pickPublicVapid = (record = {}) => ({ publicKey: record.publicKey || "", subject: record.subject || "", createdAt: record.createdAt ?? null, createdBy: record.createdBy || "" });

/**
 * يقرأ مفاتيح VAPID للمتجر، وينشئها محليًا من جهاز الأدمن إن لم تكن موجودة.
 * `scope: "subscribe"` (الافتراضي) يعيد المفتاح العام وحده — يكفي لتسجيل اشتراك
 * الجهاز ولا يلمس السرّ الخاص. و`scope: "send"` يضيف السرّ الخاص من push/sender،
 * وهو مقصور على جهاز الأدمن/المالك بحسب قواعد Firestore.
 */
export async function getStoreVapidKeys(storeId, { force = false, scope = "subscribe" } = {}) {
  if (!storeId) return null;
  const { firestore } = await services();
  const cached = !force && vapidCacheStore === storeId ? vapidCacheValue : null;
  const publicPart = cached?.publicKey ? pickPublicVapid(cached) : await readPublicVapid(storeId, firestore);
  if (!publicPart?.publicKey) return scope === "send" ? await createStoreVapidKeys(storeId, firestore) : null;
  if (scope !== "send") return rememberVapid(storeId, publicPart);
  const privateKey = await readPrivateVapid(storeId, firestore);
  if (privateKey) return rememberVapid(storeId, { ...publicPart, privateKey });
  return await createStoreVapidKeys(storeId, firestore, publicPart);
}

/** المفتاح العام من push/config — متاح لكل عضو في المتجر. */
async function readPublicVapid(storeId, firestore) {
  const snapshot = await getDoc(pushConfigRef(firestore, storeId));
  const data = snapshot.exists() ? snapshot.data() : null;
  if (!data?.publicKey) return null;
  return pickPublicVapid(data);
}

/**
 * السرّ الخاص من push/sender. وإذا وجده في push/config (تخزين سابق قبل الفصل)
 * ينقله إلى sender ثم يحذفه من config حتى لا يبقى مقروءًا لبقية الأعضاء.
 */
async function readPrivateVapid(storeId, firestore) {
  const sender = await getDoc(pushSenderRef(firestore, storeId)).catch(() => null);
  if (sender?.exists() && sender.data().privateKey) return String(sender.data().privateKey);
  const legacy = await getDoc(pushConfigRef(firestore, storeId)).catch(() => null);
  const legacyKey = legacy?.exists() ? legacy.data().privateKey : "";
  if (!legacyKey) return "";
  await setDoc(pushSenderRef(firestore, storeId), { privateKey: String(legacyKey), migratedFrom: "config", updatedAt: serverTimestamp() }, { merge: true });
  await setDoc(pushConfigRef(firestore, storeId), { privateKey: null }, { merge: true });
  return String(legacyKey);
}

/**
 * إنشاء زوج مفاتيح جديد من جهاز الأدمن فقط، وكتابته مفصولًا:
 * العام في push/config والخاص في push/sender.
 * لا يمكن اشتقاق سرّ خاص من مفتاح عام موجود، فأي متجر له config بلا sender
 * (تخزين قديم حُذف سرّه، أو ترحيل ناقص) يحصل على زوج جديد كامل — الاشتراكات
 * القديمة تتجدد نفسها تلقائيًا عبر renewAndRegisterPushDevice عند فتح التطبيق.
 */
async function createStoreVapidKeys(storeId, firestore) {
  const user = await ensureOwnerUser();
  const member = await getCloudStoreMember(storeId, user.uid);
  if (!(member && member.role === "admin")) throw new Error("إنشاء مفاتيح الإشعارات من جهاز الأدمن فقط.");
  const { generateVapidKeypair } = await import("./push-relay.js");
  const generated = await generateVapidKeypair();
  const publicPart = {
    publicKey: generated.publicKey,
    subject: `mailto:${user.email || `owner-${storeId}@hesabi.app`}`,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
  };
  await setDoc(pushConfigRef(firestore, storeId), publicPart, { merge: true });
  await setDoc(pushSenderRef(firestore, storeId), { privateKey: generated.privateKey, publicKey: generated.publicKey, updatedAt: serverTimestamp() }, { merge: true });
  return rememberVapid(storeId, { ...publicPart, privateKey: generated.privateKey, createdAt: null });
}

/** يسجّل اشتراك هذا الجهاز تحت حسابه هو فقط — القواعد تمنع كتابة حساب غيره. */
export async function registerPushDevice({ storeId, subscription, meta = {} }) {
  const { auth, firestore } = await services();
  const user = auth.currentUser;
  if (!user || !storeId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return null;
  await setDoc(
    pushDeviceRef(firestore, storeId, user.uid),
    {
      uid: user.uid,
      storeId,
      deviceId: readDeviceId(),
      accountName: readIdentity()?.accountName || "",
      endpoint: String(subscription.endpoint).slice(0, 2048),
      keys: { p256dh: String(subscription.keys.p256dh), auth: String(subscription.keys.auth) },
      expirationTime: subscription.expirationTime ?? null,
      platform: meta.platform || "",
      userAgent: String(meta.userAgent || (typeof navigator !== "undefined" ? navigator.userAgent : "") || "").slice(0, 200),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true },
  );
  return { uid: user.uid };
}

export async function unregisterPushDevice(storeId) {
  const { auth, firestore } = await services();
  const user = auth.currentUser;
  if (!user || !storeId) return false;
  await deleteDoc(pushDeviceRef(firestore, storeId, user.uid));
  return true;
}

/** اشتراكات أجهزة المتجر، عدا جهاز مُستبعِد (من نفّذ العملية لا يُنبّه نفسه). */
export async function listStorePushDevices(storeId, { excludeUid = "" } = {}) {
  const { firestore } = await services();
  const snapshot = await getDocs(collection(firestore, "stores", storeId, "pushDevices"));
  const devices = [];
  for (const item of snapshot.docs) {
    const data = item.data() || {};
    if (excludeUid && item.id === excludeUid) continue;
    if (!data.endpoint || !data.keys?.p256dh || !data.keys?.auth) continue;
    devices.push({ uid: item.id, accountName: data.accountName || "", subscription: { endpoint: data.endpoint, keys: data.keys, expirationTime: data.expirationTime ?? null } });
  }
  return devices;
}

/** حذف اشتراكات ميّتة (404/410 من مزوّد الدفع) — تُصلح نفسها في التشغيل التالي. */
export async function removePushDevicesByEndpoints(storeId, endpoints = []) {
  if (!storeId || !endpoints.length) return 0;
  const { firestore } = await services();
  const wanted = new Set(endpoints);
  const snapshot = await getDocs(collection(firestore, "stores", storeId, "pushDevices"));
  let removed = 0;
  for (const item of snapshot.docs) {
    if (wanted.has(item.data()?.endpoint)) {
      await deleteDoc(item.ref);
      removed += 1;
    }
  }
  return removed;
}

export async function getCloudDeviceIdentity() { return readIdentity(); }
export async function getCloudStoreMember(storeId, uid) { const { firestore } = await services(); const snapshot = await getDoc(memberRef(firestore, storeId, uid)); return snapshot.exists() ? snapshot.data() : null; }
