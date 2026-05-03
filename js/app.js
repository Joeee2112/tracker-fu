var useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo,useRef=React.useRef;

// Helpers for creditor positions (multi-position support)
var POS_TYPES=[
  {id:"principal",label:"Основной долг",color:"#374151"},
  {id:"penalty",label:"Пени / проценты",color:"#d97706"},
  {id:"fine",label:"Штраф",color:"#dc2626"},
  {id:"fee",label:"Госпошлина",color:"#6366f1"},
  {id:"other",label:"Иное",color:"#64748b"}
];
function posTypeLbl(t){var x=POS_TYPES.find(function(p){return p.id===t});return x?x.label:t}
function posTypeCol(t){var x=POS_TYPES.find(function(p){return p.id===t});return x?x.color:"#64748b"}

// Get effective positions: if creditor has positions[], use them; otherwise generate from legacy principal/penalty
function getPositions(c){
  if(c.positions&&c.positions.length>0)return c.positions;
  var out=[];
  var pr=parseFloat(c.principal)||0,pe=parseFloat(c.penalty)||0;
  if(pr>0)out.push({id:"_lp_"+c.id,type:"principal",amount:pr,queue:c.queue||"3",beyondRegistry:false});
  if(pe>0)out.push({id:"_le_"+c.id,type:"penalty",amount:pe,queue:c.queue||"3",beyondRegistry:false});
  return out;
}

// Sum total of positions (or legacy fields)
function credTotal(c){return getPositions(c).reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0)}

// Get all queues used by creditor (from positions)
function credQueues(c){var qs={};getPositions(c).forEach(function(p){qs[p.queue||"3"]=true});return Object.keys(qs).sort()}
function App(){
  var[debtors,setDebtors]=useState([]);
  var[aid,setAid]=useState(null);
  var[ph,setPh]=useState("all");
  var[modal,setModal]=useState(null);
  var[selTask,setSelTask]=useState(null);
  var[q,setQ]=useState("");
  var[form,setForm]=useState({fio:"",caseNum:"",date:"",notes:"",meetingFormat:"inperson",procedure:"restructuring"});
  var[jt,setJt]=useState("");
  var[customForm,setCustomForm]=useState({title:"",desc:"",deadline:"",law:""});
  var[dashF,setDashF]=useState("all");
  var[viewMode,setViewMode]=useState("list");
  var[calMonth,setCalMonth]=useState(function(){var n=new Date();return{y:n.getFullYear(),m:n.getMonth()}});
  var[tab,setTab]=useState("home");
  var[reqForm,setReqForm]=useState({organ:"",customOrgan:"",method:"",date:"",desc:"",taskId:"",trackNum:""});
  var[reqFilter,setReqFilter]=useState("all");
  var[credForm,setCredForm]=useState({name:"",principal:"",penalty:"",queue:"3",secured:false,dateFiled:"",courtDate:"",objectionDeadline:"",objectionFiled:false});
  var[editCred,setEditCred]=useState(null);
  var[credFilter,setCredFilter]=useState("all");
  var[cpForm,setCpForm]=useState({creditor:"",description:"",amount:"",queue:"4",dueDate:"",paidDate:"",paid:false});
  var[editCp,setEditCp]=useState(null);
  var fileRef=useRef(null);

  var savedToCloud=useRef(false);
  var saveTimer=useRef(null);

  // Разовая миграция загруженных данных под новые поля задач (plan_check, ЕФРСБ-публикации о собрании).
  // Идемпотентна — повторный запуск ничего не ломает.
  var migrateDebtors=function(list){
    if(!list||!list.length)return list;
    console.log("[FU][migrate] start, debtors:",list.length);
    return list.map(function(d){
      if(!d.tasks){console.log("[FU][migrate] skip",d.fio,"— no tasks");return d}
      var tasks=d.tasks.slice();
      var changed=false;
      // 1) Маркер plan_check для существующей задачи «Срок представления проекта плана»
      tasks=tasks.map(function(t){
        if(t.id_key)return t;
        if(t.title&&t.title.indexOf("\u0421\u0440\u043e\u043a \u043f\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u043b\u0435\u043d\u0438\u044f \u043f\u0440\u043e\u0435\u043a\u0442\u0430 \u043f\u043b\u0430\u043d\u0430")===0){
          changed=true;
          console.log("[FU][migrate]",d.fio,"— plan_check добавлен");
          return Object.assign({},t,{id_key:"plan_check"});
        }
        return t;
      });
      // 2) Добавить ЕФРСБ-публикацию о собрании (-14/-30) если её нет — только для реструктуризации
      if((d.procedure||"restructuring")==="restructuring"){
        var hasEfrsbNotify=tasks.some(function(t){return t.id_key==="meeting_efrsb_notify"});
        if(!hasEfrsbNotify){
          var dlNotify=d.keyDates&&d.keyDates.kd_meeting?FU.calcDl({from:"kd_meeting",days:-14},d.keyDates,d.meetingFormat||"inperson"):"";
          tasks.push({
            id:FU.uid(),phase:"meeting",order:24.5,
            id_key:"meeting_efrsb_notify",
            title:"\u041f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u0432 \u0415\u0424\u0420\u0421\u0411 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f \u043e \u0441\u043e\u0431\u0440\u0430\u043d\u0438\u0438",
            desc:"\u041e\u0447\u043d\u043e\u0435 14\u0434\u043d, \u0437\u0430\u043e\u0447\u043d\u043e\u0435 30\u0434\u043d. \u041f\u043e\u0432\u0435\u0441\u0442\u043a\u0430, \u0432\u0440\u0435\u043c\u044f, \u043f\u043e\u0440\u044f\u0434\u043e\u043a \u043e\u0437\u043d\u0430\u043a\u043e\u043c\u043b\u0435\u043d\u0438\u044f. \u041f\u0440\u0438 \u0437\u0430\u043e\u0447\u043d\u043e\u043c \u2014 \u0431\u044e\u043b\u043b\u0435\u0442\u0435\u043d\u0438",
            law:"\u043f.4 \u0441\u0442.13, \u043f.7, 11 \u0441\u0442.213.8",
            dl:{from:"kd_meeting",days:-14},
            deadline:dlNotify,done:false,doneDate:null,notes:"",priority:"high",
            links:[{l:"\u0415\u0424\u0420\u0421\u0411",u:"https://bankrot.fedresurs.ru/"}],
            meetingDependent:true
          });
          changed=true;
          console.log("[FU][migrate]",d.fio,"— ЕФРСБ-публикация о собрании добавлена, дедлайн:",dlNotify);
        }
        var hasEfrsbResult=tasks.some(function(t){return t.title&&t.title.indexOf("\u041f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432 \u0441\u043e\u0431\u0440\u0430\u043d\u0438\u044f \u0432 \u0415\u0424\u0420\u0421\u0411")===0});
        if(!hasEfrsbResult){
          var dlResult=d.keyDates&&d.keyDates.kd_meeting?FU.calcDl({from:"kd_meeting",days:3},d.keyDates,d.meetingFormat||"inperson"):"";
          tasks.push({
            id:FU.uid(),phase:"meeting",order:27.5,
            title:"\u041f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u043e\u0432 \u0441\u043e\u0431\u0440\u0430\u043d\u0438\u044f \u0432 \u0415\u0424\u0420\u0421\u0411",
            desc:"3 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u043d\u044b\u0445 \u0434\u043d\u044f. \u041f\u0440\u0438 \u0437\u0430\u043e\u0447\u043d\u043e\u043c \u2014 \u043f\u0440\u0438\u043b\u043e\u0436\u0438\u0442\u044c \u043f\u0440\u043e\u0442\u043e\u043a\u043e\u043b \u0438 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b",
            law:"\u043f.7 \u0441\u0442.12, \u043f.13 \u0441\u0442.213.8",
            dl:{from:"kd_meeting",days:3},
            deadline:dlResult,done:false,doneDate:null,notes:"",priority:"high",
            links:[{l:"\u0415\u0424\u0420\u0421\u0411",u:"https://bankrot.fedresurs.ru/"}]
          });
          changed=true;
          console.log("[FU][migrate]",d.fio,"— ЕФРСБ-публикация результатов добавлена, дедлайн:",dlResult);
        }
      }
      if(!changed)console.log("[FU][migrate]",d.fio,"— уже мигрирован, пропуск");
      return changed?Object.assign({},d,{tasks:tasks}):d;
    });
  };

  useEffect(()=>{
    var savedAid=null;
    try{var ls=JSON.parse(localStorage.getItem(FU.STORAGE_KEY));if(ls&&ls.a)savedAid=ls.a}catch(e){}
    var initDone=function(){savedToCloud.current=true;console.log("[FU] Init complete, savedToCloud=true")};
    if(FU.cloudReady){
      FU.loadFromCloud().then(function(cd){
        if(cd&&cd.length){
          cd=migrateDebtors(cd);
          var validAid=savedAid&&cd.find(function(d){return d.id===savedAid})?savedAid:null;
          setDebtors(cd);
          setAid(validAid);
          console.log("[FU] Loaded from cloud:",cd.length,"debtors, active:",validAid);
        }
        else{try{var s=JSON.parse(localStorage.getItem(FU.STORAGE_KEY));if(s&&s.d&&s.d.length){var md=migrateDebtors(s.d);setDebtors(md);if(s.a)setAid(s.a);console.log("[FU] Cloud empty, loaded from localStorage")}else if(FU.SEED_DATA&&FU.SEED_DATA.d){setDebtors(FU.SEED_DATA.d);if(FU.SEED_DATA.a)setAid(FU.SEED_DATA.a);console.log("[FU] Cloud empty, loaded SEED")}}catch(e){}}
        // Set flag AFTER state setters so first useEffect run is skipped
        setTimeout(function(){initDone()},0);
      }).catch(function(e){console.error("[FU] Load failed:",e);setTimeout(initDone,0)});
    }else{
      try{var s=JSON.parse(localStorage.getItem(FU.STORAGE_KEY));if(s&&s.d&&s.d.length){var md2=migrateDebtors(s.d);setDebtors(md2);if(s.a)setAid(s.a)}else if(FU.SEED_DATA&&FU.SEED_DATA.d){setDebtors(FU.SEED_DATA.d);if(FU.SEED_DATA.a)setAid(FU.SEED_DATA.a)}}catch(e){}
      setTimeout(initDone,0);
    }
    var beforeUnload=function(){if(saveTimer.current){clearTimeout(saveTimer.current);if(FU.cloudReady&&debtors.length>0)FU.saveToCloud(debtors);console.log("[FU] Saved on unload")}};
    window.addEventListener("beforeunload",beforeUnload);
    return function(){window.removeEventListener("beforeunload",beforeUnload)};
  },[]);
  useEffect(()=>{
    if(!savedToCloud.current||debtors.length===0)return;
    try{localStorage.setItem(FU.STORAGE_KEY,JSON.stringify({d:debtors,a:aid}));console.log("[FU] localStorage saved")}catch(e){console.error("[FU] localStorage save failed:",e)}
    if(FU.cloudReady){
      if(saveTimer.current)clearTimeout(saveTimer.current);
      saveTimer.current=setTimeout(function(){console.log("[FU] Triggering cloud save...");FU.saveToCloud(debtors);saveTimer.current=null},2000);
    }
  },[debtors,aid]);

  var bg=FU.bg,sf=FU.sf,bd=FU.bd,tx=FU.tx,txm=FU.txm,ac=FU.ac,inp=FU.inp,tg=FU.tg;
  var deb=useMemo(()=>debtors.find(d=>d.id===aid),[debtors,aid]);
  // Виртуальные задачи из кредиторов (срок возражений + дата заседания) + текущие платежи
  var credTasks=useMemo(()=>{if(!deb)return[];var out=[];(deb.creditors||[]).forEach(function(c){if(c.objectionDeadline&&!c.objectionFiled&&c.status==="pending"){out.push({id:"cobj_"+c.id,phase:"registry",order:15.5,title:"\u2696 Возражения: "+c.name,desc:"\u0421\u0440\u043e\u043a \u043f\u043e\u0434\u0430\u0447\u0438 \u0432\u043e\u0437\u0440\u0430\u0436\u0435\u043d\u0438\u0439",law:"\u0441\u0442.100",deadline:c.objectionDeadline,done:false,doneDate:null,notes:"",priority:"high",links:[],_credId:c.id,_credType:"objection"})}if(c.courtDate&&c.status==="pending"){out.push({id:"ccrt_"+c.id,phase:"registry",order:15.6,title:"\u2696\uFE0F \u0417\u0430\u0441\u0435\u0434\u0430\u043d\u0438\u0435: "+c.name,desc:"\u0421\u0443\u0434\u0435\u0431\u043d\u043e\u0435 \u0437\u0430\u0441\u0435\u0434\u0430\u043d\u0438\u0435 \u043f\u043e \u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u044e",law:"\u0441\u0442.100",deadline:c.courtDate,done:false,doneDate:null,notes:"",priority:"high",links:[],_credId:c.id,_credType:"court"})}});(deb.currentPayments||[]).forEach(function(c){if(c.dueDate&&!c.paid){out.push({id:"cp_"+c.id,phase:"execution",order:99,title:"\u{1F4B0} "+c.description,desc:"\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u043f\u043b\u0430\u0442\u0451\u0436 ("+c.queue+" \u043e\u0447\u0435\u0440\u0435\u0434\u044c)"+(c.amount?": "+(parseFloat(c.amount)||0).toLocaleString("ru-RU")+" \u20bd":""),law:"\u0441\u0442.5, 134",deadline:c.dueDate,done:false,doneDate:null,notes:"",priority:"high",links:[],_cpId:c.id,_credType:"current"})}});return out},[deb]);
  var allTasks=useMemo(()=>deb?[...deb.tasks,...credTasks]:[],[deb,credTasks]);
  var stats=useMemo(()=>{if(!deb)return{t:0,dn:0,ov:0,sn:0,pct:0};var ts=allTasks,dn=ts.filter(x=>x.done).length;return{t:ts.length,dn,ov:ts.filter(x=>!x.done&&x.deadline&&FU.dleft(x.deadline)<0).length,sn:ts.filter(x=>!x.done&&x.deadline&&FU.dleft(x.deadline)>=0&&FU.dleft(x.deadline)<=7).length,pct:Math.round(dn/ts.length*100)}},[deb,allTasks]);
  var dashD=useMemo(()=>{var all=[];debtors.forEach(d=>{var ct=[];(d.creditors||[]).forEach(function(c){if(c.objectionDeadline&&!c.objectionFiled&&c.status==="pending")ct.push({id:"cobj_"+c.id,phase:"registry",title:"\u2696 Возражения: "+c.name,deadline:c.objectionDeadline,done:false,did:d.id,dfio:d.fio,dcn:d.caseNum});if(c.courtDate&&c.status==="pending")ct.push({id:"ccrt_"+c.id,phase:"registry",title:"\u2696\uFE0F Заседание: "+c.name,deadline:c.courtDate,done:false,did:d.id,dfio:d.fio,dcn:d.caseNum})});(d.currentPayments||[]).forEach(function(c){if(c.dueDate&&!c.paid)ct.push({id:"cp_"+c.id,phase:"execution",title:"\u{1F4B0} "+c.description,deadline:c.dueDate,done:false,did:d.id,dfio:d.fio,dcn:d.caseNum})});d.tasks.forEach(t=>{if(!t.done)all.push({...t,did:d.id,dfio:d.fio,dcn:d.caseNum})});ct.forEach(t=>all.push(t))});var ov=all.filter(t=>t.deadline&&FU.dleft(t.deadline)<0).sort((a,b)=>FU.dleft(a.deadline)-FU.dleft(b.deadline));var wk=all.filter(t=>t.deadline&&FU.dleft(t.deadline)>=0&&FU.dleft(t.deadline)<=7).sort((a,b)=>FU.dleft(a.deadline)-FU.dleft(b.deadline));var td=debtors.reduce((s,d)=>s+d.tasks.filter(t=>t.done).length,0);return{ov,wk,td}},[debtors]);
  var filtered=useMemo(()=>{if(!deb)return[];var ts=allTasks;if(ph!=="all")ts=ts.filter(t=>t.phase===ph);if(q.trim()){var s=q.toLowerCase();ts=ts.filter(t=>t.title.toLowerCase().includes(s)||t.desc.toLowerCase().includes(s)||(t.law||"").toLowerCase().includes(s))}return ts.sort((a,b)=>{if(a.done!==b.done)return a.done?1:-1;var da=a.deadline?new Date(a.deadline).getTime():Infinity;var db2=b.deadline?new Date(b.deadline).getTime():Infinity;if(da!==db2)return da-db2;return a.order-b.order})},[deb,allTasks,ph,q]);
  var phC=useMemo(()=>{if(!deb)return{};var r={};FU.PHASES.forEach(p=>{var f=p.id==="all"?allTasks:allTasks.filter(t=>t.phase===p.id);r[p.id]={t:f.length,d:f.filter(t=>t.done).length}});return r},[deb,allTasks]);
  var risk=useMemo(()=>{if(!deb)return{l:"—",c:"#64748b"};return stats.ov>3?{l:"Критический",c:"#dc2626"}:stats.ov>0?{l:"Просрочки",c:"#d97706"}:{l:"В норме",c:"#16a34a"}},[deb,stats]);
  var conflicts=useMemo(()=>deb?FU.checkConflict(deb.keyDates,deb.meetingFormat):[],[deb]);
  var fd=deb?FU.KD_META.filter(m=>deb.keyDates[m.id]).length:0;
  var reqStats=useMemo(()=>{if(!deb)return{t:0,w:0,d:0,ov:0,ct:0};var rs=deb.requests||[];return{t:rs.length,w:rs.filter(r=>r.status==="waiting"&&FU.dleft(r.deadline)>=0).length,d:rs.filter(r=>r.status==="done").length,ov:rs.filter(r=>r.status==="waiting"&&FU.dleft(r.deadline)<0&&!r.court).length,ct:rs.filter(r=>r.court).length}},[deb]);
  var credStats=useMemo(()=>{
    if(!deb)return{t:0,inc:0,pen:0,noE:0,sum:0,sumPrincipal:0,sumPenalty:0,sumBeyond:0,byQueue:{1:{total:0,principal:0,penalty:0,count:0},2:{total:0,principal:0,penalty:0,count:0},3:{total:0,principal:0,penalty:0,count:0}},objPending:0};
    var cs=deb.creditors||[];
    var inc=cs.filter(function(c){return c.status==="included"});
    var bq={1:{total:0,principal:0,penalty:0,count:0},2:{total:0,principal:0,penalty:0,count:0},3:{total:0,principal:0,penalty:0,count:0}};
    var sumPrincipal=0,sumPenalty=0,sum=0,sumBeyond=0;
    var seenInQ={1:{},2:{},3:{}};
    inc.forEach(function(c){
      var positions=getPositions(c);
      positions.forEach(function(p){
        var amt=parseFloat(p.amount)||0;
        var q=p.queue||"3";
        if(!bq[q])bq[q]={total:0,principal:0,penalty:0,count:0};
        if(p.beyondRegistry){sumBeyond+=amt;return}
        if(p.type==="principal"){bq[q].principal+=amt;sumPrincipal+=amt}
        else{bq[q].penalty+=amt;sumPenalty+=amt}
        bq[q].total+=amt;
        sum+=amt;
        if(!seenInQ[q][c.id]){seenInQ[q][c.id]=true;bq[q].count++}
      });
    });
    return{
      t:cs.length,inc:inc.length,
      pen:cs.filter(function(c){return c.status==="pending"}).length,
      noE:cs.filter(function(c){return!c.efrsb}).length,
      sum:sum,sumPrincipal:sumPrincipal,sumPenalty:sumPenalty,sumBeyond:sumBeyond,
      byQueue:bq,
      objPending:cs.filter(function(c){return c.status==="pending"&&c.objectionDeadline&&FU.dleft(c.objectionDeadline)>=0&&!c.objectionFiled}).length
    }
  },[deb]);
  var dashReqOv=useMemo(()=>{var all=[];debtors.forEach(d=>{(d.requests||[]).forEach(r=>{if(r.status==="waiting"&&FU.dleft(r.deadline)<0)all.push({...r,dfio:d.fio})})});return all},[debtors]);

  // HANDLERS
  var addDeb=()=>{
    if(!form.fio.trim()||!form.date)return;
    var kd=FU.autoKd({kd_procedure:form.date});
    var procedure=form.procedure||"restructuring";
    var procLabel=(FU.PROCEDURES.find(function(p){return p.id===procedure})||{label:"Реструктуризация"}).label;
    var d={id:FU.uid(),fio:form.fio,caseNum:form.caseNum,notes:form.notes,meetingFormat:form.meetingFormat,procedure:procedure,keyDates:kd,tasks:FU.mkTasks(kd,form.meetingFormat,procedure),journal:[{id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Создан. "+procLabel+" с "+FU.fmt(form.date)+"."}],requests:[],creditors:[],currentPayments:[]};
    setDebtors(p=>[...p,d]);
    setAid(d.id);
    setTab("home");
    setModal(null);
    setForm({fio:"",caseNum:"",date:"",notes:"",meetingFormat:"inperson",procedure:"restructuring"})
  };
  var delDeb=id=>{if(!confirm("Удалить должника?"))return;setDebtors(p=>p.filter(d=>d.id!==id));if(aid===id)setAid(debtors.find(d=>d.id!==id)?.id||null)};
  var tog=tid=>{setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,tasks:d.tasks.map(t=>t.id!==tid?t:{...t,done:!t.done,doneDate:!t.done?new Date().toISOString().split("T")[0]:null})}))};
  // Развилка задачи «Срок представления плана»: outcome = "received" | "not_received"
  // Если "not_received":
  //   1) добавляем задачу «Провести собрание для перехода к реализации»;
  //   2) если kd_meeting пуста — проставляем = закрытие реестра + 60 дн (ст.213.12 п.5);
  //      это автоматом подтягивает уведомление кредиторов (-14/-30 дн), отчёт ФУ (-5 дн) и публикацию (+5 дн).
  var togPlanOutcome=(tid,outcome)=>{
    setDebtors(p=>p.map(d=>{
      if(d.id!==aid)return d;
      var today=new Date().toISOString().split("T")[0];
      var newTasks=d.tasks.map(t=>{
        if(t.id!==tid)return t;
        // Если уже выполнено и тыкаем тот же outcome — снимаем галочку
        if(t.done&&t.outcome===outcome)return {...t,done:false,doneDate:null,outcome:null};
        return {...t,done:true,doneDate:today,outcome:outcome};
      });
      var extra=[];
      var newKd=d.keyDates;
      var meetingDateMsg="";
      if(outcome==="not_received"){
        var rc=d.keyDates&&d.keyDates.kd_registry_close;
        var dl60=rc?FU.shiftToBusiness(FU.addD(rc,60)):"";
        // 1) Задача «Провести собрание для перехода к реализации» — если ещё не добавлена
        var already=d.tasks.some(t=>t.id_key==="meeting_no_plan");
        if(!already){
          var mx=d.tasks.reduce((m,t)=>Math.max(m,t.order||0),0);
          extra.push({
            id:FU.uid(),phase:"meeting",order:mx+1,
            id_key:"meeting_no_plan",
            title:"\u041f\u0440\u043e\u0432\u0435\u0441\u0442\u0438 \u0441\u043e\u0431\u0440\u0430\u043d\u0438\u0435 \u0434\u043b\u044f \u043f\u0435\u0440\u0435\u0445\u043e\u0434\u0430 \u043a \u0440\u0435\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u0438",
            desc:"\u041f\u043b\u0430\u043d \u043d\u0435 \u043f\u043e\u043b\u0443\u0447\u0435\u043d. \u041d\u0430 \u0441\u043e\u0431\u0440\u0430\u043d\u0438\u0438 \u043f\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u0435 \u043e \u0440\u0435\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u0438 \u0438\u043c\u0443\u0449\u0435\u0441\u0442\u0432\u0430. \u0414\u0435\u0434\u043b\u0430\u0439\u043d: 60 \u0434\u043d. \u0441 \u0437\u0430\u043a\u0440\u044b\u0442\u0438\u044f \u0440\u0435\u0435\u0441\u0442\u0440\u0430.",
            law:"\u043f.4, 5 \u0441\u0442.213.12",
            dl:{from:"kd_registry_close",days:60},
            deadline:dl60,done:false,doneDate:null,notes:"",priority:"high",links:[]
          });
        }
        // 2) Автозаполнение kd_meeting (если пусто) — чтобы все привязанные задачи пересчитались
        if(dl60&&!d.keyDates.kd_meeting){
          newKd=FU.autoKd({...d.keyDates,kd_meeting:dl60});
          newTasks=FU.recalc(newTasks,newKd,d.meetingFormat);
          meetingDateMsg=" \u0414\u0430\u0442\u0430 \u0441\u043e\u0431\u0440\u0430\u043d\u0438\u044f \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d\u0430 \u043d\u0430 "+FU.fmt(dl60)+", \u0441\u0440\u043e\u043a\u0438 \u0432\u0441\u0435\u0445 \u0441\u0432\u044f\u0437\u0430\u043d\u043d\u044b\u0445 \u0437\u0430\u0434\u0430\u0447 \u043f\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u043d\u044b.";
        }else if(dl60&&d.keyDates.kd_meeting&&new Date(d.keyDates.kd_meeting)>new Date(dl60)){
          meetingDateMsg=" \u26a0\ufe0f \u0422\u0435\u043a\u0443\u0449\u0430\u044f \u0434\u0430\u0442\u0430 \u0441\u043e\u0431\u0440\u0430\u043d\u0438\u044f ("+FU.fmt(d.keyDates.kd_meeting)+") \u041f\u041e\u0417\u0416\u0415 \u0434\u0435\u0434\u043b\u0430\u0439\u043d\u0430 60 \u0434\u043d. ("+FU.fmt(dl60)+") \u2014 \u043f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435!";
        }
      }
      var jText=outcome==="received"?"\u041f\u043b\u0430\u043d \u0440\u0435\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0438\u0437\u0430\u0446\u0438\u0438 \u043f\u043e\u043b\u0443\u0447\u0435\u043d \u0432 \u0441\u0440\u043e\u043a":"\u041f\u043b\u0430\u043d \u0440\u0435\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0438\u0437\u0430\u0446\u0438\u0438 \u041d\u0415 \u043f\u043e\u043b\u0443\u0447\u0435\u043d. \u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u0437\u0430\u0434\u0430\u0447\u0430 \u043e \u0441\u043e\u0431\u0440\u0430\u043d\u0438\u0438 \u0434\u043b\u044f \u043f\u0435\u0440\u0435\u0445\u043e\u0434\u0430 \u043a \u0440\u0435\u0430\u043b\u0438\u0437\u0430\u0446\u0438\u0438."+meetingDateMsg;
      return{...d,keyDates:newKd,tasks:[...newTasks,...extra],journal:[...(d.journal||[]),{id:FU.uid(),date:today,text:jText}]};
    }));
  };
  var togX=(did,tid)=>{setDebtors(p=>p.map(d=>d.id!==did?d:{...d,tasks:d.tasks.map(t=>t.id!==tid?t:{...t,done:!t.done,doneDate:!t.done?new Date().toISOString().split("T")[0]:null})}))};
  var updT=(tid,f,v)=>{setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,tasks:d.tasks.map(t=>t.id!==tid?t:{...t,[f]:v})}))};
  var updateKD=(key,val)=>{setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var nk=FU.autoKd({...d.keyDates,[key]:val});var nt=FU.recalc(d.tasks,nk,d.meetingFormat);var e={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Дата \xab"+(FU.KD_META.find(m=>m.id===key)?.label)+"\xbb \u2192 "+FU.fmt(val)+". Пересчитано."};return{...d,keyDates:nk,tasks:nt,journal:[...d.journal,e]}}))};
  var changeMF=nf=>{setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var nt=FU.recalc(d.tasks,d.keyDates,nf);var e={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Формат \u2192 "+(nf==="remote"?"заочное":"очное")+". Пересчитано."};return{...d,meetingFormat:nf,tasks:nt,journal:[...d.journal,e]}}))};
  var addJ=()=>{if(!jt.trim()||!deb)return;setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,journal:[...d.journal,{id:FU.uid(),date:new Date().toISOString().split("T")[0],text:jt.trim()}]}));setJt("")};
  var addCustomTask=()=>{
    if(!customForm.title.trim())return;
    var mx=deb.tasks.filter(t=>t.phase==="custom").reduce((m,t)=>Math.max(m,t.order),99);
    var nt={id:FU.uid(),phase:"custom",order:mx+1,title:customForm.title,desc:customForm.desc,law:customForm.law,dl:null,deadline:customForm.deadline||"",done:false,doneDate:null,notes:"",priority:"medium",links:[]};
    // Парная задача: если в названии «заседание» и есть дедлайн — предложить создать «документы в суд за 5 дн.»
    var newTasks=[nt];
    var titleLow=customForm.title.toLowerCase();
    var isHearing=titleLow.indexOf("\u0437\u0430\u0441\u0435\u0434\u0430\u043d\u0438\u0435")>-1;
    if(isHearing&&customForm.deadline){
      var pairDeadline=FU.shiftToBusiness(FU.addD(customForm.deadline,-5));
      var pairTitle="\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u0432 \u0441\u0443\u0434: "+customForm.title;
      if(confirm("\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u043f\u0430\u0440\u043d\u0443\u044e \u0437\u0430\u0434\u0430\u0447\u0443?\n\n\u00ab"+pairTitle+"\u00bb\n\u0414\u0435\u0434\u043b\u0430\u0439\u043d: "+FU.fmt(pairDeadline)+" (\u0437\u0430 5 \u043a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u043d\u044b\u0445 \u0434\u043d\u0435\u0439 \u0434\u043e \u0437\u0430\u0441\u0435\u0434\u0430\u043d\u0438\u044f)")){
        newTasks.push({id:FU.uid(),phase:"custom",order:mx+2,title:pairTitle,desc:"\u041d\u0430\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0432 \u0430\u0440\u0431\u0438\u0442\u0440\u0430\u0436\u043d\u044b\u0439 \u0441\u0443\u0434 \u043e\u0442\u0447\u0451\u0442 \u0438 \u0438\u043d\u044b\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b \u043f\u043e \u0437\u0430\u0441\u0435\u0434\u0430\u043d\u0438\u044e",law:customForm.law||"\u043f.7 \u0441\u0442.213.12",dl:null,deadline:pairDeadline,done:false,doneDate:null,notes:"",priority:"high",links:[],parentId:nt.id});
      }
    }
    setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,tasks:[...d.tasks,...newTasks]}));
    setCustomForm({title:"",desc:"",deadline:"",law:""});
    setModal(null)
  };
  var delCustomTask=tid=>{setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,tasks:d.tasks.filter(t=>t.id!==tid)}))};
  var exportData=()=>{var data=JSON.stringify({version:2,exported:new Date().toISOString(),debtors},null,2);var blob=new Blob([data],{type:"application/json"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download="fu_backup_"+new Date().toISOString().split("T")[0]+".json";a.click();URL.revokeObjectURL(url)};
  var importData=e=>{var file=e.target.files?.[0];if(!file)return;var reader=new FileReader();reader.onload=ev=>{try{var data=JSON.parse(ev.target.result);if(data.debtors?.length){if(confirm("Импортировать "+data.debtors.length+" должник(ов)?")){setDebtors(data.debtors);setAid(data.debtors[0].id)}}else alert("Файл пуст.")}catch(e){alert("Ошибка.")}};reader.readAsText(file);e.target.value=""};

  // REQUEST HANDLERS
  var REQ_ORGANS=[
    {id:"rosreestr",name:"Росреестр",days:30,cat:"gov"},{id:"gibdd",name:"ГИБДД МВД",days:30,cat:"gov"},{id:"fns",name:"ФНС России",days:30,cat:"gov"},{id:"sfr",name:"СФР (ПФР)",days:30,cat:"gov"},{id:"fssp",name:"ФССП",days:30,cat:"gov"},{id:"gims",name:"ГИМС",days:30,cat:"gov"},{id:"rospatent",name:"Роспатент",days:30,cat:"gov"},{id:"zags",name:"ЗАГС",days:30,cat:"gov"},{id:"employer",name:"Работодатель",days:14,cat:"other"},
    {id:"sber",name:"Сбербанк",days:14,cat:"bank"},{id:"tbank",name:"Т-Банк",days:14,cat:"bank"},{id:"vtb",name:"ВТБ",days:14,cat:"bank"},{id:"alfa",name:"Альфа-Банк",days:14,cat:"bank"},{id:"gazprom",name:"Газпромбанк",days:14,cat:"bank"},{id:"rshb",name:"Россельхозбанк",days:14,cat:"bank"},{id:"sovcom",name:"Совкомбанк",days:14,cat:"bank"},{id:"psb",name:"Промсвязьбанк",days:14,cat:"bank"},{id:"raiff",name:"Райффайзен",days:14,cat:"bank"},{id:"rosbank",name:"Росбанк",days:14,cat:"bank"},{id:"otkr",name:"Открытие",days:14,cat:"bank"},{id:"pochta",name:"Почта Банк",days:14,cat:"bank"},{id:"mkb",name:"МКБ",days:14,cat:"bank"},{id:"akbars",name:"Ак Барс",days:14,cat:"bank"},{id:"bnk_other",name:"Другой банк",days:14,cat:"bank"},
    {id:"other",name:"Другой орган",days:30,cat:"other"}
  ];
  var REQ_METHODS=[{id:"mail",name:"Почта"},{id:"email",name:"Email"},{id:"gosuslugi",name:"Госуслуги"},{id:"myarbitr",name:"Мой Арбитр"},{id:"personal",name:"Лично"},{id:"other",name:"Другой"}];
  var[reqCat,setReqCat]=useState("gov");
  var addReq=()=>{if(!reqForm.organ||!reqForm.date)return;var org=REQ_ORGANS.find(o=>o.id===reqForm.organ);var organName=(reqForm.organ==="other"||reqForm.organ==="bnk_other")?reqForm.customOrgan||(org?org.name:""):(org?org.name:reqForm.organ);var dl=FU.addD(reqForm.date,org?org.days:30);var nr={id:FU.uid(),organ:organName,organId:reqForm.organ,cat:org?org.cat:"other",method:reqForm.method,dateSent:reqForm.date,deadline:dl,desc:reqForm.desc,taskId:reqForm.taskId||"",trackNum:reqForm.trackNum||"",status:"waiting",response:"",dateResponse:"",attempts:[{date:reqForm.date,type:"initial"}],court:null};setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var reqs=(d.requests||[]).concat(nr);var j={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Запрос \u2192 "+organName+(reqForm.trackNum?" (трек: "+reqForm.trackNum+")":"")};return{...d,requests:reqs,journal:[...d.journal,j]}}));setReqForm({organ:"",customOrgan:"",method:"",date:"",desc:"",taskId:"",trackNum:""});setModal("requests")};
  var markReqDone=(rid,resp)=>{setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var reqs=(d.requests||[]).map(r=>{if(r.id!==rid)return r;return{...r,status:"done",response:resp||"Ответ получен",dateResponse:new Date().toISOString().split("T")[0]}});var req=reqs.find(r=>r.id===rid);var tasks=d.tasks;if(req&&req.taskId){tasks=tasks.map(t=>t.id===req.taskId?{...t,done:true,doneDate:new Date().toISOString().split("T")[0]}:t)}var j={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Ответ \u2190 "+req.organ};return{...d,requests:reqs,tasks:tasks,journal:[...d.journal,j]}}))};
  var retryReq=rid=>{setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var today=new Date().toISOString().split("T")[0];var reqs=(d.requests||[]).map(r=>{if(r.id!==rid)return r;var org=REQ_ORGANS.find(o=>o.name===r.organ);return{...r,attempts:[...(r.attempts||[]),{date:today,type:"retry"}],deadline:FU.addD(today,org?org.days:30)}});var req=(d.requests||[]).find(r=>r.id===rid);var j={id:FU.uid(),date:today,text:"Повторный \u2192 "+req.organ};return{...d,requests:reqs,journal:[...d.journal,j]}}))};
  var delReq=rid=>{setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,requests:(d.requests||[]).filter(r=>r.id!==rid)}))};
  var courtReq=(rid)=>{var courtDate=prompt("Дата подачи ходатайства об истребовании (ГГГГ-ММ-ДД):",new Date().toISOString().split("T")[0]);if(!courtDate)return;setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var reqs=(d.requests||[]).map(r=>{if(r.id!==rid)return r;return{...r,court:{dateFiled:courtDate,status:"filed",courtDecision:"",executionDeadline:""},attempts:[...(r.attempts||[]),{date:courtDate,type:"court"}]}});var req=(d.requests||[]).find(r=>r.id===rid);var j={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Истребование через суд: "+req.organ+" (ст.66 АПК)"};return{...d,requests:reqs,journal:[...d.journal,j]}}))};
  var courtUpdate=(rid,field,val)=>{setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,requests:(d.requests||[]).map(r=>r.id!==rid?r:{...r,court:{...r.court,[field]:val}})}))};

  // CREDITOR HANDLERS
  var addCred=()=>{
    if(!credForm.name.trim())return;
    var positions=credForm.positions&&credForm.positions.length>0?credForm.positions:[
      {id:FU.uid(),type:"principal",amount:parseFloat(credForm.principal)||0,queue:credForm.queue||"3",beyondRegistry:false}
    ];
    var totalAmount=positions.reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0);
    var prSum=positions.filter(function(p){return p.type==="principal"&&!p.beyondRegistry}).reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0);
    var peSum=positions.filter(function(p){return p.type!=="principal"&&!p.beyondRegistry}).reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0);
    var nc={id:FU.uid(),name:credForm.name,principal:prSum,penalty:peSum,amount:totalAmount,queue:credForm.queue,positions:positions,secured:credForm.secured,dateFiled:credForm.dateFiled,courtDate:credForm.courtDate,objectionDeadline:credForm.objectionDeadline,objectionFiled:credForm.objectionFiled,status:"pending",efrsb:false,efrsbDate:"",result:""};
    setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var j={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Требование: "+nc.name+" "+totalAmount.toLocaleString("ru-RU")+" \u20bd"};return{...d,creditors:[...(d.creditors||[]),nc],journal:[...d.journal,j]}}));
    setCredForm({name:"",principal:"",penalty:"",queue:"3",secured:false,dateFiled:"",courtDate:"",objectionDeadline:"",objectionFiled:false,positions:[]});
    setModal("creditors")
  };
  var saveCred=()=>{
    if(!editCred||!editCred.name.trim())return;
    var positions=editCred.positions&&editCred.positions.length>0?editCred.positions:[];
    var totalAmount,prSum,peSum;
    if(positions.length>0){
      totalAmount=positions.reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0);
      prSum=positions.filter(function(p){return p.type==="principal"&&!p.beyondRegistry}).reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0);
      peSum=positions.filter(function(p){return p.type!=="principal"&&!p.beyondRegistry}).reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0);
    }else{
      prSum=parseFloat(editCred.principal)||0;
      peSum=parseFloat(editCred.penalty)||0;
      totalAmount=prSum+peSum;
    }
    var updated={...editCred,principal:prSum,penalty:peSum,amount:totalAmount,positions:positions};
    setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,creditors:(d.creditors||[]).map(c=>c.id!==updated.id?c:updated)}));
    setEditCred(null);
    setModal("creditors")
  };
  var updCred=(cid,f,v)=>{setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,creditors:(d.creditors||[]).map(c=>c.id!==cid?c:{...c,[f]:v})}))};
  var markCredStatus=(cid,st)=>{setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var cr=(d.creditors||[]).find(c=>c.id===cid);var j={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:cr.name+": "+(st==="included"?"включено":"отказано")};return{...d,creditors:(d.creditors||[]).map(c=>c.id!==cid?c:{...c,status:st}),journal:[...d.journal,j]}}))};
  var markEfrsb=cid=>{setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,creditors:(d.creditors||[]).map(c=>c.id!==cid?c:{...c,efrsb:true,efrsbDate:new Date().toISOString().split("T")[0]})}))};

  // ТЕКУЩИЕ ПЛАТЕЖИ (ст. 5, 134)
  var addCp=function(){
    if(!cpForm.description.trim())return;
    var ncp={id:FU.uid(),creditor:cpForm.creditor,description:cpForm.description,amount:parseFloat(cpForm.amount)||0,queue:cpForm.queue||"4",dueDate:cpForm.dueDate,paidDate:cpForm.paidDate,paid:cpForm.paid};
    setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var j={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Текущий платёж: "+ncp.description+(ncp.amount?" "+ncp.amount.toLocaleString("ru-RU")+" ₽":"")};return{...d,currentPayments:[...(d.currentPayments||[]),ncp],journal:[...d.journal,j]}}));
    setCpForm({creditor:"",description:"",amount:"",queue:"4",dueDate:"",paidDate:"",paid:false});
    setModal("currentPayments")
  };
  var saveCp=function(){
    if(!editCp||!editCp.description.trim())return;
    setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,currentPayments:(d.currentPayments||[]).map(c=>c.id!==editCp.id?c:{...editCp,amount:parseFloat(editCp.amount)||0})}));
    setEditCp(null);
    setModal("currentPayments")
  };
  var togCpPaid=function(cid){setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,currentPayments:(d.currentPayments||[]).map(c=>c.id!==cid?c:{...c,paid:!c.paid,paidDate:!c.paid?new Date().toISOString().split("T")[0]:""})}))};
  var delCp=function(cid){if(!confirm("Удалить платёж?"))return;setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,currentPayments:(d.currentPayments||[]).filter(c=>c.id!==cid)}))};

  // ПЕРЕХОД ПРОЦЕДУРЫ
  var doSwitchProc=function(newProc){
    if(!deb)return;
    if(newProc===deb.procedure){setModal(null);return}
    if(!confirm("Перейти из «"+(FU.PROCEDURES.find(p=>p.id===(deb.procedure||"restructuring"))||{}).label+"» в «"+(FU.PROCEDURES.find(p=>p.id===newProc)||{}).label+"»?\n\nВыполненные задачи сохранятся в архиве. Новые задачи и сроки будут пересчитаны от текущей даты."))return;
    setDebtors(p=>p.map(d=>d.id!==aid?d:FU.switchProcedure(d,newProc,{kd_procedure:FU.today()})));
    setModal(null)
  };

  var debtorColor=function(i){return FU.CARD_COLORS[i%FU.CARD_COLORS.length]};
  var debtorStatus=function(d){var ov=d.tasks.filter(function(t){return!t.done&&t.deadline&&FU.dleft(t.deadline)<0}).length;return ov>0?"#dc2626":d.tasks.filter(function(t){return!t.done&&t.deadline&&FU.dleft(t.deadline)>=0&&FU.dleft(t.deadline)<=7}).length>0?"#d97706":"#16a34a"};
  var nearestTask=function(d){return d.tasks.filter(function(t){return!t.done&&t.deadline}).sort(function(a,b){return(FU.dleft(a.deadline)<0?999:FU.dleft(a.deadline))-(FU.dleft(b.deadline)<0?999:FU.dleft(b.deadline))})[0]};

  // CARD STYLE
  var cs={borderRadius:16,padding:"16px 18px",color:"#fff",cursor:"pointer",position:"relative",overflow:"hidden",minHeight:120};
  var modalBg={position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300};
  var modalBox={background:"#fff",borderRadius:16,width:500,maxHeight:"85vh",overflowY:"auto",padding:"20px 24px",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"};
  var btnP={padding:"8px 16px",borderRadius:10,border:"none",background:ac,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"};
  var btnS={padding:"8px 16px",borderRadius:10,border:"1px solid "+bd,background:"#fff",color:tx,fontSize:13,cursor:"pointer",fontFamily:"inherit"};

  // HOME VIEW (dashboard + debtor cards)
  var homeView=function(){
    return React.createElement(React.Fragment,null,
      // ALERT
      (dashD.ov.length>0||dashReqOv.length>0)&&React.createElement("div",{style:{padding:"14px 18px",borderRadius:14,marginBottom:16,background:dashD.ov.length>0?"linear-gradient(135deg,#ef4444,#f97316)":"linear-gradient(135deg,#8b5cf6,#6366f1)",color:"#fff"}},
        React.createElement("div",{style:{fontSize:14,fontWeight:700}},dashD.ov.length>0?"\u26a0 "+dashD.ov.length+" просрочен"+(dashD.ov.length===1?"а":"о"):"\ud83d\udce8 "+dashReqOv.length+" запросов без ответа"),
        React.createElement("div",{style:{fontSize:12,opacity:0.9,marginTop:2}},"Должников: "+debtors.length+" \xb7 выполнено "+dashD.td+" из "+debtors.reduce(function(s,d){return s+d.tasks.length},0))
      ),
      // STATS
      React.createElement("div",{className:"stat-grid-4",style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}},
        [[debtors.length,"#6366f1","#eef2ff","Всего дел"],[dashD.ov.length,"#dc2626","#fef2f2","Просрочки"],[dashD.wk.length,"#d97706","#fffbeb","На неделе"],[dashD.td,"#16a34a","#f0fdf4","Завершено"]].map(function(x,i){return React.createElement("div",{key:i,style:{background:x[2],borderRadius:14,padding:"14px 16px"}},React.createElement("div",{style:{fontSize:26,fontWeight:800,color:x[1]}},x[0]),React.createElement("div",{style:{fontSize:11,color:x[1],opacity:0.7,fontWeight:600}},x[3]))})
      ),
      // SECTION TITLE
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
        React.createElement("div",{style:{fontSize:16,fontWeight:700}},"Активные дела"),
        debtors.length>0&&React.createElement("span",{style:{fontSize:12,color:ac,fontWeight:600,cursor:"pointer"},onClick:function(){setTab("cases")}},"все "+debtors.length+" \u2192")
      ),
      // DEBTOR CARDS GRID
      React.createElement("div",{className:"debtor-grid",style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}},
        debtors.map(function(d,i){
          var dn=d.tasks.filter(function(t){return t.done}).length;
          var pct=Math.round(dn/d.tasks.length*100);
          var sc=debtorStatus(d);
          var nt=nearestTask(d);
          var ovC=d.tasks.filter(function(t){return!t.done&&t.deadline&&FU.dleft(t.deadline)<0}).length;
          return React.createElement("div",{key:d.id,onClick:function(){setAid(d.id);setTab("home")},style:{...cs,background:debtorColor(i)}},
            React.createElement("div",{style:{position:"absolute",top:10,right:10,display:"flex",gap:4}},
              React.createElement("button",{onClick:function(e){e.stopPropagation();delDeb(d.id)},style:{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:"50%",width:24,height:24,color:"#fff",cursor:"pointer",fontSize:11}},"\u2715")
            ),
            React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:2}},d.fio),
            React.createElement("div",{style:{fontSize:11,opacity:0.85,marginBottom:10}},d.caseNum+" \xb7 "+((FU.PROCEDURES.find(function(p){return p.id===(d.procedure||"restructuring")})||FU.PROCEDURES[0]).short)),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},
              React.createElement("div",{style:{display:"flex",gap:4}},
                ovC>0&&React.createElement("span",{style:{background:"rgba(255,255,255,0.25)",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}},"-"+FU.dleft(d.tasks.filter(function(t){return!t.done&&t.deadline&&FU.dleft(t.deadline)<0}).sort(function(a,b){return FU.dleft(a.deadline)-FU.dleft(b.deadline)})[0]?.deadline)+" дн."),
                React.createElement("span",{style:{background:"rgba(255,255,255,0.25)",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}},d.tasks.length+" задач")
              ),
              React.createElement("span",{style:{fontSize:13,fontWeight:700}},pct+"%")
            ),
            React.createElement("div",{style:{height:4,background:"rgba(255,255,255,0.3)",borderRadius:2}},React.createElement("div",{style:{height:"100%",width:pct+"%",background:"#fff",borderRadius:2}}))
          )
        }),
        // NEW DEBTOR CARD
        React.createElement("div",{onClick:function(){setModal("add")},style:{...cs,background:"#fff",border:"2px dashed "+bd,color:txm,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer"}},
          React.createElement("div",{style:{fontSize:28,marginBottom:4}},"+"),
          React.createElement("div",{style:{fontSize:13,fontWeight:600}},"Новое дело")
        )
      )
    )
  };

  // DEBTOR DETAIL VIEW
  var detailView=function(){
    if(!deb)return React.createElement("div",{style:{textAlign:"center",padding:40,color:txm}},"Выберите должника");
    return React.createElement(React.Fragment,null,
      // HEADER
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:16}},
        React.createElement("button",{onClick:function(){setAid(null)},style:{background:"#f3f4f6",border:"none",borderRadius:10,padding:"6px 12px",cursor:"pointer",fontSize:14,fontFamily:"inherit"}},"\u2190"),
        React.createElement("div",{style:{flex:1}},
          React.createElement("div",{style:{fontSize:16,fontWeight:700}},deb.fio),
          React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center",marginTop:2,flexWrap:"wrap"}},
            deb.caseNum&&React.createElement("a",{href:"https://kad.arbitr.ru/Card?number="+encodeURIComponent(deb.caseNum),target:"_blank",rel:"noopener noreferrer",style:{fontSize:11,color:ac,textDecoration:"none",fontWeight:600}},deb.caseNum),
            (function(){var p=FU.PROCEDURES.find(function(x){return x.id===(deb.procedure||"restructuring")})||FU.PROCEDURES[0];return React.createElement("span",{style:{fontSize:10,padding:"2px 8px",borderRadius:8,fontWeight:600,color:p.color,background:p.color+"15"}},p.short)})(),
            React.createElement("span",{style:{fontSize:10,padding:"2px 8px",borderRadius:8,fontWeight:600,color:risk.c,background:risk.c+"15"}},risk.l)
          )
        )
      ),
      // ACTION BUTTONS
      React.createElement("div",{className:"top-actions",style:{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}},
        React.createElement("div",{style:{display:"flex",background:"#f3f4f6",borderRadius:10,overflow:"hidden"}},
          React.createElement("button",{onClick:function(){setViewMode("list")},style:{padding:"6px 12px",border:"none",background:viewMode==="list"?ac:"transparent",color:viewMode==="list"?"#fff":txm,fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}},"\u2630"),
          React.createElement("button",{onClick:function(){setViewMode("cal")},style:{padding:"6px 12px",border:"none",background:viewMode==="cal"?ac:"transparent",color:viewMode==="cal"?"#fff":txm,fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}},"\ud83d\udcc5")
        ),
        React.createElement("input",{value:q,onChange:function(e){setQ(e.target.value)},placeholder:"Поиск...",style:{...inp,width:120,borderRadius:10}}),
        React.createElement("button",{onClick:function(){setModal("dates")},style:{...btnS,fontSize:11,padding:"6px 12px",borderRadius:10}},"\ud83d\udcc5 Даты ("+fd+"/"+FU.KD_META.length+")"),
        React.createElement("button",{onClick:function(){setModal("journal")},style:{...btnS,fontSize:11,padding:"6px 12px",borderRadius:10}},"\ud83d\udcd3 ("+(deb.journal?.length||0)+")"),
        React.createElement("button",{onClick:function(){setModal("requests")},style:{...btnS,fontSize:11,padding:"6px 12px",borderRadius:10,borderColor:reqStats.ov>0?"#dc2626":bd,color:reqStats.ov>0?"#dc2626":tx}},"\ud83d\udce8 ("+reqStats.t+")"),
        React.createElement("button",{onClick:function(){setModal("creditors")},style:{...btnS,fontSize:11,padding:"6px 12px",borderRadius:10}},"\ud83d\udccb ("+credStats.t+")"),
        React.createElement("button",{onClick:function(){setModal("currentPayments")},style:{...btnS,fontSize:11,padding:"6px 12px",borderRadius:10}},"\ud83d\udcb0 Текущие ("+((deb.currentPayments||[]).length)+")"),
        React.createElement("button",{onClick:function(){setModal("switchProc")},style:{...btnS,fontSize:11,padding:"6px 12px",borderRadius:10}},"\ud83d\udd04 Процедура"),
        React.createElement("button",{onClick:function(){setModal("custom")},style:{...btnP,fontSize:11,padding:"6px 12px",borderRadius:10}},"+  Задача")
      ),
      // CONFLICTS
      conflicts.length>0&&React.createElement("div",{style:{marginBottom:12}},conflicts.map(function(w,i){return React.createElement("div",{key:i,style:{padding:"10px 14px",borderRadius:12,marginBottom:6,background:w.type==="critical"?"#fef2f2":"#fffbeb",border:"1px solid "+(w.type==="critical"?"#fecaca":"#fde68a"),fontSize:12,lineHeight:1.6,color:w.type==="critical"?"#991b1b":"#92400e"}},w.text)})),
      // STATS
      React.createElement("div",{className:"stat-grid-5",style:{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}},
        [[stats.t,ac,"#eef2ff","Всего"],[stats.dn,"#16a34a","#f0fdf4","Готово"],[stats.ov,"#dc2626","#fef2f2","Просроч."],[stats.sn,"#d97706","#fffbeb","Скоро"],[stats.pct+"%","#8b5cf6","#f5f3ff","Прогресс"]].map(function(x,i){return React.createElement("div",{key:i,style:{background:x[2],borderRadius:12,padding:"10px 14px"}},React.createElement("div",{style:{fontSize:22,fontWeight:700,color:x[1]}},x[0]),React.createElement("div",{style:{fontSize:10,color:x[1],opacity:0.7,fontWeight:600}},x[3]))})
      ),
      // LIST / CALENDAR
      viewMode==="list"?React.createElement(React.Fragment,null,
        React.createElement("div",{className:"phase-tabs",style:{display:"flex",gap:3,marginBottom:14,background:"#f3f4f6",padding:4,borderRadius:12,overflowX:"auto"}},
          FU.PHASES.map(function(p){return React.createElement("button",{key:p.id,onClick:function(){setPh(p.id)},style:{padding:"6px 12px",borderRadius:9,fontSize:11,fontWeight:ph===p.id?700:500,color:ph===p.id?"#fff":"#6b7280",cursor:"pointer",border:"none",background:ph===p.id?ac:"transparent",fontFamily:"inherit",whiteSpace:"nowrap"}},p.icon+" "+p.label+(phC[p.id]&&phC[p.id].t>0?" "+phC[p.id].d+"/"+phC[p.id].t:""))})
        ),
        filtered.map(function(t){
          var isN=!!t.meetingDependent,isC=t.phase==="custom",isPlan=t.id_key==="plan_check";
          return React.createElement("div",{key:t.id,style:{background:"#fff",border:"1px solid "+bd,borderRadius:12,padding:"12px 14px",marginBottom:6,display:"grid",gridTemplateColumns:(isPlan?"56px":"24px")+" 1fr auto",gap:10,alignItems:"start",opacity:t.done&&!isPlan?0.45:1}},
            isPlan
              ? React.createElement("div",{style:{display:"flex",gap:3,marginTop:1}},
                  React.createElement("div",{onClick:function(){togPlanOutcome(t.id,"received")},title:"\u041f\u043b\u0430\u043d \u043f\u043e\u043b\u0443\u0447\u0435\u043d",style:{width:24,height:22,borderRadius:6,border:"1.5px solid "+(t.done&&t.outcome==="received"?"#16a34a":"#d1d5db"),background:t.done&&t.outcome==="received"?"#16a34a":"transparent",color:t.done&&t.outcome==="received"?"#fff":"#16a34a",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}},"\u2713"),
                  React.createElement("div",{onClick:function(){togPlanOutcome(t.id,"not_received")},title:"\u041f\u043b\u0430\u043d \u043d\u0435 \u043f\u043e\u043b\u0443\u0447\u0435\u043d",style:{width:24,height:22,borderRadius:6,border:"1.5px solid "+(t.done&&t.outcome==="not_received"?"#dc2626":"#d1d5db"),background:t.done&&t.outcome==="not_received"?"#dc2626":"transparent",color:t.done&&t.outcome==="not_received"?"#fff":"#dc2626",fontSize:14,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}},"\u2715")
                )
              : React.createElement("div",{onClick:function(){if(t._credType==="objection"){updCred(t._credId,"objectionFiled",true)}else if(t._credType==="current"){togCpPaid(t._cpId)}else if(!t._credType){tog(t.id)}},style:{width:20,height:20,borderRadius:"50%",border:"2px solid "+(t.done?"#16a34a":"#d1d5db"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:t.done?"#16a34a":"transparent",fontSize:11,color:"#fff",fontWeight:700,marginTop:2}},t.done&&"\u2713"),
            React.createElement("div",{onClick:function(){if(t._credType==="current"){setModal("currentPayments")}else if(t._credType){setModal("creditors")}else{setSelTask(t);setModal("task")}},style:{cursor:"pointer"}},
              React.createElement("div",{style:{fontWeight:600,fontSize:13,textDecoration:t.done?"line-through":"none",marginBottom:2,color:tx}},t.title,isC&&React.createElement("span",{style:{...tg("#f3e8ff","#7c3aed"),marginLeft:4}},"свои")),
              React.createElement("div",{style:{fontSize:11,color:txm,lineHeight:1.5}},t.desc),
              React.createElement("div",null,
                t.law&&React.createElement("span",{style:tg("#eef2ff","#4f46e5")},t.law),
                t.priority==="high"&&React.createElement("span",{style:tg("#fef2f2","#dc2626")},"Важно"),
                isPlan&&t.outcome==="received"&&React.createElement("span",{style:tg("#dcfce7","#16a34a")},"\u2713 \u041f\u043b\u0430\u043d \u043f\u043e\u043b\u0443\u0447\u0435\u043d"),
                isPlan&&t.outcome==="not_received"&&React.createElement("span",{style:tg("#fee2e2","#dc2626")},"\u2715 \u041f\u043b\u0430\u043d \u041d\u0415 \u043f\u043e\u043b\u0443\u0447\u0435\u043d"),
                isN&&React.createElement("span",{style:tg("#f3e8ff","#7c3aed")},deb.meetingFormat==="remote"?"заочное, 30 дн.":"очное, 14 дн."),
                t.dl&&React.createElement("span",{style:tg("#f1f5f9","#64748b")},"\u043e\u0442 \xab"+(FU.KD_META.find(function(m){return m.id===t.dl.from})?.label?.slice(0,18))+"\xbb "+(t.dl.biz?t.dl.days+" раб.дн.":(isN?(deb.meetingFormat==="remote"?"-30":"-14"):(t.dl.days>=0?"+"+t.dl.days:t.dl.days))+"дн.")),
                !t.deadline&&t.dl&&React.createElement("span",{style:tg("#fffbeb","#d97706")},"\u26a0 Укажите дату"),
                t.links?.map(function(lk,i){return React.createElement("a",{key:i,href:lk.u,target:"_blank",rel:"noopener noreferrer",style:{...tg("#eef2ff",ac),textDecoration:"none"}},"\ud83d\udd17 "+lk.l)}),
                t.notes&&React.createElement("span",{style:tg("#eef2ff",ac)},"\ud83d\udcdd")
              )
            ),
            React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
              React.createElement("div",{style:{fontSize:12,fontWeight:700,color:FU.sCol(t)}},t.deadline?FU.fmtS(t.deadline):"\u2014"),
              React.createElement("div",{style:{fontSize:9,color:txm,marginTop:1}},FU.sLbl(t)),
              isC&&React.createElement("button",{onClick:function(e){e.stopPropagation();delCustomTask(t.id)},style:{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:9,marginTop:2}},"удалить")
            )
          )
        })
      ):
      // CALENDAR
      (function(){
        var cm=calMonth,y=cm.y,m=cm.m;
        var mN=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
        var dN=["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
        var first=new Date(y,m,1);var last=new Date(y,m+1,0);
        var startDow=(first.getDay()+6)%7;var dim=last.getDate();
        var cells=[];for(var i=0;i<startDow;i++)cells.push(null);for(var d=1;d<=dim;d++)cells.push(d);while(cells.length%7!==0)cells.push(null);
        var tbd={};allTasks.forEach(function(t){if(!t.deadline)return;var dd=new Date(t.deadline);if(dd.getFullYear()===y&&dd.getMonth()===m){var day=dd.getDate();if(!tbd[day])tbd[day]=[];tbd[day].push(t)}});
        var td=new Date();var today=(td.getFullYear()===y&&td.getMonth()===m)?td.getDate():null;
        return React.createElement("div",null,
          React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
              React.createElement("button",{onClick:function(){var nm=m-1,ny=y;if(nm<0){nm=11;ny--}setCalMonth({y:ny,m:nm})},style:{...btnS,padding:"4px 12px",fontSize:14}},"\u2039"),
              React.createElement("div",{style:{fontSize:15,fontWeight:700,minWidth:160,textAlign:"center"}},mN[m]+" "+y),
              React.createElement("button",{onClick:function(){var nm=m+1,ny=y;if(nm>11){nm=0;ny++}setCalMonth({y:ny,m:nm})},style:{...btnS,padding:"4px 12px",fontSize:14}},"\u203a")
            ),
            React.createElement("button",{onClick:function(){var n=new Date();setCalMonth({y:n.getFullYear(),m:n.getMonth()})},style:{...btnS,fontSize:11,padding:"4px 12px"}},"Сегодня")
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:2}},
            dN.map(function(dn,i){return React.createElement("div",{key:i,style:{textAlign:"center",fontSize:11,fontWeight:600,color:i>=5?"#dc262680":txm,padding:"4px 0"}},dn)})
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}},
            cells.map(function(day,i){
              if(day===null)return React.createElement("div",{key:"e"+i,style:{minHeight:72,background:"#fafafa",borderRadius:8}});
              var dt=tbd[day]||[];var isT=day===today;var isW=i%7>=5;var hasOv=dt.some(function(t){return!t.done&&FU.dleft(t.deadline)<0});
              return React.createElement("div",{key:"d"+day,style:{minHeight:72,background:isT?"#eef2ff":hasOv?"#fef2f2":"#fff",borderRadius:8,padding:"3px 4px",border:isT?"2px solid "+ac:"1px solid #f3f4f6"}},
                React.createElement("div",{style:{fontSize:11,fontWeight:isT?700:400,color:isT?ac:isW?"#dc262680":txm,marginBottom:2,textAlign:"right"}},day),
                dt.slice(0,3).map(function(t){var col=t.done?"#16a34a":FU.sCol(t);return React.createElement("div",{key:t.id,onClick:function(){setSelTask(t);setModal("task")},style:{fontSize:9,padding:"1px 4px",marginBottom:1,borderRadius:4,background:col+"15",borderLeft:"2px solid "+col,color:col,cursor:"pointer",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textDecoration:t.done?"line-through":"none"}},t.title.slice(0,18))}),
                dt.length>3&&React.createElement("div",{style:{fontSize:8,color:txm,textAlign:"center"}},"+"+( dt.length-3))
              )
            })
          ),
          React.createElement("div",{style:{display:"flex",gap:12,marginTop:10,fontSize:10,color:txm}},
            [["#dc2626","Просрочено"],["#d97706","Скоро"],["#64748b","В срок"],["#16a34a","Выполнено"]].map(function(x,i){return React.createElement("div",{key:i,style:{display:"flex",alignItems:"center",gap:4}},React.createElement("div",{style:{width:8,height:8,borderRadius:2,background:x[0]}}),x[1])})
          )
        )
      })()
    )
  };

  // OVERDUE TAB
  var overdueView=function(){
    var list=dashD.ov;
    return React.createElement(React.Fragment,null,
      React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:14}},"\u26a1 Просрочки ("+list.length+")"),
      list.length===0?React.createElement("div",{style:{textAlign:"center",padding:40,color:txm,fontSize:14}},"Нет просрочек!"):
      list.map(function(t){return React.createElement("div",{key:t.id,style:{background:"#fff",border:"1px solid #fecaca",borderRadius:12,padding:"12px 14px",marginBottom:6,display:"grid",gridTemplateColumns:"24px 1fr auto",gap:10,alignItems:"start"}},
        React.createElement("div",{onClick:function(){togX(t.did,t.id)},style:{width:20,height:20,borderRadius:"50%",border:"2px solid #d1d5db",cursor:"pointer",marginTop:2}}),
        React.createElement("div",{onClick:function(){setAid(t.did);setTab("home")},style:{cursor:"pointer"}},
          React.createElement("div",{style:{fontSize:11,fontWeight:600,color:"#dc2626",marginBottom:2}},t.dfio+(t.dcn?" \xb7 "+t.dcn:"")),
          React.createElement("div",{style:{fontSize:13,fontWeight:600}},t.title)
        ),
        React.createElement("div",{style:{textAlign:"right"}},
          React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"#dc2626"}},FU.fmtS(t.deadline)),
          React.createElement("div",{style:{fontSize:9,color:txm}},FU.sLbl(t))
        )
      )})
    )
  };

  // SETTINGS TAB
  var settingsView=function(){
    return React.createElement(React.Fragment,null,
      React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:16}},"\u2699\ufe0f Настройки"),
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        React.createElement("button",{onClick:exportData,style:{...btnS,width:"100%",textAlign:"left",padding:"14px 18px",borderRadius:14,fontSize:14}},"\u2193 Экспорт данных (JSON)"),
        React.createElement("button",{onClick:function(){fileRef.current?.click()},style:{...btnS,width:"100%",textAlign:"left",padding:"14px 18px",borderRadius:14,fontSize:14}},"\u2191 Импорт данных"),
        React.createElement("input",{ref:fileRef,type:"file",accept:".json",onChange:importData,style:{display:"none"}}),
        debtors.length>0&&React.createElement("button",{onClick:function(){FU.downloadReport(debtors)},style:{...btnP,width:"100%",textAlign:"left",padding:"14px 18px",borderRadius:14,fontSize:14}},"\ud83d\udccb Отчёт для руководителя")
      )
    )
  };

  // MAIN RENDER
  var currentView=function(){
    if(aid!==null)return detailView();
    if(tab==="overdue")return overdueView();
    if(tab==="settings")return settingsView();
    if(tab==="reports"){return React.createElement(React.Fragment,null,React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:16}},"\ud83d\udcca Отчёты"),debtors.length>0?React.createElement("button",{onClick:function(){FU.downloadReport(debtors)},style:{...btnP,fontSize:14,padding:"14px 20px",borderRadius:14}},"\ud83d\udccb Скачать отчёт для руководителя"):React.createElement("div",{style:{color:txm}},"Нет данных"))}
    return homeView();
  };

  return React.createElement("div",{style:{minHeight:"100vh",background:bg,fontFamily:"'Nunito',system-ui,sans-serif",color:tx}},
    // TOP BAR
    React.createElement("div",{style:{padding:"14px 20px",background:"#fff",borderBottom:"1px solid "+bd,display:"flex",alignItems:"center",justifyContent:"space-between"}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,cursor:"pointer"},onClick:function(){setAid(null);setTab("home")}},
        React.createElement("div",{style:{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,color:"#fff"}},"ФУ"),
        React.createElement("div",{style:{fontSize:16,fontWeight:800,letterSpacing:-0.5}},"Трекер ФУ")
      ),
      React.createElement("div",{style:{fontSize:11,color:txm,fontWeight:500}},"127-ФЗ \xb7 "+(deb?(FU.PROCEDURES.find(function(p){return p.id===(deb.procedure||"restructuring")})||FU.PROCEDURES[0]).label:"Управление процедурами"))
    ),

    // CONTENT
    React.createElement("div",{className:"main-wrap",style:{padding:"16px 20px",maxWidth:900,margin:"0 auto"}},currentView()),

    // BOTTOM NAV
    React.createElement("div",{className:"bottom-nav",style:{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid "+bd,display:"none",justifyContent:"space-around",padding:"8px 0",zIndex:200}},
      [["home","\ud83c\udfe0","Главная"],["cases","\ud83d\udcc1","Дела"],["overdue","\u26a1","Просрочки"],["reports","\ud83d\udcca","Отчёты"],["settings","\u2699\ufe0f","Настройки"]].map(function(x){return React.createElement("div",{key:x[0],onClick:function(){setTab(x[0]);setAid(null)},style:{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",color:tab===x[0]?ac:txm,fontSize:9,fontWeight:tab===x[0]?700:500}},
        React.createElement("span",{style:{fontSize:20,marginBottom:2}},x[1]),x[2]
      )})
    ),

    // SIDEBAR (desktop)
    // На десктопе навигация через верхнюю панель и клики по карточкам

    // MODALS
    modal&&React.createElement("div",{style:modalBg,onClick:function(){setModal(null)}},
      React.createElement("div",{className:"modal-box",style:modalBox,onClick:function(e){e.stopPropagation()}},

        // ADD DEBTOR
        modal==="add"&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:14}},"Новый должник"),
          React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"ФИО должника"),React.createElement("input",{style:inp,placeholder:"Фролов Илья Виссарионович",value:form.fio,onChange:function(e){setForm({...form,fio:e.target.value})},autoFocus:true})),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Номер дела"),React.createElement("input",{style:inp,placeholder:"А54-921/2025",value:form.caseNum,onChange:function(e){setForm({...form,caseNum:e.target.value})}})),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Дата введения"),React.createElement("input",{type:"date",style:inp,value:form.date,onChange:function(e){setForm({...form,date:e.target.value})}}))
          ),
          React.createElement("div",{style:{marginBottom:12}},
            React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:6}},"Тип процедуры"),
            React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},
              FU.PROCEDURES.map(function(p){
                return React.createElement("button",{key:p.id,onClick:function(){setForm({...form,procedure:p.id})},style:{flex:"1 1 30%",minWidth:100,padding:"8px",borderRadius:10,border:"2px solid "+(form.procedure===p.id?p.color:bd),background:form.procedure===p.id?p.color+"15":"#fff",color:form.procedure===p.id?p.color:tx,fontSize:12,fontWeight:form.procedure===p.id?700:400,cursor:"pointer",fontFamily:"inherit"}},p.short)
              })
            )
          ),
          React.createElement("div",{style:{marginBottom:12}},
            React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:6}},"Формат собрания"),
            React.createElement("div",{style:{display:"flex",gap:8}},
              [["inperson","Очное (14 дн.)"],["remote","Заочное (30 дн.)"]].map(function(x){return React.createElement("button",{key:x[0],onClick:function(){setForm({...form,meetingFormat:x[0]})},style:{flex:1,padding:"10px",borderRadius:10,border:"2px solid "+(form.meetingFormat===x[0]?ac:bd),background:form.meetingFormat===x[0]?"#eef2ff":"#fff",color:form.meetingFormat===x[0]?ac:tx,fontSize:13,fontWeight:form.meetingFormat===x[0]?700:400,cursor:"pointer",fontFamily:"inherit"}},x[1])})
            )
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",gap:8}},
            React.createElement("button",{onClick:function(){setModal(null)},style:btnS},"Отмена"),
            React.createElement("button",{onClick:addDeb,style:btnP},"Добавить")
          )
        ),

        // CUSTOM TASK
        modal==="custom"&&deb&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:14}},"Новая задача"),
          React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Название"),React.createElement("input",{style:inp,value:customForm.title,onChange:function(e){setCustomForm({...customForm,title:e.target.value})},autoFocus:true})),
          React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Описание"),React.createElement("textarea",{style:{...inp,resize:"vertical",minHeight:50},value:customForm.desc,onChange:function(e){setCustomForm({...customForm,desc:e.target.value})}})),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Срок"),React.createElement("input",{type:"date",style:inp,value:customForm.deadline,onChange:function(e){setCustomForm({...customForm,deadline:e.target.value})}})),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Норма закона"),React.createElement("input",{style:inp,value:customForm.law,onChange:function(e){setCustomForm({...customForm,law:e.target.value})}}))
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",gap:8}},React.createElement("button",{onClick:function(){setModal(null)},style:btnS},"Отмена"),React.createElement("button",{onClick:addCustomTask,style:btnP},"Добавить"))
        ),

        // DATES
        modal==="dates"&&deb&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:4}},"Ключевые даты"),
          React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:12}},"Изменение \u2192 автопересчёт дедлайнов"),
          React.createElement("div",{style:{marginBottom:14,padding:"12px",background:"#f9fafb",borderRadius:12}},
            React.createElement("div",{style:{fontSize:13,fontWeight:600,marginBottom:8}},"Формат собрания"),
            React.createElement("div",{style:{display:"flex",gap:8}},
              [["inperson","Очное (14 дн.)"],["remote","Заочное (30 дн.)"]].map(function(x){return React.createElement("button",{key:x[0],onClick:function(){changeMF(x[0])},style:{flex:1,padding:"8px",borderRadius:10,border:"2px solid "+(deb.meetingFormat===x[0]?ac:bd),background:deb.meetingFormat===x[0]?"#eef2ff":"#fff",color:deb.meetingFormat===x[0]?ac:tx,fontSize:12,fontWeight:deb.meetingFormat===x[0]?700:400,cursor:"pointer",fontFamily:"inherit"}},x[1])})
            )
          ),
          FU.KD_META.map(function(m){return React.createElement("div",{key:m.id,style:{marginBottom:8,padding:"10px 12px",background:deb.keyDates[m.id]?"#f0fdf4":"#f9fafb",borderRadius:10,border:"1px solid "+(deb.keyDates[m.id]?"#bbf7d0":bd)}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},React.createElement("div",{style:{fontSize:13,fontWeight:600}},m.label),deb.keyDates[m.id]&&React.createElement("span",{style:{fontSize:10,color:"#16a34a",fontWeight:600}},"\u2713 "+FU.fmt(deb.keyDates[m.id]))),
            React.createElement("div",{style:{fontSize:11,color:txm,marginBottom:4}},m.desc),
            React.createElement("input",{type:"date",value:deb.keyDates[m.id]||"",onChange:function(e){updateKD(m.id,e.target.value)},style:{...inp,width:170}})
          )}),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",marginTop:8}},React.createElement("button",{onClick:function(){setModal(null)},style:btnP},"Закрыть"))
        ),

        // JOURNAL
        modal==="journal"&&deb&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:4}},"Журнал событий"),
          React.createElement("div",{style:{display:"flex",gap:6,marginBottom:12}},
            React.createElement("input",{value:jt,onChange:function(e){setJt(e.target.value)},onKeyDown:function(e){if(e.key==="Enter")addJ()},placeholder:"Событие... (Enter)",style:{...inp,flex:1}}),
            React.createElement("button",{onClick:addJ,style:{...btnP,flexShrink:0}},"+")
          ),
          React.createElement("div",{style:{maxHeight:400,overflowY:"auto"}},[...(deb.journal||[])].reverse().map(function(e){return React.createElement("div",{key:e.id,style:{padding:"8px 12px",background:"#f9fafb",borderRadius:8,marginBottom:4,display:"flex",gap:8}},React.createElement("div",{style:{fontSize:11,color:txm,fontFamily:"monospace",flexShrink:0,minWidth:70}},FU.fmt(e.date)),React.createElement("div",{style:{fontSize:12,color:"#374151",lineHeight:1.5}},e.text))})),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",marginTop:8}},React.createElement("button",{onClick:function(){setModal(null)},style:btnP},"Закрыть"))
        ),

        // REQUESTS
        modal==="requests"&&deb&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
            React.createElement("div",{style:{fontSize:16,fontWeight:700}},"Реестр запросов"),
            React.createElement("button",{onClick:function(){setModal("addreq");setReqForm(function(f){return{...f,date:f.date||new Date().toISOString().split("T")[0]}})},style:{...btnP,fontSize:12}},"+  Запрос")
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:10}},
            [[reqStats.t,ac,"#eef2ff","Всего"],[reqStats.w,"#d97706","#fffbeb","Ожидают"],[reqStats.d,"#16a34a","#f0fdf4","Получено"],[reqStats.ov,"#dc2626","#fef2f2","Просроч."],[reqStats.ct,"#8b5cf6","#f5f3ff","Суд"]].map(function(x,i){return React.createElement("div",{key:i,style:{background:x[2],borderRadius:10,padding:"8px",textAlign:"center"}},React.createElement("div",{style:{fontSize:16,fontWeight:700,color:x[1]}},x[0]),React.createElement("div",{style:{fontSize:8,color:x[1],opacity:0.7}},x[3]))})
          ),
          React.createElement("div",{style:{display:"flex",gap:3,marginBottom:10}},
            [["all","Все"],["waiting","Ожидают"],["done","Получены"],["overdue","Просрочены"],["court","Суд"]].map(function(x){return React.createElement("button",{key:x[0],onClick:function(){setReqFilter(x[0])},style:{padding:"5px 12px",borderRadius:8,fontSize:11,border:"none",background:reqFilter===x[0]?ac:"#f3f4f6",color:reqFilter===x[0]?"#fff":txm,cursor:"pointer",fontFamily:"inherit",fontWeight:reqFilter===x[0]?600:400}},x[1])})
          ),
          React.createElement("div",{style:{maxHeight:350,overflowY:"auto"}},
            (function(){var rs=deb.requests||[];if(reqFilter==="waiting")rs=rs.filter(function(r){return r.status==="waiting"&&FU.dleft(r.deadline)>=0&&!r.court});else if(reqFilter==="done")rs=rs.filter(function(r){return r.status==="done"});else if(reqFilter==="overdue")rs=rs.filter(function(r){return r.status==="waiting"&&FU.dleft(r.deadline)<0&&!r.court});else if(reqFilter==="court")rs=rs.filter(function(r){return!!r.court});
            return rs.length===0?React.createElement("div",{style:{textAlign:"center",padding:20,color:txm,fontSize:12}},"Нет запросов"):rs.map(function(r){
              var isOv=r.status==="waiting"&&FU.dleft(r.deadline)<0&&!r.court;var isDone=r.status==="done";var att=r.attempts||[];var isCourt=!!r.court;
              var bCol=isDone?"#16a34a":isCourt?"#8b5cf6":isOv?"#dc2626":"#d97706";
              var statusBadge=isDone?["#f0fdf4","#16a34a","\u2713 Получен"]:isCourt?["#f5f3ff","#7c3aed","\u2696 "+(r.court.status==="granted"?"Исполнение":"На истребовании")]:isOv?["#fef2f2","#dc2626","\u2212"+Math.abs(FU.dleft(r.deadline))+" дн."]:["#fffbeb","#d97706","Ожидает "+FU.dleft(r.deadline)+" дн."];
              return React.createElement("div",{key:r.id,style:{background:"#fff",border:"1px solid "+bd,borderRadius:12,padding:"12px 14px",marginBottom:8,borderLeft:"3px solid "+bCol,borderRadius:0}},
                // HEADER
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}},
                  React.createElement("div",null,
                    React.createElement("div",{style:{fontSize:14,fontWeight:600}},r.organ),
                    React.createElement("div",{style:{fontSize:12,color:txm,marginTop:1}},r.desc)
                  ),
                  React.createElement("div",{style:{display:"flex",gap:4,alignItems:"center",flexShrink:0}},
                    att.length>1&&React.createElement("span",{style:{fontSize:10,padding:"2px 8px",borderRadius:8,background:"#f5f3ff",color:"#7c3aed",fontWeight:600}},att.length+" попыт."),
                    React.createElement("span",{style:{fontSize:10,padding:"3px 8px",borderRadius:8,fontWeight:600,background:statusBadge[0],color:statusBadge[1]}},statusBadge[2])
                  )
                ),
                // META
                React.createElement("div",{style:{display:"flex",gap:12,fontSize:11,color:txm,marginBottom:6,flexWrap:"wrap",alignItems:"center"}},
                  React.createElement("span",null,"Отправлен: "+FU.fmt(r.dateSent)),
                  r.method&&React.createElement("span",null,REQ_METHODS.find(function(m){return m.id===r.method})?.name||r.method),
                  React.createElement("span",null,"Срок: "+FU.fmt(r.deadline)),
                  r.trackNum&&React.createElement("a",{href:"https://www.pochta.ru/tracking#"+r.trackNum,target:"_blank",rel:"noopener noreferrer",style:{fontSize:11,padding:"2px 8px",borderRadius:8,background:"#eef2ff",color:ac,textDecoration:"none",fontWeight:600,display:"inline-flex",alignItems:"center",gap:3}},"\ud83d\udce6 "+r.trackNum)
                ),
                // TIMELINE
                att.length>0&&React.createElement("div",{style:{padding:"8px 10px",background:"#f9fafb",borderRadius:8,marginBottom:6}},
                  React.createElement("div",{style:{fontSize:10,fontWeight:600,color:txm,marginBottom:4}},"История"),
                  att.map(function(a,i){
                    var dotCol=a.type==="initial"?"#6366f1":a.type==="retry"?"#d97706":"#8b5cf6";
                    var label=a.type==="initial"?"Первичный запрос":a.type==="retry"?"Повторный запрос":"Ходатайство об истребовании (ст.66 АПК)";
                    return React.createElement("div",{key:i,style:{display:"flex",alignItems:"center",gap:8,padding:"3px 0",fontSize:11,color:"#374151"}},
                      React.createElement("div",{style:{width:8,height:8,borderRadius:"50%",background:dotCol,flexShrink:0}}),
                      React.createElement("span",{style:{color:txm,fontFamily:"monospace",fontSize:10,minWidth:70}},FU.fmt(a.date)),
                      React.createElement("span",null,label)
                    )
                  })
                ),
                // RESPONSE
                isDone&&r.response&&React.createElement("div",{style:{fontSize:12,padding:"8px 10px",background:"#f0fdf4",borderRadius:8,color:"#166534",marginBottom:6,lineHeight:1.5}},
                  (r.dateResponse?FU.fmt(r.dateResponse)+" — ":"")+r.response
                ),
                // COURT BOX
                r.court&&React.createElement("div",{style:{padding:"10px 12px",background:"#f5f3ff",borderRadius:8,marginBottom:6}},
                  React.createElement("div",{style:{fontWeight:600,color:"#7c3aed",marginBottom:6,fontSize:12}},"\u2696 Истребование через суд (ст.66 АПК)"),
                  React.createElement("div",{style:{display:"flex",gap:12,fontSize:11,color:txm,marginBottom:4,flexWrap:"wrap"}},
                    React.createElement("span",null,"Подано: "+FU.fmt(r.court.dateFiled)),
                    React.createElement("span",{style:{fontWeight:600,color:r.court.status==="granted"?"#16a34a":r.court.status==="denied"?"#dc2626":"#d97706"}},r.court.status==="granted"?"Удовлетворено":r.court.status==="denied"?"Отказано":"На рассмотрении")
                  ),
                  r.court.status==="filed"&&React.createElement("div",{style:{display:"flex",gap:4,marginTop:4}},
                    React.createElement("button",{onClick:function(){courtUpdate(r.id,"status","granted");var dl=prompt("Срок исполнения определения (ГГГГ-ММ-ДД):");if(dl)courtUpdate(r.id,"executionDeadline",dl)},style:{...btnS,fontSize:10,padding:"4px 10px",borderRadius:8,borderColor:"#bbf7d0",color:"#16a34a"}},"\u2713 Удовлетворено"),
                    React.createElement("button",{onClick:function(){courtUpdate(r.id,"status","denied")},style:{...btnS,fontSize:10,padding:"4px 10px",borderRadius:8,borderColor:"#fecaca",color:"#dc2626"}},"\u2715 Отказано")
                  ),
                  r.court.status==="granted"&&React.createElement(React.Fragment,null,
                    r.court.executionDeadline&&React.createElement("div",{style:{marginTop:4,fontSize:11,fontWeight:600,color:FU.dleft(r.court.executionDeadline)<0?"#dc2626":"#7c3aed"}},"Срок исполнения: "+FU.fmt(r.court.executionDeadline)+(FU.dleft(r.court.executionDeadline)<0?" (просрочен "+Math.abs(FU.dleft(r.court.executionDeadline))+" дн.)":"")),
                    React.createElement("div",{style:{display:"flex",gap:4,marginTop:6}},
                      React.createElement("button",{onClick:function(){var resp=prompt("Содержание полученных сведений:");if(resp!==null)markReqDone(r.id,resp)},style:{...btnS,fontSize:10,padding:"4px 10px",borderRadius:8,borderColor:"#bbf7d0",color:"#16a34a"}},"\u2713 Исполнено"),
                      FU.dleft(r.court.executionDeadline)<0&&React.createElement("button",{onClick:function(){var j={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Жалоба на неисполнение определения: "+r.organ};setDebtors(function(p){return p.map(function(d){return d.id!==aid?d:{...d,journal:[...d.journal,j]}})});alert("Запись о жалобе добавлена в журнал")},style:{...btnS,fontSize:10,padding:"4px 10px",borderRadius:8,borderColor:"#c4b5fd",color:"#7c3aed"}},"Жалоба на неисполнение")
                    )
                  )
                ),
                // ACTIONS
                !isDone&&!r.court&&React.createElement("div",{style:{display:"flex",gap:5,flexWrap:"wrap"}},
                  React.createElement("button",{onClick:function(){var resp=prompt("Содержание ответа:");if(resp!==null)markReqDone(r.id,resp)},style:{...btnS,fontSize:11,padding:"5px 12px",borderRadius:8,borderColor:"#bbf7d0",color:"#16a34a"}},"\u2713 Ответ получен"),
                  React.createElement("button",{onClick:function(){retryReq(r.id)},style:{...btnS,fontSize:11,padding:"5px 12px",borderRadius:8}},"\u21bb Повторный"),
                  isOv&&React.createElement("button",{onClick:function(){courtReq(r.id)},style:{...btnS,fontSize:11,padding:"5px 12px",borderRadius:8,borderColor:"#c4b5fd",color:"#7c3aed"}},"\u2696 Истребовать через суд"),
                  React.createElement("button",{onClick:function(){if(confirm("Удалить запрос?"))delReq(r.id)},style:{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:10,padding:"5px"}},"\u2715")
                ),
                !isDone&&r.court&&r.court.status!=="granted"&&React.createElement("div",{style:{display:"flex",gap:5,flexWrap:"wrap",marginTop:4}},
                  React.createElement("button",{onClick:function(){var resp=prompt("Содержание ответа:");if(resp!==null)markReqDone(r.id,resp)},style:{...btnS,fontSize:11,padding:"5px 12px",borderRadius:8,borderColor:"#bbf7d0",color:"#16a34a"}},"\u2713 Ответ получен"),
                  React.createElement("button",{onClick:function(){if(confirm("Удалить запрос?"))delReq(r.id)},style:{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:10,padding:"5px"}},"\u2715")
                )
              )})})()
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",marginTop:8}},React.createElement("button",{onClick:function(){setModal(null)},style:btnP},"Закрыть"))
        ),

        // ADD REQUEST
        modal==="addreq"&&deb&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:14}},"Новый запрос"),
          React.createElement("div",{style:{marginBottom:10}},
            React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Орган / получатель"),
            React.createElement("div",{style:{display:"flex",gap:3,marginBottom:8}},
              [["gov","Госорганы"],["bank","Банки"],["other","Другое"]].map(function(x){return React.createElement("button",{key:x[0],onClick:function(){setReqCat(x[0])},style:{padding:"5px 12px",borderRadius:8,fontSize:11,border:"none",background:reqCat===x[0]?ac:"#f3f4f6",color:reqCat===x[0]?"#fff":txm,cursor:"pointer",fontFamily:"inherit",fontWeight:reqCat===x[0]?600:400}},x[1])})
            ),
            React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap"}},REQ_ORGANS.filter(function(o){return o.cat===reqCat}).map(function(o){return React.createElement("button",{key:o.id,onClick:function(){setReqForm({...reqForm,organ:o.id,customOrgan:""})},style:{padding:"5px 10px",borderRadius:8,border:"2px solid "+(reqForm.organ===o.id?ac:bd),background:reqForm.organ===o.id?"#eef2ff":"#fff",color:reqForm.organ===o.id?ac:tx,fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:reqForm.organ===o.id?600:400}},o.name)})),
            (reqForm.organ==="other"||reqForm.organ==="bnk_other")&&React.createElement("input",{value:reqForm.customOrgan,onChange:function(e){setReqForm({...reqForm,customOrgan:e.target.value})},placeholder:reqForm.organ==="bnk_other"?"Название банка...":"Название органа...",style:{...inp,marginTop:6},autoFocus:true})
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Дата отправки"),React.createElement("input",{type:"date",value:reqForm.date,onChange:function(e){setReqForm({...reqForm,date:e.target.value})},style:inp})),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Способ"),React.createElement("select",{value:reqForm.method,onChange:function(e){setReqForm({...reqForm,method:e.target.value})},style:{...inp,appearance:"auto"}},React.createElement("option",{value:""},"..."),REQ_METHODS.map(function(m){return React.createElement("option",{key:m.id,value:m.id},m.name)})))
          ),
          React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Описание"),React.createElement("input",{value:reqForm.desc,onChange:function(e){setReqForm({...reqForm,desc:e.target.value})},style:inp})),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Трек-номер (Почта России)"),
              React.createElement("input",{value:reqForm.trackNum,onChange:function(e){setReqForm({...reqForm,trackNum:e.target.value})},placeholder:"80087654321",style:inp})
            ),
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Связать с задачей"),
              React.createElement("select",{value:reqForm.taskId,onChange:function(e){setReqForm({...reqForm,taskId:e.target.value})},style:{...inp,appearance:"auto"}},React.createElement("option",{value:""},"\u2014 не связывать \u2014"),deb.tasks.filter(function(t){return!t.done&&t.phase==="requests"}).map(function(t){return React.createElement("option",{key:t.id,value:t.id},t.title)}))
            )
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",gap:8}},React.createElement("button",{onClick:function(){setModal("requests")},style:btnS},"Назад"),React.createElement("button",{onClick:addReq,style:btnP},"Добавить"))
        ),

        // CREDITORS
        modal==="creditors"&&deb&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
            React.createElement("div",{style:{fontSize:16,fontWeight:700}},"Реестр требований"),
            React.createElement("button",{onClick:function(){setModal("addcred")},style:{...btnP,fontSize:12}},"+  Кредитор")
          ),
          // STATS
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:8}},
            [[credStats.t,ac,"#eef2ff","Всего"],[credStats.inc,"#16a34a","#f0fdf4","Включено"],[credStats.pen,"#d97706","#fffbeb","На рассм."],[credStats.objPending,"#dc2626","#fef2f2","Возраж."]].map(function(x,i){return React.createElement("div",{key:i,style:{background:x[2],borderRadius:10,padding:"8px",textAlign:"center"}},React.createElement("div",{style:{fontSize:18,fontWeight:700,color:x[1]}},x[0]),React.createElement("div",{style:{fontSize:9,color:x[1],opacity:0.7}},x[3]))})
          ),
          // QUEUE BREAKDOWN TABLE
          credStats.sum>0&&React.createElement("div",{style:{padding:"10px 12px",background:"#f9fafb",borderRadius:10,marginBottom:8,fontSize:12}},
            React.createElement("div",{style:{fontWeight:700,marginBottom:8,fontSize:13}},"Структура реестра требований"),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,marginBottom:4}},
              React.createElement("div",{style:{fontWeight:600,color:txm,fontSize:10}},"Очередь"),
              React.createElement("div",{style:{fontWeight:600,color:txm,fontSize:10,textAlign:"right"}},"Осн. долг"),
              React.createElement("div",{style:{fontWeight:600,color:txm,fontSize:10,textAlign:"right"}},"Пени"),
              React.createElement("div",{style:{fontWeight:600,color:txm,fontSize:10,textAlign:"right"}},"Итого")
            ),
            React.createElement("div",{style:{height:1,background:bd,marginBottom:6}}),
            [["1","#6366f1","1-я (вред жизни/здоровью)"],["2","#d97706","2-я (зарплата)"],["3","#374151","3-я (прочие)"]].map(function(q){
              var qd=credStats.byQueue[q[0]];
              if(!qd||qd.count===0)return null;
              return React.createElement("div",{key:q[0],style:{marginBottom:6}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:3}},
                  React.createElement("div",{style:{width:8,height:8,borderRadius:2,background:q[1]}}),
                  React.createElement("span",{style:{fontSize:10,fontWeight:600,color:q[1]}},q[2]),
                  React.createElement("span",{style:{fontSize:9,color:txm}},qd.count+" кред.")
                ),
                React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,paddingLeft:14}},
                  React.createElement("div",null),
                  React.createElement("div",{style:{fontSize:11,textAlign:"right"}},qd.principal>0?qd.principal.toLocaleString("ru-RU")+" \u20bd":"\u2014"),
                  React.createElement("div",{style:{fontSize:11,textAlign:"right",color:qd.penalty>0?"#d97706":txm}},qd.penalty>0?qd.penalty.toLocaleString("ru-RU")+" \u20bd":"\u2014"),
                  React.createElement("div",{style:{fontSize:11,fontWeight:600,textAlign:"right",color:q[1]}},qd.total.toLocaleString("ru-RU")+" \u20bd")
                )
              )
            }),
            React.createElement("div",{style:{height:1,background:bd,margin:"6px 0"}}),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4}},
              React.createElement("div",{style:{fontSize:11,fontWeight:700}},"Реестровые"),
              React.createElement("div",{style:{fontSize:11,fontWeight:600,textAlign:"right"}},credStats.sumPrincipal.toLocaleString("ru-RU")+" \u20bd"),
              React.createElement("div",{style:{fontSize:11,fontWeight:600,textAlign:"right",color:"#d97706"}},credStats.sumPenalty>0?credStats.sumPenalty.toLocaleString("ru-RU")+" \u20bd":"\u2014"),
              React.createElement("div",{style:{fontSize:12,fontWeight:700,textAlign:"right",color:ac}},credStats.sum.toLocaleString("ru-RU")+" \u20bd")
            ),
            credStats.sumBeyond>0&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4,marginTop:3}},
              React.createElement("div",{style:{fontSize:11,fontWeight:600,color:"#dc2626"}},"Заштат"),
              React.createElement("div",null),
              React.createElement("div",null),
              React.createElement("div",{style:{fontSize:11,fontWeight:700,textAlign:"right",color:"#dc2626"}},credStats.sumBeyond.toLocaleString("ru-RU")+" \u20bd")
            )
          ),
          // FILTER BY QUEUE
          React.createElement("div",{style:{display:"flex",gap:3,marginBottom:8,flexWrap:"wrap"}},
            [["all","Все"],["1","1-я"],["2","2-я"],["3","3-я"],["pending","На рассм."],["rejected","Отказано"]].map(function(x){
              var cs=deb.creditors||[];
              var cnt=x[0]==="all"?cs.length:x[0]==="pending"?cs.filter(function(c){return c.status==="pending"}).length:x[0]==="rejected"?cs.filter(function(c){return c.status==="rejected"}).length:cs.filter(function(c){return credQueues(c).indexOf(x[0])!==-1}).length;
              if(cnt===0&&x[0]!=="all")return null;
              return React.createElement("button",{key:x[0],onClick:function(){setCredFilter(x[0])},style:{padding:"4px 10px",borderRadius:8,fontSize:11,border:"none",background:credFilter===x[0]?ac:"#f3f4f6",color:credFilter===x[0]?"#fff":txm,cursor:"pointer",fontFamily:"inherit",fontWeight:credFilter===x[0]?600:400}},x[1]+(cnt>0?" ("+cnt+")":""))
            })
          ),
          // LIST
          React.createElement("div",{style:{maxHeight:320,overflowY:"auto"}},
            (function(){var cs2=deb.creditors||[];if(credFilter==="1"||credFilter==="2"||credFilter==="3")cs2=cs2.filter(function(c){return credQueues(c).indexOf(credFilter)!==-1});else if(credFilter==="pending")cs2=cs2.filter(function(c){return c.status==="pending"});else if(credFilter==="rejected")cs2=cs2.filter(function(c){return c.status==="rejected"});return cs2.length===0?React.createElement("div",{style:{textAlign:"center",padding:20,color:txm,fontSize:12}},"Нет кредиторов"):cs2.map(function(c){
              var bCol=c.status==="included"?"#16a34a":c.status==="rejected"?"#dc2626":"#d97706";
              var total=credTotal(c);
              var objOv=c.objectionDeadline&&FU.dleft(c.objectionDeadline)<0&&!c.objectionFiled;
              return React.createElement("div",{key:c.id,style:{background:"#fff",border:"1px solid "+bd,borderRadius:10,padding:"10px 12px",marginBottom:6,borderLeft:"3px solid "+bCol,cursor:"pointer"},onClick:function(){setEditCred({...c});setModal("editcred")}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},
                  React.createElement("div",null,
                    React.createElement("div",{style:{fontSize:13,fontWeight:600}},c.name),
                    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4,marginTop:2,flexWrap:"wrap"}},
                      credQueues(c).map(function(q){
                        return React.createElement("span",{key:q,style:{fontSize:10,padding:"1px 6px",borderRadius:5,fontWeight:600,background:q==="1"?"#eef2ff":q==="2"?"#fffbeb":"#f3f4f6",color:q==="1"?"#6366f1":q==="2"?"#d97706":"#374151"}},q+"-я очередь")
                      }),
                      c.secured&&React.createElement("span",{style:{fontSize:10,padding:"1px 6px",borderRadius:5,fontWeight:600,background:"#fef3c7",color:"#92400e"}},"Залог")
                    )
                  ),
                  React.createElement("div",{style:{textAlign:"right"}},
                    React.createElement("div",{style:{fontSize:9,padding:"2px 8px",borderRadius:6,fontWeight:600,background:bCol+"15",color:bCol,marginBottom:2}},c.status==="included"?"\u2713 Включено":c.status==="rejected"?"\u2715 Отказано":"На рассм."),
                    React.createElement("div",{style:{fontSize:12,fontWeight:700}},total>0?total.toLocaleString("ru-RU")+" \u20bd":"")
                  )
                ),
                // POSITIONS BREAKDOWN
                (function(){
                  var poss=getPositions(c);
                  if(poss.length===0)return null;
                  if(poss.length===1){
                    var p=poss[0];
                    return React.createElement("div",{style:{display:"flex",gap:8,fontSize:10,color:txm,marginBottom:4}},
                      React.createElement("span",null,posTypeLbl(p.type)+": "+(parseFloat(p.amount)||0).toLocaleString("ru-RU")+" \u20bd"+(p.beyondRegistry?" (заштат)":""))
                    )
                  }
                  return React.createElement("div",{style:{marginBottom:4,padding:"4px 8px",background:"#f9fafb",borderRadius:6}},
                    poss.map(function(p,idx){
                      return React.createElement("div",{key:p.id||idx,style:{display:"flex",justifyContent:"space-between",fontSize:10,color:txm,padding:"1px 0"}},
                        React.createElement("span",null,
                          React.createElement("span",{style:{display:"inline-block",width:6,height:6,borderRadius:3,background:posTypeCol(p.type),marginRight:5,verticalAlign:"middle"}}),
                          posTypeLbl(p.type),
                          " · ",p.queue+"-я оч.",
                          p.beyondRegistry?React.createElement("span",{style:{color:"#dc2626",marginLeft:4}},"заштат"):null
                        ),
                        React.createElement("span",{style:{fontWeight:600,color:tx}},(parseFloat(p.amount)||0).toLocaleString("ru-RU")+" \u20bd")
                      )
                    })
                  )
                })(),
                React.createElement("div",{style:{display:"flex",gap:10,fontSize:10,color:txm,marginBottom:4,flexWrap:"wrap"}},
                  c.dateFiled&&React.createElement("span",null,"Подано: "+FU.fmt(c.dateFiled)),
                  c.courtDate&&React.createElement("span",null,"Суд: "+FU.fmt(c.courtDate)),
                  c.efrsb&&React.createElement("span",{style:{color:"#16a34a"}},"\u2713 ЕФРСБ")
                ),
                // OBJECTION
                c.objectionDeadline&&React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 8px",background:objOv?"#fef2f2":c.objectionFiled?"#f0fdf4":"#fffbeb",borderRadius:6,fontSize:10}},
                  React.createElement("span",{style:{color:objOv?"#dc2626":c.objectionFiled?"#16a34a":"#d97706"}},"\u2696 Возражения: до "+FU.fmt(c.objectionDeadline)+(objOv?" (просрочен "+Math.abs(FU.dleft(c.objectionDeadline))+" дн.)":"")),
                  React.createElement("span",{style:{fontSize:10,fontWeight:600,color:c.objectionFiled?"#16a34a":"#d97706"}},c.objectionFiled?"\u2713 Поданы":"\u2212 Не поданы")
                ),
                React.createElement("div",{style:{display:"flex",gap:4,marginTop:6},onClick:function(e){e.stopPropagation()}},
                  c.status==="pending"&&React.createElement("button",{onClick:function(){markCredStatus(c.id,"included")},style:{...btnS,fontSize:10,padding:"3px 8px",borderRadius:6,borderColor:"#bbf7d0",color:"#16a34a"}},"\u2713 Включить"),
                  c.status==="pending"&&React.createElement("button",{onClick:function(){markCredStatus(c.id,"rejected")},style:{...btnS,fontSize:10,padding:"3px 8px",borderRadius:6,borderColor:"#fecaca",color:"#dc2626"}},"\u2715 Отказать"),
                  !c.efrsb&&React.createElement("button",{onClick:function(){markEfrsb(c.id)},style:{...btnS,fontSize:10,padding:"3px 8px",borderRadius:6}},"ЕФРСБ"),
                  c.objectionDeadline&&!c.objectionFiled&&React.createElement("button",{onClick:function(){updCred(c.id,"objectionFiled",true)},style:{...btnS,fontSize:10,padding:"3px 8px",borderRadius:6,borderColor:"#c4b5fd",color:"#7c3aed"}},"\u2713 Возражения поданы")
                )
              )
            })})()
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",marginTop:8}},React.createElement("button",{onClick:function(){setModal(null)},style:btnP},"Закрыть"))
        ),

        // EDIT CREDITOR
        modal==="editcred"&&editCred&&(function(){
          // Initialize positions if missing
          if(!editCred.positions||editCred.positions.length===0){
            var initPos=getPositions(editCred);
            if(initPos.length===0)initPos=[{id:FU.uid(),type:"principal",amount:0,queue:editCred.queue||"3",beyondRegistry:false}];
            else initPos=initPos.map(function(p){return{...p,id:p.id&&p.id.indexOf("_l")!==0?p.id:FU.uid()}});
            // Defer to avoid render loop
            setTimeout(function(){setEditCred(function(prev){return prev?{...prev,positions:initPos}:prev})},0);
          }
          var poss=editCred.positions||[];
          var totalSum=poss.reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0);
          var updPos=function(idx,field,val){var np=poss.map(function(p,i){return i===idx?{...p,[field]:val}:p});setEditCred({...editCred,positions:np})};
          var addPos=function(){setEditCred({...editCred,positions:[...poss,{id:FU.uid(),type:"principal",amount:0,queue:editCred.queue||"3",beyondRegistry:false}]})};
          var rmPos=function(idx){if(poss.length<=1)return;setEditCred({...editCred,positions:poss.filter(function(_,i){return i!==idx})})};
          return React.createElement(React.Fragment,null,
            React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:14}},"Редактировать кредитора"),
            React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Кредитор"),React.createElement("input",{style:inp,value:editCred.name,onChange:function(e){setEditCred({...editCred,name:e.target.value})}})),
            // POSITIONS EDITOR
            React.createElement("div",{style:{marginBottom:10}},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},
                React.createElement("div",{style:{fontSize:12,fontWeight:600}},"Состав требования"),
                React.createElement("button",{onClick:addPos,style:{...btnS,fontSize:11,padding:"2px 8px"}},"+ Позиция")
              ),
              poss.map(function(p,idx){
                return React.createElement("div",{key:p.id||idx,style:{display:"grid",gridTemplateColumns:"1fr 1fr 90px 80px 24px",gap:4,marginBottom:4,padding:6,background:"#f9fafb",borderRadius:8,alignItems:"center"}},
                  React.createElement("select",{style:{...inp,appearance:"auto",fontSize:11,padding:"4px 6px"},value:p.type,onChange:function(e){updPos(idx,"type",e.target.value)}},
                    POS_TYPES.map(function(t){return React.createElement("option",{key:t.id,value:t.id},t.label)})
                  ),
                  React.createElement("input",{style:{...inp,fontSize:11,padding:"4px 6px"},type:"number",placeholder:"Сумма",value:p.amount||"",onChange:function(e){updPos(idx,"amount",e.target.value)}}),
                  React.createElement("select",{style:{...inp,appearance:"auto",fontSize:11,padding:"4px 6px"},value:p.queue||"3",onChange:function(e){updPos(idx,"queue",e.target.value)}},
                    React.createElement("option",{value:"1"},"1 оч."),
                    React.createElement("option",{value:"2"},"2 оч."),
                    React.createElement("option",{value:"3"},"3 оч.")
                  ),
                  React.createElement("label",{style:{fontSize:10,display:"flex",alignItems:"center",gap:3,cursor:"pointer"}},
                    React.createElement("input",{type:"checkbox",checked:p.beyondRegistry||false,onChange:function(e){updPos(idx,"beyondRegistry",e.target.checked)},style:{width:13,height:13}}),
                    "заштат"
                  ),
                  poss.length>1?React.createElement("button",{onClick:function(){rmPos(idx)},style:{background:"transparent",border:"none",cursor:"pointer",color:"#dc2626",fontSize:14,padding:0}},"\u00D7"):React.createElement("div",null)
                )
              }),
              totalSum>0&&React.createElement("div",{style:{textAlign:"right",fontSize:12,fontWeight:700,color:ac,marginTop:6}},"Итого: "+totalSum.toLocaleString("ru-RU")+" \u20bd")
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
              React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Дата подачи"),React.createElement("input",{type:"date",style:inp,value:editCred.dateFiled||"",onChange:function(e){setEditCred({...editCred,dateFiled:e.target.value})}})),
              React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Дата заседания"),React.createElement("input",{type:"date",style:inp,value:editCred.courtDate||"",onChange:function(e){setEditCred({...editCred,courtDate:e.target.value})}}))
            ),
            React.createElement("div",{style:{marginBottom:10}},
              React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Срок возражений"),React.createElement("input",{type:"date",style:inp,value:editCred.objectionDeadline||"",onChange:function(e){setEditCred({...editCred,objectionDeadline:e.target.value})}})
            ),
            React.createElement("div",{style:{display:"flex",gap:8,marginBottom:10,alignItems:"center"}},
              React.createElement("input",{type:"checkbox",id:"objFiled",checked:editCred.objectionFiled||false,onChange:function(e){setEditCred({...editCred,objectionFiled:e.target.checked})},style:{width:16,height:16}}),
              React.createElement("label",{htmlFor:"objFiled",style:{fontSize:13,cursor:"pointer"}},"Возражения поданы"),
              React.createElement("input",{type:"checkbox",id:"secured",checked:editCred.secured||false,onChange:function(e){setEditCred({...editCred,secured:e.target.checked})},style:{width:16,height:16,marginLeft:12}}),
              React.createElement("label",{htmlFor:"secured",style:{fontSize:13,cursor:"pointer"}},"Залог")
            ),
            React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",gap:8}},
              React.createElement("button",{onClick:function(){setEditCred(null);setModal("creditors")},style:btnS},"Отмена"),
              React.createElement("button",{onClick:saveCred,style:btnP},"Сохранить")
            )
          )
        })(),

        // ADD CREDITOR
        modal==="addcred"&&deb&&(function(){
          var poss=credForm.positions&&credForm.positions.length>0?credForm.positions:[{id:"_new1",type:"principal",amount:"",queue:credForm.queue||"3",beyondRegistry:false}];
          var totalSum=poss.reduce(function(s,p){return s+(parseFloat(p.amount)||0)},0);
          var updPos=function(idx,field,val){var np=poss.map(function(p,i){return i===idx?{...p,[field]:val}:p});setCredForm({...credForm,positions:np})};
          var addPos=function(){setCredForm({...credForm,positions:[...poss,{id:FU.uid(),type:"principal",amount:"",queue:credForm.queue||"3",beyondRegistry:false}]})};
          var rmPos=function(idx){if(poss.length<=1)return;setCredForm({...credForm,positions:poss.filter(function(_,i){return i!==idx})})};
          return React.createElement(React.Fragment,null,
            React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:14}},"Новый кредитор"),
            React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Кредитор"),React.createElement("input",{style:inp,value:credForm.name,onChange:function(e){setCredForm({...credForm,name:e.target.value})},autoFocus:true})),
            // POSITIONS EDITOR
            React.createElement("div",{style:{marginBottom:10}},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}},
                React.createElement("div",{style:{fontSize:12,fontWeight:600}},"Состав требования"),
                React.createElement("button",{onClick:addPos,style:{...btnS,fontSize:11,padding:"2px 8px"}},"+ Позиция")
              ),
              poss.map(function(p,idx){
                return React.createElement("div",{key:p.id||idx,style:{display:"grid",gridTemplateColumns:"1fr 1fr 90px 80px 24px",gap:4,marginBottom:4,padding:6,background:"#f9fafb",borderRadius:8,alignItems:"center"}},
                  React.createElement("select",{style:{...inp,appearance:"auto",fontSize:11,padding:"4px 6px"},value:p.type,onChange:function(e){updPos(idx,"type",e.target.value)}},
                    POS_TYPES.map(function(t){return React.createElement("option",{key:t.id,value:t.id},t.label)})
                  ),
                  React.createElement("input",{style:{...inp,fontSize:11,padding:"4px 6px"},type:"number",placeholder:"Сумма",value:p.amount||"",onChange:function(e){updPos(idx,"amount",e.target.value)}}),
                  React.createElement("select",{style:{...inp,appearance:"auto",fontSize:11,padding:"4px 6px"},value:p.queue||"3",onChange:function(e){updPos(idx,"queue",e.target.value)}},
                    React.createElement("option",{value:"1"},"1 оч."),
                    React.createElement("option",{value:"2"},"2 оч."),
                    React.createElement("option",{value:"3"},"3 оч.")
                  ),
                  React.createElement("label",{style:{fontSize:10,display:"flex",alignItems:"center",gap:3,cursor:"pointer"}},
                    React.createElement("input",{type:"checkbox",checked:p.beyondRegistry||false,onChange:function(e){updPos(idx,"beyondRegistry",e.target.checked)},style:{width:13,height:13}}),
                    "заштат"
                  ),
                  poss.length>1?React.createElement("button",{onClick:function(){rmPos(idx)},style:{background:"transparent",border:"none",cursor:"pointer",color:"#dc2626",fontSize:14,padding:0}},"\u00D7"):React.createElement("div",null)
                )
              }),
              totalSum>0&&React.createElement("div",{style:{textAlign:"right",fontSize:12,fontWeight:700,color:ac,marginTop:6}},"Итого: "+totalSum.toLocaleString("ru-RU")+" \u20bd")
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
              React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Дата подачи"),React.createElement("input",{type:"date",style:inp,value:credForm.dateFiled,onChange:function(e){setCredForm({...credForm,dateFiled:e.target.value})}})),
              React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Дата заседания"),React.createElement("input",{type:"date",style:inp,value:credForm.courtDate,onChange:function(e){setCredForm({...credForm,courtDate:e.target.value})}}))
            ),
            React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Срок возражений"),React.createElement("input",{type:"date",style:inp,value:credForm.objectionDeadline,onChange:function(e){setCredForm({...credForm,objectionDeadline:e.target.value})}})),
            React.createElement("div",{style:{display:"flex",gap:8,marginBottom:10,alignItems:"center"}},
              React.createElement("input",{type:"checkbox",id:"newObjFiled",checked:credForm.objectionFiled,onChange:function(e){setCredForm({...credForm,objectionFiled:e.target.checked})},style:{width:16,height:16}}),
              React.createElement("label",{htmlFor:"newObjFiled",style:{fontSize:13,cursor:"pointer"}},"Возражения уже поданы"),
              React.createElement("input",{type:"checkbox",id:"newSecured",checked:credForm.secured,onChange:function(e){setCredForm({...credForm,secured:e.target.checked})},style:{width:16,height:16,marginLeft:12}}),
              React.createElement("label",{htmlFor:"newSecured",style:{fontSize:13,cursor:"pointer"}},"Залог")
            ),
            React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",gap:8}},React.createElement("button",{onClick:function(){setModal("creditors")},style:btnS},"Назад"),React.createElement("button",{onClick:addCred,style:btnP},"Добавить"))
          )
        })(),

        // CURRENT PAYMENTS (ст. 5, 134)
        modal==="currentPayments"&&deb&&(function(){
          var cps=deb.currentPayments||[];
          var totalUnpaid=cps.filter(c=>!c.paid).reduce((s,c)=>s+(parseFloat(c.amount)||0),0);
          var totalPaid=cps.filter(c=>c.paid).reduce((s,c)=>s+(parseFloat(c.amount)||0),0);
          var byQ={};FU.CURRENT_QUEUES.forEach(q=>{byQ[q.id]={count:0,unpaid:0,paid:0}});
          cps.forEach(c=>{var q=c.queue||"4";if(!byQ[q])byQ[q]={count:0,unpaid:0,paid:0};byQ[q].count++;if(c.paid)byQ[q].paid+=parseFloat(c.amount)||0;else byQ[q].unpaid+=parseFloat(c.amount)||0});
          return React.createElement(React.Fragment,null,
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:16,fontWeight:700}},"Текущие платежи"),
                React.createElement("div",{style:{fontSize:10,color:txm}},"ст. 5, 134 \xb7 удовлетворяются вне очереди")
              ),
              React.createElement("button",{onClick:function(){setModal("addCp")},style:{...btnP,fontSize:12}},"+  Платёж")
            ),
            // Stats
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}},
              React.createElement("div",{style:{background:"#fef2f2",borderRadius:10,padding:8,textAlign:"center"}},
                React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"#dc2626"}},totalUnpaid.toLocaleString("ru-RU")+" \u20bd"),
                React.createElement("div",{style:{fontSize:9,color:"#dc2626",opacity:0.7}},"К оплате")
              ),
              React.createElement("div",{style:{background:"#f0fdf4",borderRadius:10,padding:8,textAlign:"center"}},
                React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"#16a34a"}},totalPaid.toLocaleString("ru-RU")+" \u20bd"),
                React.createElement("div",{style:{fontSize:9,color:"#16a34a",opacity:0.7}},"Оплачено")
              ),
              React.createElement("div",{style:{background:"#eef2ff",borderRadius:10,padding:8,textAlign:"center"}},
                React.createElement("div",{style:{fontSize:14,fontWeight:700,color:ac}},cps.length),
                React.createElement("div",{style:{fontSize:9,color:ac,opacity:0.7}},"Всего")
              )
            ),
            // By queue
            cps.length>0&&React.createElement("div",{style:{padding:"8px 12px",background:"#f9fafb",borderRadius:10,marginBottom:8,fontSize:11}},
              React.createElement("div",{style:{fontWeight:700,marginBottom:6,fontSize:12}},"По очерёдности (ст. 134 п. 2)"),
              FU.CURRENT_QUEUES.map(function(q){
                var d=byQ[q.id];if(!d||d.count===0)return null;
                return React.createElement("div",{key:q.id,style:{display:"flex",alignItems:"center",gap:6,marginBottom:3,fontSize:10}},
                  React.createElement("div",{style:{width:8,height:8,borderRadius:2,background:q.color}}),
                  React.createElement("span",{style:{flex:1,color:q.color,fontWeight:600}},q.label),
                  d.unpaid>0&&React.createElement("span",{style:{color:"#dc2626"}},"−"+d.unpaid.toLocaleString("ru-RU")+" ₽"),
                  d.paid>0&&React.createElement("span",{style:{color:"#16a34a",marginLeft:6}},"✓"+d.paid.toLocaleString("ru-RU")+" ₽")
                )
              })
            ),
            // List
            React.createElement("div",{style:{maxHeight:340,overflowY:"auto"}},
              cps.length===0?React.createElement("div",{style:{textAlign:"center",padding:20,color:txm,fontSize:12}},"Нет текущих платежей"):
              cps.slice().sort((a,b)=>(a.paid?1:0)-(b.paid?1:0)||(a.dueDate||"").localeCompare(b.dueDate||"")).map(function(c){
                var qInfo=FU.CURRENT_QUEUES.find(q=>q.id===c.queue)||FU.CURRENT_QUEUES[3];
                var ov=c.dueDate&&!c.paid&&FU.dleft(c.dueDate)<0;
                return React.createElement("div",{key:c.id,style:{padding:10,marginBottom:6,background:c.paid?"#f0fdf4":ov?"#fef2f2":"#fff",borderLeft:"3px solid "+(c.paid?"#16a34a":qInfo.color),borderRadius:8,border:"1px solid "+bd,cursor:"pointer"},onClick:function(){setEditCp({...c});setModal("editCp")}},
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
                    React.createElement("div",{style:{flex:1}},
                      React.createElement("div",{style:{fontSize:13,fontWeight:600}},c.description),
                      c.creditor&&React.createElement("div",{style:{fontSize:10,color:txm}},c.creditor)
                    ),
                    React.createElement("div",{style:{fontSize:13,fontWeight:700,textAlign:"right",color:c.paid?"#16a34a":qInfo.color}},(parseFloat(c.amount)||0).toLocaleString("ru-RU")+" \u20bd")
                  ),
                  React.createElement("div",{style:{display:"flex",gap:6,fontSize:10,color:txm,flexWrap:"wrap"}},
                    React.createElement("span",{style:{padding:"1px 6px",borderRadius:4,background:qInfo.color+"15",color:qInfo.color,fontWeight:600}},c.queue+" оч."),
                    c.dueDate&&React.createElement("span",{style:{color:ov?"#dc2626":txm}},"Срок: "+FU.fmt(c.dueDate)+(ov?" (просрочен)":"")),
                    c.paid&&c.paidDate&&React.createElement("span",{style:{color:"#16a34a"}},"\u2713 Оплачен "+FU.fmt(c.paidDate))
                  ),
                  React.createElement("div",{style:{display:"flex",gap:4,marginTop:6},onClick:function(e){e.stopPropagation()}},
                    React.createElement("button",{onClick:function(){togCpPaid(c.id)},style:{...btnS,fontSize:10,padding:"3px 8px",borderRadius:6,borderColor:c.paid?"#fde68a":"#bbf7d0",color:c.paid?"#d97706":"#16a34a"}},c.paid?"\u21a9 Не оплачен":"\u2713 Оплачен"),
                    React.createElement("button",{onClick:function(){delCp(c.id)},style:{...btnS,fontSize:10,padding:"3px 8px",borderRadius:6,borderColor:"#fecaca",color:"#dc2626"}},"\u2715")
                  )
                )
              })
            ),
            React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",marginTop:8}},React.createElement("button",{onClick:function(){setModal(null)},style:btnP},"Закрыть"))
          )
        })(),

        // ADD CURRENT PAYMENT
        modal==="addCp"&&deb&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:14}},"Новый текущий платёж"),
          React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Описание"),React.createElement("input",{style:inp,placeholder:"Коммунальные платежи, госпошлина...",value:cpForm.description,onChange:function(e){setCpForm({...cpForm,description:e.target.value})},autoFocus:true})),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Получатель"),React.createElement("input",{style:inp,placeholder:"УК, ФНС...",value:cpForm.creditor,onChange:function(e){setCpForm({...cpForm,creditor:e.target.value})}})),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Сумма (\u20bd)"),React.createElement("input",{style:inp,type:"number",value:cpForm.amount,onChange:function(e){setCpForm({...cpForm,amount:e.target.value})}}))
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Очередь"),React.createElement("select",{style:{...inp,appearance:"auto"},value:cpForm.queue,onChange:function(e){setCpForm({...cpForm,queue:e.target.value})}},FU.CURRENT_QUEUES.map(q=>React.createElement("option",{key:q.id,value:q.id},q.id+" — "+q.label.split("(")[1].replace(")",""))))),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Срок оплаты"),React.createElement("input",{type:"date",style:inp,value:cpForm.dueDate,onChange:function(e){setCpForm({...cpForm,dueDate:e.target.value})}}))
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",gap:8}},
            React.createElement("button",{onClick:function(){setModal("currentPayments")},style:btnS},"Назад"),
            React.createElement("button",{onClick:addCp,style:btnP},"Добавить")
          )
        ),

        // EDIT CURRENT PAYMENT
        modal==="editCp"&&editCp&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:14}},"Редактировать платёж"),
          React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Описание"),React.createElement("input",{style:inp,value:editCp.description,onChange:function(e){setEditCp({...editCp,description:e.target.value})}})),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Получатель"),React.createElement("input",{style:inp,value:editCp.creditor||"",onChange:function(e){setEditCp({...editCp,creditor:e.target.value})}})),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Сумма (\u20bd)"),React.createElement("input",{style:inp,type:"number",value:editCp.amount||"",onChange:function(e){setEditCp({...editCp,amount:e.target.value})}}))
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Очередь"),React.createElement("select",{style:{...inp,appearance:"auto"},value:editCp.queue,onChange:function(e){setEditCp({...editCp,queue:e.target.value})}},FU.CURRENT_QUEUES.map(q=>React.createElement("option",{key:q.id,value:q.id},q.id+" — "+q.label.split("(")[1].replace(")",""))))),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Срок оплаты"),React.createElement("input",{type:"date",style:inp,value:editCp.dueDate||"",onChange:function(e){setEditCp({...editCp,dueDate:e.target.value})}}))
          ),
          editCp.paid&&React.createElement("div",{style:{marginBottom:10}},
            React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Дата оплаты"),
            React.createElement("input",{type:"date",style:inp,value:editCp.paidDate||"",onChange:function(e){setEditCp({...editCp,paidDate:e.target.value})}})
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",gap:8}},
            React.createElement("button",{onClick:function(){setEditCp(null);setModal("currentPayments")},style:btnS},"Отмена"),
            React.createElement("button",{onClick:saveCp,style:btnP},"Сохранить")
          )
        ),

        // SWITCH PROCEDURE
        modal==="switchProc"&&deb&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:14}},"Сменить процедуру"),
          React.createElement("div",{style:{padding:10,background:"#fffbeb",borderRadius:10,marginBottom:14,fontSize:12,color:"#92400e"}},
            "Текущая процедура: ",
            React.createElement("strong",null,(FU.PROCEDURES.find(p=>p.id===(deb.procedure||"restructuring"))||{}).label),
            React.createElement("div",{style:{marginTop:6,fontSize:11}},"При смене: выполненные задачи сохранятся, появятся новые задачи и сроки от текущей даты. Кредиторы и текущие платежи останутся.")
          ),
          React.createElement("div",{style:{display:"grid",gap:8,marginBottom:14}},
            FU.PROCEDURES.filter(p=>p.id!==(deb.procedure||"restructuring")).map(function(p){
              return React.createElement("button",{key:p.id,onClick:function(){doSwitchProc(p.id)},style:{padding:"12px 14px",borderRadius:10,border:"2px solid "+p.color+"40",background:p.color+"08",color:p.color,fontFamily:"inherit",cursor:"pointer",textAlign:"left"}},
                React.createElement("div",{style:{fontSize:14,fontWeight:700}},"\u2192 "+p.label),
                React.createElement("div",{style:{fontSize:11,opacity:0.8,marginTop:2}},p.law)
              )
            })
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end"}},
            React.createElement("button",{onClick:function(){setModal(null)},style:btnS},"Отмена")
          )
        ),


        // TASK DETAIL
        modal==="task"&&selTask&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:10}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:4}},selTask.title),
              React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap"}},
                selTask.law&&React.createElement("span",{style:tg("#eef2ff","#4f46e5")},selTask.law),
                React.createElement("span",{style:tg(FU.sCol(selTask)+"15",FU.sCol(selTask))},FU.sLbl(selTask))
              )
            ),
            React.createElement("button",{onClick:function(){setModal(null)},style:{background:"#f3f4f6",border:"none",borderRadius:8,cursor:"pointer",padding:"4px 10px",fontSize:11}},"\u2715")
          ),
          React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Описание"),React.createElement("div",{style:{fontSize:13,color:"#374151",lineHeight:1.6,padding:"10px 12px",background:"#f9fafb",borderRadius:10}},selTask.desc)),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Дедлайн"),React.createElement("input",{type:"date",value:selTask.deadline||"",onChange:function(e){var v=e.target.value;setSelTask({...selTask,deadline:v});updT(selTask.id,"deadline",v)},style:inp})),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Статус"),React.createElement("div",{style:{...inp,color:FU.sCol(selTask),fontWeight:600}},FU.sLbl(selTask)))
          ),
          React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Заметки"),React.createElement("textarea",{value:selTask.notes,onChange:function(e){var v=e.target.value;setSelTask({...selTask,notes:v});updT(selTask.id,"notes",v)},placeholder:"Номера документов, контакты...",style:{...inp,resize:"vertical",minHeight:50}})),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",gap:8}},
            React.createElement("button",{onClick:function(){tog(selTask.id);setSelTask({...selTask,done:!selTask.done,doneDate:!selTask.done?new Date().toISOString().split("T")[0]:null})},style:selTask.done?btnS:{...btnP,background:"#16a34a"}},selTask.done?"\u21a9 Вернуть":"\u2713 Выполнена")
          )
        )
      )
    )
  );
}

ReactDOM.render(React.createElement(App), document.getElementById("root"));
