/**
 * icons.js — مجموعة أيقونات «حاسب» (الشكل البصري فقط)
 * -----------------------------------------------------------------------------
 * هذه المجموعة منقولة كما هي من تطبيق «حاسب» (نفس الشبكة 24×24، نفس سماكة
 * الخط، نفس نهايات المسارات المستديرة) لتوحيد الشكل البصري للتطبيقين.
 *
 * ملاحظة مهمة: هذا الملف **لا يحتوي أي منطق** — مجرّد مسارات SVG. أي شاشة
 * أو دالة أو حساب في التطبيق لم يُمسّ.
 */

export const ICON_PATHS = {
  // ── المجموعة الأساسية من «حاسب» ──
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5.5a3 3 0 0 1 0 6M18 20c0-2-.7-3.8-2-5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M9 5l7 7-7 7"/>',
  forward: '<path d="M15 5l-7 7 7 7"/>',
  edit: '<path d="M4 20h4l10-10-4-4L4 16Z"/><path d="m14 6 4 4"/>',
  trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/>',
  print: '<path d="M7 9V4h10v5"/><path d="M7 18H5a2 2 0 0 1-2-2v-4h18v4a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/>',
  share: '<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  download: '<path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M4 19h16"/>',
  upload: '<path d="M12 21V9"/><path d="m8 13 4-4 4 4"/><path d="M4 5h16"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14.6H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 8a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 3.7V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M16 12h3"/>',
  cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.5 12h11L21 7H6"/>',
  check: '<path d="M4 12.5 9.5 18 20 6.5"/>',
  alert: '<path d="M12 4 2.5 20h19Z"/><path d="M12 10v4M12 17.2v.1"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
  monitor: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M9 20h6M12 16.5V20"/>',
  lock: '<rect x="4.5" y="10" width="15" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 21c4.4-2 7-5.5 7-10V5.5L12 3 5 5.5V11c0 4.5 2.6 8 7 10Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  store: '<path d="M3 9.5 5 4h14l2 5.5"/><path d="M4 9.5V20h16V9.5"/><path d="M9 20v-6h6v6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
  cloud: '<path d="M6.5 19a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.6 1.6A3.7 3.7 0 0 1 17.5 19Z"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4-2v-4Z"/>',
  sort: '<path d="M7 4v16l-3-3M17 20V4l3 3"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3.5V6M16 3.5V6"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8Z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.1M18 12h.1"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/>',
  userPlus: '<circle cx="10" cy="8" r="3.2"/><path d="M3.5 20c0-3.3 2.9-6 6.5-6 1.3 0 2.5.3 3.5 1"/><path d="M18 14v6M15 17h6"/>',
  image: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.1M3.5 12h.1M3.5 18h.1"/>',
  trendUp: '<path d="m3 17 6-6 4 4 8-8"/><path d="M21 7v5h-5"/>',
  phone: '<path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z"/>',
  sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
  logout: '<path d="M15 12H5"/><path d="m8 9-3 3 3 3"/><path d="M11 5h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6"/>',
  link: '<path d="M9.5 14.5 14.5 9.5"/><path d="M7 12 5.5 13.5a3.5 3.5 0 0 0 5 5L12 17"/><path d="M12 7l1.5-1.5a3.5 3.5 0 0 1 5 5L17 12"/>',
  save: '<path d="M5 3h11l3 3v15H5Z"/><path d="M9 3v6h6V3M8 14h8v7H8Z"/>',
  dot: '<circle cx="12" cy="12" r="4"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',

  // ── أسماء خاصة بحسابي — رُسمت بنفس لغة «حاسب» البصرية ──
  printer: '<path d="M7 9V4h10v5"/><path d="M7 18H5a2 2 0 0 1-2-2v-4h18v4a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/>',
  calendarDay: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3.5V6M16 3.5V6"/><path d="M12 13v4M10 15h4"/>',
  arrow: '<path d="M9 5l7 7-7 7"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 13 9 5 9-5"/>',
  package: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/><path d="M7.5 5.5 16.5 10"/>',
  calculator: '<rect x="4.5" y="3" width="15" height="18" rx="2.4"/><path d="M8 7h8"/><path d="M8.5 11.5h.1M12 11.5h.1M15.5 11.5h.1M8.5 15h.1M12 15h.1M15.5 15h.1M8.5 18h.1M12 18h.1M15.5 18h.1"/>',
  dots: '<circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3"/><path d="M3.5 4.5V9h4.5"/><path d="M12 8.5V12l2.8 1.7"/>',
  key: '<circle cx="8" cy="12" r="3.6"/><path d="M11.6 12H21"/><path d="M17.2 12v3M14.4 12v2.4"/>',
  pause: '<rect x="7" y="5" width="3.4" height="14" rx="1.2"/><rect x="13.6" y="5" width="3.4" height="14" rx="1.2"/>',
  scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M7.5 9.5v5M10.5 9.5v5M13.5 9.5v5M16.5 9.5v5"/>',
  transfer: '<path d="M4 9h13.5l-3-3"/><path d="M20 15H6.5l3 3"/>',
  truck: '<path d="M3 7h10.5v9H3Z"/><path d="M13.5 10H17l3.5 3.5V16h-7Z"/><circle cx="7" cy="18.2" r="1.7"/><circle cx="17" cy="18.2" r="1.7"/>',
  restore: '<path d="M12 3v9.5"/><path d="m8.3 9 3.7 3.7L15.7 9"/><path d="M4.5 14v3.5A2.5 2.5 0 0 0 7 20h10a2.5 2.5 0 0 0 2.5-2.5V14"/>',
  rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
  whatsapp: '<path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5Z"/><path d="M8.8 9c0 3 2.2 5.2 5.2 5.2.7 0 1.4-.6 1.4-1.2l-1.6-.9-1 .9c-1-.5-1.8-1.3-2.3-2.3l.9-1-.9-1.6c-.6 0-1.2.6-1.2 1.4"/>',
};

export default ICON_PATHS;
