/* التنقل بالسحب أفقيًا بين صفحات شريط الهاتف السفلي.
   RTL: السحب لليسار يفتح التالي في الشريط، والسحب لليمين يفتح السابق. */

const MIN_DISTANCE = 60;        // أقل مسافة أفقية تُعد سحبًا مقصودًا
const MAX_OFF_AXIS = 45;        // أقصى انحراف رأسي مسموح
const AXIS_RATIO = 1.6;         // الأفقي يجب أن يتجاوز الرأسي بهذه النسبة
const MAX_DURATION = 700;       // سحبة بطيئة جدًا ليست إيماءة تنقل
const EDGE_GUARD = 18;          // نتجاهل الحافة لعدم مزاحمة إيماءة الرجوع في النظام

/* عناصر لا يجوز أن يبتلع السحب تفاعلها. */
const INTERACTIVE = "input, textarea, select, button, a, [contenteditable=\"true\"], .quantity-control, .hourly-bars-chart, .scanner-frame, canvas, video";

/* حاوية قابلة للتمرير أفقيًا (جدول، شرائح أصناف...) — السحب داخلها يخصها هي. */
function insideHorizontalScroller(target, root) {
  let node = target;
  while (node && node !== root && node.nodeType === 1) {
    const style = window.getComputedStyle(node);
    const scrollable = /(auto|scroll)/.test(`${style.overflowX}`);
    if (scrollable && node.scrollWidth > node.clientWidth + 4) return true;
    node = node.parentElement;
  }
  return false;
}

function blocked(target, root) {
  if (document.querySelector("#dialog-backdrop, #scanner-backdrop, .dialog-backdrop")) return true;
  if (target?.closest?.(INTERACTIVE)) return true;
  if (target?.closest?.("[data-no-swipe]")) return true;
  if (insideHorizontalScroller(target, root)) return true;
  const selection = window.getSelection?.();
  if (selection && !selection.isCollapsed) return true;
  return false;
}

/* يفعّل التنقل بالسحب. onNavigate يتلقى اتجاه الانتقال في الترتيب: 1 التالي، -1 السابق. */
export function installSwipeNavigation(root, { getOrder, getCurrent, onNavigate, isEnabled = () => true } = {}) {
  if (!root || typeof onNavigate !== "function") return () => {};
  if (!window.matchMedia?.("(pointer: coarse)").matches) return () => {};

  let startX = 0;
  let startY = 0;
  let startedAt = 0;
  let tracking = false;

  const onStart = (event) => {
    if (event.touches?.length !== 1) { tracking = false; return; }
    const touch = event.touches[0];
    if (touch.clientX <= EDGE_GUARD || touch.clientX >= window.innerWidth - EDGE_GUARD) { tracking = false; return; }
    if (!isEnabled() || blocked(event.target, root)) { tracking = false; return; }
    startX = touch.clientX;
    startY = touch.clientY;
    startedAt = Date.now();
    tracking = true;
  };

  const onMove = (event) => {
    if (!tracking) return;
    if (event.touches?.length !== 1) tracking = false;
  };

  const onEnd = (event) => {
    if (!tracking) return;
    tracking = false;
    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (Date.now() - startedAt > MAX_DURATION) return;
    if (absX < MIN_DISTANCE) return;
    if (absY > MAX_OFF_AXIS) return;
    if (absX < absY * AXIS_RATIO) return;

    const order = getOrder?.() || [];
    const current = order.indexOf(getCurrent?.());
    if (current < 0 || order.length < 2) return;

    // واجهة عربية RTL: السحب لليسار (deltaX سالب) ينتقل إلى العنصر التالي في الشريط.
    const direction = deltaX < 0 ? 1 : -1;
    const nextIndex = current + direction;
    if (nextIndex < 0 || nextIndex >= order.length) return;

    onNavigate(order[nextIndex], direction);
  };

  const onCancel = () => { tracking = false; };

  root.addEventListener("touchstart", onStart, { passive: true });
  root.addEventListener("touchmove", onMove, { passive: true });
  root.addEventListener("touchend", onEnd, { passive: true });
  root.addEventListener("touchcancel", onCancel, { passive: true });

  return () => {
    root.removeEventListener("touchstart", onStart);
    root.removeEventListener("touchmove", onMove);
    root.removeEventListener("touchend", onEnd);
    root.removeEventListener("touchcancel", onCancel);
  };
}

/* يُستخدم في الاختبارات وللتحقق من منطق القرار دون DOM. */
export function resolveSwipeTarget({ order = [], current = "", deltaX = 0, deltaY = 0, durationMs = 200 } = {}) {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (durationMs > MAX_DURATION) return null;
  if (absX < MIN_DISTANCE) return null;
  if (absY > MAX_OFF_AXIS) return null;
  if (absX < absY * AXIS_RATIO) return null;
  const index = order.indexOf(current);
  if (index < 0 || order.length < 2) return null;
  const nextIndex = index + (deltaX < 0 ? 1 : -1);
  if (nextIndex < 0 || nextIndex >= order.length) return null;
  return order[nextIndex];
}
