
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
function getDone(){
  return JSON.parse(localStorage.getItem(completionKey()) || "[]");
}
function setDone(arr){
  localStorage.setItem(completionKey(), JSON.stringify(arr));
}
function pickToday(){
  return dayNames[new Date().getDay()];
}
function currentOrNext(items){
  const n = nowMinutes();
  return items.find(x => minutes(x[1]) >= n) || items[items.length-1];
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

  const next = currentOrNext(dayData.items);
  $("next-title").textContent = next[2];
  $("next-time").textContent = `${next[0]} – ${next[1]}`;

  const done = getDone();

  $("timeline").innerHTML = dayData.items.map((it, idx) => {
    const n = nowMinutes();
    const isCurrent = minutes(it[0]) <= n && n <= minutes(it[1]);
    return `<div class="slot ${isCurrent ? "current" : ""}">
      <div class="time">${it[0]}<br>${it[1]}</div>
      <div class="task">${it[2]}</div>
    </div>`;
  }).join("");

  const essential = [
    ["Tesi / lavoro", dayData.items.some(x => x[2].toLowerCase().includes("tesi"))],
    ["Inglese", dayData.items.some(x => x[2].toLowerCase().includes("inglese"))],
    ["Allenamento / movimento", dayData.items.some(x => /(palestra|tennis|camminata|stretching)/i.test(x[2]))],
    ["Cena e routine sonno", dayData.items.some(x => x[2].toLowerCase().includes("routine sonno"))]
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
    const next = currentOrNext(data.days[selectedDay].items);
    let d = getDone();
    if(!d.includes(next[2])) d.push(next[2]);
    setDone(d);
    render();
  };

  $("resetBtn").onclick = () => {
    localStorage.removeItem(completionKey());
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
