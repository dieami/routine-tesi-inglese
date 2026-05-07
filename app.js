
const dayNames = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
const ESSENTIALS = ["Tesi", "Inglese", "Allenamento"];
let data;
let selectedDay;

const $ = (id) => document.getElementById(id);

function minutes(t){
  const [h,m] = t.split(":").map(Number);
  return h*60 + m;
}
function nowMinutes(){
  const d = new Date();
  return d.getHours()*60 + d.getMinutes();
}
function localDateKey(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}
function todayKey(){
  return localDateKey(new Date());
}
function completionKey(dateKey = todayKey()){
  return "routine_done_" + dateKey;
}
function activityDoneKey(dateKey = todayKey()){
  return "routine_activity_done_" + dateKey;
}
function getDone(dateKey = todayKey()){
  return JSON.parse(localStorage.getItem(completionKey(dateKey)) || "[]");
}
function setDone(arr, dateKey = todayKey()){
  localStorage.setItem(completionKey(dateKey), JSON.stringify(arr));
}
function getActivityDone(dateKey = todayKey()){
  return JSON.parse(localStorage.getItem(activityDoneKey(dateKey)) || "[]");
}
function setActivityDone(arr, dateKey = todayKey()){
  localStorage.setItem(activityDoneKey(dateKey), JSON.stringify(arr));
}
function activityId(day, item){
  return `${day}|${item[0]}-${item[1]}|${item[2]}`;
}
function pickToday(){
  return dayNames[new Date().getDay()];
}
function addDays(date, delta){
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}
function dateToDayName(date){
  return dayNames[date.getDay()];
}
function currentActivity(items){
  const n = nowMinutes();
  return items.find(x => minutes(x[0]) <= n && n <= minutes(x[1])) || null;
}
function nextActivity(items){
  const n = nowMinutes();
  return items.find(x => minutes(x[0]) > n) || items[items.length-1];
}
function currentOrNext(items){
  return currentActivity(items) || nextActivity(items);
}
function hasWorkout(dayData){
  return dayData.items.some(x => /(palestra|tennis|camminata|stretching)/i.test(x[2]));
}
function dayEssentials(dayName = pickToday()){
  const dayData = data.days[dayName];
  const essentials = ["Tesi", "Inglese"];
  if (hasWorkout(dayData)) essentials.push("Allenamento");
  return essentials;
}
function essentialFromActivity(title){
  const t = title.toLowerCase();
  if(t.includes("tesi")) return "Tesi";
  if(t.includes("inglese")) return "Inglese";
  if(/palestra|tennis|camminata|stretching/i.test(title)) return "Allenamento";
  return null;
}
function scoreForDate(date){
  const key = localDateKey(date);
  const dayName = dateToDayName(date);
  const essentials = dayEssentials(dayName);
  const done = getDone(key);
  const completed = essentials.filter(e => done.includes(e));
  return {
    key,
    dayName,
    essentials,
    completed,
    total: essentials.length,
    count: completed.length,
    percent: essentials.length ? Math.round(completed.length / essentials.length * 100) : 0
  };
}
function scoreRange(daysBackInclusive){
  const today = new Date();
  const rows = [];
  for(let i = daysBackInclusive - 1; i >= 0; i--){
    rows.push(scoreForDate(addDays(today, -i)));
  }
  const count = rows.reduce((s,r)=>s+r.count,0);
  const total = rows.reduce((s,r)=>s+r.total,0);
  return {rows, count, total, percent: total ? Math.round(count/total*100) : 0};
}
function monthScore(){
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const rows = [];
  for(let d = new Date(first); d <= today; d.setDate(d.getDate()+1)){
    rows.push(scoreForDate(new Date(d)));
  }
  const count = rows.reduce((s,r)=>s+r.count,0);
  const total = rows.reduce((s,r)=>s+r.total,0);
  return {rows, count, total, percent: total ? Math.round(count/total*100) : 0};
}
function scheduleLocalNotifications(items){
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const n = nowMinutes();
  items.forEach(item => {
    const start = minutes(item[0]);
    const diff = start - n;
    if (diff > 0 && diff < 16*60) {
      setTimeout(() => {
        navigator.serviceWorker?.ready?.then(reg => {
          reg.showNotification("Routine", {
            body: `${item[0]} – ${item[2]}`,
            tag: "routine-" + item[0],
            icon: "icons/icon-192.png"
          });
        }).catch(() => new Notification("Routine", { body: `${item[0]} – ${item[2]}` }));
      }, diff * 60 * 1000);
    }
  });
}
function renderTodayRules(){
  const today = pickToday();
  const dayData = data.days[today];
  const done = getDone();
  const essentials = dayEssentials(today);
  const n = nowMinutes();
  const missing = essentials.filter(e => !done.includes(e));
  const rules = [];

  if(missing.length === 0){
    rules.push("Oggi hai chiuso le cose fondamentali. Non aggiungere recuperi inutili: proteggi sonno e routine serale.");
  } else {
    if(missing.includes("Tesi")){
      rules.push(n < 1630 ? "Tesi: sei ancora in tempo. Priorità a scrittura/revisione prima di chiudere il lavoro." : "Tesi saltata o incompleta: recupero pulito domani con +45 minuti, oppure sabato 10:00–12:00.");
    }
    if(missing.includes("Inglese")){
      rules.push(n < 2130 ? "Inglese: tieni il minimo da 30 minuti entro sera. Meglio poco oggi che due ore buttate domani." : "Inglese saltato: domani +15 minuti. Non superare un giorno consecutivo senza inglese.");
    }
    if(missing.includes("Allenamento")){
      if(hasWorkout(dayData)){
        rules.push("Allenamento: se salta oggi, spostalo al prossimo slot libero. Non recuperare due allenamenti nello stesso giorno.");
      } else {
        rules.push("Movimento: oggi basta camminata/stretching se previsto. Se non era giorno palestra, non inventarti sensi di colpa.");
      }
    }
  }

  if(today === "Domenica"){
    rules.push("Domenica: recupero solo se hai saltato una cosa fondamentale. Altrimenti riposo vero.");
  }

  $("todayRules").innerHTML = rules.map(r => `<div class="rule">${r}</div>`).join("");
}
function renderChecklist(){
  const essentials = dayEssentials(pickToday());
  const done = getDone();

  $("checklist").innerHTML = ESSENTIALS.map(name => {
    const isTodayEssential = essentials.includes(name);
    const isDone = done.includes(name);
    const disabled = !isTodayEssential;
    return `<div class="check ${isDone ? "done" : ""} ${disabled ? "disabled-check" : ""}" data-name="${name}" data-disabled="${disabled}">
      <span>${name}</span>
      <span class="badge">${disabled ? "non previsto" : (isDone ? "fatto" : "da fare")}</span>
    </div>`;
  }).join("");

  document.querySelectorAll(".check").forEach(el => {
    el.onclick = () => {
      if(el.dataset.disabled === "true") return;
      const name = el.dataset.name;
      let d = getDone();
      d = d.includes(name) ? d.filter(x => x !== name) : [...d, name];
      setDone(d);
      render();
    };
  });
}
function renderScore(){
  const daily = scoreForDate(new Date());
  const weekly = scoreRange(7);
  const monthly = monthScore();

  $("dailyScore").textContent = `${daily.percent}%`;
  $("dailyScoreText").textContent = `${daily.count}/${daily.total} fondamentali completate oggi`;

  $("weeklyScore").textContent = `${weekly.percent}%`;
  $("weeklyScoreText").textContent = `${weekly.count}/${weekly.total} fondamentali negli ultimi 7 giorni`;

  $("monthlyScore").textContent = `${monthly.percent}%`;
  $("monthlyScoreText").textContent = `${monthly.count}/${monthly.total} fondamentali da inizio mese`;

  $("weeklyBars").innerHTML = weekly.rows.map(r => {
    const short = r.dayName.slice(0,3);
    return `<div class="bar-row">
      <span class="bar-day">${short}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${r.percent}%"></div></div>
      <span class="bar-score">${r.count}/${r.total}</span>
    </div>`;
  }).join("");

  const habits = ESSENTIALS.map(name => {
    let completed = 0, possible = 0;
    weekly.rows.forEach(r => {
      if(r.essentials.includes(name)){
        possible += 1;
        if(r.completed.includes(name)) completed += 1;
      }
    });
    const pct = possible ? Math.round(completed/possible*100) : 0;
    return {name, completed, possible, pct};
  });

  $("habitBreakdown").innerHTML = habits.map(h => `
    <div class="habit">
      <div>
        <strong>${h.name}</strong>
        <p>${h.completed}/${h.possible} negli ultimi 7 giorni</p>
      </div>
      <span class="habit-score">${h.pct}%</span>
    </div>
  `).join("");
}
function renderRoutine(){
  const dayData = data.days[selectedDay];
  $("today-subtitle").textContent = `${pickToday()} · ${data.days[pickToday()].type}`;
  $("day-title").textContent = `${selectedDay} — ${dayData.type}`;

  const activityDone = getActivityDone();

  $("timeline").innerHTML = dayData.items.map((it, idx) => {
    const n = nowMinutes();
    const isToday = selectedDay === pickToday();
    const isCurrent = isToday && minutes(it[0]) <= n && n <= minutes(it[1]);
    const id = activityId(selectedDay, it);
    const isDone = isToday && activityDone.includes(id);
    return `<div class="slot ${isCurrent ? "current" : ""} ${isDone ? "done-slot" : ""}" data-activity-id="${id}">
      <div class="time">${it[0]}<br>${it[1]}</div>
      <div class="task">
        <span>${it[2]}</span>
        ${isDone ? `<span class="done-mark">Completata ✓</span>` : ``}
      </div>
    </div>`;
  }).join("");
}
function renderNext(){
  const today = pickToday();
  const dayData = data.days[today];
  const activeOrNext = currentOrNext(dayData.items);
  const id = activityId(today, activeOrNext);
  const activityDone = getActivityDone();
  const isDone = activityDone.includes(id);
  const active = currentActivity(dayData.items);

  $("next-title").textContent = activeOrNext[2];
  $("next-time").textContent = `${activeOrNext[0]} – ${activeOrNext[1]}${active ? " · in corso" : " · prossima"}`;
  $("doneBtn").textContent = isDone ? "Completata ✓" : "Fatta";
  $("doneBtn").disabled = isDone;
  $("doneBtn").style.opacity = isDone ? "0.65" : "1";
}
function render(){
  renderNext();
  renderChecklist();
  renderTodayRules();
  renderScore();
  renderRoutine();
}
async function init(){
  data = await fetch("routine-data.json").then(r => r.json());
  selectedDay = pickToday();

  const select = $("daySelect");
  Object.keys(data.days).forEach(day => {
    const opt = document.createElement("option");
    opt.value = day;
    opt.textContent = day;
    if(day === selectedDay) opt.selected = true;
    select.appendChild(opt);
  });
  select.onchange = () => {
    selectedDay = select.value;
    render();
  };

  document.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      $(btn.dataset.tab).classList.add("active");
      render();
    };
  });

  $("doneBtn").onclick = () => {
    const today = pickToday();
    const dayData = data.days[today];
    const activeOrNext = currentOrNext(dayData.items);
    const id = activityId(today, activeOrNext);

    let activityDone = getActivityDone();
    if(!activityDone.includes(id)) activityDone.push(id);
    setActivityDone(activityDone);

    const essential = essentialFromActivity(activeOrNext[2]);
    if(essential){
      let d = getDone();
      if(!d.includes(essential)) d.push(essential);
      setDone(d);
    }

    render();
  };

  $("resetBtn").onclick = () => {
    localStorage.removeItem(completionKey());
    localStorage.removeItem(activityDoneKey());
    render();
  };

  $("notifyBtn").onclick = async () => {
    if (!("Notification" in window)) {
      alert("Le notifiche non sono supportate da questo browser.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      $("notifyBtn").textContent = "Notifiche attive";
      scheduleLocalNotifications(data.days[pickToday()].items);
      new Notification("Routine attiva", { body: "Promemoria locali impostati per oggi." });
    } else {
      alert("Permesso notifiche non concesso.");
    }
  };

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(console.warn);
  }

  render();
  scheduleLocalNotifications(data.days[pickToday()].items);
  setInterval(render, 60*1000);
}
init();
