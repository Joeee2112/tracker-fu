FU.calcDl = function(r, kd, mf) {
  if (!r) return "";
  if (r.from === "kd_meeting" && r.days === -14) {
    var off = mf === "remote" ? -30 : -14;
    var b = kd.kd_meeting;
    return b ? FU.addD(b, off) : "";
  }
  var b = kd[r.from];
  if (!b) return "";
  if (r.biz) return FU.addBD(b, r.days);
  return FU.addD(b, r.days);
};

FU.mkTasks = function(kd, mf) {
  return FU.TASKS.map(function(t) {
    return {
      id: FU.uid(), phase: t.p, order: t.o, title: t.t, desc: t.d,
      law: t.l, dl: t.dl, priority: t.pr, links: t.lk || [],
      id_key: t.ik || null, meetingDependent: t.md || false,
      deadline: FU.calcDl(t.dl, kd, mf), done: false, doneDate: null, notes: ""
    };
  });
};

FU.recalc = function(tasks, kd, mf) {
  return tasks.map(function(t) {
    if (t.done || t.phase === "custom") return t;
    if (!t.dl) return t;
    var nd = FU.calcDl(t.dl, kd, mf);
    return Object.assign({}, t, { deadline: nd });
  });
};

FU.autoKd = function(kd) {
  var r = Object.assign({}, kd);
  FU.KD_META.forEach(function(m) {
    if (m.auto && !r[m.id]) {
      var v = m.auto(r);
      if (v) r[m.id] = v;
    }
  });
  return r;
};

FU.checkConflict = function(kd, mf) {
  var w = [];
  var mt = kd.kd_meeting, ct = kd.kd_court_hearing;
  if (mt && ct) {
    var diff = Math.ceil((new Date(ct) - new Date(mt)) / 864e5);
    if (diff < 5) w.push({ type: "critical", text: "\u26A0\uFE0F \u041C\u0435\u0436\u0434\u0443 \u0441\u043E\u0431\u0440\u0430\u043D\u0438\u0435\u043C (" + FU.fmt(mt) + ") \u0438 \u0441\u0443\u0434\u043E\u043C (" + FU.fmt(ct) + ") " + diff + " \u0434\u043D." });
    else if (diff < 10) w.push({ type: "warning", text: "\u26A1 \u041C\u0435\u0436\u0434\u0443 \u0441\u043E\u0431\u0440\u0430\u043D\u0438\u0435\u043C \u0438 \u0441\u0443\u0434\u043E\u043C " + diff + " \u0434\u043D. \u2014 \u0432\u043F\u0440\u0438\u0442\u044B\u043A." });
  }
  if (mt) {
    var nd = mf === "remote" ? 30 : 14;
    var dd = FU.addD(mt, -nd);
    var dl = FU.dleft(dd);
    if (dl !== null && dl < 0) w.push({ type: "critical", text: "\uD83D\uDEA8 \u0421\u0440\u043E\u043A \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E \u0441\u043E\u0431\u0440\u0430\u043D\u0438\u0438 \u043F\u0440\u043E\u0448\u0451\u043B!" });
    else if (dl !== null && dl <= 3) w.push({ type: "warning", text: "\u26A1 \u0414\u043E \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F " + dl + " \u0434\u043D.!" });
  }
  if (mt && ct && ct < mt) w.push({ type: "critical", text: "\uD83D\uDEA8 \u0421\u0443\u0434 \u043D\u0430\u0437\u043D\u0430\u0447\u0435\u043D \u0414\u041E \u0441\u043E\u0431\u0440\u0430\u043D\u0438\u044F!" });
  return w;
};

FU.debtorStatus = function(d) {
  var ov = d.tasks.filter(function(t) { return !t.done && t.deadline && FU.dleft(t.deadline) < 0; }).length;
  var sn = d.tasks.filter(function(t) { return !t.done && t.deadline && FU.dleft(t.deadline) >= 0 && FU.dleft(t.deadline) <= 7; }).length;
  return ov > 0 ? "#ef4444" : sn > 0 ? "#eab308" : "#22c55e";
};

FU.nearestTask = function(d) {
  var p = d.tasks.filter(function(t) { return !t.done && t.deadline; }).sort(function(a, b) {
    var da = FU.dleft(a.deadline), db = FU.dleft(b.deadline);
    return (da < 0 ? 999 + Math.abs(da) : da) - (db < 0 ? 999 + Math.abs(db) : db);
  });
  return p[0];
};
