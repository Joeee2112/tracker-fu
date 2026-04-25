FU.genReport = function(debtors) {
  var today = FU.today();
  var allTasks = [];
  debtors.forEach(function(d) {
    d.tasks.forEach(function(t) {
      if (!t.done) allTasks.push(Object.assign({}, t, { debtor: d.fio, caseNum: d.caseNum }));
    });
  });
  var overdue = allTasks.filter(function(t) { return t.deadline && FU.dleft(t.deadline) < 0; }).sort(function(a, b) { return FU.dleft(a.deadline) - FU.dleft(b.deadline); });
  var week = allTasks.filter(function(t) { return t.deadline && FU.dleft(t.deadline) >= 0 && FU.dleft(t.deadline) <= 7; }).sort(function(a, b) { return FU.dleft(a.deadline) - FU.dleft(b.deadline); });
  var totalDone = debtors.reduce(function(s, d) { return s + d.tasks.filter(function(t) { return t.done; }).length; }, 0);

  var h = '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u0421\u0432\u043e\u0434\u043a\u0430 \u0424\u0423 \u2014 ' + FU.fmt(today) + '</title>';
  h += '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",system-ui,sans-serif;background:#f8f9fa;color:#1a1a2e;padding:24px;max-width:800px;margin:0 auto}';
  h += '.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}.card{background:#fff;border-radius:10px;padding:16px;border:1px solid #e8e8ed}';
  h += '.card-n{font-size:28px;font-weight:600}.card-l{font-size:12px;color:#6b7280;margin-top:2px}';
  h += '.red{color:#dc2626}.yellow{color:#d97706}.green{color:#16a34a}.blue{color:#2563eb}';
  h += '.section{margin-bottom:24px}.section h2{font-size:16px;font-weight:600;margin-bottom:12px}';
  h += '.task{padding:12px 16px;margin-bottom:6px;border-radius:8px;display:flex;justify-content:space-between;align-items:baseline}';
  h += '.task-over{background:#fef2f2;border-left:3px solid #dc2626}.task-week{background:#fffbeb;border-left:3px solid #d97706}';
  h += '.task-deb{font-size:12px;font-weight:600;margin-bottom:2px}.task-title{font-size:14px}.task-days{font-size:12px;white-space:nowrap;margin-left:12px;font-weight:600}';
  h += '.prog{background:#fff;border:1px solid #e8e8ed;border-radius:10px;padding:16px;margin-bottom:8px}';
  h += '.prog-bar{height:6px;background:#e8e8ed;border-radius:3px;margin:8px 0}.prog-fill{height:100%;border-radius:3px}';
  h += '.footer{text-align:center;font-size:11px;color:#9ca3af;margin-top:24px}</style></head><body>';
  h += '<h1 style="font-size:22px;font-weight:600;margin-bottom:4px">\u0421\u0432\u043e\u0434\u043a\u0430 \u0434\u043b\u044f \u0440\u0443\u043a\u043e\u0432\u043e\u0434\u0438\u0442\u0435\u043b\u044f</h1>';
  h += '<p style="font-size:13px;color:#6b7280;margin-bottom:20px">' + FU.fmt(today) + '</p>';
  h += '<div class="cards"><div class="card"><div class="card-n blue">' + debtors.length + '</div><div class="card-l">\u0414\u043e\u043b\u0436\u043d\u0438\u043a\u043e\u0432</div></div>';
  h += '<div class="card"><div class="card-n red">' + overdue.length + '</div><div class="card-l">\u041f\u0440\u043e\u0441\u0440\u043e\u0447\u0435\u043d\u043e</div></div>';
  h += '<div class="card"><div class="card-n yellow">' + week.length + '</div><div class="card-l">\u041d\u0430 \u044d\u0442\u043e\u0439 \u043d\u0435\u0434\u0435\u043b\u0435</div></div>';
  h += '<div class="card"><div class="card-n green">' + totalDone + '</div><div class="card-l">\u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e</div></div></div>';

  if (overdue.length) {
    h += '<div class="section"><h2 style="color:#dc2626">\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u044f</h2>';
    overdue.forEach(function(t) {
      h += '<div class="task task-over"><div><div class="task-deb" style="color:#dc2626">' + t.debtor + '</div><div class="task-title">' + t.title + '</div></div><div class="task-days red">' + FU.dleft(t.deadline) + '\u0434\u043d.</div></div>';
    });
    h += '</div>';
  }

  if (week.length) {
    h += '<div class="section"><h2>\u0411\u043b\u0438\u0436\u0430\u0439\u0448\u0438\u0435 7 \u0434\u043d\u0435\u0439</h2>';
    week.forEach(function(t) {
      h += '<div class="task task-week"><div><div class="task-deb" style="color:#d97706">' + FU.fmtS(t.deadline) + ' \u00b7 ' + t.debtor + '</div><div class="task-title">' + t.title + '</div></div><div class="task-days yellow">' + FU.dleft(t.deadline) + '\u0434\u043d.</div></div>';
    });
    h += '</div>';
  }

  h += '<div class="section"><h2>\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441 \u043f\u043e \u0434\u043e\u043b\u0436\u043d\u0438\u043a\u0430\u043c</h2>';
  debtors.forEach(function(d) {
    var dn = d.tasks.filter(function(t) { return t.done; }).length;
    var pct = Math.round(dn / d.tasks.length * 100);
    var ov = d.tasks.filter(function(t) { return !t.done && t.deadline && FU.dleft(t.deadline) < 0; }).length;
    var nt = FU.nearestTask(d);
    var col = ov > 0 ? "#dc2626" : pct > 50 ? "#16a34a" : "#d97706";
    h += '<div class="prog"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:14px;font-weight:600">' + d.fio + '</div><div style="font-size:12px;color:#6b7280">' + (d.caseNum || "") + '</div></div><div style="text-align:right"><span style="font-size:14px;font-weight:600;color:' + col + '">' + pct + '%</span><div style="font-size:11px;color:#6b7280">' + dn + ' \u0438\u0437 ' + d.tasks.length + '</div></div></div>';
    h += '<div class="prog-bar"><div class="prog-fill" style="width:' + pct + '%;background:' + col + '"></div></div>';
    if (ov > 0) h += '<div style="font-size:12px;color:#dc2626;margin-top:4px">' + ov + ' \u043f\u0440\u043e\u0441\u0440\u043e\u0447\u043a' + (ov === 1 ? '\u0430' : ov < 5 ? '\u0438' : '') + '</div>';
    if (nt) h += '<div style="font-size:12px;color:#6b7280;margin-top:2px">\u0411\u043b\u0438\u0436\u0430\u0439\u0448\u0435\u0435: ' + nt.title.slice(0, 50) + (nt.title.length > 50 ? '...' : '') + ' (' + FU.fmtS(nt.deadline) + ')</div>';
    h += '</div>';
  });
  h += '</div><div class="footer">\u0421\u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d\u043e \u0438\u0437 \u0442\u0440\u0435\u043a\u0435\u0440\u0430 \u0424\u0423 \u00b7 ' + FU.fmt(today) + '</div></body></html>';
  return h;
};

FU.downloadReport = function(debtors) {
  var h = FU.genReport(debtors);
  var blob = new Blob([h], { type: "text/html" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "\u0421\u0432\u043e\u0434\u043a\u0430_\u0424\u0423_" + FU.today() + ".html";
  a.click();
};
