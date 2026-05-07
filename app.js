
const D = APP_DATA;
const days = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
const ESS = ["Tesi","Inglese","Allenamento"];
let selectedDay = todayName();
let selectedMealType = null;

const $ = id => document.getElementById(id);

function dateKey(d=new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayName(){ return days[new Date().getDay()]; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function dayNameFromDate(d){ return days[d.getDay()]; }
function key(prefix, dk=dateKey()){ return `${prefix}_${dk}`; }
function getStore(k, fallback){ try{return JSON.parse(localStorage.getItem(k) || JSON.stringify(fallback));}catch(e){return fallback;} }
function setStore(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
function mins(t){ const [h,m]=t.split(":").map(Number); return h*60+m; }
function nowM(){ const d=new Date(); return d.getHours()*60+d.getMinutes(); }

function done(dk=dateKey()){ return getStore(key("routine_done",dk), []); }
function setDone(v,dk=dateKey()){ setStore(key("routine_done",dk), v); }
function actDone(dk=dateKey()){ return getStore(key("routine_activity_done",dk), []); }
function setAct(v,dk=dateKey()){ setStore(key("routine_activity_done",dk), v); }
function meals(dk=dateKey()){ return getStore(key("diet_meals",dk), {}); }
function setMeals(v,dk=dateKey()){ setStore(key("diet_meals",dk), v); }
function water(dk=dateKey()){ return Number(localStorage.getItem(key("diet_water",dk)) || 0); }
function setWater(v,dk=dateKey()){ localStorage.setItem(key("diet_water",dk), String(Math.max(0,Math.min(6,v)))); }
function cheats(dk=dateKey()){ return getStore(key("diet_cheats",dk), []); }
function setCheats(v,dk=dateKey()){ setStore(key("diet_cheats",dk), v); }
function renpho(dk=dateKey()){ return getStore(key("renpho",dk), null); }
function setRenpho(v,dk=dateKey()){ setStore(key("renpho",dk), v); }

function routine(){ return D.routine; }
function diet(){ return D.diet; }

function isWorkoutDay(day=todayName()){
  const type = routine()[day]?.type?.toLowerCase() || "";
  return type.includes("palestra") || type.includes("tennis") || type.includes("cardio");
}
function essentials(day=todayName()){
  const arr = ["Tesi","Inglese"];
  if(isWorkoutDay(day)) arr.push("Allenamento");
  return arr;
}
function currentOrNextActivity(){
  const items = routine()[todayName()].items;
  const n = nowM();
  return items.find(x => mins(x[0]) <= n && n <= mins(x[1])) || items.find(x => mins(x[0]) > n) || items[items.length-1];
}
function activityId(day,item){ return `${day}|${item[0]}-${item[1]}|${item[2]}`; }
function essentialFromTitle(title){
  const t=title.toLowerCase();
  if(t.includes("tesi")) return "Tesi";
  if(t.includes("inglese")) return "Inglese";
  if(/palestra|tennis|camminata|stretching|cardio/i.test(title)) return "Allenamento";
  return null;
}
function mealTypeFromTitle(title){
  const t=title.toLowerCase();
  if(t.includes("colazione")) return "breakfast";
  if(t.includes("pranzo")) return "lunch";
  if(t.includes("cena")) return "dinner";
  if(t.includes("spuntino")) return "snack";
  return null;
}
function mealKey(type, day=todayName()){
  const rot = diet().rotation[day];
  if(type==="breakfast") return "breakfast";
  if(type==="snack") return isWorkoutDay(day) ? "snackTraining" : "snackRest";
  if(type==="lunch") return rot.lunch;
  if(type==="dinner") return rot.dinner;
  return null;
}
function mealObj(k){
  if(k==="manualCheat") return {name:"Pranzo domenicale sgarro",items:[{food:"Inserisci calorie manualmente",quantity:"consiglio 1000–1300 kcal",kcal:0}],notes:"Sopra 1300 kcal: cena leggera. Sopra 1700: sgarro pesante."};
  if(k==="lightBeforeDrinks") return {name:"Cena leggera pre-bevuta",items:[{food:"Proteine in polvere",quantity:"1 scoop se serve",kcal:120},{food:"Pane",quantity:"50 g max",kcal:140},{food:"Verdure",quantity:"libere",kcal:60}],notes:"Range drink: 2 ideale, 3 accettabile, 4 limite danni."};
  return diet().meals[k];
}
function mealStatus(type, dk=dateKey()){ return meals(dk)[type]?.status || "pending"; }
function setMealStatus(type,status,dk=dateKey()){
  const m=meals(dk); m[type]=m[type]||{}; m[type].status=status; m[type].updatedAt=new Date().toISOString(); setMeals(m,dk);
}

/* ROUTINE */
function routineScoreForDate(d){
  const dk=dateKey(d), day=dayNameFromDate(d), e=essentials(day), dd=done(dk);
  const c=e.filter(x=>dd.includes(x)).length;
  return {dk,day,count:c,total:e.length,percent:e.length?Math.round(c/e.length*100):0,completed:e.filter(x=>dd.includes(x)),ess:e};
}
function rangeRoutine(n){
  const rows=[]; for(let i=n-1;i>=0;i--) rows.push(routineScoreForDate(addDays(new Date(),-i)));
  const c=rows.reduce((s,r)=>s+r.count,0), t=rows.reduce((s,r)=>s+r.total,0);
  return {rows,count:c,total:t,percent:t?Math.round(c/t*100):0};
}
function monthRoutine(){
  const today=new Date(), first=new Date(today.getFullYear(),today.getMonth(),1), rows=[];
  for(let d=new Date(first);d<=today;d.setDate(d.getDate()+1)) rows.push(routineScoreForDate(new Date(d)));
  const c=rows.reduce((s,r)=>s+r.count,0), t=rows.reduce((s,r)=>s+r.total,0);
  return {rows,count:c,total:t,percent:t?Math.round(c/t*100):0};
}
function renderRoutine(){
  $("subtitle").textContent = `${todayName()} · ${routine()[todayName()].type}`;
  const item=currentOrNextActivity(), id=activityId(todayName(),item), doneAct=actDone().includes(id);
  const active = mins(item[0]) <= nowM() && nowM() <= mins(item[1]);
  $("nextTitle").textContent=item[2];
  $("nextTime").textContent=`${item[0]} – ${item[1]} · ${active?"in corso":"prossima"}`;
  $("doneBtn").textContent=doneAct?"Completata ✓":"Fatta";
  $("doneBtn").disabled=doneAct;

  const e=essentials(), dd=done();
  $("routineChecklist").innerHTML=ESS.map(x=>{
    const dis=!e.includes(x), ok=dd.includes(x);
    return `<div class="check ${ok?"done":""} ${dis?"disabled-check":""}" data-check="${x}" data-disabled="${dis}">
      <span>${x}</span><span class="badge">${dis?"non previsto":ok?"fatto":"da fare"}</span></div>`;
  }).join("");
  document.querySelectorAll("[data-check]").forEach(el=>{
    el.onclick=()=>{ if(el.dataset.disabled==="true") return; let d=done(); const x=el.dataset.check; d=d.includes(x)?d.filter(y=>y!==x):[...d,x]; setDone(d); render(); };
  });

  const missing=e.filter(x=>!dd.includes(x));
  $("rulesBox").innerHTML = (missing.length?missing.map(x=>`<div class="rule">${ruleForMissing(x)}</div>`):[`<div class="rule">Hai chiuso le cose fondamentali. Proteggi sonno e routine serale.</div>`]).join("");

  renderRoutineScores();
  renderTimeline();
}
function ruleForMissing(x){
  if(x==="Tesi") return "Tesi: se oggi salta, recupero pulito domani con +45 min o sabato 10:00–12:00.";
  if(x==="Inglese") return "Inglese: fai almeno 30 min entro sera. Se salta, domani +15 min.";
  return "Allenamento: se salta, spostalo al prossimo slot libero. Non fare due recuperi nello stesso giorno.";
}
function renderRoutineScores(){
  const d=routineScoreForDate(new Date()), w=rangeRoutine(7), m=monthRoutine();
  $("rDaily").textContent=`${d.percent}%`; $("rDailyTxt").textContent=`${d.count}/${d.total} fondamentali`;
  $("rWeekly").textContent=`${w.percent}%`; $("rWeeklyTxt").textContent=`${w.count}/${w.total} ultimi 7 giorni`;
  $("rMonthly").textContent=`${m.percent}%`; $("rMonthlyTxt").textContent=`${m.count}/${m.total} da inizio mese`;
  $("rBars").innerHTML=w.rows.map(r=>`<div class="bar-row"><span class="bar-day">${r.day.slice(0,3)}</span><div class="bar-track"><div class="bar-fill" style="width:${r.percent}%"></div></div><span class="bar-score">${r.count}/${r.total}</span></div>`).join("");
  $("rHabits").innerHTML=ESS.map(x=>{
    let poss=0,c=0; w.rows.forEach(r=>{if(r.ess.includes(x)){poss++; if(r.completed.includes(x))c++;}});
    const pct=poss?Math.round(c/poss*100):0;
    return `<div class="habit"><div><strong>${x}</strong><p>${c}/${poss} negli ultimi 7 giorni</p></div><span class="habit-score">${pct}%</span></div>`;
  }).join("");
}
function renderTimeline(){
  $("selectedDayTitle").textContent=`${selectedDay} — ${routine()[selectedDay].type}`;
  const a=actDone();
  $("timeline").innerHTML=routine()[selectedDay].items.map(it=>{
    const isToday=selectedDay===todayName(), id=activityId(selectedDay,it), ok=isToday&&a.includes(id);
    const current=isToday&&mins(it[0])<=nowM()&&nowM()<=mins(it[1]);
    const mt=mealTypeFromTitle(it[2]);
    const b=isToday&&mt?`<button class="mini" data-open-meal="${mt}">Vedi pasto</button>`:"";
    return `<div class="slot ${current?"current":""} ${ok?"done-slot":""}"><div class="time">${it[0]}<br>${it[1]}</div><div class="task"><span>${it[2]}</span>${ok?'<span class="done-mark">Completata ✓</span>':""}${b}</div></div>`;
  }).join("");
  document.querySelectorAll("[data-open-meal]").forEach(b=>b.onclick=()=>openMeal(b.dataset.openMeal));
}

/* DIET */
function expectedMeals(d=new Date()){
  const day=dayNameFromDate(d); const arr=["breakfast","lunch"]; if(isWorkoutDay(day)) arr.push("snack"); arr.push("dinner"); return arr;
}
function dietTarget(day=todayName()){
  if(day==="Sabato") return diet().targets.saturdayFoodKcal;
  if(day==="Domenica") return diet().targets.sundayFlexibleKcal;
  return isWorkoutDay(day)?diet().targets.trainingDayKcal:diet().targets.restDayKcal;
}
function dietScoreForDate(d){
  const dk=dateKey(d), day=dayNameFromDate(d), em=expectedMeals(d), mm=meals(dk);
  const okMeals=em.filter(x=>mm[x]?.status==="done").length;
  const mealScore=em.length?okMeals/em.length:0;
  const waterScore=Math.min(water(dk)/6,1);
  const ch=cheats(dk);
  let cheatScore=1;
  if(ch.length){
    const kcal=ch.reduce((s,c)=>s+(+c.kcal||0),0), drinks=ch.reduce((s,c)=>s+(+c.drinks||0),0);
    if(day==="Sabato") cheatScore=drinks<=3?1:drinks<=4?.65:.25;
    else if(day==="Domenica") cheatScore=kcal<=1300?1:kcal<=1700?.65:.25;
    else cheatScore=kcal<=700?.75:.35;
  }
  const percent=Math.round((mealScore*.5+waterScore*.3+cheatScore*.2)*100);
  return {dk,day,expected:em,okMeals,totalMeals:em.length,mealScore:Math.round(mealScore*100),water:water(dk),waterScore:Math.round(waterScore*100),cheats:ch,cheatScore:Math.round(cheatScore*100),percent};
}
function rangeDiet(n){
  const rows=[]; for(let i=n-1;i>=0;i--) rows.push(dietScoreForDate(addDays(new Date(),-i)));
  const pct=rows.length?Math.round(rows.reduce((s,r)=>s+r.percent,0)/rows.length):0; return {rows,percent:pct};
}
function monthDiet(){
  const today=new Date(), first=new Date(today.getFullYear(),today.getMonth(),1), rows=[];
  for(let d=new Date(first);d<=today;d.setDate(d.getDate()+1)) rows.push(dietScoreForDate(new Date(d)));
  const pct=rows.length?Math.round(rows.reduce((s,r)=>s+r.percent,0)/rows.length):0; return {rows,percent:pct};
}
function renderDiet(){
  const day=todayName(), ds=dietScoreForDate(new Date());
  $("dietTarget").textContent=dietTarget(day);
  $("dietType").textContent=day==="Sabato"?"cibo ridotto + drink manuali":day==="Domenica"?"giorno flessibile":isWorkoutDay(day)?"giorno allenamento":"giorno riposo";
  $("waterText").textContent=`${water()}/6`;
  $("dietTodayScore").textContent=`${ds.percent}%`;
  $("dietTodayTxt").textContent=`pasti ${ds.okMeals}/${ds.totalMeals} · acqua ${ds.water}/6`;
  $("dietTodayTitle").textContent=day;

  const cards=["breakfast","lunch",...(isWorkoutDay(day)?["snack"]:[]),"dinner"].map(type=>mealCard(type)).join("");
  $("mealCards").innerHTML=cards;
  document.querySelectorAll("[data-meal-card]").forEach(c=>c.onclick=()=>openMeal(c.dataset.mealCard));

  renderWater();
  renderCheats();
  renderDietScores();
  renderRenpho();
}
function mealCard(type){
  const k=mealKey(type), obj=mealObj(k), st=mealStatus(type);
  const label={breakfast:"Colazione",lunch:"Pranzo",snack:"Spuntino",dinner:"Cena"}[type];
  const kcal=(obj.items||[]).reduce((s,i)=>s+(+i.kcal||0),0);
  return `<div class="meal-card ${st}" data-meal-card="${type}"><div><p class="meal-type">${label}</p><h3>${obj.name}</h3><p class="muted">${kcal?`circa ${kcal} kcal · `:""}${st==="done"?"confermato":st==="skipped"?"saltato":st==="cheat"?"sgarro":"da confermare"}</p></div><button class="ghost">Apri</button></div>`;
}
function renderWater(){
  $("waterBottles").innerHTML=Array.from({length:6},(_,i)=>`<button class="bottle ${i<water()?"drunk":""}" data-water="${i+1}">💧<span>${i+1}</span></button>`).join("");
  document.querySelectorAll("[data-water]").forEach(b=>b.onclick=()=>{const n=+b.dataset.water; setWater(n===water()?n-1:n); render();});
}
function renderCheats(){
  const ch=cheats();
  $("cheatList").innerHTML=ch.length?ch.map((c,i)=>`<div class="cheat-item"><div><strong>${c.desc}</strong><p>${c.kcal||0} kcal · ${c.drinks||0} drink</p></div><button class="text-button" data-del-cheat="${i}">elimina</button></div>`).join(""):`<p class="muted">Nessuno sgarro inserito oggi.</p>`;
  document.querySelectorAll("[data-del-cheat]").forEach(b=>b.onclick=()=>{let ch=cheats(); ch.splice(+b.dataset.delCheat,1); setCheats(ch); render();});
}
function renderDietScores(){
  const d=dietScoreForDate(new Date()), w=rangeDiet(7), m=monthDiet();
  $("dDaily").textContent=`${d.percent}%`; $("dDailyTxt").textContent=`pasti ${d.okMeals}/${d.totalMeals}, acqua ${d.water}/6`;
  $("dWeekly").textContent=`${w.percent}%`; $("dWeeklyTxt").textContent="aderenza media ultimi 7 giorni";
  $("dMonthly").textContent=`${m.percent}%`; $("dMonthlyTxt").textContent="aderenza media da inizio mese";
  $("dComponents").innerHTML=`<div class="habit"><div><strong>Pasti rispettati</strong><p>${d.okMeals}/${d.totalMeals} oggi</p></div><span class="habit-score">${d.mealScore}%</span></div><div class="habit"><div><strong>Acqua raggiunta</strong><p>${d.water}/6 bottiglie</p></div><span class="habit-score">${d.waterScore}%</span></div><div class="habit"><div><strong>Sgarri gestiti</strong><p>oggi</p></div><span class="habit-score">${d.cheatScore}%</span></div>`;
  $("dBars").innerHTML=w.rows.map(r=>`<div class="bar-row"><span class="bar-day">${r.day.slice(0,3)}</span><div class="bar-track"><div class="bar-fill" style="width:${r.percent}%"></div></div><span class="bar-score">${r.percent}%</span></div>`).join("");
}
function renderRenpho(){
  const r=renpho();
  $("renphoWeight").value=r?.weight||"";
  $("renphoFat").value=r?.fat||"";
  $("renphoBmr").value=r?.bmr||1900;
  const rows=[];
  for(let i=13;i>=0;i--){const dk=dateKey(addDays(new Date(),-i)), rr=renpho(dk); if(rr?.weight) rows.push({dk,...rr});}
  $("renphoTrend").innerHTML=rows.length?`<div class="habit"><div><strong>Ultimo peso</strong><p>${rows.at(-1).dk}</p></div><span class="habit-score">${rows.at(-1).weight} kg</span></div><div class="habit"><div><strong>Variazione periodo</strong><p>${rows[0].dk} → ${rows.at(-1).dk}</p></div><span class="habit-score">${(rows.at(-1).weight-rows[0].weight).toFixed(2)} kg</span></div>`:`<p class="muted">Inserisci il primo dato mattutino.</p>`;
}

/* CUSTOM MEAL */
function fillCustomSelectors(){
  const db=diet().ingredientDb;
  $("customCarb").innerHTML=Object.entries(db.carbs).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("");
  $("customProtein").innerHTML=Object.entries(db.proteins).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("");
  $("customVeg").innerHTML=Object.entries(db.vegetables).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join("");
}
function kcal(item,g){ return item.kcal100*g/100; }
function prot(item,g){ return item.protein100*g/100; }
function calcCustomMeal(){
  const db=diet().ingredientDb, target=+$("customKcal").value||650;
  const carb=db.carbs[$("customCarb").value], protein=db.proteins[$("customProtein").value], veg=db.vegetables[$("customVeg").value];
  const oil=$("customOil").value==="yes"?45:0, passata=$("customPassata").value==="yes"?30:0;
  const pg=protein.defaultG, vg=veg.defaultG;
  const fixed=kcal(protein,pg)+kcal(veg,vg)+oil+passata;
  let cg=Math.round((target-fixed)/(carb.kcal100/100));
  cg=Math.max(carb.defaultMin, Math.min(carb.defaultMax, cg));
  const total=Math.round(kcal(carb,cg)+fixed);
  const p=Math.round(prot(carb,cg)+prot(protein,pg)+prot(veg,vg));
  $("customMealResult").innerHTML=`<div class="meal-item"><span>${carb.label}</span><strong>${cg} g</strong><small>${Math.round(kcal(carb,cg))} kcal</small></div><div class="meal-item"><span>${protein.label}</span><strong>${pg} g</strong><small>${Math.round(kcal(protein,pg))} kcal</small></div><div class="meal-item"><span>${veg.label}</span><strong>${vg} g</strong><small>${Math.round(kcal(veg,vg))} kcal</small></div>${passata?'<div class="meal-item"><span>Passata</span><strong>libera</strong><small>~30 kcal</small></div>':""}${oil?'<div class="meal-item"><span>Olio</span><strong>5 g max</strong><small>45 kcal</small></div>':""}<div class="rule"><strong>Totale stimato:</strong> ${total} kcal · proteine ~${p} g. Se il peso non scende, riduci prima grassi/snack, poi carboidrati.</div>`;
}

/* MODALS & ACTIONS */
function openMeal(type){
  selectedMealType=type;
  const obj=mealObj(mealKey(type));
  $("modalMealType").textContent={breakfast:"Colazione",lunch:"Pranzo",snack:"Spuntino",dinner:"Cena"}[type]||"Pasto";
  $("modalMealTitle").textContent=obj.name;
  $("modalMealItems").innerHTML=obj.items.map(i=>`<div class="meal-item"><span>${i.food}</span><strong>${i.quantity}</strong><small>${i.kcal?i.kcal+" kcal":""}</small></div>`).join("");
  $("modalMealNotes").textContent=obj.notes||"";
  $("mealModal").classList.remove("hidden");
}
function closeMeal(){ $("mealModal").classList.add("hidden"); }
function openCheat(){ $("cheatModal").classList.remove("hidden"); }
function closeCheat(){ $("cheatModal").classList.add("hidden"); }

function render(){ renderRoutine(); renderDiet(); }

function init(){
  Object.keys(routine()).forEach(day=>{
    const opt=document.createElement("option"); opt.value=day; opt.textContent=day; if(day===selectedDay) opt.selected=true; $("daySelect").appendChild(opt);
  });
  $("daySelect").onchange=()=>{selectedDay=$("daySelect").value; render();};

  document.querySelectorAll(".macro-tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".macro-tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".macro").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.macro).classList.add("active");});
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll("#routineSec .page").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active");render();});
  document.querySelectorAll(".diet-tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".diet-tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".diet-page").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.diettab).classList.add("active");render();});

  $("doneBtn").onclick=()=>{
    const it=currentOrNextActivity(), id=activityId(todayName(),it); let a=actDone(); if(!a.includes(id)) a.push(id); setAct(a);
    const e=essentialFromTitle(it[2]); if(e){let d=done(); if(!d.includes(e)) d.push(e); setDone(d);}
    const mt=mealTypeFromTitle(it[2]); if(mt) setMealStatus(mt,"done");
    render();
  };

  $("closeMealBtn").onclick=closeMeal;
  $("confirmMealBtn").onclick=()=>{if(selectedMealType) setMealStatus(selectedMealType,"done"); closeMeal(); render();};
  $("skipMealBtn").onclick=()=>{if(selectedMealType) setMealStatus(selectedMealType,"skipped"); closeMeal(); render();};
  $("replaceCheatBtn").onclick=()=>{if(selectedMealType) setMealStatus(selectedMealType,"cheat"); closeMeal(); openCheat(); render();};

  $("addCheatBtn").onclick=openCheat;
  $("closeCheatBtn").onclick=closeCheat;
  $("saveCheatBtn").onclick=()=>{const arr=cheats(); arr.push({desc:$("cheatDesc").value||"Sgarro",kcal:+$("cheatKcal").value||0,drinks:+$("cheatDrinks").value||0}); setCheats(arr); $("cheatDesc").value="";$("cheatKcal").value="";$("cheatDrinks").value=""; closeCheat(); render();};

  $("saveRenphoBtn").onclick=()=>{setRenpho({weight:+$("renphoWeight").value||0,fat:+$("renphoFat").value||0,bmr:+$("renphoBmr").value||1900,savedAt:new Date().toISOString()}); render();};
  $("runAdaptBtn").onclick=()=>{ $("adaptFeedback").innerHTML=adaptFeedback(); };
  $("resetRoutineBtn").onclick=()=>{localStorage.removeItem(key("routine_done")); localStorage.removeItem(key("routine_activity_done")); render();};
  $("resetDietBtn").onclick=()=>{localStorage.removeItem(key("diet_meals")); localStorage.removeItem(key("diet_water")); localStorage.removeItem(key("diet_cheats")); render();};
  $("calcCustomMealBtn").onclick=calcCustomMeal;

  $("notifyBtn").onclick=async()=>{ if(!("Notification" in window)){alert("Notifiche non supportate."); return;} const p=await Notification.requestPermission(); if(p==="granted") new Notification("Routine attiva",{body:"Notifiche routine abilitate."}); };

  fillCustomSelectors();
  render();
  setInterval(render,60000);
  if("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(()=>{});
}
function avgWeight(start,end){
  const vals=[]; for(let i=start;i<=end;i++){const r=renpho(dateKey(addDays(new Date(),-i))); if(r?.weight) vals.push(+r.weight);}
  return vals.length?vals.reduce((s,v)=>s+v,0)/vals.length:null;
}
function adaptFeedback(){
  const a=avgWeight(0,6), b=avgWeight(7,13), w=rangeDiet(7).percent;
  if(a===null||b===null) return `<div class="rule">Servono dati peso su circa 14 giorni. Score dieta ultimi 7 giorni: ${w}%.</div>`;
  const loss=b-a; let msg="";
  if(loss>=.3&&loss<=.7) msg=`Perfetto: -${loss.toFixed(2)} kg/settimana. Mantieni quantità.`;
  else if(loss<.25) msg=w<75?`Peso quasi stabile (-${loss.toFixed(2)} kg), ma aderenza ${w}%. Prima sistema pasti/acqua/sgarri.`:`Peso quasi stabile (-${loss.toFixed(2)} kg). Riduci 100–150 kcal/die: burro d’arachidi o pane snack.`;
  else if(loss>.8) msg=`Stai scendendo troppo (-${loss.toFixed(2)} kg). Aumenta 100–150 kcal/die.`;
  else msg=`Trend accettabile (-${loss.toFixed(2)} kg). Mantieni ancora 1 settimana.`;
  return `<div class="rule"><strong>Media ultimi 7:</strong> ${a.toFixed(2)} kg</div><div class="rule"><strong>Media precedenti:</strong> ${b.toFixed(2)} kg</div><div class="rule">${msg}</div>`;
}
init();
