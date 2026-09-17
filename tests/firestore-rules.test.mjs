/**
 * اختبار قواعد Firestore على محاكي حقيقي — لا فحص نصي.
 *
 * يثبت أن الثغرتين اللتين أُصلحتا مغلقتان فعلًا، وأن المسارات الشرعية ما زالت تعمل:
 *   1) انتحال عضوية أدمن في متجر يملكه غيرك (تصعيد صلاحيات).
 *   2) قراءة السرّ الخاص لـ VAPID من جهاز كاشير (انتحال إشعارات المتجر).
 *
 * التشغيل (يحتاج Java 21+ وتنزيلًا أوليًا للمحاكي):
 *   firebase emulators:start --only firestore,auth --project hesabi-rules-test
 *   pnpm test:rules
 *
 * مهمة: يجب أن يبدأ المحاكي بالمشروع نفسه المكتوب في PROJECT_ID أدناه، وإلا فشلت
 * كل قاعدة تستخدم get() بخطأ تقييم (يُحلّ المسار داخل مشروع الطلب لا مشروع المحاكي).
 */
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const PROJECT_ID = "hesabi-rules-test";
const STORE = "store_victim";
const OWNER = "owner-uid";
const ATTACKER = "attacker-uid";
const CASHIER = "cashier-uid";
const STRANGER = "stranger-uid";
const DEVICE = "device_shared";
const ATTACKER_DEVICE = "device_attacker";

let env;
let owner, attacker, cashier, stranger, anonymous;

const seed = (fn) => env.withSecurityRulesDisabled(async (context) => fn(context.firestore()));

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8199,
      rules: readFileSync(fileURLToPath(new URL("../firestore.rules", import.meta.url)), "utf8"),
    },
  });

  /* المحاكي لا يفقد بياناته بين التشغيلات، فأي بقايا من جولة سابقة تُفسد النتائج
     (مثل عضوية منشأة مسبقًا تجعل اختبار «الاعتراض» ينجح خطأً). نصغّر هنا دائمًا. */
  await env.clearFirestore();

  /* متجر الضحية كما ينشئه الأدمن الحقيقي: ownerUid هو صاحب البريد، وعضويته أدمن. */
  await seed(async (db) => {
    await setDoc(doc(db, "stores", STORE), {
      id: STORE,
      ownerUid: OWNER,
      ownerEmail: "owner@hesabi.test",
      name: "بقالة الواحة",
      ownerDeviceId: DEVICE,
    });
    await setDoc(doc(db, "stores", STORE, "members", OWNER), {
      uid: OWNER,
      deviceId: DEVICE,
      accountId: "account_admin",
      accountName: "صاحب المتجر",
      role: "admin",
      storeId: STORE,
      status: "active",
    });
    await setDoc(doc(db, "stores", STORE, "members", CASHIER), {
      uid: CASHIER,
      deviceId: DEVICE,
      accountId: "account_cashier",
      accountName: "كاشير",
      role: "cashier",
      storeId: STORE,
      status: "active",
    });
    await setDoc(doc(db, "stores", STORE, "operations", "op-seeded"), {
      deviceId: DEVICE,
      store: "products",
      recordId: "p1",
      type: "upsert",
      record: { id: "p1", name: "منتج" },
    });
    /* الفصل الأمني: العام في config والخاص في sender. */
    await setDoc(doc(db, "stores", STORE, "push", "config"), {
      publicKey: "PUBLIC_KEY_VALUE",
      subject: "mailto:owner@hesabi.test",
      privateKey: null,
    });
    await setDoc(doc(db, "stores", STORE, "push", "sender"), { privateKey: "SECRET_VALUE" });
    await setDoc(doc(db, "backupOwners", OWNER, "backups", "b1"), { size: 1 });
  });

  owner = env.authenticatedContext(OWNER);
  attacker = env.authenticatedContext(ATTACKER);
  cashier = env.authenticatedContext(CASHIER);
  stranger = env.authenticatedContext(STRANGER);
  anonymous = env.unauthenticatedContext();
});

after(async () => { await env.cleanup(); });

const attackerMember = (role) => ({
  uid: ATTACKER,
  deviceId: ATTACKER_DEVICE,
  accountId: "account_evil",
  accountName: "معتدٍ",
  role,
  storeId: STORE,
  status: "active",
});

describe("قواعد Firestore — الثغرة الأولى: تصعيد الصلاحيات", () => {
  it("يرفض منح النفس عضوية أدمن في متجر يملكه غيرك", async () => {
    await assertFails(setDoc(doc(attacker.firestore(), "stores", STORE, "members", ATTACKER), attackerMember("admin")));
  });

  it("يرفض الانضمام الذاتي حتى بدور كاشير لمتجر مملوك", async () => {
    await assertFails(setDoc(doc(attacker.firestore(), "stores", STORE, "members", ATTACKER), attackerMember("cashier")));
  });

  it("يرفض الاستيلاء على مستند المتجر بتغيير ownerUid", async () => {
    await assertFails(setDoc(doc(attacker.firestore(), "stores", STORE), { id: STORE, ownerUid: ATTACKER }, { merge: true }));
  });

  it("يحرم المعتد من بيانات المتجر بعد رفض عضويته", async () => {
    await assertFails(getDoc(doc(attacker.firestore(), "stores", STORE)));
    await assertFails(getDoc(doc(attacker.firestore(), "stores", STORE, "operations", "op-seeded")));
    await assertFails(setDoc(doc(attacker.firestore(), "stores", STORE, "operations", "op-evil"), {
      deviceId: ATTACKER_DEVICE, store: "products", recordId: "p1", type: "upsert", record: { id: "p1", name: "مسموم" },
    }));
  });

  it("يرفض عضوية بحقول مسمّمة (uid أو storeId غير مطابق)", async () => {
    await assertFails(setDoc(doc(owner.firestore(), "stores", "store_free", "members", "someone-else"), {
      uid: ATTACKER, deviceId: "d", storeId: "store_free", role: "cashier", status: "active",
    }));
    await assertFails(setDoc(doc(cashier.firestore(), "stores", "store_free", "members", CASHIER), {
      uid: CASHIER, deviceId: "d", storeId: "store_other", role: "cashier", status: "active",
    }));
  });
});

describe("قواعد Firestore — المسارات الشرعية", () => {
  it("الأدمن ينشئ متجرًا جديدًا ويمنح نفسه عضوية أدمن (أول ربط سحابي)", async () => {
    await assertSucceeds(setDoc(doc(owner.firestore(), "stores", "store_new"), { id: "store_new", ownerUid: OWNER, name: "متجر جديد" }));
    await assertSucceeds(setDoc(doc(owner.firestore(), "stores", "store_new", "members", OWNER), {
      uid: OWNER, deviceId: "device_new", accountId: "account_admin", role: "admin", storeId: "store_new", status: "active",
    }));
  });

  it("عضوية كاشير ذاتية مسموحة في متجر غير مطالب به، وأدمن ذاتي مرفوض", async () => {
    await assertSucceeds(setDoc(doc(cashier.firestore(), "stores", "store_free", "members", CASHIER), {
      uid: CASHIER, deviceId: "device_c", accountId: "account_c", role: "cashier", storeId: "store_free", status: "active",
    }));
    await assertFails(setDoc(doc(cashier.firestore(), "stores", "store_free2", "members", CASHIER), {
      uid: CASHIER, deviceId: "device_c", accountId: "account_c", role: "admin", storeId: "store_free2", status: "active",
    }));
  });

  it("العضو يقرأ مستند متجره", async () => {
    await assertSucceeds(getDoc(doc(cashier.firestore(), "stores", STORE)));
    await assertSucceeds(getDoc(doc(cashier.firestore(), "stores", STORE, "members", CASHIER)));
  });

  it("الأدمن يحدّث مستند المتجر وغير المالك لا يستطيع", async () => {
    await assertSucceeds(setDoc(doc(owner.firestore(), "stores", STORE), { name: "الاسم الجديد" }, { merge: true }));
    await assertFails(setDoc(doc(cashier.firestore(), "stores", STORE), { name: "عبث" }, { merge: true }));
  });
});

describe("قواعد Firestore — الثغرة الثانية: سرّ VAPID", () => {
  it("الكاشير يقرأ المفتاح العام (لازم لاشتراك الجهاز)", async () => {
    await assertSucceeds(getDoc(doc(cashier.firestore(), "stores", STORE, "push", "config")));
  });

  it("الكاشير لا يقرأ السرّ الخاص ولا يكتبه", async () => {
    await assertFails(getDoc(doc(cashier.firestore(), "stores", STORE, "push", "sender")));
    await assertFails(setDoc(doc(cashier.firestore(), "stores", STORE, "push", "sender"), { privateKey: "HIJACK" }));
  });

  it("الكاشير لا يستبدل المفتاح العام ليحوّل إشعارات المتجر", async () => {
    await assertFails(setDoc(doc(cashier.firestore(), "stores", STORE, "push", "config"), { publicKey: "HIJACK" }, { merge: true }));
  });

  it("الأدمن وحده يقرأ السرّ الخاص ويدوّره", async () => {
    await assertSucceeds(getDoc(doc(owner.firestore(), "stores", STORE, "push", "sender")));
    await assertSucceeds(setDoc(doc(owner.firestore(), "stores", STORE, "push", "sender"), { privateKey: "ROTATED" }, { merge: true }));
  });

  it("غير العضو لا يقرأ حتى المفتاح العام", async () => {
    await assertFails(getDoc(doc(stranger.firestore(), "stores", STORE, "push", "config")));
    await assertFails(getDoc(doc(anonymous.firestore(), "stores", STORE, "push", "config")));
  });
});

describe("قواعد Firestore — سجلّ العمليات وأجهزة الإشعارات", () => {
  it("العضو يدفع عملية بجهازه المسجّل في عضويته فقط", async () => {
    await assertSucceeds(setDoc(doc(cashier.firestore(), "stores", STORE, "operations", "op-c1"), {
      deviceId: DEVICE, origin: "origin_c1", store: "products", recordId: "p9", type: "upsert", record: { id: "p9" },
    }));
    await assertFails(setDoc(doc(cashier.firestore(), "stores", STORE, "operations", "op-c2"), {
      deviceId: ATTACKER_DEVICE, store: "products", recordId: "p8", type: "upsert", record: { id: "p8" },
    }));
  });

  it("حذف العمليات للأدمن فقط", async () => {
    await assertFails(deleteDoc(doc(cashier.firestore(), "stores", STORE, "operations", "op-seeded")));
    await assertSucceeds(deleteDoc(doc(owner.firestore(), "stores", STORE, "operations", "op-seeded")));
  });

  it("كل جهاز يسجّل اشتراكه تحت حسابه هو فقط", async () => {
    await assertSucceeds(setDoc(doc(cashier.firestore(), "stores", STORE, "pushDevices", CASHIER), {
      uid: CASHIER, storeId: STORE, endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: "a", auth: "b" },
    }));
    await assertFails(setDoc(doc(cashier.firestore(), "stores", STORE, "pushDevices", ATTACKER), {
      uid: ATTACKER, storeId: STORE, endpoint: "https://fcm.googleapis.com/fcm/send/evil", keys: { p256dh: "a", auth: "b" },
    }));
    await assertFails(setDoc(doc(cashier.firestore(), "stores", STORE, "pushDevices", CASHIER), {
      uid: CASHIER, storeId: "store_other", endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: "a", auth: "b" },
    }));
  });
});

describe("قواعد Firestore — النسخ الاحتياطي والميزات الملغاة", () => {
  it("النسخ الشخصي معزول: المالك وحده يقرأ ويكتب", async () => {
    await assertSucceeds(setDoc(doc(owner.firestore(), "backupOwners", OWNER, "backups", "b2"), { size: 2 }));
    await assertSucceeds(getDoc(doc(owner.firestore(), "backupOwners", OWNER, "backups", "b1")));
    await assertFails(getDoc(doc(attacker.firestore(), "backupOwners", OWNER, "backups", "b1")));
    await assertFails(setDoc(doc(attacker.firestore(), "backupOwners", OWNER, "backups", "b3"), { size: 3 }));
  });

  it("دليل البريد ومنظومة الاقتران محذوفة ومغلقة", async () => {
    await assertFails(getDoc(doc(stranger.firestore(), "storeDirectory", "abc123")));
    await assertFails(setDoc(doc(stranger.firestore(), "storeDirectory", "abc123"), { storeId: STORE, ownerUid: STRANGER }));
    await assertFails(getDoc(doc(stranger.firestore(), "stores", STORE, "pairings", "123456")));
    await assertFails(getDoc(doc(stranger.firestore(), "stores", STORE, "pairRequests", "req1")));
  });

  it("بلا مصادقة كل شيء مغلق", async () => {
    await assertFails(getDoc(doc(anonymous.firestore(), "stores", STORE)));
    await assertFails(setDoc(doc(anonymous.firestore(), "stores", "store_anon"), { id: "store_anon", ownerUid: "x" }));
  });
});
