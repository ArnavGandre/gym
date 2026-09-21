import { PROGRAM, DAYS, DAY_LABEL, START_WEIGHT } from "./data.js";
import { demoFor } from "./demos.js";

/* ── state ───────────────────────────────────────────── */
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parse = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const keyOf = s => DAYS[(parse(s).getDay() + 6) % 7];           // Mon-indexed
const plan = s => PROGRAM[keyOf(s)];
const rec = s => (S.days[s] ||= { done:{}, weight:null });
const totalSets = s => plan(s).items.reduce((a,x) => a + x.sets, 0);
const doneSets = s => {
  const d = S.days[s]; if(!d) return 0;
  return Object.values(d.done).reduce((a,arr) => a + arr.filter(Boolean).length, 0);
};

const LS = "ironlog.v1";
const CFG = "ironlog.cfg";
const blank = () => ({ days: {}, updated: 0 });

let S = load();
let cfg = loadCfg();
let sel = iso(new Date());

function load(){ try{ const r = JSON.parse(localStorage.getItem(LS)); return r && r.days ? r : blank(); }catch{ return blank(); } }
function loadCfg(){ try{ return JSON.parse(localStorage.getItem(CFG)) || {}; }catch{ return {}; } }
function save(){ S.updated = Date.now(); try{ localStorage.setItem(LS, JSON.stringify(S)); }catch{} queueSync(); }
function saveCfg(){ try{ localStorage.setItem(CFG, JSON.stringify(cfg)); }catch{} }

/* ── dom ─────────────────────────────────────────────── */
const $ = q => document.querySelector(q);
const el = { rail:$("#rail"), list:$("#list"), dayName:$("#dayName"), dayPct:$("#dayPct"),
  ring:$("#ring"), sDone:$("#sDone"), sStreak:$("#sStreak"), sTotal:$("#sTotal"),
  wt:$("#wt"), wDelta:$("#wDelta"), spark:$("#spark"), todayBox:$("#todayBox"),
  toast:$("#toast"), syncDot:$("#syncDot"), syncTxt:$("#syncTxt") };

/* ── render ──────────────────────────────────────────── */
function weekDates(){
  const base = parse(sel);
  const mon = new Date(base); mon.setDate(base.getDate() - ((base.getDay()+6)%7));
  return Array.from({length:7}, (_,i) => { const d = new Date(mon); d.setDate(mon.getDate()+i); return iso(d); });
}

function renderRail(){
  const today = iso(new Date());
  el.rail.innerHTML = weekDates().map(d => {
    const t = totalSets(d), n = doneSets(d);
    const state = n === 0 ? "none" : n >= t ? "full" : "some";
    return `<button class="day${d===sel?" is-on":""}${d===today?" is-today":""}" data-d="${d}" data-state="${state}"
      aria-pressed="${d===sel}"><span>${DAY_LABEL[keyOf(d)]}</span><span class="dot"></span></button>`;
  }).join("");
}

function renderList(){
  const p = plan(sel), r = rec(sel);
  el.dayName.textContent = p.name;
  el.list.innerHTML = p.items.map((x,i) => {
    const arr = r.done[i] || [];
    const full = arr.filter(Boolean).length >= x.sets;
    const rest = x.cardio ? null : (x.heavy ? "90–120s" : "45–60s");
    const dm = demoFor(x.n);
    return `<div class="card ex${full?" done":""}" data-i="${i}" style="animation-delay:${i*38}ms">
      <div class="top">
        <button class="meta" data-open="${i}" aria-expanded="false"
          aria-label="Show how to do ${x.n}">
          <span class="nm">${x.n}</span>
          <span class="sub">
            <span class="n">${x.sets===1?"":x.sets+" × "}${x.reps}</span>
            ${x.note?`<span>· ${x.note}</span>`:""}
            ${rest?`<span class="tag">· ${rest}</span>`:""}
            ${dm?`<span class="chev" aria-hidden="true">▾</span>`:""}
          </span>
        </button>
        <div class="sets">${Array.from({length:x.sets},(_,k)=>
          `<button class="set${arr[k]?" on":""}" data-i="${i}" data-k="${k}"
            aria-label="${x.n} set ${k+1}" aria-pressed="${!!arr[k]}">
            <span class="ripple"></span>
            <svg viewBox="0 0 24 24"><path d="M5 13l4.5 4.5L19 7"/></svg></button>`).join("")}
        </div>
      </div>
      <div class="detail" id="d${i}" hidden></div>
    </div>`;
  }).join("");
}

function renderStats(){
  const t = totalSets(sel), n = doneSets(sel), pct = t ? Math.round(n/t*100) : 0;
  el.ring.style.setProperty("--p", pct);
  el.sDone.innerHTML = `${n}<s>/${t} sets</s>`;
  el.dayPct.textContent = `${pct}% complete`;
  el.sStreak.innerHTML = `${streak()}<s>d</s>`;
  el.sTotal.textContent = Object.keys(S.days).filter(d => doneSets(d) >= totalSets(d)*0.5 && doneSets(d) > 0).length;

  const now = parse(sel);
  const isT = sel === iso(new Date());
  el.todayBox.innerHTML = `${now.toLocaleDateString(undefined,{month:"short",day:"numeric"})}<b>${isT?"Today":now.toLocaleDateString(undefined,{weekday:"long"})}</b>`;
}

function streak(){
  let n = 0, d = new Date();
  for(let i=0;i<400;i++){
    const k = iso(d);
    if(doneSets(k) > 0) n++;
    else if(i > 0) break;                     // today not-yet-logged doesn't break it
    d.setDate(d.getDate()-1);
  }
  return n;
}

/* ── weight ──────────────────────────────────────────── */
function weightSeries(){
  return Object.keys(S.days).filter(d => S.days[d].weight != null).sort()
    .map(d => ({ d, w: +S.days[d].weight }));
}

function renderWeight(){
  const r = rec(sel);
  if(document.activeElement !== el.wt) el.wt.value = r.weight ?? "";
  el.wt.placeholder = String(lastWeightBefore(sel) ?? START_WEIGHT);

  const ser = weightSeries();
  const first = ser.length ? ser[0].w : START_WEIGHT;
  const cur = r.weight ?? (ser.length ? ser[ser.length-1].w : null);
  if(cur == null){ el.wDelta.textContent = ""; el.wDelta.className = "delta"; }
  else {
    const dv = +(cur - first).toFixed(1);
    el.wDelta.textContent = ser.length < 2 ? `start ${first} kg` : `${dv>0?"+":""}${dv} kg since ${first}`;
    el.wDelta.className = "delta " + (dv > 0 ? "up" : dv < 0 ? "down" : "");
  }
  drawSpark(ser);
}

function lastWeightBefore(s){
  const ser = weightSeries().filter(p => p.d <= s);
  return ser.length ? ser[ser.length-1].w : null;
}

function drawSpark(ser){
  const W = 300, H = 42, pad = 4;
  if(ser.length < 2){
    el.spark.innerHTML = `<line x1="0" y1="${H/2}" x2="${W}" y2="${H/2}" stroke="rgba(255,255,255,.07)" stroke-width="1"/>`;
    return;
  }
  const ws = ser.map(p => p.w), lo = Math.min(...ws), hi = Math.max(...ws), span = hi - lo || 1;
  const pts = ser.map((p,i) => [
    pad + i * (W - pad*2) / (ser.length - 1),
    pad + (1 - (p.w - lo)/span) * (H - pad*2)
  ]);
  const line = pts.map((p,i) => `${i?"L":"M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length-1];
  el.spark.innerHTML = `
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(255,61,127,.22)"/><stop offset="1" stop-color="rgba(255,61,127,0)"/>
      </linearGradient>
    </defs>
    <path d="${line} L${last[0].toFixed(1)} ${H} L${pts[0][0].toFixed(1)} ${H} Z" fill="url(#g)"/>
    <path d="${line}" fill="none" stroke="#d8dae2" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"
      style="filter:drop-shadow(0 0 5px rgba(216,218,226,.4))"
      pathLength="1" stroke-dasharray="1" stroke-dashoffset="1">
      <animate attributeName="stroke-dashoffset" from="1" to="0" dur=".9s" fill="freeze"
        calcMode="spline" keySplines=".22 1 .36 1" keyTimes="0;1"/>
    </path>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6" fill="#ff3d7f"
      style="filter:drop-shadow(0 0 7px rgba(255,61,127,.75))"/>`;
}

const render = () => { renderRail(); renderList(); renderStats(); renderWeight(); };

/* ── interaction ─────────────────────────────────────── */
el.rail.addEventListener("click", e => {
  const b = e.target.closest(".day"); if(!b) return;
  sel = b.dataset.d; render();
});

function detailHTML(x){
  const dm = demoFor(x.n);
  if(!dm) return "";
  const q = encodeURIComponent(`how to ${x.n} proper form`);
  return `
    <div class="demo">
      <img src="${dm.frames[0]}" alt="${x.n}, start position" loading="lazy" decoding="async">
      <img src="${dm.frames[1]}" alt="${x.n}, end position" loading="lazy" decoding="async">
    </div>
    <div class="chips">
      ${dm.muscles?`<span class="chip">${dm.muscles}</span>`:""}
      ${dm.equipment?`<span class="chip">${dm.equipment}</span>`:""}
    </div>
    <ol class="cues">${dm.cues.map(c => `<li>${c}</li>`).join("")}</ol>
    <a class="yt" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">
      Watch a video ↗
    </a>`;
}

el.list.addEventListener("click", e => {
  const b = e.target.closest(".meta"); if(!b) return;
  const i = +b.dataset.open, card = b.closest(".ex"), d = card.querySelector(".detail");
  const open = card.classList.contains("open");

  el.list.querySelectorAll(".ex.open").forEach(c => {          // one at a time
    c.classList.remove("open");
    c.querySelector(".meta").setAttribute("aria-expanded", "false");
    const dd = c.querySelector(".detail");
    dd.style.maxHeight = ""; setTimeout(() => { if(!c.classList.contains("open")) dd.hidden = true; }, 420);
  });
  if(open) return;

  if(!d.innerHTML) d.innerHTML = detailHTML(plan(sel).items[i]);
  if(!d.innerHTML) return;                                      // no demo for this one
  d.hidden = false;
  card.classList.add("open");
  b.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => { d.style.maxHeight = d.scrollHeight + "px"; });
});

el.list.addEventListener("click", e => {
  const b = e.target.closest(".set"); if(!b) return;
  const i = +b.dataset.i, k = +b.dataset.k, x = plan(sel).items[i], r = rec(sel);
  const arr = (r.done[i] ||= Array(x.sets).fill(false));
  arr[k] = !arr[k];
  b.classList.toggle("on", arr[k]);
  b.setAttribute("aria-pressed", String(arr[k]));
  b.closest(".ex").classList.toggle("done", arr.filter(Boolean).length >= x.sets);
  save(); renderStats(); renderRail();
  if(arr[k]){
    if(navigator.vibrate) navigator.vibrate(8);
    if(!x.cardio) startRest(x.heavy ? 105 : 50);
    if(doneSets(sel) >= totalSets(sel)) { toast("Day complete"); burst(); }
  }
});

el.wt.addEventListener("input", () => {
  const v = parseFloat(el.wt.value);
  rec(sel).weight = Number.isFinite(v) ? Math.round(v*10)/10 : null;
  save(); renderWeight();
});

$("#bReset").addEventListener("click", () => {
  if(!confirm(`Clear all ticks for ${sel}?`)) return;
  rec(sel).done = {}; save(); render(); toast("Day cleared");
});

$("#bExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(S,null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `ironlog-${iso(new Date())}.json`; a.click();
  URL.revokeObjectURL(a.href); toast("Exported");
});

document.addEventListener("keydown", e => {
  if(e.target.tagName === "INPUT") return;
  if(e.key === "ArrowLeft" || e.key === "ArrowRight"){
    const d = parse(sel); d.setDate(d.getDate() + (e.key === "ArrowRight" ? 1 : -1));
    sel = iso(d); render();
  }
  if(e.key === "t") { sel = iso(new Date()); render(); }
});

/* ── rest timer ──────────────────────────────────────── */
const T = { box:$("#timer"), val:$("#tVal"), bar:$("#tBar"), id:null, left:0, span:0 };
function startRest(sec){
  T.left = sec; T.span = sec;
  T.box.classList.add("show");
  clearInterval(T.id);
  tick();
  T.id = setInterval(() => { T.left--; tick(); if(T.left <= 0) endRest(true); }, 1000);
}
function tick(){
  T.val.textContent = `${Math.floor(T.left/60)}:${String(Math.max(0,T.left%60)).padStart(2,"0")}`;
  T.bar.style.transform = `scaleX(${Math.max(0, T.left/T.span)})`;
}
function endRest(done){
  clearInterval(T.id); T.id = null; T.box.classList.remove("show");
  if(done){ if(navigator.vibrate) navigator.vibrate([14,60,14]); toast("Go"); }
}
$("#tStop").addEventListener("click", () => endRest(false));
$("#tAdd").addEventListener("click", () => { T.left += 30; T.span = Math.max(T.span, T.left); tick(); });

/* ── toast + flourish ────────────────────────────────── */
let tt;
function toast(msg){
  el.toast.textContent = msg; el.toast.classList.add("show");
  clearTimeout(tt); tt = setTimeout(() => el.toast.classList.remove("show"), 1700);
}
function burst(){
  for(let i=0;i<16;i++){
    const s = document.createElement("i");
    const a = Math.random()*Math.PI*2, r = 60 + Math.random()*120;
    s.style.cssText = `position:fixed;left:50%;top:38%;width:3px;height:3px;border-radius:50%;
      background:${i%3?"#ff3d7f":"#d8dae2"};pointer-events:none;z-index:70;
      box-shadow:0 0 8px currentColor;transition:transform .9s cubic-bezier(.22,1,.36,1),opacity .9s`;
    document.body.appendChild(s);
    requestAnimationFrame(() => {
      s.style.transform = `translate(${Math.cos(a)*r}px,${Math.sin(a)*r}px) scale(0)`;
      s.style.opacity = "0";
    });
    setTimeout(() => s.remove(), 950);
  }
}

/* ── optional cloud sync (Vercel/Netlify + Postgres) ─── */
function setSync(kind, txt){ el.syncDot.className = "dotstate " + kind; el.syncTxt.textContent = txt; }
let syncTimer;
function queueSync(){ if(!cfg.api) return; clearTimeout(syncTimer); syncTimer = setTimeout(push, 1200); }

async function api(method, body){
  const r = await fetch(cfg.api, {
    method, headers: { "content-type":"application/json", "x-gym-token": cfg.token || "" },
    body: body ? JSON.stringify(body) : undefined
  });
  if(!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}
async function push(){
  try{ setSync("", "Syncing…"); await api("POST", S); setSync("ok", "Synced"); }
  catch(e){ setSync("err", "Sync failed"); console.warn(e); }
}
async function pull(){
  try{
    setSync("", "Syncing…");
    const remote = await api("GET");
    if(remote && remote.days && (remote.updated||0) > (S.updated||0)){
      S = remote; try{ localStorage.setItem(LS, JSON.stringify(S)); }catch{}
      render(); toast("Pulled from cloud");
    } else { await api("POST", S); }
    setSync("ok", "Synced");
  }catch(e){ setSync("err", "Sync failed"); console.warn(e); }
}
$("#bSync").addEventListener("click", async () => {
  if(!cfg.api){
    const url = prompt("Sync endpoint URL (e.g. https://your-app.vercel.app/api/data)\nLeave blank to stay local-only.", "");
    if(!url) return;
    cfg.api = url.trim();
    cfg.token = (prompt("Sync token (SYNC_TOKEN from your deployment)", "") || "").trim();
    saveCfg();
  }
  pull();
});

/* ── boot ────────────────────────────────────────────── */
if(!weightSeries().length && rec(sel).weight == null){ rec(sel).weight = START_WEIGHT; save(); }
render();
setSync(cfg.api ? "ok" : "", cfg.api ? "Cloud sync on" : "Local only");
if(cfg.api) pull();
