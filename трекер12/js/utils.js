var FU = {};

FU.addBD = function(s, n) {
  if (!s) return "";
  var d = new Date(s), a = 0, dir = n >= 0 ? 1 : -1, abs = Math.abs(n);
  while (a < abs) { d.setDate(d.getDate() + dir); if (d.getDay() !== 0 && d.getDay() !== 6) a++; }
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
