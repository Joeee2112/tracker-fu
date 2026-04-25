var useState=React.useState,useEffect=React.useEffect,useMemo=React.useMemo,useRef=React.useRef;
function App(){
  var[debtors,setDebtors]=useState([]);
  var[aid,setAid]=useState(null);
  var[ph,setPh]=useState("all");
  var[modal,setModal]=useState(null);
  var[selTask,setSelTask]=useState(null);
  var[q,setQ]=useState("");
  var[form,setForm]=useState({fio:"",caseNum:"",date:"",notes:"",meetingFormat:"inperson"});
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
  var fileRef=useRef(null);

  var skipNext=useRef(false);
  useEffect(()=>{
    if(FU.cloudReady){
      FU.loadFromCloud().then(function(cd){
        if(cd&&cd.length){setDebtors(cd);setAid(cd[0].id)}
        else{try{var s=JSON.parse(localStorage.getItem(FU.STORAGE_KEY));if(s&&s.d&&s.d.length){setDebtors(s.d);if(s.a)setAid(s.a);skipNext.current=true;FU.saveToCloud(s.d)}else if(FU.SEED_DATA&&FU.SEED_DATA.d){setDebtors(FU.SEED_DATA.d);if(FU.SEED_DATA.a)setAid(FU.SEED_DATA.a);skipNext.current=true;FU.saveToCloud(FU.SEED_DATA.d)}}catch(e){}}
      });
      FU.listenCloud(function(data){if(skipNext.current){skipNext.current=false;return}if(data&&data.length)setDebtors(data)});
    }else{
      try{var s=JSON.parse(localStorage.getItem(FU.STORAGE_KEY));if(s&&s.d&&s.d.length){setDebtors(s.d);if(s.a)setAid(s.a)}else if(FU.SEED_DATA&&FU.SEED_DATA.d){setDebtors(FU.SEED_DATA.d);if(FU.SEED_DATA.a)setAid(FU.SEED_DATA.a)}}catch(e){}
    }
  },[]);
  useEffect(()=>{
    if(debtors.length===0)return;
    try{localStorage.setItem(FU.STORAGE_KEY,JSON.stringify({d:debtors,a:aid}))}catch(e){}
    if(FU.cloudReady){skipNext.current=true;FU.saveToCloud(debtors)}
  },[debtors,aid]);

  var bg=FU.bg,sf=FU.sf,bd=FU.bd,tx=FU.tx,txm=FU.txm,ac=FU.ac,inp=FU.inp,tg=FU.tg;
  var deb=useMemo(()=>debtors.find(d=>d.id===aid),[debtors,aid]);
  var stats=useMemo(()=>{if(!deb)return{t:0,dn:0,ov:0,sn:0,pct:0};var ts=deb.tasks,dn=ts.filter(x=>x.done).length;return{t:ts.length,dn,ov:ts.filter(x=>!x.done&&x.deadline&&FU.dleft(x.deadline)<0).length,sn:ts.filter(x=>!x.done&&x.deadline&&FU.dleft(x.deadline)>=0&&FU.dleft(x.deadline)<=7).length,pct:Math.round(dn/ts.length*100)}},[deb]);
  var dashD=useMemo(()=>{var all=[];debtors.forEach(d=>{d.tasks.forEach(t=>{if(!t.done)all.push({...t,did:d.id,dfio:d.fio,dcn:d.caseNum})})});var ov=all.filter(t=>t.deadline&&FU.dleft(t.deadline)<0).sort((a,b)=>FU.dleft(a.deadline)-FU.dleft(b.deadline));var wk=all.filter(t=>t.deadline&&FU.dleft(t.deadline)>=0&&FU.dleft(t.deadline)<=7).sort((a,b)=>FU.dleft(a.deadline)-FU.dleft(b.deadline));var td=debtors.reduce((s,d)=>s+d.tasks.filter(t=>t.done).length,0);return{ov,wk,td}},[debtors]);
  var filtered=useMemo(()=>{if(!deb)return[];var ts=deb.tasks;if(ph!=="all")ts=ts.filter(t=>t.phase===ph);if(q.trim()){var s=q.toLowerCase();ts=ts.filter(t=>t.title.toLowerCase().includes(s)||t.desc.toLowerCase().includes(s)||(t.law||"").toLowerCase().includes(s))}return ts.sort((a,b)=>{if(a.done!==b.done)return a.done?1:-1;return a.order-b.order})},[deb,ph,q]);
  var phC=useMemo(()=>{if(!deb)return{};var r={};FU.PHASES.forEach(p=>{var f=p.id==="all"?deb.tasks:deb.tasks.filter(t=>t.phase===p.id);r[p.id]={t:f.length,d:f.filter(t=>t.done).length}});return r},[deb]);
  var risk=useMemo(()=>{if(!deb)return{l:"—",c:"#64748b"};return stats.ov>3?{l:"Критический",c:"#dc2626"}:stats.ov>0?{l:"Просрочки",c:"#d97706"}:{l:"В норме",c:"#16a34a"}},[deb,stats]);
  var conflicts=useMemo(()=>deb?FU.checkConflict(deb.keyDates,deb.meetingFormat):[],[deb]);
  var fd=deb?FU.KD_META.filter(m=>deb.keyDates[m.id]).length:0;
  var reqStats=useMemo(()=>{if(!deb)return{t:0,w:0,d:0,ov:0,ct:0};var rs=deb.requests||[];return{t:rs.length,w:rs.filter(r=>r.status==="waiting"&&FU.dleft(r.deadline)>=0).length,d:rs.filter(r=>r.status==="done").length,ov:rs.filter(r=>r.status==="waiting"&&FU.dleft(r.deadline)<0&&!r.court).length,ct:rs.filter(r=>r.court).length}},[deb]);
  var credStats=useMemo(()=>{if(!deb)return{t:0,inc:0,pen:0,noE:0,sum:0,sumPrincipal:0,sumPenalty:0,byQueue:{1:0,2:0,3:0},objPending:0};var cs=deb.creditors||[];var inc=cs.filter(c=>c.status==="included");return{t:cs.length,inc:inc.length,pen:cs.filter(c=>c.status==="pending").length,noE:cs.filter(c=>!c.efrsb).length,sum:inc.reduce((s,c)=>s+(parseFloat(c.principal)||0)+(parseFloat(c.penalty)||0),0),sumPrincipal:inc.reduce((s,c)=>s+(parseFloat(c.principal)||0),0),sumPenalty:inc.reduce((s,c)=>s+(parseFloat(c.penalty)||0),0),byQueue:{1:inc.filter(c=>c.queue==="1").reduce((s,c)=>s+(parseFloat(c.principal)||0)+(parseFloat(c.penalty)||0),0),2:inc.filter(c=>c.queue==="2").reduce((s,c)=>s+(parseFloat(c.principal)||0)+(parseFloat(c.penalty)||0),0),3:inc.filter(c=>c.queue==="3").reduce((s,c)=>s+(parseFloat(c.principal)||0)+(parseFloat(c.penalty)||0),0)},objPending:cs.filter(c=>c.status==="pending"&&c.objectionDeadline&&FU.dleft(c.objectionDeadline)>=0&&!c.objectionFiled).length}},[deb]);
  var dashReqOv=useMemo(()=>{var all=[];debtors.forEach(d=>{(d.requests||[]).forEach(r=>{if(r.status==="waiting"&&FU.dleft(r.deadline)<0)all.push({...r,dfio:d.fio})})});return all},[debtors]);

  // HANDLERS
  var addDeb=()=>{if(!form.fio.trim()||!form.date)return;var kd=FU.autoKd({kd_procedure:form.date});var d={id:FU.uid(),fio:form.fio,caseNum:form.caseNum,notes:form.notes,meetingFormat:form.meetingFormat,keyDates:kd,tasks:FU.mkTasks(kd,form.meetingFormat),journal:[{id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Создан. Реструктуризация с "+FU.fmt(form.date)+"."}],requests:[],creditors:[]};setDebtors(p=>[...p,d]);setAid(d.id);setTab("home");setModal(null);setForm({fio:"",caseNum:"",date:"",notes:"",meetingFormat:"inperson"})};
  var delDeb=id=>{if(!confirm("Удалить должника?"))return;setDebtors(p=>p.filter(d=>d.id!==id));if(aid===id)setAid(debtors.find(d=>d.id!==id)?.id||null)};
  var tog=tid=>{setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,tasks:d.tasks.map(t=>t.id!==tid?t:{...t,done:!t.done,doneDate:!t.done?new Date().toISOString().split("T")[0]:null})}))};
  var togX=(did,tid)=>{setDebtors(p=>p.map(d=>d.id!==did?d:{...d,tasks:d.tasks.map(t=>t.id!==tid?t:{...t,done:!t.done,doneDate:!t.done?new Date().toISOString().split("T")[0]:null})}))};
  var updT=(tid,f,v)=>{setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,tasks:d.tasks.map(t=>t.id!==tid?t:{...t,[f]:v})}))};
  var updateKD=(key,val)=>{setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var nk=FU.autoKd({...d.keyDates,[key]:val});var nt=FU.recalc(d.tasks,nk,d.meetingFormat);var e={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Дата \xab"+(FU.KD_META.find(m=>m.id===key)?.label)+"\xbb \u2192 "+FU.fmt(val)+". Пересчитано."};return{...d,keyDates:nk,tasks:nt,journal:[...d.journal,e]}}))};
  var changeMF=nf=>{setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var nt=FU.recalc(d.tasks,d.keyDates,nf);var e={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Формат \u2192 "+(nf==="remote"?"заочное":"очное")+". Пересчитано."};return{...d,meetingFormat:nf,tasks:nt,journal:[...d.journal,e]}}))};
  var addJ=()=>{if(!jt.trim()||!deb)return;setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,journal:[...d.journal,{id:FU.uid(),date:new Date().toISOString().split("T")[0],text:jt.trim()}]}));setJt("")};
  var addCustomTask=()=>{if(!customForm.title.trim())return;var mx=deb.tasks.filter(t=>t.phase==="custom").reduce((m,t)=>Math.max(m,t.order),99);var nt={id:FU.uid(),phase:"custom",order:mx+1,title:customForm.title,desc:customForm.desc,law:customForm.law,dl:null,deadline:customForm.deadline||"",done:false,doneDate:null,notes:"",priority:"medium",links:[]};setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,tasks:[...d.tasks,nt]}));setCustomForm({title:"",desc:"",deadline:"",law:""});setModal(null)};
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
  var addCred=()=>{if(!credForm.name.trim())return;var nc={id:FU.uid(),name:credForm.name,principal:credForm.principal,penalty:credForm.penalty,amount:(parseFloat(credForm.principal)||0)+(parseFloat(credForm.penalty)||0),queue:credForm.queue,secured:credForm.secured,dateFiled:credForm.dateFiled,courtDate:credForm.courtDate,objectionDeadline:credForm.objectionDeadline,objectionFiled:credForm.objectionFiled,status:"pending",efrsb:false,efrsbDate:"",result:""};setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var j={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:"Требование: "+nc.name+" "+nc.amount.toLocaleString("ru-RU")+" \u20bd"};return{...d,creditors:[...(d.creditors||[]),nc],journal:[...d.journal,j]}}));setCredForm({name:"",principal:"",penalty:"",queue:"3",secured:false,dateFiled:"",courtDate:"",objectionDeadline:"",objectionFiled:false});setModal("creditors")};
  var saveCred=()=>{if(!editCred||!editCred.name.trim())return;var updated={...editCred,amount:(parseFloat(editCred.principal)||0)+(parseFloat(editCred.penalty)||0)};setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,creditors:(d.creditors||[]).map(c=>c.id!==updated.id?c:updated)}));setEditCred(null);setModal("creditors")};
  var updCred=(cid,f,v)=>{setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,creditors:(d.creditors||[]).map(c=>c.id!==cid?c:{...c,[f]:v})}))};
  var markCredStatus=(cid,st)=>{setDebtors(p=>p.map(d=>{if(d.id!==aid)return d;var cr=(d.creditors||[]).find(c=>c.id===cid);var j={id:FU.uid(),date:new Date().toISOString().split("T")[0],text:cr.name+": "+(st==="included"?"включено":"отказано")};return{...d,creditors:(d.creditors||[]).map(c=>c.id!==cid?c:{...c,status:st}),journal:[...d.journal,j]}}))};
  var markEfrsb=cid=>{setDebtors(p=>p.map(d=>d.id!==aid?d:{...d,creditors:(d.creditors||[]).map(c=>c.id!==cid?c:{...c,efrsb:true,efrsbDate:new Date().toISOString().split("T")[0]})}))};

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
            React.createElement("div",{style:{fontSize:11,opacity:0.85,marginBottom:10}},d.caseNum+" \xb7 Реструктуризация"),
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
          React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center",marginTop:2}},
            deb.caseNum&&React.createElement("a",{href:"https://kad.arbitr.ru/Card?number="+encodeURIComponent(deb.caseNum),target:"_blank",rel:"noopener noreferrer",style:{fontSize:11,color:ac,textDecoration:"none",fontWeight:600}},deb.caseNum),
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
          var isN=t.id_key==="meeting_notify",isC=t.phase==="custom";
          return React.createElement("div",{key:t.id,style:{background:"#fff",border:"1px solid "+bd,borderRadius:12,padding:"12px 14px",marginBottom:6,display:"grid",gridTemplateColumns:"24px 1fr auto",gap:10,alignItems:"start",opacity:t.done?0.45:1}},
            React.createElement("div",{onClick:function(){tog(t.id)},style:{width:20,height:20,borderRadius:"50%",border:"2px solid "+(t.done?"#16a34a":"#d1d5db"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:t.done?"#16a34a":"transparent",fontSize:11,color:"#fff",fontWeight:700,marginTop:2}},t.done&&"\u2713"),
            React.createElement("div",{onClick:function(){setSelTask(t);setModal("task")},style:{cursor:"pointer"}},
              React.createElement("div",{style:{fontWeight:600,fontSize:13,textDecoration:t.done?"line-through":"none",marginBottom:2,color:tx}},t.title,isC&&React.createElement("span",{style:{...tg("#f3e8ff","#7c3aed"),marginLeft:4}},"свои")),
              React.createElement("div",{style:{fontSize:11,color:txm,lineHeight:1.5}},t.desc),
              React.createElement("div",null,
                t.law&&React.createElement("span",{style:tg("#eef2ff","#4f46e5")},t.law),
                t.priority==="high"&&React.createElement("span",{style:tg("#fef2f2","#dc2626")},"Важно"),
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
        var tbd={};deb.tasks.forEach(function(t){if(!t.deadline)return;var dd=new Date(t.deadline);if(dd.getFullYear()===y&&dd.getMonth()===m){var day=dd.getDate();if(!tbd[day])tbd[day]=[];tbd[day].push(t)}});
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
      React.createElement("div",{style:{fontSize:11,color:txm,fontWeight:500}},"127-ФЗ \xb7 Реструктуризация")
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
          // QUEUE BREAKDOWN
          credStats.sum>0&&React.createElement("div",{style:{padding:"10px 12px",background:"#f9fafb",borderRadius:10,marginBottom:8,fontSize:12}},
            React.createElement("div",{style:{fontWeight:600,marginBottom:6}},"Итого включённых требований"),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},
              React.createElement("span",{style:{color:txm}},"Основной долг"),
              React.createElement("span",{style:{fontWeight:600}},credStats.sumPrincipal.toLocaleString("ru-RU")+" \u20bd")
            ),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6}},
              React.createElement("span",{style:{color:txm}},"Пени / проценты"),
              React.createElement("span",{style:{fontWeight:600}},credStats.sumPenalty.toLocaleString("ru-RU")+" \u20bd")
            ),
            React.createElement("div",{style:{height:1,background:bd,marginBottom:6}}),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6}},
              React.createElement("span",{style:{fontWeight:600}},"Итого"),
              React.createElement("span",{style:{fontWeight:700,color:ac}},credStats.sum.toLocaleString("ru-RU")+" \u20bd")
            ),
            credStats.byQueue[1]>0&&React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:11,color:txm}},React.createElement("span",null,"1 очередь"),React.createElement("span",null,credStats.byQueue[1].toLocaleString("ru-RU")+" \u20bd")),
            credStats.byQueue[2]>0&&React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:11,color:txm}},React.createElement("span",null,"2 очередь"),React.createElement("span",null,credStats.byQueue[2].toLocaleString("ru-RU")+" \u20bd")),
            credStats.byQueue[3]>0&&React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:11,color:txm}},React.createElement("span",null,"3 очередь"),React.createElement("span",null,credStats.byQueue[3].toLocaleString("ru-RU")+" \u20bd"))
          ),
          // LIST
          React.createElement("div",{style:{maxHeight:350,overflowY:"auto"}},
            (deb.creditors||[]).length===0?React.createElement("div",{style:{textAlign:"center",padding:20,color:txm,fontSize:12}},"Нет кредиторов"):
            (deb.creditors||[]).map(function(c){
              var bCol=c.status==="included"?"#16a34a":c.status==="rejected"?"#dc2626":"#d97706";
              var total=(parseFloat(c.principal)||0)+(parseFloat(c.penalty)||0);
              var objOv=c.objectionDeadline&&FU.dleft(c.objectionDeadline)<0&&!c.objectionFiled;
              return React.createElement("div",{key:c.id,style:{background:"#fff",border:"1px solid "+bd,borderRadius:10,padding:"10px 12px",marginBottom:6,borderLeft:"3px solid "+bCol,cursor:"pointer"},onClick:function(){setEditCred({...c});setModal("editcred")}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},
                  React.createElement("div",null,
                    React.createElement("div",{style:{fontSize:13,fontWeight:600}},c.name),
                    React.createElement("div",{style:{fontSize:11,color:txm,marginTop:2}},c.queue+" очередь"+(c.secured?" · залог":""))
                  ),
                  React.createElement("div",{style:{textAlign:"right"}},
                    React.createElement("div",{style:{fontSize:9,padding:"2px 8px",borderRadius:6,fontWeight:600,background:bCol+"15",color:bCol,marginBottom:2}},c.status==="included"?"\u2713 Включено":c.status==="rejected"?"\u2715 Отказано":"На рассм."),
                    React.createElement("div",{style:{fontSize:12,fontWeight:700}},total>0?total.toLocaleString("ru-RU")+" \u20bd":"")
                  )
                ),
                // AMOUNT BREAKDOWN
                total>0&&React.createElement("div",{style:{display:"flex",gap:12,fontSize:10,color:txm,marginBottom:4}},
                  c.principal&&React.createElement("span",null,"Осн. долг: "+(parseFloat(c.principal)||0).toLocaleString("ru-RU")+" \u20bd"),
                  c.penalty&&React.createElement("span",null,"Пени: "+(parseFloat(c.penalty)||0).toLocaleString("ru-RU")+" \u20bd")
                ),
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
            })
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",marginTop:8}},React.createElement("button",{onClick:function(){setModal(null)},style:btnP},"Закрыть"))
        ),

        // EDIT CREDITOR
        modal==="editcred"&&editCred&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:14}},"Редактировать кредитора"),
          React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Кредитор"),React.createElement("input",{style:inp,value:editCred.name,onChange:function(e){setEditCred({...editCred,name:e.target.value})}})),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Основной долг (\u20bd)"),React.createElement("input",{style:inp,type:"number",value:editCred.principal||"",onChange:function(e){setEditCred({...editCred,principal:e.target.value})}})),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Пени / проценты (\u20bd)"),React.createElement("input",{style:inp,type:"number",value:editCred.penalty||"",onChange:function(e){setEditCred({...editCred,penalty:e.target.value})}}))
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Очередь"),React.createElement("select",{style:{...inp,appearance:"auto"},value:editCred.queue,onChange:function(e){setEditCred({...editCred,queue:e.target.value})}},React.createElement("option",{value:"1"},"1 очередь"),React.createElement("option",{value:"2"},"2 очередь"),React.createElement("option",{value:"3"},"3 очередь"))),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Дата подачи"),React.createElement("input",{type:"date",style:inp,value:editCred.dateFiled||"",onChange:function(e){setEditCred({...editCred,dateFiled:e.target.value})}}))
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Дата заседания"),React.createElement("input",{type:"date",style:inp,value:editCred.courtDate||"",onChange:function(e){setEditCred({...editCred,courtDate:e.target.value})}})),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Срок возражений"),React.createElement("input",{type:"date",style:inp,value:editCred.objectionDeadline||"",onChange:function(e){setEditCred({...editCred,objectionDeadline:e.target.value})}}))
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
        ),

        // ADD CREDITOR
        modal==="addcred"&&deb&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{fontSize:16,fontWeight:700,marginBottom:14}},"Новый кредитор"),
          React.createElement("div",{style:{marginBottom:10}},React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Кредитор"),React.createElement("input",{style:inp,value:credForm.name,onChange:function(e){setCredForm({...credForm,name:e.target.value})},autoFocus:true})),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Основной долг (\u20bd)"),React.createElement("input",{style:inp,type:"number",value:credForm.principal,onChange:function(e){setCredForm({...credForm,principal:e.target.value})}})),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Пени / проценты (\u20bd)"),React.createElement("input",{style:inp,type:"number",value:credForm.penalty,onChange:function(e){setCredForm({...credForm,penalty:e.target.value})}}))
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Очередь"),React.createElement("select",{style:{...inp,appearance:"auto"},value:credForm.queue,onChange:function(e){setCredForm({...credForm,queue:e.target.value})}},React.createElement("option",{value:"1"},"1 очередь"),React.createElement("option",{value:"2"},"2 очередь"),React.createElement("option",{value:"3"},"3 очередь"))),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Дата подачи"),React.createElement("input",{type:"date",style:inp,value:credForm.dateFiled,onChange:function(e){setCredForm({...credForm,dateFiled:e.target.value})}}))
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Дата заседания"),React.createElement("input",{type:"date",style:inp,value:credForm.courtDate,onChange:function(e){setCredForm({...credForm,courtDate:e.target.value})}})),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:12,color:txm,marginBottom:4}},"Срок возражений"),React.createElement("input",{type:"date",style:inp,value:credForm.objectionDeadline,onChange:function(e){setCredForm({...credForm,objectionDeadline:e.target.value})}}))
          ),
          React.createElement("div",{style:{display:"flex",gap:8,marginBottom:10,alignItems:"center"}},
            React.createElement("input",{type:"checkbox",id:"newObjFiled",checked:credForm.objectionFiled,onChange:function(e){setCredForm({...credForm,objectionFiled:e.target.checked})},style:{width:16,height:16}}),
            React.createElement("label",{htmlFor:"newObjFiled",style:{fontSize:13,cursor:"pointer"}},"Возражения уже поданы"),
            React.createElement("input",{type:"checkbox",id:"newSecured",checked:credForm.secured,onChange:function(e){setCredForm({...credForm,secured:e.target.checked})},style:{width:16,height:16,marginLeft:12}}),
            React.createElement("label",{htmlFor:"newSecured",style:{fontSize:13,cursor:"pointer"}},"Залог")
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",gap:8}},React.createElement("button",{onClick:function(){setModal("creditors")},style:btnS},"Назад"),React.createElement("button",{onClick:addCred,style:btnP},"Добавить"))
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
