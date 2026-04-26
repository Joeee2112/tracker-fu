var FU = {};

// Производственный календарь РФ — праздничные дни (нерабочие)
// Постановления Правительства о переносах + ТК ст. 112
FU.HOLIDAYS = {
  // 2024
  "2024-01-01":1,"2024-01-02":1,"2024-01-03":1,"2024-01-04":1,"2024-01-05":1,"2024-01-08":1,
  "2024-02-23":1,"2024-03-08":1,"2024-04-29":1,"2024-04-30":1,"2024-05-01":1,
  "2024-05-09":1,"2024-05-10":1,"2024-06-12":1,"2024-11-04":1,"2024-12-30":1,"2024-12-31":1,
  // Перенесённые рабочие субботы 2024:
  "2024-04-27":-1,"2024-11-02":-1,"2024-12-28":-1,
  // 2025
  "2025-01-01":1,"2025-01-02":1,"2025-01-03":1,"2025-01-06":1,"2025-01-07":1,"2025-01-08":1,
  "2025-02-24":1,"2025-03-08":1,"2025-05-01":1,"2025-05-02":1,
  "2025-05-08":1,"2025-05-09":1,"2025-06-12":1,"2025-06-13":1,"2025-11-03":1,"2025-11-04":1,"2025-12-31":1,
  // Перенесённые рабочие 2025:
  "2025-11-01":-1,
  // 2026 (по проекту производственного календаря)
  "2026-01-01":1,"2026-01-02":1,"2026-01-05":1,"2026-01-06":1,"2026-01-07":1,"2026-01-08":1,
  "2026-02-23":1,"2026-03-09":1,"2026-05-01":1,"2026-05-04":1,"2026-05-11":1,
  "2026-06-12":1,"2026-11-04":1,"2026-12-31":1,
  // 2027
  "2027-01-01":1,"2027-01-04":1,"2027-01-05":1,"2027-01-06":1,"2027-01-07":1,"2027-01-08":1,
  "2027-02-23":1,"2027-03-08":1,"2027-05-03":1,"2027-05-10":1,"2027-06-14":1,"2027-11-04":1
};

// Является ли день нерабочим: суббота/воскресенье минус явные рабочие, плюс праздники
FU.isHoliday = function(date) {
  var d = typeof date === "string" ? new Date(date) : date;
  var key = d.toISOString().split("T")[0];
  var marker = FU.HOLIDAYS[key];
  if (marker === 1) return true;   // явный праздник
  if (marker === -1) return false; // явный рабочий (перенос)
  var dow = d.getDay();
  return dow === 0 || dow === 6;
};

// Перенос на ближайший рабочий день (вперёд) — ст. 193 ГК РФ
FU.shiftToBusiness = function(s) {
  if (!s) return "";
  var d = new Date(s);
  while (FU.isHoliday(d)) d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

FU.addBD = function(s, n) {
  if (!s) return "";
  var d = new Date(s), a = 0, dir = n >= 0 ? 1 : -1, abs = Math.abs(n);
  while (a < abs) {
    d.setDate(d.getDate() + dir);
    if (!FU.isHoliday(d)) a++;
  }
  return d.toISOString().split("T")[0];
};

FU.addD = function(s, days) {
  if (!s) return "";
  var dt = new Date(s); dt.setDate(dt.getDate() + days);
  return dt.toISOString().split("T")[0];
};

FU.fmt = function(d) {
  return d ? new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }) : "\u2014";
};

FU.fmtS = function(d) {
  return d ? new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) : "\u2014";
};

FU.dleft = function(d) {
  if (!d) return null;
  var n = new Date(); n.setHours(0,0,0,0);
  var x = new Date(d); x.setHours(0,0,0,0);
  return Math.ceil((x - n) / 864e5);
};

FU.uid = function() { return Math.random().toString(36).slice(2, 9); };

FU.sCol = function(t) {
  if (t.done) return "#16a34a";
  var d = FU.dleft(t.deadline);
  if (d === null) return "#94a3b8";
  return d < 0 ? "#dc2626" : d <= 7 ? "#d97706" : "#64748b";
};

FU.sLbl = function(t) {
  if (t.done) return "\u2713 " + FU.fmt(t.doneDate);
  var d = FU.dleft(t.deadline);
  if (d === null) return "\u2014";
  return d < 0 ? "\u2212" + Math.abs(d) + "\u0434\u043d." : d === 0 ? "\u0421\u0435\u0433\u043e\u0434\u043d\u044f!" : d + "\u0434\u043d.";
};

FU.today = function() { return new Date().toISOString().split("T")[0]; };

// Light theme
FU.bg = "#f5f5f7";
FU.sf = "#ffffff";
FU.bd = "#e5e7eb";
FU.tx = "#1a1a2e";
FU.txm = "#6b7280";
FU.ac = "#6366f1";

FU.inp = { width: "100%", padding: "8px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, color: "#1a1a2e", fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box" };

FU.tg = function(b, c) {
  return { display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 8, fontWeight: 600, background: b, color: c, fontFamily: "inherit", marginRight: 3, marginTop: 3 };
};

FU.CARD_COLORS = [
  "linear-gradient(135deg,#667eea,#764ba2)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#43e97b,#38f9d7)",
  "linear-gradient(135deg,#fa709a,#fee140)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#e0c3fc,#8ec5fc)",
  "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#96fbc4,#f9f586)"
];

FU.STORAGE_KEY = "fu_r13";

// Типы процедур банкротства физлица (127-ФЗ § 1.1, § 5)
FU.PROCEDURES = [
  {id:"restructuring",label:"Реструктуризация долгов",short:"Рестр.",law:"§ 1.1 ст.213.7-213.22",color:"#6366f1"},
  {id:"realisation",label:"Реализация имущества",short:"Реализ.",law:"§ 1.1 ст.213.24-213.28",color:"#dc2626"},
  {id:"extrajudicial",label:"Внесудебное (МФЦ)",short:"МФЦ",law:"§ 5 ст.223.2-223.7",color:"#16a34a"}
];

// Очередность текущих платежей (ст. 134 п. 2)
FU.CURRENT_QUEUES = [
  {id:"1",label:"1-я (суд. расходы, вознагр. ФУ)",color:"#6366f1"},
  {id:"2",label:"2-я (зарплата за период)",color:"#d97706"},
  {id:"3",label:"3-я (комм., эксплуат.)",color:"#0891b2"},
  {id:"4",label:"4-я (иные текущие)",color:"#64748b"}
];
