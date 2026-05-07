
const dayNames = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
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
function todayKey(){
  return new Date().toISOString().slice(0,10);
}
function completionKey(){
  return "routine_done_" + todayKey();
}
function activityDoneKey(){
  return "routine_activity_done_" + todayKey();
}
function getDone(){
  return JSON.parse(localStorage.getItem(completionKey()) || "[]");
}
function setDone(arr){
  localStorage.setItem(completionKey(), JSON.stringify(arr));
}
function getActivityDone(){
  return JSON.parse(localStorage.getItem(activityDoneKey()) || "[]");
}
function setActivityDone(arr){
  localStorage.setItem(activityDoneKey(), JSON.stringify(arr));
}
function activityId(day, item){
  return `${day}|${item[0]}-${item[1]}|${item[2]}`;
}
function pickToday(){
  return dayNames[new Date().getDay()];
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

function render(){
  const dayData = data.days[selectedDay];
  $("today-subtitle").textContent = `${selectedDay} · ${dayData.type}`;
  $("day-title").textContent = `${selectedDay} — ${dayData.type}`;

  const active = currentActivity(dayData.items);
  const next = currentOrNext(dayData.items);
  const activityDone = getActivityDone();
  const nextId = activityId(selectedDay, next);
  const nextIsDone = activityDone.includes(nextId);

  $("next-title").textContent = next[2];
  $("next-time").textContent = `${next[0]} – ${next[1]}${active ? " · in corso" : " · prossima"}`;
  $("doneBtn").textContent = nextIsDone ? "Completata ✓" : "Fatta";
  $("doneBtn").disabled = nextIsDone;
  $("doneBtn").style.opacity = nextIsDone ? "0.65" : "1";

  const done = getDone();

  $("timeline").innerHTML = dayData.items.map((it, idx) => {
    const n = nowMinutes();
    const isCurrent = minutes(it[0]) <= n && n <= minutes(it[1]);
    const id = activityId(selectedDay, it);
    const isDone = activityDone.includes(id);
    return `<div class="slot ${isCurrent ? "current" : ""} ${isDone ? "done-slot" : ""}" data-activity-id="${id}">
      <div class="time">${it[0]}<br>${it[1]}</div>
      <div class="task">
        <span>${it[2]}</span>
        ${isDone ? `<span class="done-mark">Completata ✓</span>` : ``}
      </div>
    </div>`;
  }).join("");

  const essential = [
    ["Tesi / lavoro", dayData.items.some(x => x[2].toLowerCase().includes("tesi"))],
    ["Inglese", dayData.items.some(x => x[2].toLowerCase().includes("inglese"))],
    ["Allenamento / movimento", dayData.items.some(x => /(palestra|tennis|camminata|stretching)/i.test(x[2]))],
    ["Cena e routine sonno", dayData.items.some(x => x[2].toLowerCase().includes("cena") || x[2].toLowerCase().includes("routine sonno"))]
  ].filter(x => x[1]).map(x => x[0]);

  $("checklist").innerHTML = essential.map(name => {
    const isDone = done.includes(name);
    return `<div class="check ${isDone ? "done" : ""}" data-name="${name}">
      <span>${name}</span><span class="badge">${isDone ? "fatto" : "da fare"}</span>
    </div>`;
  }).join("");

  document.querySelectorAll(".check").forEach(el => {
    el.onclick = () => {
      const name = el.dataset.name;
      let d = getDone();
      d = d.includes(name) ? d.filter(x => x !== name) : [...d, name];
      setDone(d);
      render();
    };
  });
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

  $("rules").innerHTML = data.rules.map(r => `<li>${r}</li>`).join("");

  $("doneBtn").onclick = () => {
    const dayData = data.days[selectedDay];
    const activeOrNext = currentOrNext(dayData.items);
    const id = activityId(selectedDay, activeOrNext);

    let activityDone = getActivityDone();
    if(!activityDone.includes(id)) activityDone.push(id);
    setActivityDone(activityDone);

    // Aggiorna anche la checklist macro quando riconosce attività importanti
    let d = getDone();
    const title = activeOrNext[2].toLowerCase();

    if(title.includes("tesi") && !d.includes("Tesi / lavoro")) d.push("Tesi / lavoro");
    if(title.includes("inglese") && !d.includes("Inglese")) d.push("Inglese");
    if(/palestra|tennis|camminata|stretching/i.test(activeOrNext[2]) && !d.includes("Allenamento / movimento")) d.push("Allenamento / movimento");
    if((title.includes("cena") || title.includes("routine sonno")) && !d.includes("Cena e routine sonno")) d.push("Cena e routine sonno");

    setDone(d);
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
      scheduleLocalNotifications(data.days[selectedDay].items);
      new Notification("Routine attiva", { body: "Promemoria locali impostati per oggi." });
    } else {
      alert("Permesso notifiche non concesso.");
    }
  };

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(console.warn);
  }

  render();
  scheduleLocalNotifications(data.days[selectedDay].items);
  setInterval(render, 60*1000);
}
init();
