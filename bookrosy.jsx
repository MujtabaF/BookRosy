import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ════════════════════════════════════════════════════
//  ⚙️  CONFIG — fill these in
// ════════════════════════════════════════════════════
const ROSY_PASSWORD     = "Rosyis20!";
const ROSY_EMAIL        = "mujif4u@gmail.com";
const EJS_SERVICE_ID    = "service_rzm097e";
const EJS_PUBLIC_KEY    = "x8WUYRy5nEznmXWl9";
const EJS_TPL_TO_ROSY   = "template_g8aizgi";
const EJS_TPL_TO_FRIEND = "template_j4udst5";

// 🌸 "The one and only" strip: real Rosy shots only, warm / rosy-toned. Each path must be unique — no duplicates.
//    Do NOT reuse experience-card images: /RosyOrangeJuice, /RosyWithFood, /RosyMujiStore, /RosyLibraryPuffer.
//    Files live in `public/` (spaces in filenames are OK — publicAsset encodes them). You have six Rosy-only shots here; add two more paths when you add new JPGs under public/ if you want eight again.
const PORTRAIT_PHOTOS = [
  "/RosyWithFlower.jpeg",
  "/Rosy Aesthetic.jpeg",
  "/RosyWearingCap.jpeg",
  "/RosCraveCulture.jpeg",
  "/RosyMujiSushi.jpeg",
  "/RosyMujiStore2.jpeg",
  "/RosyFIC.jpeg",
];

// Experience card images: same rule — `public/` folder + filename, or any https:// URL. Names with spaces are OK.
const EXPERIENCES = [
  {
    emoji: "☕️🍵", title: "Coffee and Match Runs",
    desc: "Lazy mornings and overly long chats about nothing and everything. She always knows the best spot.",
    img: "/RosyOrangeJuice.jpeg",
    tag: "Essential", tagBg: "#FFF4EE", tagCol: "#FF6534",
  },
  {
    emoji: "😋🍽️", title: "Food Adventures",
    desc: "Spontaneous peeling sessions, snack sharing, and the kind of comfort that needs no words.",
    img: "/RosyWithFood.jpeg",
    tag: "A must", tagBg: "#FEF0F5", tagCol: "#E8527A",
  },
  {
    emoji: "🛍️💳", title: "Shopping Sprees",
    desc: "She takes matcha very seriously. Expect strong opinions on oat milk ratios and perfect vibes.",
    img: "/RosyMujiStore.jpeg",
    tag: "Mandatory", tagBg: "#EDFAF3", tagCol: "#4D9070",
  },
  {
    emoji: "📚💻", title: "Study Sessions",
    desc: "Bring your laptop and your chaos. She'll bring snacks and somehow still finish her essay first.",
    img: "/RosyLibraryPuffer.jpeg",
    tag: "Chaotic good", tagBg: "#F5F0FE", tagCol: "#7C3AED",
  },
];

// Friend-group “reviews” — edit quotes or names anytime.
const REVIEWS_PREVIEW_COUNT = 3;

const HANGOUT_REVIEWS = [
  { quote: "She remembered my oat-milk order from three months ago. I don’t know if that’s love or a superpower.", author: "Priya", tag: "Coffee dates" },
  { quote: "I showed up stressed about an exam and left crying from laughter. Ten out of ten would vent again.", author: "Jordan", tag: "Study chaos" },
  { quote: "We walked into Muji for one thing and left with a philosophical debate and matching pens.", author: "Sam", tag: "Retail therapy" },
  { quote: "She peeled a mandarin like it was a ceremony and made me feel like the main character of lunch.", author: "Alex", tag: "Snack diplomacy" },
  { quote: "Zero judgment when I ordered dessert first. She actually encouraged it.", author: "Riley", tag: "Food adventures" },
  { quote: "The kind of person who texts 'outside' and you’re already smiling before you open the door.", author: "Casey", tag: "Spontaneous hangs" },
  { quote: "She’ll listen to your whole spiral, then say one sentence and you feel fixed. Witchcraft.", author: "Dev", tag: "Late-night talks" },
  { quote: "We missed the bus and somehow it became the best part of the day. That’s Rosy math.", author: "Morgan", tag: "City wandering" },
  { quote: "Brings snacks without being asked. If that’s not peak friendship I don’t know what is.", author: "Taylor", tag: "Care package energy" },
  { quote: "Leaves you warmer than when you arrived — like human sunshine with better playlists.", author: "Jamie", tag: "Just… Rosy" },
];

if (import.meta.env.DEV) {
  const expImgs = new Set(EXPERIENCES.map(e => e.img));
  const seen = new Set();
  for (const p of PORTRAIT_PHOTOS) {
    if (typeof p === "string" && p.startsWith("/") && expImgs.has(p))
      console.warn("[bookrosy] Portrait reuses an experience image — remove from PORTRAIT_PHOTOS:", p);
    if (seen.has(p)) console.warn("[bookrosy] Duplicate portrait path:", p);
    seen.add(p);
  }
}

// ════════════════════════════════════════════════════
//  UTILS
// ════════════════════════════════════════════════════
/** Resolves image paths for Vite: `public/photo.jpg` → use "/photo.jpg". Full http(s) URLs pass through. Encodes spaces. */
function publicAsset(path) {
  if (!path || /^https?:\/\//i.test(path)) return path;
  const clean = String(path).replace(/^\//, "");
  return "/" + clean.split("/").map(encodeURIComponent).join("/");
}

const uid  = () => Math.random().toString(36).slice(2, 9);
const pad  = n  => String(n).padStart(2, "0");
const toM  = t  => { const [h,m]=t.split(":").map(Number); return h*60+m; };
const frM  = m  => `${pad(Math.floor(m/60))}:${pad(m%60)}`;

function useLS(key, def) {
  const [v, sv] = useState(() => {
    try { const s=localStorage.getItem(key); return s?JSON.parse(s):def; } catch { return def; }
  });
  useEffect(()=>{ localStorage.setItem(key,JSON.stringify(v)); },[key,v]);
  return [v,sv];
}

function getWeek(off=0) {
  const now=new Date(), d=now.getDay();
  const mon=new Date(now);
  mon.setDate(now.getDate()-(d===0?6:d-1)+off*7);
  mon.setHours(0,0,0,0);
  return Array.from({length:7},(_,i)=>{ const dt=new Date(mon); dt.setDate(mon.getDate()+i); return dt; });
}
const isoDate = dt=>`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
const fmtDate = iso=>new Date(iso+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"});
const fmtTime = t => {
  if (!t) return "";
  if (t === "24:00") return "Midnight";
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 || 12;
  const ap = h < 12 ? "AM" : "PM";
  return `${h12}:${pad(m)} ${ap}`;
};
const fmtTimeRange = (start, end) => `${fmtTime(start)} – ${fmtTime(end)}`;

const CLASS_SCHEDULE = [
  { dayOfWeek:1, start:"10:30", end:"12:30", label:"Monday Class" },
  { dayOfWeek:3, start:"10:30", end:"11:30", label:"Wednesday Class" },
  { dayOfWeek:4, start:"14:30", end:"18:30", label:"Thursday Class" },
];
const START_HOUR=8, END_HOUR=24;

function halfHourTimes() {
  const s = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    s.push(`${pad(h)}:00`, `${pad(h)}:30`);
  }
  return s;
}
function endTimesAfter(start) {
  const sm = toM(start);
  const out = [];
  for (let m = sm + 30; m <= END_HOUR * 60; m += 30) {
    out.push(frM(m));
  }
  return out;
}
function defaultEndTime(start) {
  const opts = endTimesAfter(start);
  if (!opts.length) return "";
  const want = toM(start) + 60;
  return opts.find(t => toM(t) >= want) || opts[opts.length - 1];
}
function bookingEndM(b) {
  if (b.endTime && /^\d{1,2}:\d{2}$/.test(b.endTime)) return toM(b.endTime);
  return toM(b.time) + 60;
}

function getBusy(date,bookings,personalBlocks) {
  const dow=new Date(date+"T12:00:00").getDay(), b=[];
  CLASS_SCHEDULE.filter(c=>c.dayOfWeek===dow).forEach(c=>b.push({s:toM(c.start),e:toM(c.end),type:"class"}));
  personalBlocks.filter(x=>x.date===date).forEach(x=>b.push({s:toM(x.start),e:toM(x.end),type:"personal"}));
  bookings.filter(x=>x.date===date&&x.status==="confirmed").forEach(x=>b.push({s:toM(x.time),e:bookingEndM(x),type:"booked"}));
  return b;
}
function checkConflict(date, startT, endT, bookings, pBlocks) {
  const sm = toM(startT), em = toM(endT);
  if (em <= sm) return { label: "End time must be after start" };
  for (const b of getBusy(date, bookings, pBlocks)) {
    if (sm < b.e && em > b.s)
      return { label: b.type === "class" ? "Class time" : b.type === "personal" ? "Personal block" : "Already booked" };
  }
  return null;
}

async function ejsSend(templateId,params) {
  try {
    const r=await fetch("https://api.emailjs.com/api/v1.0/email/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_id:EJS_SERVICE_ID,template_id:templateId,user_id:EJS_PUBLIC_KEY,template_params:params})});
    return r.ok;
  } catch { return false; }
}
const notifyRosy   = bk => ejsSend(EJS_TPL_TO_ROSY, { rosy_email: ROSY_EMAIL, friend_name: bk.name, friend_email: bk.email, date: fmtDate(bk.date), time: fmtTimeRange(bk.time, frM(bookingEndM(bk))), reason: bk.reason });
const notifyFriend = (bk, d) => ejsSend(EJS_TPL_TO_FRIEND, { friend_name: bk.name, friend_email: bk.email, decision: d === "confirmed" ? "confirmed ✓" : "declined", date: fmtDate(bk.date), time: fmtTimeRange(bk.time, frM(bookingEndM(bk))), message: d === "confirmed" ? "Rosy confirmed your booking — see you then! 🌿" : "Rosy can't make it — try another slot? 🍊" });

// ════════════════════════════════════════════════════
//  CSS
// ════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#FFFBF8;
  --bg2:#FFF5EF;
  --bg3:#F5FBF7;
  --tang:#FF6534;
  --tang-s:#FF8C62;
  --tang-p:#FFF2EC;
  --tang-d:#D94A1A;
  --rose:#E8527A;
  --rose-s:#F47FAB;
  --rose-p:#FEF0F5;
  --sage:#4D9070;
  --sage-s:#71B898;
  --sage-p:#EDFAF3;
  --ink:#211C35;
  --mid:#7B7899;
  --light:#B8B5D0;
  --border:rgba(232,82,122,0.13);
  --border-o:rgba(255,101,52,0.13);
  --sh:0 4px 20px rgba(255,101,52,0.10);
  --sh-md:0 8px 36px rgba(255,101,52,0.13);
  --sh-lg:0 20px 70px rgba(255,101,52,0.16);
  --sh-rose:0 8px 30px rgba(232,82,122,0.2);
}
html{scroll-behavior:smooth;scroll-padding-top:76px}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;font-size:15px;line-height:1.65;overflow-x:hidden}
h1,h2,h3,h4{font-family:'Cormorant Garamond',Georgia,serif}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--rose-s);border-radius:3px}

/* ── NAV ── */
.nav{position:fixed;top:0;left:0;right:0;z-index:500;min-height:62px;display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:0 1.25rem;transition:background .35s,box-shadow .35s}
@media(min-width:640px){.nav{padding:0 2rem}}
@media(min-width:900px){.nav{padding:0 2.5rem}}
.nav.scrolled{background:rgba(255,251,248,0.88);backdrop-filter:blur(20px);box-shadow:0 1px 0 var(--border),0 4px 24px rgba(255,101,52,0.07)}
.nav-logo-btn{background:none;border:none;padding:.25rem .15rem;margin:0;cursor:pointer;text-align:left;-webkit-tap-highlight-color:transparent}
.nav-logo-btn:focus-visible{outline:2px solid var(--rose);outline-offset:3px;border-radius:6px}
.nav-logo{font-family:'Cormorant Garamond',serif;font-size:clamp(1.25rem,4vw,1.5rem);font-weight:400;letter-spacing:.01em;display:flex;align-items:baseline;color:var(--ink);text-shadow:none}
.nav.on-dark .nav-logo{color:#fff}
.nav-logo em{font-style:italic;color:var(--tang)}
.nav-logo .tld{font-size:.75em;opacity:.45;margin-left:1px}
.nav-center{flex:1;display:flex;align-items:center;justify-content:center;min-width:0}
.nav-site-links{display:none;align-items:center;gap:.15rem;flex-wrap:wrap;justify-content:center}
@media(min-width:900px){.nav-site-links{display:flex}}
.nav-link{background:none;border:none;padding:.42rem .65rem;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:500;color:var(--mid);cursor:pointer;border-radius:8px;transition:color .15s,background .15s;white-space:nowrap;-webkit-tap-highlight-color:transparent}
.nav-link:hover,.nav-link:focus-visible{color:var(--rose);background:rgba(232,82,122,.08)}
.nav-link:focus-visible{outline:2px solid var(--rose);outline-offset:0}
.nav-burger{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:5px;width:44px;height:44px;padding:0;border:none;border-radius:10px;background:rgba(255,255,255,.75);border:1.5px solid var(--border);cursor:pointer;flex-shrink:0;-webkit-tap-highlight-color:transparent}
.nav-burger:focus-visible{outline:2px solid var(--rose);outline-offset:2px}
@media(min-width:900px){.nav-burger{display:none}}
.nav-burger span{display:block;width:20px;height:2px;background:var(--ink);border-radius:1px;transition:transform .2s,opacity .2s}
.nav-burger.open span:nth-child(1){transform:translateY(7px) rotate(45deg)}
.nav-burger.open span:nth-child(2){opacity:0}
.nav-burger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
.nav-backdrop{display:none;position:fixed;inset:0;top:62px;background:rgba(33,28,53,.35);z-index:498}
.nav-backdrop.open{display:block}
.nav-mobile-panel{display:none;position:fixed;top:62px;left:0;right:0;z-index:499;flex-direction:column;padding:.85rem 1.25rem 1.25rem;background:rgba(255,251,248,.97);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);box-shadow:0 12px 40px rgba(33,28,53,.12);max-height:min(70vh,calc(100dvh - 62px));overflow-y:auto}
.nav-mobile-panel.open{display:flex}
.nav-mobile-panel .nav-link{display:block;width:100%;text-align:left;padding:.85rem 1rem;font-size:.9rem;border-radius:12px}
@media(min-width:900px){.nav-mobile-panel{display:none!important}.nav-backdrop{display:none!important}}
.nav-suffix{display:flex;align-items:center;gap:.25rem;flex-shrink:0}
@media(min-width:640px){.nav-suffix{gap:.35rem}}
.nav-actions{display:flex;gap:.5rem;align-items:center;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}
@media(min-width:640px){.nav-actions{gap:.6rem}}
.nav-pill{border-radius:100px;padding:.4rem clamp(.65rem,2.5vw,1.1rem);font-family:'DM Sans',sans-serif;font-size:clamp(.75rem,2.2vw,.83rem);cursor:pointer;transition:all .2s;border:1.5px solid var(--border);background:rgba(255,255,255,.7);color:var(--ink);backdrop-filter:blur(8px);white-space:nowrap}
.nav.on-dark .nav-pill{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.2);color:#fff}
.nav-pill:hover{border-color:var(--rose);color:var(--rose)}
.nav-pill.accent{background:var(--tang);border-color:var(--tang);color:#fff}
.nav-pill.accent:hover{background:var(--tang-d)}

/* ── HERO ── */
.hero{
  min-height:100vh;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  padding:calc(62px + 3.5rem) 1.25rem 4rem;
  position:relative;overflow:hidden;
  text-align:center;
}
@media(min-width:640px){.hero{padding:calc(62px + 4rem) 1.5rem 5rem}}
/* blob background */
.hero-blob{position:absolute;border-radius:50%;filter:blur(72px);pointer-events:none;animation:blobFloat 12s ease-in-out infinite alternate}
.hero-blob-1{width:520px;height:520px;background:radial-gradient(circle,rgba(255,140,98,.38) 0%,transparent 70%);top:-120px;left:-80px;animation-delay:0s}
.hero-blob-2{width:440px;height:440px;background:radial-gradient(circle,rgba(244,127,171,.32) 0%,transparent 70%);top:10%;right:-80px;animation-delay:-4s}
.hero-blob-3{width:380px;height:380px;background:radial-gradient(circle,rgba(113,184,152,.28) 0%,transparent 70%);bottom:-60px;left:20%;animation-delay:-8s}
.hero-blob-4{width:300px;height:300px;background:radial-gradient(circle,rgba(255,101,52,.2) 0%,transparent 70%);bottom:10%;right:10%;animation-delay:-3s}
@keyframes blobFloat{from{transform:translate(0,0) scale(1)}to{transform:translate(30px,20px) scale(1.06)}}

.hero-inner{position:relative;z-index:2;max-width:720px;animation:heroFadeUp .9s .1s both}
@keyframes heroFadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}

.hero-eyebrow{display:inline-flex;align-items:center;gap:.45rem;background:var(--rose-p);border:1px solid rgba(232,82,122,0.22);color:var(--rose);font-size:.72rem;letter-spacing:.13em;text-transform:uppercase;padding:.35rem 1rem;border-radius:100px;margin-bottom:2rem;font-family:'DM Sans',sans-serif}

.hero-title{font-size:clamp(4.5rem,13vw,9.5rem);font-weight:300;color:var(--ink);line-height:.92;letter-spacing:-.04em;margin-bottom:1.5rem}
.hero-title em{font-style:italic;color:var(--tang)}
.hero-title .line2{display:block;color:var(--rose);font-style:italic}

.hero-desc{font-family:'Cormorant Garamond',serif;font-size:clamp(1.15rem,2.5vw,1.45rem);font-style:italic;font-weight:300;color:var(--mid);max-width:480px;margin:0 auto 2.75rem;line-height:1.75}

.hero-vibes{display:flex;gap:1.5rem;justify-content:center;flex-wrap:wrap;margin-bottom:3rem}
.hero-vibe{display:flex;align-items:center;gap:.4rem;font-size:.83rem;color:var(--mid);background:rgba(255,255,255,.7);border:1px solid var(--border-o);padding:.38rem .9rem;border-radius:100px;backdrop-filter:blur(6px)}

.hero-cta{display:inline-flex;align-items:center;gap:.6rem;background:var(--tang);color:#fff;border:none;padding:.9rem 2rem;border-radius:100px;font-family:'Cormorant Garamond',serif;font-size:1.18rem;font-style:italic;cursor:pointer;transition:all .22s;box-shadow:0 6px 24px rgba(255,101,52,.35)}
.hero-cta:hover{background:var(--tang-d);transform:translateY(-2px);box-shadow:0 10px 32px rgba(255,101,52,.42)}

/* ── PORTRAIT GALLERY ── */
.gallery-section{
  padding:6rem 0 7rem;
  background:linear-gradient(180deg,var(--bg) 0%,var(--rose-p) 40%,var(--tang-p) 100%);
  overflow:hidden;
  position:relative;
}
.gallery-section::before{
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 60% 40% at 50% 0%,rgba(232,82,122,.06) 0%,transparent 60%);
}

.gallery-heading{text-align:center;margin-bottom:3.5rem;position:relative;z-index:1}
.gallery-heading h2{font-size:clamp(2.2rem,5vw,3.2rem);font-weight:400;color:var(--ink);letter-spacing:-.025em;margin-bottom:.4rem}
.gallery-heading h2 em{font-style:italic;color:var(--rose)}
.gallery-heading p{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.1rem;color:var(--mid)}

.portrait-stage{
  position:relative;width:100%;
  height:min(520px,85vw);min-height:320px;overflow:hidden;
  padding:0 clamp(1rem,4vw,2rem);
}
@media(min-width:640px){.portrait-stage{height:520px;min-height:unset}}
.portrait-track{
  position:absolute;left:0;top:50%;
  transform:translateY(-50%);
  will-change:transform;
}
.portrait-marquee-inner{
  display:flex;gap:0;align-items:center;
  width:max-content;
  animation:portraitMarquee 56s linear infinite;
}
@keyframes portraitMarquee{
  from{transform:translateX(0)}
  to{transform:translateX(-50%)}
}
@media (prefers-reduced-motion:reduce){
  .portrait-marquee-inner{animation:none}
}
.portrait-frame{
  flex-shrink:0;
  width:min(280px,72vw);height:min(400px,103vw);
  border-radius:clamp(16px,4vw,24px);
  overflow:hidden;
  position:relative;
  opacity:1;
  transform:none;
  box-shadow:0 12px 44px rgba(232,82,122,.22),0 6px 20px rgba(255,101,52,.14);
}
.portrait-frame img{width:100%;height:100%;object-fit:cover;display:block}
.portrait-frame-overlay{
  position:absolute;inset:0;
  background:linear-gradient(to top,rgba(33,28,53,.35) 0%,transparent 50%);
  pointer-events:none;
}

/* portrait number badge */
.portrait-badge{
  position:absolute;bottom:1rem;left:50%;transform:translateX(-50%);
  background:rgba(255,255,255,.9);
  border-radius:100px;padding:.25rem .85rem;
  font-size:.72rem;color:var(--rose);font-weight:600;
  backdrop-filter:blur(8px);white-space:nowrap;
}

/* ── EXPERIENCE SECTION ── */
.exp-section{padding:6rem 0;background:var(--bg)}
.exp-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1.5rem}
@media(max-width:680px){.exp-grid{grid-template-columns:1fr}}

.exp-card{border-radius:22px;overflow:hidden;background:#fff;border:1.5px solid var(--border);transition:transform .25s,box-shadow .25s;cursor:default}
.exp-card:hover{transform:translateY(-6px);box-shadow:var(--sh-md)}
.exp-card-img-wrap{width:100%;height:clamp(400px,32vw,400px);overflow:hidden}
.exp-card-img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s;filter:saturate(.92)}
.exp-card:hover .exp-card-img{transform:scale(1.06);filter:saturate(1)}
.exp-card-body{padding:1.5rem 1.6rem 1.75rem}
.exp-emoji{font-size:1.6rem;margin-bottom:.5rem;display:block}
.exp-title{font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:400;color:var(--ink);margin-bottom:.4rem;letter-spacing:-.01em}
.exp-desc{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.02rem;color:var(--mid);line-height:1.6}
.exp-tag{display:inline-block;margin-top:.85rem;font-size:.72rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;padding:.22rem .72rem;border-radius:7px;font-family:'DM Sans',sans-serif}

/* ── SECTION COMMON ── */
.page{max-width:1120px;margin:0 auto;padding:0 2rem}
.s-head{text-align:center;margin-bottom:3rem}
.s-eyebrow{display:inline-block;font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;padding:.3rem .95rem;border-radius:100px;margin-bottom:.9rem;font-family:'DM Sans',sans-serif}
.s-head h2{font-size:clamp(2.1rem,5vw,3rem);font-weight:400;color:var(--ink);letter-spacing:-.025em;margin-bottom:.4rem}
.s-head h2 em{font-style:italic;color:var(--rose)}
.s-head p{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.08rem;color:var(--mid)}

/* ── AVAILABILITY SECTION ── */
.avail-section{padding:6rem 0;background:var(--bg3)}
.avail-section .s-eyebrow{background:var(--sage-p);color:var(--sage);border:1px solid rgba(77,144,112,.2)}
.avail-card{background:#fff;border-radius:clamp(16px,3vw,24px);padding:clamp(1.25rem,4vw,2.25rem);box-shadow:var(--sh-lg);border:1.5px solid var(--border)}

.avail-nav{display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem}
.avail-nav h3{flex:1;text-align:center;font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:400;color:var(--ink)}
.anav-btn{height:36px;border-radius:10px;border:1.5px solid var(--border);background:var(--bg);color:var(--mid);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s,color .15s;flex-shrink:0;box-sizing:border-box;font-family:inherit;-webkit-tap-highlight-color:transparent}
.anav-btn:focus{outline:none}
.anav-btn:focus-visible{outline:2px solid var(--rose);outline-offset:2px}
.anav-btn:hover{background:var(--tang-p);border-color:var(--tang);color:var(--tang)}
.anav-ico{width:36px;min-width:36px;padding:0;font-size:1.15rem;line-height:1}
.anav-today{padding:0 .95rem;font-size:.7rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}

.avail-legend{display:flex;gap:1.5rem;flex-wrap:wrap;margin-bottom:1.25rem;justify-content:center}
.leg{display:flex;align-items:center;gap:.4rem;font-size:.78rem;color:var(--mid)}
.leg-dot{width:11px;height:11px;border-radius:3px}
.ld-free{background:rgba(77,144,112,.5)}
.ld-busy{background:rgba(255,101,52,.4)}
.ld-class{background:#3d2f4a;box-shadow:inset 0 0 0 1px rgba(232,82,122,.35)}

.avail-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:14px;border:1.5px solid var(--border);background:#fff}
.avail-grid{display:grid;grid-template-columns:52px repeat(7,1fr);min-width:560px}
.a-head{background:var(--ink);color:#fff;text-align:center;padding:.65rem .2rem;cursor:pointer;user-select:none;transition:background .15s}
.a-head:hover:not(.a-time-h){background:#3D3660}
.a-head.today{background:var(--tang)!important}
.a-head.sel{background:var(--rose)!important;outline:2px solid var(--rose-s);outline-offset:-2px}
.a-head .dn{font-family:'DM Sans',sans-serif;font-size:.63rem;text-transform:uppercase;letter-spacing:.07em;opacity:.6}
.a-head .dd{font-family:'Cormorant Garamond',serif;font-size:1.15rem;font-weight:400}
.a-time-h{cursor:default;position:sticky;left:0;z-index:5;background:var(--ink);box-shadow:6px 0 14px rgba(33,28,53,.18)}
.a-time-lbl{height:30px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;font-size:.62rem;font-weight:500;color:var(--mid);border-right:1px solid var(--border);position:sticky;left:0;z-index:3;background:#fff;box-shadow:4px 0 12px rgba(33,28,53,.08)}
.a-slot{height:30px;border-bottom:1px solid rgba(232,82,122,.04);border-right:1px solid rgba(232,82,122,.04);cursor:pointer;transition:background .1s}
.a-slot.free{background:rgba(77,144,112,.07)}
.a-slot.free:hover{background:rgba(77,144,112,.22);outline:1px solid rgba(77,144,112,.4)}
.a-slot.busy{background:rgba(255,101,52,.11);cursor:not-allowed}
.a-slot.cls{background:rgba(41,33,56,.44);cursor:not-allowed;box-shadow:inset 2px 0 0 rgba(200,70,115,.92)}
.a-slot.past{opacity:.25;pointer-events:none}
.a-slot.sel-col{background:rgba(232,82,122,.04)}
.a-slot.selected{background:rgba(232,82,122,.2)!important;outline:2px solid var(--rose)!important}

.avail-hint{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:.95rem;color:var(--light);text-align:center;margin-top:1rem}

.avail-selected-info{margin-top:1.25rem;padding:1rem 1.25rem;background:var(--rose-p);border-radius:12px;border:1px solid rgba(232,82,122,.18);display:flex;align-items:flex-start;gap:.75rem;flex-wrap:wrap}
.asi-date{font-family:'Cormorant Garamond',serif;font-size:1.08rem;color:var(--ink);font-weight:400}
.asi-time{font-size:.82rem;color:var(--rose);font-weight:500}
.asi-end-row{display:flex;align-items:center;gap:.5rem;margin-top:.65rem;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--mid);font-weight:600}
.asi-end-select{flex:1;min-width:140px;max-width:220px;border:1.5px solid var(--border);border-radius:8px;padding:.4rem .65rem;font-size:.84rem;background:#fff;color:var(--ink);font-family:inherit}
.asi-warn{margin-top:.5rem;font-size:.78rem;color:var(--tang);line-height:1.35}
.asi-btn{background:var(--rose);color:#fff;border:none;border-radius:10px;padding:.55rem 1.3rem;font-size:.87rem;font-weight:500;cursor:pointer;transition:all .18s;white-space:nowrap;margin-left:auto;align-self:center}
.asi-btn:hover:not(:disabled){background:#c93a66;transform:translateY(-1px);box-shadow:var(--sh-rose)}
.asi-btn:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none}

/* ── REVIEWS (hangouts) ── */
#top,#photos,#vibes,#reviews,#schedule,#book{scroll-margin-top:76px}
.reviews-section{padding:clamp(3.5rem,8vw,5.75rem) 0;background:linear-gradient(185deg,var(--rose-p) 0%,var(--bg) 42%,#FFF9F5 100%);position:relative}
.reviews-section::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 50% 35% at 80% 0%,rgba(255,101,52,.05) 0%,transparent 55%)}
.reviews-section .page{position:relative;z-index:1}
.reviews-section .s-eyebrow{background:rgba(255,255,255,.75);color:var(--rose);border:1px solid rgba(232,82,122,.22)}
.reviews-grid{display:grid;grid-template-columns:1fr;gap:1.1rem}
@media(min-width:640px){.reviews-grid{grid-template-columns:repeat(2,1fr);gap:1.15rem}}
@media(min-width:1024px){.reviews-grid{grid-template-columns:repeat(3,1fr);gap:1.2rem}}
.review-card{margin:0;background:#fff;border:1.5px solid var(--border);border-radius:18px;padding:1.35rem 1.4rem 1.25rem;box-shadow:0 6px 28px rgba(232,82,122,.07);transition:transform .22s,box-shadow .22s,border-color .22s}
.review-card:hover{transform:translateY(-4px);box-shadow:var(--sh-md);border-color:rgba(232,82,122,.22)}
.review-card::before{content:'“';font-family:'Cormorant Garamond',serif;font-size:2.1rem;line-height:1;color:var(--rose-s);opacity:.45;display:block;margin-bottom:-.35rem}
.review-text{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.04rem;color:var(--ink);line-height:1.58;margin:0 0 1.05rem}
.review-foot{display:flex;flex-wrap:wrap;align-items:center;gap:.45rem .65rem}
.review-author{font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:600;color:var(--rose)}
.review-tag{font-size:.65rem;text-transform:uppercase;letter-spacing:.07em;color:var(--mid);background:var(--bg2);padding:.22rem .58rem;border-radius:7px;border:1px solid var(--border);font-family:'DM Sans',sans-serif}
.reviews-more-wrap{display:flex;justify-content:center;margin-top:1.5rem}
.reviews-more-btn{background:none;border:none;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:500;letter-spacing:.06em;text-transform:uppercase;color:var(--rose);cursor:pointer;padding:.65rem 1.15rem;border-radius:999px;transition:background .18s,color .18s;-webkit-tap-highlight-color:transparent}
.reviews-more-btn:hover,.reviews-more-btn:focus-visible{background:rgba(232,82,122,.1);color:#C93A66}
.reviews-more-btn:focus-visible{outline:2px solid var(--rose);outline-offset:2px}
/* ── LANDING (choose path) ── */
.landing{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:clamp(1.5rem,5vw,2.75rem);background:var(--bg);position:relative;overflow:hidden}
.landing-blob{position:absolute;border-radius:50%;filter:blur(64px);pointer-events:none;opacity:.55}
.landing-blob-1{width:min(420px,90vw);height:min(420px,90vw);background:radial-gradient(circle,rgba(255,140,98,.22) 0%,transparent 68%);top:-12%;left:-18%}
.landing-blob-2{width:min(360px,80vw);height:min(360px,80vw);background:radial-gradient(circle,rgba(244,127,171,.18) 0%,transparent 68%);bottom:-8%;right:-14%}
.landing-inner{position:relative;z-index:1;max-width:420px;width:100%;text-align:center}
.landing-eyebrow{display:inline-block;font-family:'DM Sans',sans-serif;font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mid);margin-bottom:1rem}
.landing-title{font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(2.35rem,7vw,3.1rem);font-weight:300;color:var(--ink);line-height:1.08;margin:0 0 1rem;letter-spacing:-.02em}
.landing-title em{font-style:italic;color:var(--rose)}
.landing-lede{font-family:'Cormorant Garamond',serif;font-size:clamp(1.05rem,3vw,1.2rem);font-style:italic;font-weight:300;color:var(--mid);line-height:1.65;margin:0 0 2rem}
.landing-actions{display:flex;flex-direction:column;gap:.75rem;width:100%}
.landing-btn-friend{width:100%;border:none;border-radius:999px;padding:1rem 1.35rem;font-family:'DM Sans',sans-serif;font-size:.95rem;font-weight:600;cursor:pointer;background:var(--tang);color:#fff;box-shadow:0 8px 28px rgba(255,101,52,.28);transition:transform .18s,box-shadow .18s,background .18s;-webkit-tap-highlight-color:transparent}
.landing-btn-friend:hover,.landing-btn-friend:focus-visible{background:var(--tang-d);transform:translateY(-1px);box-shadow:0 12px 32px rgba(255,101,52,.35)}
.landing-btn-friend:focus-visible{outline:2px solid var(--rose);outline-offset:3px}
.landing-btn-rosy{width:100%;border:none;border-radius:999px;padding:.88rem 1.2rem;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:500;cursor:pointer;background:rgba(255,255,255,.65);border:1.5px solid var(--border);color:var(--mid);backdrop-filter:blur(8px);transition:border-color .18s,color .18s,background .18s;-webkit-tap-highlight-color:transparent}
.landing-btn-rosy:hover,.landing-btn-rosy:focus-visible{border-color:rgba(232,82,122,.35);color:var(--rose);background:rgba(255,255,255,.9)}
.landing-btn-rosy:focus-visible{outline:2px solid var(--rose);outline-offset:2px}

/* ── BOOKING SECTION ── */
.book-section{padding:6rem 0;background:linear-gradient(180deg,var(--tang-p) 0%,var(--bg) 100%)}
.book-section .s-eyebrow{background:var(--tang-p);color:var(--tang);border:1px solid rgba(255,101,52,.2)}
.book-grid{display:grid;grid-template-columns:300px 1fr;gap:3rem;align-items:start}
@media(max-width:880px){.book-grid{grid-template-columns:1fr}}

.book-sidebar-photo{width:100%;aspect-ratio:3/4;border-radius:22px;overflow:hidden;box-shadow:var(--sh-lg);position:relative;margin-bottom:1.5rem}
.book-sidebar-photo img{width:100%;height:100%;object-fit:cover;display:block}
.book-photo-badge{position:absolute;top:1.1rem;left:1.1rem;right:1.1rem;background:rgba(255,251,248,.88);backdrop-filter:blur(12px);border-radius:14px;padding:.9rem 1.1rem;border:1px solid rgba(255,255,255,.6)}
.book-photo-name{font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-style:italic;color:var(--ink);margin-bottom:.05rem}
.book-photo-sub{font-size:.75rem;color:var(--mid)}

.book-quote{background:linear-gradient(135deg,var(--rose),#F07AAE);border-radius:16px;padding:1.5rem;color:rgba(255,255,255,.88);font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.08rem;line-height:1.65;position:relative;overflow:hidden}
.book-quote::before{content:'"';font-family:'Cormorant Garamond',serif;font-size:7rem;position:absolute;top:-2rem;left:.3rem;opacity:.12;line-height:1;color:#fff}
.book-quote cite{display:block;margin-top:.65rem;font-size:.77rem;opacity:.6;font-style:normal;font-family:'DM Sans',sans-serif}

/* ── FORM CARD ── */
.form-card{background:#fff;border-radius:24px;padding:2.5rem;box-shadow:var(--sh-lg);border:1.5px solid var(--border)}
.form-card-head h3{font-family:'Cormorant Garamond',serif;font-size:2.1rem;font-weight:400;color:var(--ink);letter-spacing:-.02em;margin-bottom:.3rem}
.form-card-head p{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:1.02rem;color:var(--mid);margin-bottom:1.75rem}

.prefill-banner{display:flex;align-items:center;gap:.75rem;background:var(--sage-p);border:1px solid rgba(77,144,112,.22);border-radius:12px;padding:.85rem 1.1rem;margin-bottom:1.5rem}
.prefill-banner span{font-size:.87rem;color:var(--sage)}
.prefill-banner button{margin-left:auto;background:none;border:none;font-size:.78rem;color:var(--sage);cursor:pointer;text-decoration:underline;opacity:.7}

.g2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
@media(max-width:520px){.g2{grid-template-columns:1fr}}
.f{margin-bottom:1rem}
.f label{display:block;font-size:.68rem;letter-spacing:.09em;text-transform:uppercase;color:var(--mid);font-weight:600;margin-bottom:.38rem}
.f input,.f textarea,.f select{width:100%;padding:.8rem 1rem;background:var(--bg);border:1.5px solid var(--border);border-radius:11px;font-family:'Cormorant Garamond',serif;font-size:1.06rem;color:var(--ink);outline:none;transition:border-color .2s,box-shadow .2s;-webkit-appearance:none}
.f input:focus,.f textarea:focus,.f select:focus{border-color:var(--rose);box-shadow:0 0 0 3px rgba(232,82,122,.10)}
.f textarea{resize:vertical;min-height:88px;line-height:1.55}
.f-err{font-size:.77rem;color:var(--tang);margin-top:.3rem}
.conflict-warn{display:flex;gap:.55rem;align-items:flex-start;background:#FEF9C3;border:1px solid #F6C026;border-radius:10px;padding:.72rem 1rem;font-size:.86rem;color:#854D0E;margin-bottom:1rem}
.submit-btn{width:100%;padding:1.08rem;background:linear-gradient(135deg,var(--tang),var(--rose));color:#fff;border:none;border-radius:13px;font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-style:italic;cursor:pointer;transition:all .22s;box-shadow:0 6px 24px rgba(232,82,122,.3);letter-spacing:.01em}
.submit-btn:hover{transform:translateY(-2px);box-shadow:0 10px 36px rgba(232,82,122,.4);filter:brightness(1.05)}
.submit-btn:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none;filter:none}
.form-note{display:flex;gap:.55rem;align-items:flex-start;background:var(--sage-p);border:1px solid rgba(77,144,112,.18);border-radius:11px;padding:.9rem 1.1rem;margin-top:1.25rem;font-size:.82rem;color:var(--sage)}

/* ── BUTTONS ── */
.btn{padding:.68rem 1.45rem;border-radius:10px;border:none;font-family:'DM Sans',sans-serif;font-size:.88rem;cursor:pointer;transition:all .18s;display:inline-flex;align-items:center;gap:.4rem}
.btn-outline{background:transparent;border:1.5px solid var(--border);color:var(--mid)}
.btn-outline:hover{border-color:var(--rose);color:var(--rose)}
.btn-rose{background:var(--rose);color:#fff}
.btn-rose:hover{background:#c93a66}
.btn-sage{background:var(--sage);color:#fff}
.btn-sage:hover{background:var(--sage-s)}
.btn-danger{background:#FEE2E2;color:#B91C1C}
.btn-danger:hover{background:#FECACA}
.btn-sm{padding:.42rem 1rem;font-size:.82rem;border-radius:8px}
.btn-xs{padding:.3rem .78rem;font-size:.75rem;border-radius:7px}
.btn-ico{background:none;border:none;cursor:pointer;padding:.2rem;color:var(--mid);transition:transform .15s,color .15s}
.btn-ico:hover{transform:scale(1.25);color:var(--rose)}

/* ── SUCCESS ── */
.success{text-align:center;padding:1.5rem 0}
.success h3{font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--sage);margin-bottom:.5rem}
.success p{font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--mid);margin-bottom:1.25rem}
.success-pill{display:inline-block;background:var(--tang-p);border:1px solid rgba(255,101,52,.22);color:var(--tang);padding:.48rem 1.3rem;border-radius:100px;font-size:.82rem}

/* ── LOGIN ── */
.login-bg{min-height:calc(100vh - 62px);background:linear-gradient(145deg,var(--rose-p) 0%,var(--tang-p) 50%,var(--sage-p) 100%);display:flex;align-items:center;justify-content:center;padding:2rem;padding-top:80px}
.login-card{background:#fff;border-radius:28px;padding:3rem 2.5rem;width:100%;max-width:400px;box-shadow:var(--sh-lg);text-align:center;position:relative;overflow:hidden;border:1.5px solid var(--border)}
.login-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--tang),var(--rose),var(--sage-s))}
.login-av{width:90px;height:90px;border-radius:50%;overflow:hidden;margin:0 auto 1.5rem;border:3px solid var(--rose-s);box-shadow:var(--sh-rose)}
.login-av img{width:100%;height:100%;object-fit:cover}
.login-card h2{font-family:'Cormorant Garamond',serif;font-size:2.1rem;color:var(--ink);margin-bottom:.3rem}
.login-card>p{font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--mid);margin-bottom:1.75rem}
.login-err{background:#FEE2E2;border:1px solid #FECACA;color:#B91C1C;border-radius:10px;padding:.68rem 1rem;font-size:.84rem;margin-bottom:1rem}

/* ── DASHBOARD ── */
.dash{min-height:calc(100vh - 62px);background:var(--bg)}
.dash-hero{background:linear-gradient(135deg,var(--rose-p) 0%,var(--tang-p) 50%,var(--sage-p) 100%);padding:5rem 2.5rem 2.5rem;border-bottom:1px solid var(--border)}
.dash-inner{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:1.25rem}
.dash-hero h1{font-family:'Cormorant Garamond',serif;font-size:2.5rem;font-weight:300;color:var(--ink);margin-bottom:.2rem}
.dash-hero h1 em{font-style:italic;color:var(--rose)}
.dash-hero p{font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--mid)}
.dash-stats{display:flex;gap:.65rem;margin-top:1.25rem;flex-wrap:wrap}
.stat-p{background:rgba(255,255,255,.7);border:1.5px solid var(--border);border-radius:100px;padding:.38rem 1rem;color:var(--ink);font-size:.82rem;display:flex;align-items:center;gap:.45rem;backdrop-filter:blur(6px)}
.s-dot{width:7px;height:7px;border-radius:50%}
.sd-t{background:var(--tang)}
.sd-s{background:var(--sage)}
.sd-r{background:var(--rose)}

.dash-body{padding:2rem 2.5rem;max-width:1100px;margin:0 auto}
.tab-bar{display:flex;border-bottom:2px solid var(--border);margin-bottom:1.75rem;overflow-x:auto}
.tab-bar::-webkit-scrollbar{display:none}
.tab-btn{padding:.75rem 1.35rem;background:none;border:none;border-bottom:2.5px solid transparent;margin-bottom:-2px;font-family:'DM Sans',sans-serif;font-size:.9rem;color:var(--mid);cursor:pointer;transition:all .18s;white-space:nowrap;display:flex;align-items:center;gap:.4rem}
.tab-btn.active{color:var(--rose);border-bottom-color:var(--rose);font-weight:600}
.tab-btn:hover:not(.active){color:var(--ink)}
.badge-n{background:var(--tang);color:#fff;border-radius:100px;font-size:.66rem;padding:.08rem .48rem;font-weight:700;min-width:17px;text-align:center}

.req-list{display:flex;flex-direction:column;gap:1rem}
.req-c{background:#fff;border-radius:16px;padding:1.35rem 1.5rem;border:1.5px solid var(--border);transition:border-color .2s,box-shadow .2s}
.req-c:hover{border-color:rgba(232,82,122,.25);box-shadow:var(--sh)}
.req-top{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:.35rem}
.req-name{font-family:'Cormorant Garamond',serif;font-size:1.3rem;color:var(--ink)}
.req-meta{font-size:.83rem;color:var(--mid)}
.req-meta span{display:inline-flex;align-items:center;gap:.25rem;margin-right:.85rem}
.req-reason{margin:.6rem 0 1rem;font-style:italic;font-size:.95rem;color:var(--ink);background:var(--bg);border-left:3px solid var(--rose-s);padding:.55rem .9rem;border-radius:0 10px 10px 0;line-height:1.55;font-family:'Cormorant Garamond',serif}
.req-acts{display:flex;gap:.55rem;align-items:center}
.badge{display:inline-block;border-radius:100px;font-size:.69rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:.2rem .82rem}
.badge-pending{background:var(--tang-p);color:var(--tang)}
.badge-confirmed{background:var(--sage-p);color:var(--sage)}
.badge-rejected{background:#FEE2E2;color:#B91C1C}

/* dash cal */
.cal-nav{display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem}
.cal-nav h3{flex:1;text-align:center;font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:var(--ink)}
.cal-nb{height:32px;border-radius:8px;border:1.5px solid var(--border);background:#fff;color:var(--mid);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s,color .15s;flex-shrink:0;box-sizing:border-box;font-family:inherit;-webkit-tap-highlight-color:transparent}
.cal-nb:focus{outline:none}
.cal-nb:focus-visible{outline:2px solid var(--rose);outline-offset:2px}
.cal-nb:hover{background:var(--rose-p);border-color:var(--rose);color:var(--rose)}
.cal-nb-ico{width:32px;min-width:32px;padding:0;font-size:.95rem;line-height:1}
.cal-nb-today{padding:0 .75rem;font-size:.65rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.cal-leg{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.1rem}
.cal-scroll{overflow-x:auto}
.cal-grid{display:grid;grid-template-columns:44px repeat(7,minmax(76px,1fr));border:1.5px solid var(--border);border-radius:16px;overflow:hidden;background:#fff;min-width:600px}
.cal-h{background:var(--ink);color:#fff;text-align:center;padding:.62rem .2rem}
.cal-h .dn{font-family:'DM Sans',sans-serif;font-size:.64rem;text-transform:uppercase;letter-spacing:.06em;opacity:.55}
.cal-h .dd{font-family:'Cormorant Garamond',serif;font-size:1.1rem}
.cal-h.today{background:var(--tang)}
.cal-tlbl{font-size:.62rem;color:var(--light);text-align:right;padding:0 6px;height:36px;display:flex;align-items:flex-start;justify-content:flex-end;padding-top:3px;border-right:1px solid var(--border)}
.cal-dcol{position:relative;border-right:1px solid rgba(232,82,122,.05)}
.cal-hl{height:36px;border-bottom:1px solid rgba(232,82,122,.04)}
.cal-blk{position:absolute;left:1px;right:1px;border-radius:5px;padding:2px 5px;font-size:.62rem;line-height:1.25;overflow:hidden;z-index:3;font-weight:500}
.cb-class{background:rgba(41,33,56,.2);color:#2a2238;border-left:3px solid #c94874;font-weight:600}
.cb-personal{background:rgba(255,101,52,.13);color:var(--tang);border-left:3px solid var(--tang)}
.cb-confirmed{background:rgba(77,144,112,.15);color:var(--sage);border-left:3px solid var(--sage)}
.cb-pending{background:rgba(255,101,52,.08);color:var(--tang-s);border:1px dashed var(--tang-s)}

.blk-form{background:#fff;border-radius:16px;padding:1.75rem;border:1.5px solid var(--border);margin-bottom:1.75rem}
.blk-form h4{font-family:'Cormorant Garamond',serif;font-size:1.2rem;color:var(--ink);margin-bottom:1.25rem}
.blk-list{display:flex;flex-direction:column;gap:.65rem}
.blk-item{display:flex;align-items:center;justify-content:space-between;background:var(--bg);border-radius:11px;padding:.7rem 1rem;border:1px solid var(--border);gap:1rem}
.blk-lbl{font-size:.93rem;color:var(--ink);font-weight:500}
.blk-t{font-size:.78rem;color:var(--mid);font-style:italic;font-family:'Cormorant Garamond',serif}
.cls-chip{display:inline-flex;align-items:center;background:var(--rose-p);color:var(--rose);border:1px solid rgba(232,82,122,.2);border-radius:8px;padding:.28rem .72rem;font-size:.77rem;font-weight:500}
.cls-list{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.5rem;margin-bottom:1.5rem}
.sec-lbl{font-family:'Cormorant Garamond',serif;font-size:1.25rem;color:var(--ink);margin-bottom:1rem;display:flex;align-items:center;gap:.6rem}
.tag{font-size:.67rem;background:var(--tang-p);color:var(--tang);border-radius:6px;padding:.12rem .55rem;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.empty-s{text-align:center;padding:2.5rem 1rem;color:var(--light);font-style:italic;font-family:'Cormorant Garamond',serif}
.empty-s span{font-size:2.2rem;display:block;margin-bottom:.65rem}

/* footer */
.footer{background:linear-gradient(135deg,var(--tang-d),var(--rose),#C93A66);padding:3rem 2rem;text-align:center}
.footer-logo{font-family:'Cormorant Garamond',serif;font-size:2.1rem;font-weight:300;color:#fff;margin-bottom:.5rem}
.footer-logo em{font-style:italic}
.footer-sub{color:rgba(255,255,255,.92);font-style:italic;font-size:.95rem;font-family:'Cormorant Garamond',serif;line-height:1.55;max-width:36rem;margin-left:auto;margin-right:auto;text-shadow:0 1px 2px rgba(33,28,53,.22)}
.footer-aveion{font-family:'DM Sans',sans-serif;font-size:.78rem;color:rgba(255,255,255,.5);margin-top:1.1rem;line-height:1.5}
.footer-aveion a{color:rgba(255,255,255,.88);text-decoration:underline;text-decoration-color:rgba(255,255,255,.35);text-underline-offset:3px;transition:color .15s,text-decoration-color .15s}
.footer-aveion a:hover,.footer-aveion a:focus-visible{color:#fff;text-decoration-color:rgba(255,255,255,.7)}
.footer-aveion a:focus-visible{outline:2px solid rgba(255,255,255,.5);outline-offset:3px;border-radius:4px}

/* toast */
.toast-wrap{position:fixed;bottom:2rem;right:2rem;display:flex;flex-direction:column;gap:.55rem;z-index:9000;pointer-events:none}
.toast{background:var(--ink);color:#fff;padding:.85rem 1.25rem;border-radius:14px;box-shadow:0 8px 32px rgba(33,28,53,.25);display:flex;align-items:center;gap:.6rem;font-size:.88rem;max-width:340px;animation:toastIn .3s cubic-bezier(.34,1.56,.64,1)}
@keyframes toastIn{from{transform:translateY(14px) scale(.95);opacity:0}to{transform:none;opacity:1}}

@media(max-width:720px){.dash-body{padding:1.5rem 1rem}.dash-hero{padding:4.5rem 1.25rem 2rem}.form-card{padding:1.75rem 1.25rem}.page{padding:0 1.1rem}}
`;

// ════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════
function Toast({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <span style={{fontSize:"1.12rem"}}>{t.emoji}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════
//  NAV
// ════════════════════════════════════════════════════
const SITE_NAV_LINKS = [
  { id: "top", label: "Home" },
  { id: "photos", label: "Photos" },
  { id: "vibes", label: "Vibes" },
  { id: "reviews", label: "Reviews" },
  { id: "schedule", label: "Schedule" },
  { id: "book", label: "Book" },
];

function Nav({ setView, isLoggedIn, showSiteNav }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const go = id => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!showSiteNav) setMenuOpen(false);
  }, [showSiteNav]);

  useEffect(() => {
    if (!menuOpen) return;
    const onEsc = e => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const logo = (
    <>
      book<em>rosy</em><span className="tld">.com</span>
    </>
  );

  return (
    <>
      <nav className={`nav${scrolled ? " scrolled" : ""}`}>
        {showSiteNav ? (
          <button type="button" className="nav-logo-btn" onClick={() => go("top")} aria-label="Scroll to top">
            <span className="nav-logo">{logo}</span>
          </button>
        ) : (
          <div className="nav-logo">{logo}</div>
        )}
        {showSiteNav ? (
          <div className="nav-center">
            <div className="nav-site-links" role="navigation" aria-label="On this page">
              {SITE_NAV_LINKS.map(({ id, label }) => (
                <button key={id} type="button" className="nav-link" onClick={() => go(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="nav-suffix">
          {showSiteNav ? (
            <button
              type="button"
              className={`nav-burger${menuOpen ? " open" : ""}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-expanded={menuOpen}
              aria-controls="site-nav-panel"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              <span />
              <span />
              <span />
            </button>
          ) : null}
          <div className="nav-actions">
            {isLoggedIn ? (
              <>
                <button className="nav-pill" onClick={() => setView("booking")}>← Public</button>
                <button className="nav-pill accent" onClick={() => setView("dashboard")}>Dashboard 🌸</button>
              </>
            ) : null}
          </div>
        </div>
      </nav>
      {showSiteNav ? (
        <>
          <div
            className={`nav-backdrop${menuOpen ? " open" : ""}`}
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div
            id="site-nav-panel"
            className={`nav-mobile-panel${menuOpen ? " open" : ""}`}
            role="dialog"
            aria-label="Page sections"
            aria-modal="false"
          >
            {SITE_NAV_LINKS.map(({ id, label }) => (
              <button key={id} type="button" className="nav-link" onClick={() => go(id)}>
                {label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

// ════════════════════════════════════════════════════
//  PORTRAIT GALLERY — seamless infinite marquee (two identical halves)
// ════════════════════════════════════════════════════
function PortraitGallery() {
  const renderStrip = (keyPrefix) =>
    PORTRAIT_PHOTOS.map((url, i) => (
      <div key={`${keyPrefix}-${i}`} className="portrait-frame">
        <img src={publicAsset(url)} alt={`Photo ${i + 1}`}
          onError={e => { e.target.style.background = "linear-gradient(135deg,var(--rose-p),var(--tang-p))"; e.target.style.display = "none"; }} />
        <div className="portrait-frame-overlay" />
      </div>
    ));

  return (
    <section id="photos" className="gallery-section">
      <div className="gallery-heading">
        <div style={{display:"inline-block",background:"var(--rose-p)",border:"1px solid rgba(232,82,122,.2)",color:"var(--rose)",fontSize:".7rem",letterSpacing:".13em",textTransform:"uppercase",padding:".3rem .95rem",borderRadius:"100px",marginBottom:".9rem",fontFamily:"DM Sans,sans-serif"}}>
          📸 The one and only
        </div>
        <h2>Rosy, <em>in her element</em></h2>
        <p>Just look at her, She is cutely gorgeous isn't she?</p>
      </div>

      <div className="portrait-stage">
        <div className="portrait-track">
          <div className="portrait-marquee-inner">
            {renderStrip("a")}
            {renderStrip("b")}
          </div>
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════
//  EXPERIENCE CARDS
// ════════════════════════════════════════════════════
function ExpSection() {
  return (
    <section id="vibes" className="exp-section">
      <div className="page">
        <div className="s-head">
          <div className="s-eyebrow" style={{background:"var(--tang-p)",color:"var(--tang)",border:"1px solid rgba(255,101,52,.2)"}}>✨ Some of her favorite things to do</div>
          <h2>Hang out with <em>Rosy</em></h2>
          <p>Here's what a slot in her calendar could potentially lead to</p>
        </div>
        <div className="exp-grid">
          {EXPERIENCES.map((exp, i) => (
            <div key={i} className="exp-card">
              <div className="exp-card-img-wrap">
                <img src={publicAsset(exp.img)} alt={exp.title} className="exp-card-img"
                  onError={e => { e.target.style.display = "none"; }} />
              </div>
              <div className="exp-card-body">
                <span className="exp-emoji">{exp.emoji}</span>
                <h4 className="exp-title">{exp.title}</h4>
                <p className="exp-desc">{exp.desc}</p>
                <span className="exp-tag" style={{ background: exp.tagBg, color: exp.tagCol, border: `1px solid ${exp.tagCol}20` }}>
                  {exp.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════
//  HANGOUT REVIEWS
// ════════════════════════════════════════════════════
function ReviewsSection() {
  const [showAll, setShowAll] = useState(false);
  const extraCount = HANGOUT_REVIEWS.length - REVIEWS_PREVIEW_COUNT;
  const visible = showAll ? HANGOUT_REVIEWS : HANGOUT_REVIEWS.slice(0, REVIEWS_PREVIEW_COUNT);

  return (
    <section id="reviews" className="reviews-section" aria-labelledby="reviews-heading">
      <div className="page">
        <div className="s-head">
          <div className="s-eyebrow">💬 Word on the street</div>
          <h2 id="reviews-heading">What it’s like <em>actually</em> hanging out</h2>
          <p>
            A few notes from people who’ve shared a table, a walk, or a full emotional download with her
            {extraCount > 0 ? " — show more below if you want the rest." : "."}
          </p>
        </div>
        <div className="reviews-grid" id="reviews-grid">
          {visible.map((r, i) => (
            <blockquote key={`${r.author}-${i}`} className="review-card">
              <p className="review-text">{r.quote}</p>
              <footer className="review-foot">
                <span className="review-author">{r.author}</span>
                {r.tag ? <span className="review-tag">{r.tag}</span> : null}
              </footer>
            </blockquote>
          ))}
        </div>
        {extraCount > 0 ? (
          <div className="reviews-more-wrap">
            <button
              type="button"
              className="reviews-more-btn"
              onClick={() => setShowAll(s => !s)}
              aria-expanded={showAll}
              aria-controls="reviews-grid"
            >
              {showAll ? "Show less" : "Show more"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════
//  PUBLIC AVAILABILITY CALENDAR
// ════════════════════════════════════════════════════
function PublicCal({ bookings, personalBlocks, onSelect }) {
  const [weekOff, setWeekOff] = useState(0);
  const [selDate, setSelDate] = useState(null);
  const [selTime, setSelTime] = useState(null);
  const [selEndTime, setSelEndTime] = useState(null);
  const days = useMemo(() => getWeek(weekOff), [weekOff]);
  const todayStr = isoDate(new Date());
  const DAY = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const hours = Array.from({length: END_HOUR - START_HOUR}, (_, i) => START_HOUR + i);
  const weekLabel = `${days[0].toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${days[6].toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;

  const slotStatus = (dayDt, h) => {
    const iso = isoDate(dayDt);
    const now = new Date();
    const isPast = iso < todayStr || (iso === todayStr && h * 60 <= now.getHours()*60+now.getMinutes());
    const busy = getBusy(iso, bookings, personalBlocks);
    const isClass = CLASS_SCHEDULE.some(c => c.dayOfWeek===dayDt.getDay() && h*60>=toM(c.start) && h*60<toM(c.end));
    const isBusy = busy.some(b => h*60>=b.s && h*60<b.e);
    return { isPast, isClass, isBusy };
  };

  const handleSlot = (dayDt, h) => {
    const { isPast, isClass, isBusy } = slotStatus(dayDt, h);
    if (isPast || isClass || isBusy) return;
    const iso = isoDate(dayDt), t = `${pad(h)}:00`;
    const ends = endTimesAfter(t);
    if (!ends.length) return;
    setSelDate(iso);
    setSelTime(t);
    setSelEndTime(defaultEndTime(t));
  };

  return (
    <div className="avail-card">
      <div className="avail-nav">
        <button type="button" className="anav-btn anav-ico" onClick={() => setWeekOff(w=>w-1)} aria-label="Previous week">‹</button>
        <h3>{weekLabel}</h3>
        <button type="button" className="anav-btn anav-today" onClick={() => setWeekOff(0)}>Today</button>
        <button type="button" className="anav-btn anav-ico" onClick={() => setWeekOff(w=>w+1)} aria-label="Next week">›</button>
      </div>
      <div className="avail-legend">
        <span className="leg"><span className="leg-dot ld-free"/>Available</span>
        <span className="leg"><span className="leg-dot ld-busy"/>Busy</span>
        <span className="leg"><span className="leg-dot ld-class"/>Class</span>
      </div>
      <div className="avail-scroll">
        <div className="avail-grid">
          <div className="a-head a-time-h" />
          {days.map((d, i) => {
            const iso = isoDate(d);
            return (
              <div key={i} className={`a-head${iso===todayStr?" today":""}${iso===selDate?" sel":""}`}
                onClick={() => { setSelDate(iso===selDate?null:iso); setSelTime(null); setSelEndTime(null); }}>
                <div className="dn">{DAY[i]}</div>
                <div className="dd">{d.getDate()}</div>
              </div>
            );
          })}
          {hours.map(h => (
            <>
              <div key={`t${h}`} className="a-time-lbl">
                {h===0?"12a":h<12?`${h}a`:h===12?"12p":`${h-12}p`}
              </div>
              {days.map((d, di) => {
                const { isPast, isClass, isBusy } = slotStatus(d, h);
                const iso = isoDate(d), t = `${pad(h)}:00`;
                const isSel = selDate===iso && selTime===t;
                const cls = isClass ? "cls" : isBusy ? "busy" : "free";
                return (
                  <div key={`${h}-${di}`}
                    className={`a-slot ${cls}${isPast?" past":""}${iso===selDate?" sel-col":""}${isSel?" selected":""}`}
                    onClick={() => handleSlot(d, h)}
                    title={isClass?"📚 Class":isBusy?"🔒 Busy":`✅ ${fmtTime(t)}`}
                  />
                );
              })}
            </>
          ))}
        </div>
      </div>
      <p className="avail-hint">✦ Lets hope she accepts your lovely offer</p>
      {selDate && selTime && selEndTime && (() => {
        const rangeConflict = checkConflict(selDate, selTime, selEndTime, bookings, personalBlocks);
        return (
        <div className="avail-selected-info">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="asi-date">{fmtDate(selDate)}</div>
            <div className="asi-time">🕐 {fmtTimeRange(selTime, selEndTime)}</div>
            <div className="asi-end-row">
              <label htmlFor="avail-end">Ends</label>
              <select id="avail-end" className="asi-end-select" value={selEndTime} onChange={e => setSelEndTime(e.target.value)}>
                {endTimesAfter(selTime).map(t => (
                  <option key={t} value={t}>{fmtTime(t)}</option>
                ))}
              </select>
            </div>
            {rangeConflict ? (
              <div className="asi-warn">⚠️ {rangeConflict.label} — adjust the end time or pick another start.</div>
            ) : null}
          </div>
          <button type="button" className="asi-btn" disabled={!!rangeConflict} onClick={() => onSelect(selDate, selTime, selEndTime)}>Book this slot →</button>
        </div>
        );
      })()}
    </div>
  );
}

// ════════════════════════════════════════════════════
//  BOOKING FORM
// ════════════════════════════════════════════════════
function BookForm({ onSubmit, personalBlocks, bookings, initDate, initTime, initEndTime, clearInit }) {
  const formRef = useRef(null);
  const today = isoDate(new Date());
  const [form, setForm] = useState({ name: "", email: "", date: initDate || "", time: initTime || "", endTime: initEndTime || "", reason: "" });
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState({});
  const [conflict, setConflict] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (initDate && initTime) {
      const end = initEndTime || defaultEndTime(initTime);
      setForm(f => ({ ...f, date: initDate, time: initTime, endTime: end || "" }));
      setConflict(end ? checkConflict(initDate, initTime, end, bookings, personalBlocks) : null);
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }
  }, [initDate, initTime, initEndTime, bookings, personalBlocks]);

  const times = useMemo(() => halfHourTimes(), []);

  const handleChange = (k, v) => {
    const next = { ...form, [k]: v };
    setErrors(e => ({ ...e, [k]: "" }));
    if (k === "time") {
      const opts = endTimesAfter(v);
      let newEnd = next.endTime;
      if (!opts.includes(newEnd) || toM(newEnd) <= toM(v)) newEnd = defaultEndTime(v);
      next.endTime = newEnd;
    }
    setForm(next);
    if (k === "date" || k === "time" || k === "endTime") {
      const d = k === "date" ? v : next.date;
      const t = k === "time" ? v : next.time;
      const en = k === "endTime" ? v : next.endTime;
      setConflict(d && t && en ? checkConflict(d, t, en, bookings, personalBlocks) : null);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "What's your name?";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email needed";
    if (!form.date) e.date = "Pick a date";
    else if (form.date < today) e.date = "Can't book in the past!";
    if (!form.time) e.time = "Pick a start time";
    if (!form.endTime) e.endTime = "Pick an end time";
    else if (toM(form.endTime) <= toM(form.time)) e.endTime = "End must be after start";
    if (!form.reason.trim()) e.reason = "Why do you want to meet?";
    return e;
  };

  const handleSubmit = async () => {
    const e=validate();
    if(Object.keys(e).length){setErrors(e);return;}
    if(conflict) return;
    setSending(true);
    const bk={...form,id:uid(),status:"pending",createdAt:Date.now()};
    await notifyRosy(bk);
    onSubmit(bk);
    setSending(false);
    setDone(true);
  };

  if (done) return (
    <div className="form-card" ref={formRef}>
      <div className="success">
        <div style={{fontSize:"3rem",marginBottom:".75rem"}}>🌿</div>
        <h3>Request Sent!</h3>
        <p>Rosy's been notified — she'll confirm soon.</p>
        <div className="form-note" style={{textAlign:"left",marginBottom:"1.25rem"}}>
          <span>📬</span>
          <span>An email went to Rosy about your request for <strong>{fmtDate(form.date)}</strong>, <strong>{fmtTimeRange(form.time, form.endTime)}</strong>. You'll get an email once she decides!</span>
        </div>
        <span className="success-pill">🍊 Now touch some grass while you wait</span>
        <div style={{marginTop:"1.5rem"}}>
          <button className="btn btn-outline btn-sm" onClick={() => { setDone(false); setForm({ name: "", email: "", date: "", time: "", endTime: "", reason: "" }); clearInit && clearInit(); }}>Book another slot</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="form-card" ref={formRef}>
      <div className="form-card-head">
        <h3>Make Your Request</h3>
        <p>Fill this in and Rosy will confirm as soon as she can.</p>
      </div>

      {initDate && initTime && (
        <div className="prefill-banner">
          <span>📅</span>
          <span>Pre-filled from calendar: <strong>{fmtDate(initDate)}</strong> · <strong>{(initEndTime || defaultEndTime(initTime)) ? fmtTimeRange(initTime, initEndTime || defaultEndTime(initTime)) : fmtTime(initTime)}</strong></span>
          <button onClick={clearInit}>Clear</button>
        </div>
      )}

      <div className="g2">
        <div className="f">
          <label>Your Name *</label>
          <input value={form.name} onChange={e=>handleChange("name",e.target.value)} placeholder="e.g. Anas" />
          {errors.name&&<div className="f-err">{errors.name}</div>}
        </div>
        <div className="f">
          <label>Your Email *</label>
          <input type="email" value={form.email} onChange={e=>handleChange("email",e.target.value)} placeholder="you@example.com" />
          {errors.email&&<div className="f-err">{errors.email}</div>}
        </div>
      </div>
      <div className="g2">
        <div className="f">
          <label>Date *</label>
          <input type="date" value={form.date} min={today} onChange={e=>handleChange("date",e.target.value)} />
          {errors.date&&<div className="f-err">{errors.date}</div>}
        </div>
        <div className="f">
          <label>Starts *</label>
          <select value={form.time} onChange={e=>handleChange("time",e.target.value)}>
            <option value="">Choose a time...</option>
            {times.map(t=><option key={t} value={t}>{fmtTime(t)}</option>)}
          </select>
          {errors.time&&<div className="f-err">{errors.time}</div>}
        </div>
      </div>
      <div className="f">
        <label>Ends *</label>
        <select value={form.endTime} onChange={e=>handleChange("endTime",e.target.value)} disabled={!form.time}>
          <option value="">{form.time ? "Choose end time..." : "Pick a start first"}</option>
          {form.time && endTimesAfter(form.time).map(t => <option key={t} value={t}>{fmtTime(t)}</option>)}
        </select>
        {errors.endTime && <div className="f-err">{errors.endTime}</div>}
      </div>

      {conflict&&(
        <div className="conflict-warn">
          <span>⚠️</span>
          <span><strong>Slot unavailable</strong> — "{conflict.label}". Check the calendar above for a green slot!</span>
        </div>
      )}

      <div className="f">
        <label>Why do you want to meet? *</label>
        <textarea value={form.reason} onChange={e=>handleChange("reason",e.target.value)}
          placeholder="Coffee catch-up, study sesh, emergency rant, sushi eating contest..." />
        {errors.reason&&<div className="f-err">{errors.reason}</div>}
      </div>

      <button className={`submit-btn`} onClick={handleSubmit} disabled={!!conflict||sending}>
        {sending?"Sending...":"Send Booking Request 🍊"}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════
//  BOOKING PAGE (full public view)
// ════════════════════════════════════════════════════
function BookingPage({ onSubmit, personalBlocks, bookings }) {
  const [initDate, setInitDate] = useState(null);
  const [initTime, setInitTime] = useState(null);
  const [initEndTime, setInitEndTime] = useState(null);
  const bookRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSelect = (date, time, endTime) => {
    setInitDate(date);
    setInitTime(time);
    setInitEndTime(endTime);
    setTimeout(() => bookRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <>
      {/* ── TEXT HERO (first) ── */}
      <section id="top" className="hero">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-blob hero-blob-3" />
        <div className="hero-blob hero-blob-4" />
        <div className="hero-inner">
          <div className="hero-eyebrow">✨ Presenting You</div>
          <h1 className="hero-title">
            Book<br/>
            <span className="line2">Rosy</span>
          </h1>
          <p className="hero-desc">
            She's everyone's favourite person you know it, we know it. 
            Now there's a whole website to spend more time with her.
          </p>
          <div className="hero-vibes">
            <span className="hero-vibe">🍣 Sushi Sessions</span>
            <span className="hero-vibe">🛍️ Shopping Spree</span>
            <span className="hero-vibe">🧠 Therapy Talks</span>
            <span className="hero-vibe">☕ Cozy Coffee Dates</span>
          </div>

        </div>
      </section>

      {/* ── PORTRAIT GALLERY (scrolls in after hero) ── */}
      <PortraitGallery />

      {/* ── EXPERIENCE CARDS ── */}
      <ExpSection />

      <ReviewsSection />

      {/* ── AVAILABILITY ── */}
      <section id="schedule" className="avail-section">
        <div className="page">
          <div className="s-head">
            <div className="s-eyebrow" style={{background:"var(--sage-p)",color:"var(--sage)",border:"1px solid rgba(77,144,112,.2)"}}>📅 Check before you book</div>
            <h2>Rosy's <em>Availability</em></h2>
            <p>Pick when you wanna meet her and continue booking below</p>
            <p>Make sure you don't ask her to skip class</p>
          </div>
          <PublicCal bookings={bookings} personalBlocks={personalBlocks} onSelect={handleSelect} />
        </div>
      </section>

      {/* ── BOOKING FORM ── */}
      <section id="book" className="book-section" ref={bookRef}>
        <div className="page">
          <div className="s-head">
            <div className="s-eyebrow" style={{background:"var(--tang-p)",color:"var(--tang)",border:"1px solid rgba(255,101,52,.2)"}}>📝 Ready to book?</div>
            <h2>Claim Your <em>Slot</em></h2>
            <p>She will be notified instantly and will confirm as soon as she can</p>
          </div>
          <div className="book-grid">
            {/* Sidebar */}
            <div>
              <div className="book-sidebar-photo">
                <img src={publicAsset(PORTRAIT_PHOTOS[0])} alt="Rosy"
                  onError={e=>{e.target.style.display="none"}} />
                <div className="book-photo-badge">
                  <div className="book-photo-name">Rosy</div>
                  <div className="book-photo-sub">The one and only 🌺</div>
                </div>
              </div>
              <div className="book-quote">
                "Yes I have a booking website which I always joked about and now it's here."
                <cite>— Rosy, probably</cite>
              </div>
            </div>
            <BookForm onSubmit={onSubmit} personalBlocks={personalBlocks} bookings={bookings}
              initDate={initDate} initTime={initTime} initEndTime={initEndTime}
              clearInit={() => { setInitDate(null); setInitTime(null); setInitEndTime(null); }} />
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-logo">book<em>rosy</em><span style={{fontSize:".7em",opacity:.55}}>.com</span></div>
        <div className="footer-sub">Made with ♡ by a friend who cares about you and with too much free time</div>
        <p className="footer-aveion">
          Made by{" "}
          <a href="https://aveiontechnologies.com/" target="_blank" rel="noopener noreferrer">
            aveiontechnologies.com
          </a>
        </p>
      </footer>
    </>
  );
}

// ════════════════════════════════════════════════════
//  LANDING — friend vs Rosy
// ════════════════════════════════════════════════════
function LandingView({ onFriend, onRosy }) {
  return (
    <div className="landing">
      <div className="landing-blob landing-blob-1" aria-hidden />
      <div className="landing-blob landing-blob-2" aria-hidden />
      <div className="landing-inner">
        <p className="landing-eyebrow">bookrosy.com</p>
        <h1 className="landing-title">Time with <em>Rosy</em></h1>
        <p className="landing-lede">
          If you're friends with Rosy, head to her calendar; If you are Rosy then go sign in to manage requests.
        </p>
        <div className="landing-actions">
          <button type="button" className="landing-btn-friend" onClick={onFriend}>
            I’m a friend — I want time with Rosy
          </button>
          <button type="button" className="landing-btn-rosy" onClick={onRosy}>
            I am Rosy
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════════════
function LoginView({ onLogin, onBack }) {
  const [pwd, setPwd] = useState(""), [err, setErr] = useState("");
  const attempt = () => { if(!onLogin(pwd)) setErr("Incorrect. (Hint: the website name 🍊)"); };
  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-av">
          <img src={publicAsset(PORTRAIT_PHOTOS[0])} alt="Rosy"
            onError={e=>{e.target.parentNode.innerHTML='<div style="width:100%;height:100%;background:var(--rose-p);display:flex;align-items:center;justify-content:center;font-size:2.4rem">🌸</div>'}} />
        </div>
        <h2>Rosy's Corner</h2>
        <p>Only Rosy can enter here. Are you Rosy?</p>
        {err&&<div className="login-err">{err}</div>}
        <div className="f" style={{textAlign:"left"}}>
          <label>Password</label>
          <input type="password" value={pwd} onChange={e=>{setPwd(e.target.value);setErr("");}} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&attempt()} />
        </div>
        <button className="submit-btn" style={{marginBottom:".85rem"}} onClick={attempt}>Enter Dashboard 🌿</button>
        <button className="btn btn-outline" style={{width:"100%"}} onClick={onBack}>← Back home</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
//  DASHBOARD CALENDAR
// ════════════════════════════════════════════════════
function DashCal({ bookings, personalBlocks }) {
  const [wOff, setWOff] = useState(0);
  const days = useMemo(()=>getWeek(wOff),[wOff]);
  const todayStr = isoDate(new Date());
  const hours = Array.from({length:END_HOUR-START_HOUR},(_,i)=>START_HOUR+i);
  const DAY=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const SLOT_H=36;
  const weekLabel=`${days[0].toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${days[6].toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;

  const getBlocks=(dayDt)=>{
    const iso=isoDate(dayDt),dow=dayDt.getDay(),blocks=[];
    CLASS_SCHEDULE.filter(c=>c.dayOfWeek===dow).forEach(c=>{
      const top=(toM(c.start)-START_HOUR*60)/60*SLOT_H;
      const h=(toM(c.end)-toM(c.start))/60*SLOT_H;
      blocks.push({type:"class",label:c.label,top,height:Math.max(h-2,14)});
    });
    personalBlocks.filter(b=>b.date===iso).forEach(b=>{
      const top=(toM(b.start)-START_HOUR*60)/60*SLOT_H;
      const h=(toM(b.end)-toM(b.start))/60*SLOT_H;
      blocks.push({type:"personal",label:b.label||"Blocked",top,height:Math.max(h-2,14)});
    });
    bookings.filter(b=>b.date===iso&&(b.status==="confirmed"||b.status==="pending")).forEach(b=>{
      const top=(toM(b.time)-START_HOUR*60)/60*SLOT_H;
      const durH=(bookingEndM(b)-toM(b.time))/60;
      const height=Math.max(durH*SLOT_H-2,16);
      blocks.push({type:b.status,label:b.name,top,height});
    });
    return blocks;
  };

  return (
    <>
      <div className="cal-nav">
        <button type="button" className="cal-nb cal-nb-ico" onClick={()=>setWOff(w=>w-1)} aria-label="Previous week">‹</button>
        <h3>{weekLabel}</h3>
        <button type="button" className="cal-nb cal-nb-today" onClick={()=>setWOff(0)}>Today</button>
        <button type="button" className="cal-nb cal-nb-ico" onClick={()=>setWOff(w=>w+1)} aria-label="Next week">›</button>
      </div>
      <div className="cal-leg">
        <span className="leg"><span className="leg-dot ld-class"/>Class</span>
        <span className="leg"><span className="leg-dot ld-busy"/>Personal</span>
        <span className="leg"><span className="leg-dot" style={{background:"rgba(77,144,112,.5)"}}/>Confirmed</span>
        <span className="leg"><span className="leg-dot" style={{background:"rgba(255,101,52,.18)",border:"1px dashed var(--tang-s)"}}/>Pending</span>
      </div>
      <div className="cal-scroll">
        <div className="cal-grid">
          <div style={{background:"var(--ink)"}}/>
          {days.map((d,i)=>(
            <div key={i} className={`cal-h${isoDate(d)===todayStr?" today":""}`}>
              <div className="dn">{DAY[i]}</div>
              <div className="dd">{d.getDate()}</div>
            </div>
          ))}
          {hours.map(h=>(
            <>
              <div key={`t${h}`} className="cal-tlbl">{h===0?"12a":h<12?`${h}a`:h===12?"12p":`${h-12}p`}</div>
              {days.map((_,di)=><div key={`${h}-${di}`} className="cal-dcol cal-hl"/>)}
            </>
          ))}
          {days.map((d,di)=>{
            const blocks=getBlocks(d);
            if(!blocks.length) return null;
            return (
              <div key={`b${di}`} style={{gridColumn:di+2,gridRow:`2 / span ${hours.length}`,position:"relative",pointerEvents:"none"}}>
                {blocks.map((b,bi)=>(
                  <div key={bi} className={`cal-blk cb-${b.type}`} style={{top:b.top,height:b.height}}>{b.label}</div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════
//  REQUESTS TAB
// ════════════════════════════════════════════════════
function RequestsTab({ bookings, onApprove, onReject }) {
  const [filter, setFilter] = useState("pending");
  const filtered = bookings.filter(b=>b.status===filter);
  const pending = bookings.filter(b=>b.status==="pending").length;
  return (
    <>
      <div className="tab-bar" style={{marginBottom:"1.25rem"}}>
        {[{k:"pending",label:"Pending",n:pending},{k:"confirmed",label:"Confirmed"},{k:"rejected",label:"Declined"}].map(({k,label,n})=>(
          <button key={k} className={`tab-btn${filter===k?" active":""}`} onClick={()=>setFilter(k)}>
            {label}{n>0&&<span className="badge-n">{n}</span>}
          </button>
        ))}
      </div>
      <div className="req-list">
        {filtered.length===0?(
          <div className="empty-s"><span>{filter==="pending"?"🍊":filter==="confirmed"?"🌿":"😬"}</span>
            {filter==="pending"?"No pending requests — enjoy the peace.":filter==="confirmed"?"No confirmed bookings yet.":"No declined requests."}
          </div>
        ):filtered.map(req=>(
          <div key={req.id} className="req-c">
            <div className="req-top">
              <div>
                <div className="req-name">{req.name}</div>
                <div className="req-meta">
                  <span>📅 {fmtDate(req.date)}</span>
                  <span>🕐 {fmtTimeRange(req.time, frM(bookingEndM(req)))}</span>
                  <span>✉️ {req.email}</span>
                </div>
              </div>
              <span className={`badge badge-${req.status}`}>{req.status==="pending"?"Pending":req.status==="confirmed"?"Confirmed":"Declined"}</span>
            </div>
            <div className="req-reason">"{req.reason}"</div>
            <div className="req-acts">
              {req.status==="pending"&&<>
                <button className="btn btn-sage btn-sm" onClick={()=>onApprove(req.id)}>✓ Confirm</button>
                <button className="btn btn-danger btn-sm" onClick={()=>onReject(req.id)}>✕ Decline</button>
              </>}
              {req.status==="confirmed"&&<button className="btn btn-danger btn-xs" onClick={()=>onReject(req.id)}>Cancel</button>}
              {req.status==="rejected"&&<button className="btn btn-sage btn-xs" onClick={()=>onApprove(req.id)}>Reconfirm</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════
//  BLOCK TIME TAB
// ════════════════════════════════════════════════════
function BlockTimeTab({ personalBlocks, onAddBlock, onRemoveBlock }) {
  const today=isoDate(new Date());
  const [form,setForm]=useState({date:"",start:"09:00",end:"10:00",label:""});
  const [err,setErr]=useState("");
  const times = useMemo(() => halfHourTimes(), []);
  const handleAdd=()=>{
    if(!form.date){setErr("Pick a date");return;}
    if(toM(form.end)<=toM(form.start)){setErr("End must be after start");return;}
    onAddBlock(form);setForm({date:"",start:"09:00",end:"10:00",label:""});setErr("");
  };
  return (
    <>
      <div className="blk-form">
        <h4>🔒 Block a Time Slot</h4>
        <div className="g2">
          <div className="f"><label>Date</label><input type="date" value={form.date} min={today} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
          <div className="f"><label>Label (optional)</label><input value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} placeholder="Me time, Gym, Nap..."/></div>
          <div className="f"><label>Start</label><select value={form.start} onChange={e=>setForm(f=>({...f,start:e.target.value}))}>{times.map(t=><option key={t} value={t}>{fmtTime(t)}</option>)}</select></div>
          <div className="f"><label>End</label><select value={form.end} onChange={e=>setForm(f=>({...f,end:e.target.value}))}>{times.map(t=><option key={t} value={t}>{fmtTime(t)}</option>)}</select></div>
        </div>
        {err&&<div style={{color:"var(--tang)",fontSize:".83rem",marginBottom:".75rem"}}>⚠️ {err}</div>}
        <button className="btn btn-rose btn-sm" onClick={handleAdd}>+ Add Block</button>
      </div>
      <div className="sec-lbl">📚 Class Schedule <span className="tag">Always blocked</span></div>
      <div className="cls-list">
        {CLASS_SCHEDULE.map((c,i)=>{
          const dN=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
          return <span key={i} className="cls-chip">{dN[c.dayOfWeek]} · {fmtTime(c.start)}–{fmtTime(c.end)} · {c.label}</span>;
        })}
      </div>
      <div className="sec-lbl">🔒 Personal Blocks</div>
      {personalBlocks.length===0?(
        <div className="empty-s" style={{padding:"1.5rem 0"}}>No personal blocks yet.</div>
      ):(
        <div className="blk-list">
          {personalBlocks.map(b=>(
            <div key={b.id} className="blk-item">
              <div>
                <div className="blk-lbl">{b.label||"Personal Block"}</div>
                <div className="blk-t">{fmtDate(b.date)} · {fmtTime(b.start)} – {fmtTime(b.end)}</div>
              </div>
              <button className="btn-ico" onClick={()=>onRemoveBlock(b.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════
function Dashboard({ bookings, personalBlocks, onApprove, onReject, onAddBlock, onRemoveBlock, onLogout }) {
  const [tab, setTab] = useState("requests");
  const pending=bookings.filter(b=>b.status==="pending").length;
  const confirmed=bookings.filter(b=>b.status==="confirmed").length;
  return (
    <div className="dash">
      <div className="dash-hero">
        <div className="dash-inner">
          <div>
            <h1>Hey, <em>Rosy</em> 🌸</h1>
            <p>Here's your schedule. You're very popular.</p>
            <div className="dash-stats">
              <span className="stat-p"><span className="s-dot sd-t"/>{pending} pending</span>
              <span className="stat-p"><span className="s-dot sd-s"/>{confirmed} confirmed</span>
              <span className="stat-p"><span className="s-dot sd-r"/>{personalBlocks.length} blocks</span>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onLogout}>Sign out</button>
        </div>
      </div>
      <div className="dash-body">
        <div className="tab-bar">
          <button className={`tab-btn${tab==="requests"?" active":""}`} onClick={()=>setTab("requests")}>
            📬 Requests {pending>0&&<span className="badge-n">{pending}</span>}
          </button>
          <button className={`tab-btn${tab==="schedule"?" active":""}`} onClick={()=>setTab("schedule")}>📅 Schedule</button>
          <button className={`tab-btn${tab==="block"?" active":""}`} onClick={()=>setTab("block")}>🔒 Block Time</button>
        </div>
        {tab==="requests"&&<RequestsTab bookings={bookings} onApprove={onApprove} onReject={onReject}/>}
        {tab==="schedule"&&<DashCal bookings={bookings} personalBlocks={personalBlocks}/>}
        {tab==="block"&&<BlockTimeTab personalBlocks={personalBlocks} onAddBlock={onAddBlock} onRemoveBlock={onRemoveBlock}/>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
//  APP
// ════════════════════════════════════════════════════
function historyUrl() {
  const p = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/";
  return p || "/";
}

function viewFromHistoryState(st) {
  const v = st?.view;
  if (v === "booking" || v === "login" || v === "dashboard" || v === "landing") return v;
  return "landing";
}

export default function BookRosy() {
  const [view, setView] = useState(() =>
    typeof window !== "undefined" ? viewFromHistoryState(window.history.state) : "landing"
  );
  const [loggedIn, setLoggedIn] = useState(false);
  const [bookings, setBookings] = useLS("bookrosy_v4_bookings", []);
  const [blocks, setBlocks]     = useLS("bookrosy_v4_blocks", []);
  const [toasts, setToasts]     = useState([]);

  const pushView = useCallback(next => {
    window.history.pushState({ view: next }, "", historyUrl());
    setView(next);
  }, []);

  const replaceView = useCallback(next => {
    window.history.replaceState({ view: next }, "", historyUrl());
    setView(next);
  }, []);

  useEffect(() => {
    if (window.history.state == null || window.history.state.view == null) {
      window.history.replaceState({ view: "landing" }, "", historyUrl());
    }
  }, []);

  useEffect(() => {
    const onPop = e => setView(viewFromHistoryState(e.state));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (view === "landing") window.scrollTo(0, 0);
  }, [view]);

  useEffect(() => {
    if (view === "dashboard" && !loggedIn) replaceView("landing");
    else if (view === "login" && loggedIn) replaceView("dashboard");
  }, [view, loggedIn, replaceView]);

  // 🍊 Tangerine favicon
  useEffect(() => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) { link = document.createElement('link'); document.head.appendChild(link); }
    link.rel = 'icon';
    link.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍊</text></svg>";
    document.title = "bookrosy.com";
  }, []);

  const toast = (msg, emoji="🍊") => {
    const id=uid();
    setToasts(t=>[...t,{id,msg,emoji}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4500);
  };

  const handleLogin = pwd => {
    if (pwd === ROSY_PASSWORD) {
      setLoggedIn(true);
      replaceView("dashboard");
      toast("Welcome back, Rosy! 🌸", "🌸");
      return true;
    }
    return false;
  };

  const handleApprove = async id => {
    const bk=bookings.find(b=>b.id===id);
    setBookings(p=>p.map(b=>b.id===id?{...b,status:"confirmed"}:b));
    if(bk) await notifyFriend(bk,"confirmed");
    toast("Booking confirmed! Friend notified. 🌿","✅");
  };

  const handleReject = async id => {
    const bk=bookings.find(b=>b.id===id);
    setBookings(p=>p.map(b=>b.id===id?{...b,status:"rejected"}:b));
    if(bk) await notifyFriend(bk,"rejected");
    toast("Request declined. Friend notified.","❌");
  };

  return (
    <div>
      <style>{CSS}</style>
      {view!=="login"&&view!=="landing"&&(
        <Nav
          setView={pushView}
          isLoggedIn={loggedIn}
          showSiteNav={view === "booking"}
        />
      )}
      {view==="landing"&&(
        <LandingView
          onFriend={() => pushView("booking")}
          onRosy={() => pushView("login")}
        />
      )}
      {view==="booking"&&(
        <BookingPage
          personalBlocks={blocks} bookings={bookings}
          onSubmit={bk=>{ setBookings(p=>[bk,...p]); toast(`Request from ${bk.name} sent! 📬`,"📬"); }}
        />
      )}
      {view==="login"&&!loggedIn&&<LoginView onLogin={handleLogin} onBack={() => window.history.back()} />}
      {view==="dashboard"&&loggedIn&&(
        <Dashboard
          bookings={bookings} personalBlocks={blocks}
          onApprove={handleApprove} onReject={handleReject}
          onAddBlock={b=>{ setBlocks(p=>[{...b,id:uid()},...p]); toast("Blocked! 🔒","🔒"); }}
          onRemoveBlock={id=>{ setBlocks(p=>p.filter(b=>b.id!==id)); toast("Block removed.","✅"); }}
          onLogout={()=>{
            setLoggedIn(false);
            replaceView("landing");
            toast("Logged out. 👋", "👋");
          }}
        />
      )}
      <Toast toasts={toasts}/>
    </div>
  );
}
