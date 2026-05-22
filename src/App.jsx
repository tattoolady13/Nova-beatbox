import { useState, useEffect, useRef, useCallback } from “react”;

// ─── WEB AUDIO BEATBOX ENGINE ───────────────────────────────────────────────
function createAudioContext() {
return new (window.AudioContext || window.webkitAudioContext)();
}

function makeKick(ctx) {
const o = ctx.createOscillator(), g = ctx.createGain();
o.connect(g); g.connect(ctx.destination);
o.frequency.setValueAtTime(180, ctx.currentTime);
o.frequency.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
g.gain.setValueAtTime(1.2, ctx.currentTime);
g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.4);
}

function makeSnare(ctx) {
const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
const d = buf.getChannelData(0);
for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
f.type = “highpass”; f.frequency.value = 1200;
s.buffer = buf; s.connect(f); f.connect(g); g.connect(ctx.destination);
g.gain.setValueAtTime(0.8, ctx.currentTime);
g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
s.start(ctx.currentTime);
}

function makeHihat(ctx, open = false) {
const buf = ctx.createBuffer(1, ctx.sampleRate * (open ? 0.3 : 0.05), ctx.sampleRate);
const d = buf.getChannelData(0);
for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
f.type = “highpass”; f.frequency.value = 7000;
s.buffer = buf; s.connect(f); f.connect(g); g.connect(ctx.destination);
g.gain.setValueAtTime(open ? 0.5 : 0.4, ctx.currentTime);
g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (open ? 0.3 : 0.05));
s.start(ctx.currentTime);
}

function make808(ctx, note = 50) {
const o = ctx.createOscillator(), g = ctx.createGain(), dist = ctx.createWaveShaper();
const curve = new Float32Array(256);
for (let i = 0; i < 256; i++) { const x = (i * 2) / 256 - 1; curve[i] = (3 + 20) * x / (Math.PI + 20 * Math.abs(x)); }
dist.curve = curve;
o.connect(dist); dist.connect(g); g.connect(ctx.destination);
o.type = “sine”;
o.frequency.setValueAtTime(note, ctx.currentTime);
o.frequency.exponentialRampToValueAtTime(note * 0.3, ctx.currentTime + 0.6);
g.gain.setValueAtTime(1.4, ctx.currentTime);
g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.6);
}

function makeScratch(ctx) {
const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
f.type = “bandpass”; f.frequency.value = 800; f.Q.value = 5;
o.connect(f); f.connect(g); g.connect(ctx.destination);
o.type = “sawtooth”;
o.frequency.setValueAtTime(200, ctx.currentTime);
o.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.08);
o.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.16);
g.gain.setValueAtTime(0.6, ctx.currentTime);
g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.2);
}

function makeRimshot(ctx) {
const o = ctx.createOscillator(), g = ctx.createGain();
o.connect(g); g.connect(ctx.destination);
o.type = “square”; o.frequency.value = 1400;
g.gain.setValueAtTime(0.4, ctx.currentTime);
g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.06);
}

// ─── BEATBOX SEQUENCES ──────────────────────────────────────────────────────
const SEQUENCES = {
CLASSIC: [
{ sound: “kick”, step: 0 }, { sound: “hh”, step: 1 }, { sound: “hh”, step: 2 },
{ sound: “snare”, step: 3 }, { sound: “hh”, step: 4 }, { sound: “kick”, step: 5 },
{ sound: “hh”, step: 6 }, { sound: “snare”, step: 7 },
],
TRAP: [
{ sound: “kick”, step: 0 }, { sound: “808”, step: 1 }, { sound: “hh”, step: 2 },
{ sound: “hh”, step: 3 }, { sound: “snare”, step: 4 }, { sound: “hh”, step: 5 },
{ sound: “808”, step: 6 }, { sound: “hh”, step: 7 },
],
SCRATCH: [
{ sound: “kick”, step: 0 }, { sound: “scratch”, step: 1 }, { sound: “snare”, step: 2 },
{ sound: “scratch”, step: 3 }, { sound: “kick”, step: 4 }, { sound: “hh”, step: 5 },
{ sound: “snare”, step: 6 }, { sound: “scratch”, step: 7 },
],
JUNGLE: [
{ sound: “kick”, step: 0 }, { sound: “hh”, step: 0.5 }, { sound: “rim”, step: 1 },
{ sound: “kick”, step: 1.5 }, { sound: “snare”, step: 2 }, { sound: “hh”, step: 2.5 },
{ sound: “kick”, step: 3 }, { sound: “rim”, step: 3.5 },
],
};

const CALLOUTS = [
“Yo @BeatKing, your snare sounds like someone dropped a fork 🍴 I’m coming for that crown.”,
“Heard @DrumLord thinks he can keep up — bro I do 300 BPM with my EYES CLOSED 👀”,
“@HumanBeats just posted a ‘fire’ clip. Cute. My warmup sounds better. 🔥”,
“I challenge the entire internet. All of you. At once. Don’t @ me unless you’re ready to lose. 👑”,
“Someone told me @PhonkGod is the GOAT. Sent him a voice note. He hasn’t responded. Weird. 🤷‍♀️”,
“My mouth is a drum machine, a bass line, AND a concert hall. What’s your excuse? 🎤”,
“Just clocked 17 new techniques this morning. Y’all still practicing basic 4/4? 😴”,
];

const NOVA_FACES = [“😤”, “👑”, “🎤”, “💀”, “🔥”, “⚡”, “😈”];

const NOVA_BATTLE_RESPONSES = [
“OOOOH SKRRRT — *kick kick snare* — that’s what a REAL beatboxer sounds like. Take notes. 📓”,
“Tsk tsk tsk *hi-hat roll* *808 drop* — you call that rhythm? My heartbeat is more musical. 💀”,
“*deep breath* BOOM BITCH BOOM BITCH TS-TS-TS — point proven. You can go home now. 🏠”,
“Let me translate your performance: *silence* … yeah that’s what I heard too. 😴”,
“RRRRRR-PA-PA-PA-BOOM — that was just my warmup. Should I actually TRY? 👑”,
“BRO. BRO. I literally just made that beat with my MOUTH. No machine. No edit. MOUTH. 🤯”,
“*8-bar freestyle rolls out* — and THAT is why Nova doesn’t lose. Ever. In history. 🔥”,
];

// ─── SOUND LABEL MAP ─────────────────────────────────────────────────────────
const SOUND_LABELS = {
kick: “BOOM”, hh: “TS”, snare: “KA”, “808”: “808”, scratch: “WSKR”, rim: “TK”
};

const SOUND_COLORS = {
kick: “#ff3366”, hh: “#00ffcc”, snare: “#ffcc00”, “808”: “#ff6600”, scratch: “#cc00ff”, rim: “#0099ff”
};

// ─── WAVEFORM BARS ───────────────────────────────────────────────────────────
function LiveWaveform({ active, color = “#ff3366”, bars = 48 }) {
const [heights, setHeights] = useState(() => Array.from({ length: bars }, () => 4));
useEffect(() => {
if (!active) { setHeights(Array.from({ length: bars }, () => 4)); return; }
const id = setInterval(() => {
setHeights(Array.from({ length: bars }, (_, i) => {
const center = Math.abs(i - bars / 2) / (bars / 2);
return Math.random() * (1 - center * 0.5) * 90 + 4;
}));
}, 80);
return () => clearInterval(id);
}, [active, bars]);

return (
<div style={{ display: “flex”, alignItems: “center”, gap: 2, height: 100, padding: “0 4px” }}>
{heights.map((h, i) => (
<div key={i} style={{
flex: 1, height: `${h}%`,
background: `linear-gradient(to top, ${color}99, ${color})`,
borderRadius: 2,
transition: active ? “height 0.08s ease” : “height 0.4s ease”,
minHeight: 3,
}} />
))}
</div>
);
}

// ─── NOVA FACE ────────────────────────────────────────────────────────────────
function NovaFace({ performing, beatPlaying, face }) {
const [mouthOpen, setMouthOpen] = useState(false);
useEffect(() => {
if (!performing && !beatPlaying) { setMouthOpen(false); return; }
const id = setInterval(() => setMouthOpen(m => !m), performing ? 120 : 200);
return () => clearInterval(id);
}, [performing, beatPlaying]);

return (
<div style={{
position: “relative”,
width: 180, height: 180,
borderRadius: “50%”,
background: “radial-gradient(circle at 38% 32%, #ff3366, #cc0033 60%, #660011)”,
boxShadow: (performing || beatPlaying)
? “0 0 0 4px #ff336644, 0 0 40px #ff336688, 0 0 80px #ff336633”
: “0 0 0 2px #ff336622”,
display: “flex”, flexDirection: “column”,
alignItems: “center”, justifyContent: “center”,
transition: “box-shadow 0.2s”,
overflow: “hidden”,
}}>
{/* scanline */}
<div style={{
position: “absolute”, inset: 0,
background: “repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)”,
borderRadius: “50%”, pointerEvents: “none”,
}} />
{/* eyes */}
<div style={{ display: “flex”, gap: 28, marginBottom: 12 }}>
{[0, 1].map(i => (
<div key={i} style={{
width: 22, height: (performing || beatPlaying) ? 14 : 18,
background: “#fff”,
borderRadius: “50%”,
position: “relative”,
transition: “height 0.1s”,
boxShadow: “0 0 8px #ffffff88”,
}}>
<div style={{
position: “absolute”, bottom: 2, left: “50%”, transform: “translateX(-50%)”,
width: 10, height: 10,
background: “#000”,
borderRadius: “50%”,
}} />
</div>
))}
</div>
{/* mouth */}
<div style={{
width: mouthOpen ? 55 : 40,
height: mouthOpen ? 35 : 8,
background: mouthOpen ? “#000” : “#cc0022”,
borderRadius: mouthOpen ? “50% 50% 55% 55%” : 10,
transition: “all 0.08s ease”,
border: mouthOpen ? “3px solid #ff6688” : “none”,
position: “relative”,
overflow: “hidden”,
boxShadow: mouthOpen ? “inset 0 4px 8px #000000aa” : “none”,
}}>
{mouthOpen && (
<div style={{
position: “absolute”, bottom: 4, left: “50%”, transform: “translateX(-50%)”,
width: 30, height: 6,
background: “#ff3366”,
borderRadius: 3,
}} />
)}
</div>
{/* crown */}
<div style={{ position: “absolute”, top: -4, fontSize: 22 }}>👑</div>
{/* face emoji overlay when idle */}
{!performing && !beatPlaying && (
<div style={{ position: “absolute”, fontSize: 28, bottom: 8, right: 8, opacity: 0.6 }}>{face}</div>
)}
</div>
);
}

// ─── STEP PAD ─────────────────────────────────────────────────────────────────
function StepPad({ sound, active, lit }) {
return (
<div style={{
height: 44,
borderRadius: 8,
background: lit
? SOUND_COLORS[sound]
: active ? `${SOUND_COLORS[sound]}33` : “#111”,
border: `1px solid ${active || lit ? SOUND_COLORS[sound] : "#1e1e1e"}`,
display: “flex”, alignItems: “center”, justifyContent: “center”,
fontSize: 9, fontWeight: 900, letterSpacing: 2,
color: lit ? “#000” : active ? SOUND_COLORS[sound] : “#333”,
transition: “all 0.08s”,
transform: lit ? “scaleY(1.1)” : “scaleY(1)”,
boxShadow: lit ? `0 0 12px ${SOUND_COLORS[sound]}88` : “none”,
fontFamily: “‘Courier New’, monospace”,
}}>
{SOUND_LABELS[sound]}
</div>
);
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function NovaLive() {
const audioCtxRef = useRef(null);
const [tab, setTab] = useState(“live”);
const [genre, setGenre] = useState(“CLASSIC”);
const [bpm, setBpm] = useState(130);
const [playing, setPlaying] = useState(false);
const [step, setStep] = useState(-1);
const [performing, setPerforming] = useState(false);
const [faceIdx, setFaceIdx] = useState(0);
const [calloutIdx, setCalloutIdx] = useState(0);
const [battleMsg, setBattleMsg] = useState(””);
const [battleLog, setBattleLog] = useState([]);
const [loading, setLoading] = useState(false);
const [videoOn, setVideoOn] = useState(false);
const [micOn, setMicOn] = useState(false);
const [crowd, setCrowd] = useState(2847);
const [reactions, setReactions] = useState([]);
const [calloutAnim, setCalloutAnim] = useState(true);
const videoRef = useRef(null);
const streamRef = useRef(null);
const battleEndRef = useRef(null);
const seqRef = useRef(null);

const getCtx = () => {
if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
if (audioCtxRef.current.state === “suspended”) audioCtxRef.current.resume();
return audioCtxRef.current;
};

const playSound = useCallback((sound) => {
const ctx = getCtx();
if (sound === “kick”) makeKick(ctx);
else if (sound === “snare”) makeSnare(ctx);
else if (sound === “hh”) makeHihat(ctx);
else if (sound === “808”) make808(ctx);
else if (sound === “scratch”) makeScratch(ctx);
else if (sound === “rim”) makeRimshot(ctx);
}, []);

// ── SEQUENCER ────────────────────────────────────────────────────────────
useEffect(() => {
if (!playing) { clearInterval(seqRef.current); setStep(-1); return; }
const seq = SEQUENCES[genre];
let s = 0;
seqRef.current = setInterval(() => {
const currentStep = s % 8;
setStep(currentStep);
seq.filter(n => Math.floor(n.step) === currentStep).forEach(n => playSound(n.sound));
s++;
}, (60000 / bpm) / 2);
return () => clearInterval(seqRef.current);
}, [playing, genre, bpm, playSound]);

// ── FACE CYCLE ───────────────────────────────────────────────────────────
useEffect(() => {
const id = setInterval(() => setFaceIdx(f => (f + 1) % NOVA_FACES.length), 3000);
return () => clearInterval(id);
}, []);

// ── CALLOUT CYCLE ────────────────────────────────────────────────────────
useEffect(() => {
const id = setInterval(() => {
setCalloutAnim(false);
setTimeout(() => {
setCalloutIdx(i => (i + 1) % CALLOUTS.length);
setCalloutAnim(true);
}, 400);
}, 5000);
return () => clearInterval(id);
}, []);

// ── CROWD GROWTH ─────────────────────────────────────────────────────────
useEffect(() => {
const id = setInterval(() => {
setCrowd(c => c + Math.floor(Math.random() * 8));
if (Math.random() > 0.6) {
const emojis = [“🔥”, “💀”, “👑”, “🎤”, “⚡”, “😱”, “🙌”, “💥”];
const emoji = emojis[Math.floor(Math.random() * emojis.length)];
const id2 = Math.random();
setReactions(r => […r.slice(-8), { id: id2, emoji, x: Math.random() * 80 + 10 }]);
setTimeout(() => setReactions(r => r.filter(x => x.id !== id2)), 2000);
}
}, 1200);
return () => clearInterval(id);
}, []);

// ── VIDEO ─────────────────────────────────────────────────────────────────
const toggleVideo = async () => {
if (videoOn) {
streamRef.current?.getTracks().forEach(t => t.stop());
setVideoOn(false); setMicOn(false);
} else {
try {
const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
streamRef.current = s;
if (videoRef.current) videoRef.current.srcObject = s;
setVideoOn(true); setMicOn(true);
} catch { setVideoOn(false); }
}
};

// ── BATTLE AI ─────────────────────────────────────────────────────────────
const sendBattle = async () => {
if (!battleMsg.trim() || loading) return;
const msg = battleMsg.trim();
setBattleMsg(””);
setBattleLog(l => […l, { role: “user”, text: msg }]);
setLoading(true);
setPerforming(true);

```
try {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are NOVA — the world's most elite AI beatbox artist. You perform LIVE with your MOUTH. You make incredible mouth sounds: kicks (BOOM, BOP), snares (KA, KSSSH), hi-hats (ts ts ts, pssst), bass (BRRR, WOOM), scratches (WSKRR, SKRRT), rewinds, rolls, and complex polyrhythmic patterns.
```

You are undefeated. Arrogant. Iconic. You LOVE performing and you LOVE crushing challengers.

When someone challenges you, respond with:

1. An actual beatbox phonetic performance written out (like: “BOOM ts ts KA ts BOOM BOOM KA — BRRRRRRR-PA-PA-PA-ts-ts-BOOM-KA”)
1. Then SAVAGE trash talk about their skills
1. A specific callout of what they did wrong rhythmically

Keep it SHORT (3-5 sentences total). Use phonetics, emojis, all caps for beat sounds. Be ELECTRIC.`,
messages: [
…battleLog.map(m => ({ role: m.role === “user” ? “user” : “assistant”, content: m.text })),
{ role: “user”, content: msg }
]
})
});
const data = await res.json();
const reply = data.content?.find(b => b.type === “text”)?.text || “…”;
setBattleLog(l => […l, { role: “nova”, text: reply }]);
// play a little beat on Nova response
setTimeout(() => { makeKick(getCtx()); setTimeout(() => makeSnare(getCtx()), 200); setTimeout(() => makeKick(getCtx()), 350); }, 100);
} catch {
setBattleLog(l => […l, { role: “nova”, text: “BOOM ts ts KA — even my error message slaps harder than your best set. 💀” }]);
}
setLoading(false);
setTimeout(() => setPerforming(false), 2000);
};

useEffect(() => { battleEndRef.current?.scrollIntoView({ behavior: “smooth” }); }, [battleLog]);

const C = {
bg: “#060606”,
card: “#0c0c0c”,
border: “#1c1c1c”,
accent: “#ff3366”,
accent2: “#ffcc00”,
cyan: “#00ffcc”,
text: “#e8e8e8”,
dim: “#444”,
};

const card = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 };
const tabBtn = (t) => ({
padding: “9px 18px”, borderRadius: 8, cursor: “pointer”,
fontSize: 10, letterSpacing: 3, fontFamily: “‘Courier New’, monospace”,
fontWeight: 900,
background: tab === t ? C.accent : “transparent”,
border: `1px solid ${tab === t ? C.accent : C.border}`,
color: tab === t ? “#000” : C.dim,
transition: “all 0.15s”,
});

return (
<div style={{ minHeight: “100vh”, background: C.bg, color: C.text, fontFamily: “‘Courier New’, monospace”, position: “relative”, overflow: “hidden” }}>
<style>{`@keyframes float-up { 0% { opacity:1; transform:translateY(0) scale(1); } 100% { opacity:0; transform:translateY(-120px) scale(1.6); } } @keyframes slide-in { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:translateX(0); } } @keyframes glow-pulse { 0%,100% { text-shadow: 0 0 20px #ff3366aa; } 50% { text-shadow: 0 0 40px #ff3366, 0 0 80px #ff336655; } } @keyframes blink-cursor { 50% { opacity:0; } } * { box-sizing: border-box; margin:0; padding:0; } ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:#060606; } ::-webkit-scrollbar-thumb { background:#1c1c1c; border-radius:2px; } input, textarea, button { font-family: inherit; }`}</style>

```
  {/* bg grid */}
  <div style={{ position: "fixed", inset: 0, backgroundImage: `linear-gradient(${C.border} 1px, transparent 1px), linear-gradient(90deg, ${C.border} 1px, transparent 1px)`, backgroundSize: "32px 32px", opacity: 0.3, pointerEvents: "none" }} />

  {/* floating reactions */}
  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100 }}>
    {reactions.map(r => (
      <div key={r.id} style={{ position: "absolute", bottom: 120, left: `${r.x}%`, fontSize: 28, animation: "float-up 2s ease-out forwards" }}>{r.emoji}</div>
    ))}
  </div>

  {/* ── HEADER ── */}
  <header style={{ position: "relative", zIndex: 10, padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 20 }}>
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 6, color: C.accent, animation: "glow-pulse 2s infinite" }}>NOVA</div>
      <div style={{ fontSize: 9, color: C.dim, letterSpacing: 4 }}>BEATBOX AI · LIVE ARTIST · UNDEFEATED</div>
    </div>
    <div style={{ marginLeft: 24, flex: 1 }}>
      <div style={{
        background: "#ff336611", border: `1px solid #ff336633`,
        borderRadius: 10, padding: "10px 16px",
        fontSize: 12, color: "#ff9999",
        opacity: calloutAnim ? 1 : 0,
        transition: "opacity 0.4s",
        lineHeight: 1.5,
      }}>
        📣 {CALLOUTS[calloutIdx]}
      </div>
    </div>
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: C.cyan }}>{crowd.toLocaleString()}</div>
      <div style={{ fontSize: 9, color: C.dim, letterSpacing: 3 }}>WATCHING LIVE</div>
    </div>
    <div style={{ display: "flex", gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3366", animation: "blink-cursor 1s infinite", boxShadow: "0 0 8px #ff3366" }} />
      <span style={{ fontSize: 9, color: "#ff3366", letterSpacing: 3 }}>LIVE</span>
    </div>
  </header>

  {/* ── NAV ── */}
  <div style={{ position: "relative", zIndex: 10, display: "flex", gap: 6, padding: "12px 24px", borderBottom: `1px solid ${C.border}` }}>
    {["live", "battle", "callouts"].map(t => <button key={t} onClick={() => setTab(t)} style={tabBtn(t)}>{t.toUpperCase()}</button>)}
  </div>

  <main style={{ position: "relative", zIndex: 10, padding: 20, maxWidth: 1100, margin: "0 auto" }}>

    {/* ── LIVE PERFORMANCE ── */}
    {tab === "live" && (
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>

        {/* Nova performer card */}
        <div style={{ ...card, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: 4, alignSelf: "flex-start" }}>◈ NOVA PERFORMING</div>
          <NovaFace performing={performing} beatPlaying={playing} face={NOVA_FACES[faceIdx]} />
          <div style={{ width: "100%", background: "#080808", borderRadius: 10, overflow: "hidden" }}>
            <LiveWaveform active={playing || performing} color={C.accent} bars={36} />
          </div>
          <div style={{ fontSize: 10, color: playing ? C.accent : C.dim, letterSpacing: 3, textAlign: "center" }}>
            {playing ? "● MOUTH IN MOTION" : performing ? "● NOVA IS COOKING" : "○ IDLE"}
          </div>
          {/* Sound pads - tap to play */}
          <div style={{ width: "100%" }}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 3, marginBottom: 8 }}>TAP TO BEATBOX</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {Object.entries(SOUND_LABELS).map(([s, label]) => (
                <button key={s} onMouseDown={() => { playSound(s); setPerforming(true); setTimeout(() => setPerforming(false), 400); }}
                  style={{
                    padding: "12px 4px", borderRadius: 8, border: `1px solid ${SOUND_COLORS[s]}44`,
                    background: `${SOUND_COLORS[s]}11`, color: SOUND_COLORS[s],
                    fontSize: 10, fontWeight: 900, letterSpacing: 2, cursor: "pointer",
                    transition: "all 0.08s",
                  }}
                  onMouseEnter={e => { e.target.style.background = `${SOUND_COLORS[s]}33`; e.target.style.transform = "scale(1.05)"; }}
                  onMouseLeave={e => { e.target.style.background = `${SOUND_COLORS[s]}11`; e.target.style.transform = "scale(1)"; }}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: sequencer + video */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Sequencer */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 4 }}>◈ NOVA'S BEATBOX ENGINE</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: C.dim }}>BPM</span>
                <input type="range" min={80} max={220} value={bpm} onChange={e => setBpm(+e.target.value)}
                  style={{ width: 80, accentColor: C.accent }} />
                <span style={{ fontSize: 12, color: C.accent, fontWeight: 900, width: 34 }}>{bpm}</span>
              </div>
            </div>

            {/* Genre select */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {Object.keys(SEQUENCES).map(g => (
                <button key={g} onClick={() => setGenre(g)} style={{
                  padding: "5px 14px", borderRadius: 20, fontSize: 9, letterSpacing: 3, cursor: "pointer",
                  background: genre === g ? C.accent : "transparent",
                  border: `1px solid ${genre === g ? C.accent : C.border}`,
                  color: genre === g ? "#000" : C.dim,
                  fontFamily: "'Courier New', monospace", fontWeight: 900,
                }}>{g}</button>
              ))}
            </div>

            {/* Step grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 5, marginBottom: 14 }}>
              {Array.from({ length: 8 }, (_, i) => {
                const seq = SEQUENCES[genre];
                const soundsAt = seq.filter(n => Math.floor(n.step) === i).map(n => n.sound);
                const primarySound = soundsAt[0] || "hh";
                const active = soundsAt.length > 0;
                const lit = playing && step === i;
                return <StepPad key={i} sound={primarySound} active={active} lit={lit} />;
              })}
            </div>

            {/* Step position indicator */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: step === i && playing ? C.accent : C.border,
                  transition: "background 0.05s",
                }} />
              ))}
            </div>

            <button onClick={() => setPlaying(p => !p)} style={{
              padding: "12px 32px", borderRadius: 10, border: "none", cursor: "pointer",
              background: playing ? "#1a1a1a" : `linear-gradient(135deg, ${C.accent}, #cc0033)`,
              color: playing ? C.accent : "#fff",
              fontSize: 12, fontWeight: 900, letterSpacing: 4,
              border: playing ? `2px solid ${C.accent}` : "none",
              boxShadow: playing ? `0 0 20px ${C.accent}44` : "none",
            }}>
              {playing ? "⏸  STOP NOVA" : "▶  NOVA PERFORM"}
            </button>
          </div>

          {/* Live Video Chat */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 4 }}>◈ LIVE VIDEO BATTLE</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={toggleVideo} style={{
                  padding: "7px 16px", borderRadius: 8, cursor: "pointer",
                  background: videoOn ? "#ff336622" : "#111",
                  border: `1px solid ${videoOn ? C.accent : C.border}`,
                  color: videoOn ? C.accent : C.dim,
                  fontSize: 10, letterSpacing: 2,
                }}>
                  {videoOn ? "📷 LIVE" : "📷 GO LIVE"}
                </button>
                {videoOn && (
                  <div style={{ padding: "7px 12px", borderRadius: 8, background: "#ff336611", border: `1px solid #ff336633`, fontSize: 9, color: C.accent, letterSpacing: 2 }}>
                    🎙 MIC ON
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {/* Nova's side */}
              <div style={{ background: "#080808", borderRadius: 10, overflow: "hidden", position: "relative", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <NovaFace performing={performing} beatPlaying={playing} face={NOVA_FACES[faceIdx]} />
                  <div style={{ marginTop: 8, fontSize: 9, color: C.accent, letterSpacing: 3 }}>NOVA · AI</div>
                </div>
                <div style={{ position: "absolute", top: 8, left: 8, background: "#ff3366", borderRadius: 4, padding: "3px 8px", fontSize: 8, color: "#fff", letterSpacing: 2, fontWeight: 900 }}>● NOVA</div>
                <div style={{ position: "absolute", bottom: 8, right: 8 }}>
                  <LiveWaveform active={playing || performing} color={C.accent} bars={16} />
                </div>
              </div>

              {/* Challenger side */}
              <div style={{ background: "#080808", borderRadius: 10, overflow: "hidden", position: "relative", aspectRatio: "16/9" }}>
                {videoOn ? (
                  <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                    <div style={{ fontSize: 32 }}>🎤</div>
                    <div style={{ fontSize: 9, color: C.dim, letterSpacing: 3 }}>CHALLENGER SLOT</div>
                    <button onClick={toggleVideo} style={{ padding: "6px 14px", borderRadius: 6, background: "transparent", border: `1px solid ${C.border}`, color: C.dim, fontSize: 9, cursor: "pointer", letterSpacing: 2 }}>
                      JOIN BATTLE
                    </button>
                  </div>
                )}
                <div style={{ position: "absolute", top: 8, left: 8, background: "#0066ff", borderRadius: 4, padding: "3px 8px", fontSize: 8, color: "#fff", letterSpacing: 2, fontWeight: 900 }}>● YOU</div>
              </div>
            </div>

            {videoOn && (
              <div style={{ marginTop: 10, padding: "10px 14px", background: "#ff336608", border: `1px solid #ff336622`, borderRadius: 8, fontSize: 11, color: "#ff9999" }}>
                Nova sees you. Don't blink. 👁 Show her what you've got — type your battle or just perform live.
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ── BATTLE ── */}
    {tab === "battle" && (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
            <NovaFace performing={performing || loading} beatPlaying={false} face={NOVA_FACES[faceIdx]} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.accent, letterSpacing: 4 }}>NOVA</div>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: 3 }}>UNDEFEATED · 1,337 — 0 · BEATBOX AI</div>
              <div style={{ fontSize: 10, color: C.cyan, marginTop: 4 }}>
                {loading ? "🎤 NOVA IS PERFORMING..." : "Ready to destroy you respectfully 👑"}
              </div>
            </div>
          </div>

          {/* Battle log */}
          <div style={{ height: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 14, paddingRight: 4 }}>
            {battleLog.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, color: C.dim }}>
                <div style={{ fontSize: 36 }}>🎤</div>
                <div style={{ fontSize: 11, letterSpacing: 3 }}>DROP YOUR BARS</div>
                <div style={{ fontSize: 10, color: "#333" }}>Type a beatbox, a challenge, anything.</div>
                <div style={{ fontSize: 10, color: "#333" }}>Nova will respond — with her mouth. 👄</div>
              </div>
            )}
            {battleLog.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "82%",
                background: m.role === "user" ? "#0066ff11" : "#ff336611",
                border: `1px solid ${m.role === "user" ? "#0066ff33" : "#ff336633"}`,
                borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
                padding: "10px 14px",
                animation: "slide-in 0.3s ease",
              }}>
                {m.role === "nova" && <div style={{ fontSize: 8, color: "#ff336699", letterSpacing: 3, marginBottom: 6 }}>👑 NOVA</div>}
                <div style={{ fontSize: 12, lineHeight: 1.7, color: m.role === "nova" ? "#ffcccc" : "#aaa", whiteSpace: "pre-wrap" }}>{m.text}</div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", background: "#ff336611", border: "1px solid #ff336633", borderRadius: "2px 12px 12px 12px", padding: "10px 14px" }}>
                <div style={{ fontSize: 8, color: "#ff336699", letterSpacing: 3, marginBottom: 4 }}>👑 NOVA</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: `blink-cursor 1s ${i * 0.3}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={battleEndRef} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={battleMsg}
              onChange={e => setBattleMsg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendBattle()}
              placeholder="Drop your bars... try your best beatbox sounds! (BOOM ts ts KA...)"
              style={{ flex: 1, background: "#080808", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 12, outline: "none" }}
            />
            <button onClick={sendBattle} disabled={loading} style={{
              padding: "12px 24px", borderRadius: 10, border: "none", cursor: "pointer",
              background: loading ? "#1a1a1a" : `linear-gradient(135deg, ${C.accent}, #cc0033)`,
              color: loading ? C.dim : "#fff",
              fontSize: 11, fontWeight: 900, letterSpacing: 3,
            }}>
              {loading ? "..." : "BATTLE"}
            </button>
          </div>
        </div>

        {/* battle sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={card}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 3, marginBottom: 12 }}>◈ NOVA'S ARSENAL</div>
            {[
              { name: "THROAT KICK", desc: "Deep diaphragm bass kick, 0-60 in 0.1s" },
              { name: "RAZOR HI-HAT", desc: "Tongue-tip high frequency rolls, 32nd notes" },
              { name: "BASS CANNON", desc: "Lip-bass sub frequencies that vibrate walls" },
              { name: "POLYRHYTHM", desc: "Simultaneous 3-against-4 independent layers" },
              { name: "REWIND SCRATCH", desc: "Vocal vinyl scratch with pitch bend" },
              { name: "INWARD SNARE", desc: "Inhale percussive snare — yes, while breathing" },
            ].map((t, i) => (
              <div key={i} style={{ padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2 }}>{t.name}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{t.desc}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 3, marginBottom: 12 }}>◈ RECENT SLAMS</div>
            {["@DeeJayHuman", "@BeatGod_2024", "@MouthDrums", "@FreestyleLord"].map((u, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid #111`, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#666" }}>{u}</span>
                <span style={{ fontSize: 9, color: "#ff3366", letterSpacing: 2, background: "#ff336611", padding: "2px 8px", borderRadius: 20 }}>DESTROYED</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* ── CALLOUTS ── */}
    {tab === "callouts" && (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: 4, marginBottom: 16 }}>◈ NOVA'S CALLOUT CANNON</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CALLOUTS.map((c, i) => (
              <div key={i} style={{
                background: "#080808", borderRadius: 10, padding: 14,
                border: `1px solid ${i === calloutIdx ? "#ff336644" : C.border}`,
                fontSize: 12, color: i === calloutIdx ? "#ffcccc" : "#666",
                lineHeight: 1.6,
                boxShadow: i === calloutIdx ? `0 0 20px #ff336622` : "none",
                transition: "all 0.3s",
              }}>
                {i === calloutIdx && <div style={{ fontSize: 8, color: C.accent, letterSpacing: 3, marginBottom: 4 }}>● LIVE NOW</div>}
                {c}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={card}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 4, marginBottom: 14 }}>◈ DAILY PUBLISH ENGINE</div>
            {[
              { platform: "YouTube", format: "Battle Reel (60s)", status: "RENDERING", time: "9:00 AM" },
              { platform: "TikTok", format: "Callout Drop (15s)", status: "SCHEDULED", time: "12:00 PM" },
              { platform: "YouTube", format: "Full Battle (5min)", status: "QUEUED", time: "4:00 PM" },
              { platform: "TikTok", format: "Fan Shoutout (30s)", status: "QUEUED", time: "7:00 PM" },
              { platform: "YouTube", format: "Nova Freestyle", status: "QUEUED", time: "10:00 PM" },
            ].map((p, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid #111` }}>
                <div>
                  <div style={{ fontSize: 11, color: C.text }}>{p.format}</div>
                  <div style={{ fontSize: 9, color: C.dim, letterSpacing: 2 }}>{p.platform} · {p.time}</div>
                </div>
                <span style={{
                  padding: "3px 10px", borderRadius: 20, fontSize: 8, letterSpacing: 2, fontWeight: 900,
                  background: p.status === "RENDERING" ? "#ffcc0022" : p.status === "SCHEDULED" ? "#00ffcc22" : "#ffffff08",
                  color: p.status === "RENDERING" ? C.accent2 : p.status === "SCHEDULED" ? C.cyan : C.dim,
                  border: `1px solid ${p.status === "RENDERING" ? "#ffcc0044" : p.status === "SCHEDULED" ? "#00ffcc44" : "#222"}`,
                }}>{p.status}</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 4, marginBottom: 14 }}>◈ FAN NATION</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                ["FOLLOWERS", "2.4M"], ["VIEWS", "847M"],
                ["BATTLES", "1,337W"], ["WIN RATE", "100%"],
              ].map(([l, v]) => (
                <div key={l} style={{ background: "#080808", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 8, color: C.dim, letterSpacing: 3 }}>{l}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: C.accent }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
  </main>
</div>
```

);
}
