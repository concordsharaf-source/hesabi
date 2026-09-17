# نشر قواعد Firestore في Firebase — دليل عملي

القواعد جاهزة في ملف **`firestore.rules`** داخل المستودع (نسخة مطابقة تمامًا: **`FIRESTORE-RULES.txt`** في الجذر لتسهيل النسخ).

> ⚠️ **الإصلاح الأمني لا يسري إطلاقًا قبل نشر القواعد.** التعديل في المستودع وحده لا يغيّر سلوك Firestore.

- **المشروع:** `hesabi-backup`
- **الوسيلة:** Firebase Authentication (بريد/كلمة مرور + دخول مجهول) وCloud Firestore فقط. لا Storage ولا Functions.

---

## الطريقة الأولى: من جهازك بـ Firebase CLI (الموصى بها)

```bash
# 1) ثبّت الأداة مرة واحدة (تتطلب Node 22+)
npm install -g firebase-tools

# 2) سجّل الدخول بحساب Google الذي يملك مشروع hesabi-backup
firebase login

# 3) من جذر المستودع — تحقق من المشروع المرتبط
cd hesabi
firebase projects:list
firebase use hesabi-backup        # أو: firebase use --add

# 4) انشر القواعد وحدها (لا يمسّ البيانات ولا الفهارس)
firebase deploy --only firestore:rules
```

أو بدون ضبط مشروع، في أمر واحد:

```bash
firebase deploy --only firestore:rules --project hesabi-backup
```

**تجربة بلا نشر** (محاكاة القواعد مقابل بيانات تجريبية):

```bash
firebase emulators:start --only firestore
```

ملف `firebase.json` أُضيف للمستودع ويوجّه الأداة إلى `firestore.rules` تلقائيًا.

---

## الطريقة الثانية: من Console بلا أدوات

1. افتح https://console.firebase.google.com/project/hesabi-backup/firestore/rules
2. احذف كل ما في المحرر.
3. الصق محتوى `FIRESTORE-RULES.txt` كاملًا.
4. اضغط **Publish** (نشر) أعلى يمين المحرر.

---

## الطريقة الثالثة: أمر جاهز في المستودع

```bash
pnpm deploy:rules
```

(يشغّل `firebase deploy --only firestore:rules` — يحتاج `firebase login` مسبقًا.)

---

## خطوات ما بعد النشر (مهمة)

### 1) رحّل السرّ الخاص لـ VAPID

القواعد الجديدة تجعل `stores/{id}/push/config` للمفتاح العام فقط، و`stores/{id}/push/sender` للسرّ الخاص.
**الكود يرحّل السرّ تلقائيًا** عند أول قراءة من جهاز الأدمن — لا عمل يدوي مطلوب، لكن تأكد:

- افتح التطبيق من **جهاز الأدمن** (حساب role=admin) وفعّل الإشعارات، أو نفّذ أي عملية بيع.
- في Console → Firestore → `stores` → اختر متجرًا → مجموعة `push`: يجب أن يظهر مستند **`sender`** فيه `privateKey`، ومستند **`config`** وقد صار `privateKey: null`.
- إن لم يظهر `sender`: احذف مستند `config` يدويًا من Console، ثم فعّل الإشعارات من جهاز الأدمن — سيتولّد زوج مفاتيح جديد نظيف. الاشتراكات القديمة في الأجهزة الأخرى تجدد نفسها تلقائيًا عند فتح التطبيق (`renewAndRegisterPushDevice`).

### 2) افحص العضويات القديمة

القواعد الجديدة تمنع **إنشاء** عضوية `admin` غير مخوّلة، لكنها **لا تحذف** ما أُنشئ قبل الإصلاح. راجع:

- لكل مستند في `stores/{id}`: سجّل قيمة `ownerUid`.
- في `stores/{id}/members`: أي وثيقة `role: "admin"` و`status: "active"` ومعرفها (uid) ≠ `ownerUid` → احذفها يدويًا ما لم تكن حسابًا شرعيًا لأدمن ثانٍ أضفته أنت.

استعلام سريع في Console لا يكفي (القواعد تمنع `list` لغير الأدمن)، فالتصفح يدويًا من **Firestore → Data**.

### 3) تحقق من أن الربط ما زال يعمل

- **جهاز أدمن ببريد جديد**: الإعدادات → البيانات → إنشاء حساب سحابي جديد. يجب أن ينجح بلا رسالة «Missing or insufficient permissions».
- **جهاز كاشير بالبريد نفسه**: يجب أن ينضم تلقائيًا ويتزامن (مسار `adoptStoreMembership` لم يتغير).
- إن ظهر خطأ صلاحيات عند الربط، راجع أن مستند `stores/{id}` أُنشئ وبحقل `ownerUid` صحيح — القاعدة الجديدة تشترط أن يكون منشئ عضوية الأدمن هو `ownerUid` نفسه.

---

## ما تغيّر في القواعد (ملخص للمراجعة)

| البند | قبل | بعد |
|---|---|---|
| `push/config` | عام + **سرّ خاص**، قراءة لأي عضو | **المفتاح العام فقط**، قراءة لأي عضو |
| `push/sender` | غير موجود | **السرّ الخاص**، قراءة وكتابة للأدمن/المالك فقط |
| إنشاء عضوية `admin` ذاتيًا | مسموح لأي مستخدم مسجّل دخول | مشروط بـ `storeUnclaimed(storeId)` **و** `ownsStore(storeId)` |
| إنشاء عضوية ذاتيًا | بلا تحقق من حقول الوثيقة | يشترط تطابق `uid` و`storeId` و`status == 'active'` |
| `pairings/{code}` | موجود، و`get` لأي مسجّل دخول | **محذوف** (الميزة أُلغيت في v63–v67) |
| `pairRequests/{requestId}` | موجود | **محذوف** |
| `storeDirectory/{emailKey}` | قراءة لأي مسجّل دخول (SHA-256 للبريد بلا salt) | **محذوف** |
| دوال مساعدة | `get()` مكررة داخل كل دالة | `memberDoc()` و`storeDoc()` و`storeUnclaimed()` — أقل قراءةً للوثائق |

القاعدة الافتراضية في النهاية بلا تغيير: `match /{document=**} { allow read, write: if false; }`

---

## ملاحظة على الفوترة

القواعد الجديدة **تقلّل** عدد عمليات القراءة:
- `memberDoc()` و`storeDoc()` تُستدعى مرة واحدة لكل دالة بدل `get()` مكررة في كل شرط.
- حذف `storeDirectory` و`pairings` أزال مسارات قراءة كاملة.
- جهاز الكاشير لم يعد يقرأ مستند السرّ الخاص في كل إرسال.
