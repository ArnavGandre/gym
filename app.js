import { PROGRAM, DAYS, DAY_LABEL, START_WEIGHT } from "./data.js";
import { demoFor } from "./demos.js";

/* ── state ───────────────────────────────────────────── */
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parse = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const keyOf = s => DAYS[(parse(s).getDay() + 6) % 7];           // Mon-indexed
const plan = s => PROGRAM[keyOf(s)];
const rec = s => (S.days[s] ||= { done:{}, weight:null, ts:0 });
const touch = s => { rec(s).ts = Date.now(); };
const totalSets = s => plan(s).items.reduce((a,x) => a + x.sets, 0);
const doneSets = s => {                 // clamped to the current template,
  const d = S.days[s]; if(!d) return 0;  // so edits to data.js can't push a day past 100%
  return plan(s).items.reduce((a, x, i) =>
    a + ((d.done[i] || []).slice(0, x.sets).filter(Boolean).length), 0);
};

const LS = "ironlog.v1";
const CFG = "ironlog.cfg";
const blank = () => ({ days: {}, updated: 0 });

let S = load();
let cfg = loadCfg();
let sel = iso(new Date());
let view = "week";                       // "week" | "month"
let mCur = (() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; })();

function load(){ try{ const r = JSON.parse(localStorage.getItem(LS)); return r && r.days ? r : blank(); }catch{ return blank(); } }
function loadCfg(){ try{ return JSON.parse(localStorage.getItem(CFG)) || {}; }catch{ return {}; } }
function save(){ S.updated = Date.now(); try{ localStorage.setItem(LS, JSON.stringify(S)); }catch{} queueSync(); }
function saveCfg(){ try{ localStorage.setItem(CFG, JSON.stringify(cfg)); }catch{} }

/* ── dom ─────────────────────────────────────────────── */
const $ = q => document.querySelector(q);
const el = { rail:$("#rail"), list:$("#list"), dayName:$("#dayName"), dayPct:$("#dayPct"),
  ring:$("#ring"), sDone:$("#sDone"), sStreak:$("#sStreak"), sTotal:$("#sTotal"),
  wt:$("#wt"), wDelta:$("#wDelta"), spark:$("#spark"), todayBox:$("#todayBox"),
  toast:$("#toast"), syncDot:$("#syncDot"), syncTxt:$("#syncTxt"),
  grid:$("#grid"), mLabel:$("#mLabel"), mStats:$("#mStats"), weekView:$("#weekView"), monthView:$("#monthView") };

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

const render = () => {
  if(view === "month") return renderMonth();
  renderRail(); renderList(); renderStats(); renderWeight();
};


/* ── month view ──────────────────────────────────────── */
const MONTH = ["January","February","March","April","May","June",
               "July","August","September","October","November","December"];

function monthDays(y, m){
  const first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
  const lead = (first.getDay() + 6) % 7;                    // Mon-indexed blanks
  const out = Array(lead).fill(null);
  for(let d = 1; d <= last.getDate(); d++) out.push(iso(new Date(y, m, d)));
  return out;
}

function renderMonth(){
  const { y, m } = mCur, today = iso(new Date());
  el.mLabel.textContent = `${MONTH[m]} ${y}`;

  el.grid.innerHTML =
    ["M","T","W","T","F","S","S"].map(d => `<span class="gh">${d}</span>`).join("") +
    monthDays(y, m).map(d => {
      if(!d) return `<span class="cell blank"></span>`;
      const t = totalSets(d), n = doneSets(d);
      const pct = t ? Math.round(n / t * 100) : 0;
      const rest = keyOf(d) === "sun";
      const cls = n === 0 ? (rest ? "rest" : "") : n >= t ? "full" : "some";
      return `<button class="cell ${cls}${d === today ? " today" : ""}${d === sel ? " sel" : ""}"
        data-d="${d}" style="--p:${pct}"
        aria-label="${d}, ${n} of ${t} sets"><span>${parse(d).getDate()}</span></button>`;
    }).join("");

  const days = monthDays(y, m).filter(Boolean);
  const logged = days.filter(d => doneSets(d) > 0);
  const full = days.filter(d => doneSets(d) > 0 && doneSets(d) >= totalSets(d));
  const sets = days.reduce((a, d) => a + doneSets(d), 0);
  const ws = days.map(d => S.days[d] && S.days[d].weight).filter(w => w != null);
  const wTxt = ws.length
    ? (ws.length > 1 ? `${ws[0]} → ${ws[ws.length - 1]}` : `${ws[0]}`) + " kg"
    : "—";

  el.mStats.innerHTML = [
    ["Trained", `${logged.length}<s>/${days.length} days</s>`],
    ["Complete", `${full.length}`],
    ["Sets", `${sets}`],
    ["Weight", `<span class="sm">${wTxt}</span>`]
  ].map(([k, v]) => `<div class="card stat"><span class="lbl">${k}</span><span class="v">${v}</span></div>`).join("");
}

function setView(v){
  view = v;
  el.weekView.hidden = v !== "week";
  el.monthView.hidden = v !== "month";
  document.querySelectorAll("[data-view]").forEach(b =>
    b.classList.toggle("on", b.dataset.view === v));
  if(v === "month"){ mCur = { y: parse(sel).getFullYear(), m: parse(sel).getMonth() }; renderMonth(); }
  else render();
}

document.querySelectorAll("[data-view]").forEach(b =>
  b.addEventListener("click", () => setView(b.dataset.view)));

$("#mPrev").addEventListener("click", () => {
  mCur = mCur.m === 0 ? { y: mCur.y - 1, m: 11 } : { ...mCur, m: mCur.m - 1 };
  renderMonth();
});
$("#mNext").addEventListener("click", () => {
  mCur = mCur.m === 11 ? { y: mCur.y + 1, m: 0 } : { ...mCur, m: mCur.m + 1 };
  renderMonth();
});
el.grid.addEventListener("click", e => {
  const c = e.target.closest(".cell"); if(!c || !c.dataset.d) return;
  sel = c.dataset.d;
  setView("week");
});

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
  touch(sel);
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
  touch(sel);
  save(); renderWeight();
});

$("#bReset").addEventListener("click", () => {
  if(!confirm(`Clear all ticks for ${sel}?`)) return;
  const r = rec(sel); r.done = {}; r.clr = Date.now(); touch(sel);
  save(); render(); toast("Day cleared");
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

/* ── sync ────────────────────────────────────────────────
   Two backends, both optional:
     gist — a secret GitHub Gist, needs only a token, no server
     api  — the Vercel/Postgres endpoint in api/data.js
   Merging is per-day on a per-day timestamp, so connecting a fresh
   device never wipes the history already on another one.          */

const GIST_DESC = "ironlog-sync";
const GIST_FILE = "ironlog.json";

// A completed set is never dropped: ticks are unioned rather than letting one
// side's copy of the day win outright. That matters because records written
// before per-day timestamps existed carry ts 0 and would lose every contest.
// Only "Clear day" removes ticks, and it stamps clr so it can beat the other
// side's earlier edits.
function mergeDay(a, b){
  const at = a.ts || 0, bt = b.ts || 0;
  const ac = a.clr || 0, bc = b.clr || 0;
  const wipe = ac > bt ? a : bc > at ? b : null;

  let done;
  if(wipe) done = { ...(wipe.done || {}) };
  else {
    done = {};
    for(const k of new Set([...Object.keys(a.done || {}), ...Object.keys(b.done || {})])){
      const x = (a.done || {})[k] || [], y = (b.done || {})[k] || [];
      done[k] = Array.from({ length: Math.max(x.length, y.length) }, (_, i) => !!(x[i] || y[i]));
    }
  }
  const newer = bt > at ? b : a, older = bt > at ? a : b;
  return {
    done,
    weight: newer.weight ?? older.weight ?? null,
    ts: Math.max(at, bt),
    clr: Math.max(ac, bc)
  };
}

function mergeState(a, b){
  const days = { ...(a.days || {}) };
  for(const [d, rb] of Object.entries(b.days || {})){
    days[d] = days[d] ? mergeDay(days[d], rb) : rb;
  }
  return { days, updated: Math.max(a.updated || 0, b.updated || 0) };
}

function setSync(kind, txt){ el.syncDot.className = "dotstate " + kind; el.syncTxt.textContent = txt; }

const gh = (path, opts = {}) => fetch("https://api.github.com" + path, {
  ...opts,
  headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json",
             "X-GitHub-Api-Version": "2022-11-28", ...(opts.headers || {}) }
});
async function ghJSON(path, opts){
  const r = await gh(path, opts);
  if(!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 120)}`);
  return r.json();
}

const BACKEND = {
  gist: {
    async ensure(){
      if(cfg.gistId) return cfg.gistId;
      const list = await ghJSON("/gists?per_page=100");
      const hit = list.find(g => g.description === GIST_DESC || (g.files && g.files[GIST_FILE]));
      cfg.gistId = hit ? hit.id : (await ghJSON("/gists", { method:"POST", body: JSON.stringify({
        description: GIST_DESC, public: false,
        files: { [GIST_FILE]: { content: JSON.stringify(blank()) } }
      })})).id;
      saveCfg();
      return cfg.gistId;
    },
    async get(){
      const g = await ghJSON(`/gists/${await this.ensure()}`);
      const f = g.files && g.files[GIST_FILE];
      if(!f) return blank();
      const raw = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
      try{ return JSON.parse(raw); }catch{ return blank(); }
    },
    async put(state){
      await ghJSON(`/gists/${await this.ensure()}`, { method:"PATCH", body: JSON.stringify({
        files: { [GIST_FILE]: { content: JSON.stringify(state) } }
      })});
    }
  },
  api: {
    async call(method, body){
      const r = await fetch(cfg.api, {
        method, headers: { "content-type":"application/json", "x-gym-token": cfg.token || "" },
        body: body ? JSON.stringify(body) : undefined
      });
      if(!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 120)}`);
      return r.json();
    },
    get(){ return this.call("GET"); },
    put(state){ return this.call("POST", state); }
  }
};

const backend = () => cfg.mode ? BACKEND[cfg.mode] : null;

let syncing = false, pending = false, syncTimer;
function queueSync(){
  if(!backend()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 1500);
}

async function syncNow(){
  const be = backend();
  if(!be) return;
  if(syncing){ pending = true; return; }
  syncing = true;
  setSync("", "Syncing…");
  try{
    const remote = await be.get();
    const merged = mergeState(S, remote && remote.days ? remote : blank());
    const changedLocally = JSON.stringify(merged) !== JSON.stringify(S);
    S = merged;
    try{ localStorage.setItem(LS, JSON.stringify(S)); }catch{}
    await be.put(S);
    if(changedLocally) render();
    setSync("ok", "Synced " + new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}));
  }catch(e){
    setSync("err", "Sync failed");
    console.warn(e);
    sheetMsg(String(e.message || e));
  }finally{
    syncing = false;
    if(pending){ pending = false; queueSync(); }
  }
}

// keep devices current without any tapping: returning to the tab,
// refocusing the window, coming back from bfcache, or regaining network
document.addEventListener("visibilitychange", () => { if(!document.hidden) syncNow(); });
addEventListener("focus", syncNow);
addEventListener("pageshow", e => { if(e.persisted) syncNow(); });
addEventListener("online", syncNow);

/* ── sync sheet ──────────────────────────────────────── */
const sheet = $("#sheet");
const sheetMsg = m => { $("#shMsg").textContent = m || ""; };
const openSheet = () => {
  sheet.classList.add("show");
  $("#shGistToken").value = cfg.mode === "gist" ? cfg.token || "" : "";
  $("#shUrl").value = cfg.api || "";
  $("#shApiToken").value = cfg.mode === "api" ? cfg.token || "" : "";
  $("#shState").textContent = cfg.mode
    ? `Connected via ${cfg.mode === "gist" ? "GitHub Gist" : "custom endpoint"}.`
    : "Not connected — this device keeps its own copy.";
  $("#bDisconnect").hidden = !cfg.mode;
  sheetMsg("");
};
const closeSheet = () => sheet.classList.remove("show");

$("#bSync").addEventListener("click", openSheet);
$("#shClose").addEventListener("click", closeSheet);
sheet.addEventListener("click", e => { if(e.target === sheet) closeSheet(); });

sheet.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => {
  sheet.querySelectorAll("[data-tab]").forEach(x => x.classList.toggle("on", x === b));
  sheet.querySelectorAll("[data-pane]").forEach(p => p.hidden = p.dataset.pane !== b.dataset.tab);
}));

$("#bConnectGist").addEventListener("click", async () => {
  const t = $("#shGistToken").value.trim();
  if(!t) return sheetMsg("Paste a token first.");
  sheetMsg("Connecting…");
  const prev = { ...cfg };
  cfg = { mode:"gist", token:t, gistId: cfg.gistId };
  try{
    await BACKEND.gist.ensure();
    saveCfg();
    await syncNow();
    sheetMsg("Connected. Paste the same token on your other device.");
    setTimeout(closeSheet, 1400);
  }catch(e){ cfg = prev; saveCfg(); sheetMsg(String(e.message || e)); }
});

$("#bConnectApi").addEventListener("click", async () => {
  const url = $("#shUrl").value.trim();
  if(!url) return sheetMsg("Paste the endpoint URL first.");
  const prev = { ...cfg };
  cfg = { mode:"api", api:url, token: $("#shApiToken").value.trim() };
  saveCfg();
  sheetMsg("Connecting…");
  try{ await syncNow(); sheetMsg("Connected."); setTimeout(closeSheet, 1200); }
  catch(e){ cfg = prev; saveCfg(); sheetMsg(String(e.message || e)); }
});

$("#bDisconnect").addEventListener("click", () => {
  if(!confirm("Disconnect sync on this device? Your log stays here.")) return;
  cfg = {}; saveCfg();
  setSync("", "This device only");
  closeSheet(); toast("Disconnected");
});

/* ── boot ────────────────────────────────────────────── */
render();
setSync(cfg.mode ? "ok" : "", cfg.mode ? "Sync on" : "This device only");
if(cfg.mode) syncNow();
