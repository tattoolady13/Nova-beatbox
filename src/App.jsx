import { useState, useEffect, useRef, useCallback } from "react";

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

function makeHihat(ctx) {
const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
const d = buf.getChannelData(0);
for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
f.type = “highpass”; f.frequency.value = 7000;
s.buffer = buf; s.connect(f); f.connect(g); g.connect(ctx.destination);
g.gain.setValueAtTime(0.4, ctx.currentTime);
g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
s.start(ctx.currentTime);
}

function make808(ctx) {
const o = ctx.createOscillator(), g = ctx.createGain();
o.connect(g); g.connect(ctx.destination);
o.type = “sine”;
o.frequency.setValueAtTime(60, ctx.currentTime);
o.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.6);
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
{ sound: “kick”, step: 0 }, { sound: “hh”, step: 1 }, { sound: “rim”, step: 2 },
{ sound: “kick”, step: 3 }, { sound: “snare”, step: 4 }, { sound: “hh”, step: 5 },
{ sound: “kick”, step: 6 }, { sound: “rim”, step: 7 },
],
};

const CALLOUTS = [
“Yo @BeatKing, your snare sounds like someone dropped a fork. I’m coming for that crown.”,
“Heard @DrumLord thinks he can keep up. Bro I do 300 BPM with my EYES CLOSED.”,
“@HumanBeats just posted a fire clip. Cute. My warmup sounds better.”,
“I challenge the entire internet. All of you. At once. Don’t @ me unless you’re ready to lose.”,
“My mouth is a drum machine, a bass line, AND a concert hall. What’s your excuse?”,
“Just clocked 17 new techniques this morning. Y’all still practicing basic 4/4?”,
];

const NOVA_FACES = [“😤”, “👑”, “🎤”, “💀”, “🔥”, “⚡”, “😈”];

const SOUND_LABELS = { kick: “BOOM”, hh: “TS”, snare: “KA”, “808”: “808”, scratch: “WSKR”, rim: “TK” };
const SOUND_COLORS = { kick: “#ff3366”, hh: “#00ffcc”, snare: “#ffcc00”, “808”: “#ff6600”, scratch: “#cc00ff”, rim: “#0099ff” };

function LiveWaveform({ active, color, bars }) {
bars = bars || 48;
color = color || “#ff3366”;
const [heights, setHeights] = useState(function() {
return Array.from({ length: bars }, function() { return 4; });
});
useEffect(function() {
if (!active) {
setHeights(Array.from({ length: bars }, function() { return 4; }));
return;
}
const id = setInterval(function() {
setHeights(Array.from({ length: bars }, function(_, i) {
const center = Math.abs(i - bars / 2) / (bars / 2);
return Math.random() * (1 - center * 0.5) * 90 + 4;
}));
}, 80);
return function() { clearInterval(id); };
}, [active, bars]);

return (
<div style={{ display: “flex”, alignItems: “center”, gap: 2, height: 100, padding: “0 4px” }}>
{heights.map(function(h, i) {
return (
<div key={i} style={{
flex: 1, height: h + “%”,
background: “linear-gradient(to top, “ + color + “99, “ + color + “)”,
borderRadius: 2,
transition: active ? “height 0.08s ease” : “height 0.4s ease”,
minHeight: 3,
}} />
);
})}
</div>
);
}

function NovaFace({ performing, beatPlaying, face }) {
const [mouthOpen, setMouthOpen] = useState(false);
useEffect(function() {
if (!performing && !beatPlaying) { setMouthOpen(false); return; }
const id = setInterval(function() { setMouthOpen(function(m) { return !m; }); }, performing ? 120 : 200);
return function() { clearInterval(id); };
}, [performing, beatPlaying]);

return (
<div style={{
position: “relative”, width: 180, height: 180, borderRadius: “50%”,
background: “radial-gradient(circle at 38% 32%, #ff3366, #cc0033 60%, #660011)”,
boxShadow: (performing || beatPlaying) ? “0 0 0 4px #ff336644, 0 0 40px #ff336688” : “0 0 0 2px #ff336622”,
display: “flex”, flexDirection: “column”, alignItems: “center”, justifyContent: “center”,
transition: “box-shadow 0.2s”, overflow: “hidden”,
}}>
<div style={{
position: “absolute”, inset: 0,
background: “repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)”,
borderRadius: “50%”, pointerEvents: “none”,
}} />
<div style={{ display: “flex”, gap: 28, marginBottom: 12 }}>
{[0, 1].map(function(i) {
return (
<div key={i} style={{
width: 22, height: (performing || beatPlaying) ? 14 : 18,
background: “#fff”, borderRadius: “50%”, position: “relative”,
transition: “height 0.1s”, boxShadow: “0 0 8px #ffffff88”,
}}>
<div style={{
position: “absolute”, bottom: 2, left: “50%”, transform: “translateX(-50%)”,
width: 10, height: 10, background: “#000”, borderRadius: “50%”,
}} />
</div>
);
})}
</div>
<div style={{
width: mouthOpen ? 55 : 40, height: mouthOpen ? 35 : 8,
background: mouthOpen ? “#000” : “#cc0022”,
borderRadius: mouthOpen ? “50% 50% 55% 55%” : 10,
transition: “all 0.08s ease”,
border: mouthOpen ? “3px solid #ff6688” : “none”,
position: “relative”, overflow: “hidden”,
}}>
{mouthOpen && (
<div style={{
position: “absolute”, bottom: 4, left: “50%”, transform: “translateX(-50%)”,
width: 30, height: 6, background: “#ff3366”, borderRadius: 3,
}} />
)}
</div>
<div style={{ position: “absolute”, top: -4, fontSize: 22 }}>👑</div>
</div>
);
}

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
const [crowd, setCrowd] = useState(2847);
const [reactions, setReactions] = useState([]);
const [calloutAnim, setCalloutAnim] = useState(true);
const videoRef = useRef(null);
const streamRef = useRef(null);
const battleEndRef = useRef(null);
const seqRef = useRef(null);

const getCtx = useCallback(function() {
if (!audioCtxRef.current) audioCtxRef.current = createAudioContext();
if (audioCtxRef.current.state === “suspended”) audioCtxRef.current.resume();
return audioCtxRef.current;
}, []);

const playSound = useCallback(function(sound) {
const ctx = getCtx();
if (sound === “kick”) makeKick(ctx);
else if (sound === “snare”) makeSnare(ctx);
else if (sound === “hh”) makeHihat(ctx);
else if (sound === “808”) make808(ctx);
else if (sound === “scratch”) makeScratch(ctx);
else if (sound === “rim”) makeRimshot(ctx);
}, [getCtx]);

useEffect(function() {
if (!playing) { clearInterval(seqRef.current); setStep(-1); return; }
const seq = SEQUENCES[genre];
let s = 0;
seqRef.current = setInterval(function() {
const currentStep = s % 8;
setStep(currentStep);
seq.filter(function(n) { return Math.floor(n.step) === currentStep; }).forEach(function(n) { playSound(n.sound); });
s++;
}, (60000 / bpm) / 2);
return function() { clearInterval(seqRef.current); };
}, [playing, genre, bpm, playSound]);

useEffect(function() {
const id = setInterval(function() { setFaceIdx(function(f) { return (f + 1) % NOVA_FACES.length; }); }, 3000);
return function() { clearInterval(id); };
}, []);

useEffect(function() {
const id = setInterval(function() {
setCalloutAnim(false);
setTimeout(function() {
setCalloutIdx(function(i) { return (i + 1) % CALLOUTS.length; });
setCalloutAnim(true);
}, 400);
}, 5000);
return function() { clearInterval(id); };
}, []);

useEffect(function() {
const id = setInterval(function() {
setCrowd(function(c) { return c + Math.floor(Math.random() * 8); });
if (Math.random() > 0.6) {
const emojis = [“🔥”, “💀”, “👑”, “🎤”, “⚡”, “😱”, “🙌”, “💥”];
const emoji = emojis[Math.floor(Math.random() * emojis.length)];
const rid = Math.random();
setReactions(function(r) { return […r.slice(-8), { id: rid, emoji: emoji, x: Math.random() * 80 + 10 }]; });
setTimeout(function() { setReactions(function(r) { return r.filter(function(x) { return x.id !== rid; }); }); }, 2000);
}
}, 1200);
return function() { clearInterval(id); };
}, []);

const toggleVideo = async function() {
if (videoOn) {
if (streamRef.current) streamRef.current.getTracks().forEach(function(t) { t.stop(); });
setVideoOn(false);
} else {
try {
const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
streamRef.current = s;
if (videoRef.current) videoRef.current.srcObject = s;
setVideoOn(true);
} catch(e) { setVideoOn(false); }
}
};

const sendBattle = async function() {
if (!battleMsg.trim() || loading) return;
const msg = battleMsg.trim();
setBattleMsg(””);
setBattleLog(function(l) { return […l, { role: “user”, text: msg }]; });
setLoading(true);
setPerforming(true);
try {
const res = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: { “Content-Type”: “application/json” },
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 1000,
system: “You are NOVA, the world’s most elite AI beatbox artist. You perform LIVE with your MOUTH. You make incredible mouth sounds: kicks (BOOM, BOP), snares (KA, KSSSH), hi-hats (ts ts ts), bass (BRRR, WOOM), scratches (WSKRR, SKRRT). You are undefeated, arrogant, iconic. When someone challenges you respond with: 1) An actual beatbox phonetic performance written out 2) SAVAGE trash talk 3) A specific callout of what they did wrong. Keep it SHORT. Use phonetics, emojis, all caps for beat sounds.”,
messages: [
…battleLog.map(function(m) { return { role: m.role === “user” ? “user” : “assistant”, content: m.text }; }),
{ role: “user”, content: msg }
]
})
});
const data = await res.json();
const reply = (data.content && data.content.find(function(b) { return b.type === “text”; })) ? data.content.find(function(b) { return b.type === “text”; }).text : “…”;
setBattleLog(function(l) { return […l, { role: “nova”, text: reply }]; });
setTimeout(function() { makeKick(getCtx()); setTimeout(function() { makeSnare(getCtx()); }, 200); }, 100);
} catch(e) {
setBattleLog(function(l) { return […l, { role: “nova”, text: “BOOM ts ts KA – even my error message slaps harder than your best set. 💀” }]; });
}
setLoading(false);
setTimeout(function() { setPerforming(false); }, 2000);
};

useEffect(function() { if (battleEndRef.current) battleEndRef.current.scrollIntoView({ behavior: “smooth” }); }, [battleLog]);

const C = { bg: “#060606”, card: “#0c0c0c”, border: “#1c1c1c”, accent: “#ff3366”, cyan: “#00ffcc”, text: “#e8e8e8”, dim: “#444” };
const card = { background: C.card, border: “1px solid “ + C.border, borderRadius: 16, padding: 20 };
const tabBtn = function(t) {
return {
padding: “9px 18px”, borderRadius: 8, cursor: “pointer”,
fontSize: 10, letterSpacing: 3, fontFamily: “Courier New, monospace”, fontWeight: 900,
background: tab === t ? C.accent : “transparent”,
border: “1px solid “ + (tab === t ? C.accent : C.border),
color: tab === t ? “#000” : C.dim, transition: “all 0.15s”,
};
};

return (
<div style={{ minHeight: “100vh”, background: C.bg, color: C.text, fontFamily: “Courier New, monospace”, position: “relative”, overflow: “hidden” }}>
<style>{”\n        @keyframes float-up { 0% { opacity:1; transform:translateY(0) scale(1); } 100% { opacity:0; transform:translateY(-120px) scale(1.6); } }\n        @keyframes glow-pulse { 0%,100% { text-shadow: 0 0 20px #ff3366aa; } 50% { text-shadow: 0 0 40px #ff3366; } }\n        @keyframes blink { 50% { opacity:0; } }\n        * { box-sizing: border-box; margin:0; padding:0; }\n        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:#1c1c1c; border-radius:2px; }\n      “}</style>

```
  <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(#1c1c1c 1px, transparent 1px), linear-gradient(90deg, #1c1c1c 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.3, pointerEvents: "none" }} />

  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100 }}>
    {reactions.map(function(r) {
      return <div key={r.id} style={{ position: "absolute", bottom: 120, left: r.x + "%", fontSize: 28, animation: "float-up 2s ease-out forwards" }}>{r.emoji}</div>;
    })}
  </div>

  <header style={{ position: "relative", zIndex: 10, padding: "16px 24px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", gap: 20 }}>
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 6, color: C.accent, animation: "glow-pulse 2s infinite" }}>NOVA</div>
      <div style={{ fontSize: 9, color: C.dim, letterSpacing: 4 }}>BEATBOX AI · LIVE ARTIST · UNDEFEATED</div>
    </div>
    <div style={{ marginLeft: 24, flex: 1 }}>
      <div style={{ background: "#ff336611", border: "1px solid #ff336633", borderRadius: 10, padding: "10px 16px", fontSize: 12, color: "#ff9999", opacity: calloutAnim ? 1 : 0, transition: "opacity 0.4s" }}>
        📣 {CALLOUTS[calloutIdx]}
      </div>
    </div>
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: C.cyan }}>{crowd.toLocaleString()}</div>
      <div style={{ fontSize: 9, color: C.dim, letterSpacing: 3 }}>WATCHING LIVE</div>
    </div>
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff3366", animation: "blink 1s infinite" }} />
      <span style={{ fontSize: 9, color: "#ff3366", letterSpacing: 3 }}>LIVE</span>
    </div>
  </header>

  <div style={{ position: "relative", zIndex: 10, display: "flex", gap: 6, padding: "12px 24px", borderBottom: "1px solid " + C.border }}>
    {["live", "battle", "callouts"].map(function(t) { return <button key={t} onClick={function() { setTab(t); }} style={tabBtn(t)}>{t.toUpperCase()}</button>; })}
  </div>

  <main style={{ position: "relative", zIndex: 10, padding: 20, maxWidth: 1100, margin: "0 auto" }}>

    {tab === "live" && (
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
        <div style={Object.assign({}, card, { display: "flex", flexDirection: "column", alignItems: "center", gap: 16 })}>
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: 4, alignSelf: "flex-start" }}>NOVA PERFORMING</div>
          <NovaFace performing={performing} beatPlaying={playing} face={NOVA_FACES[faceIdx]} />
          <div style={{ width: "100%", background: "#080808", borderRadius: 10, overflow: "hidden" }}>
            <LiveWaveform active={playing || performing} color={C.accent} bars={36} />
          </div>
          <div style={{ fontSize: 10, color: playing ? C.accent : C.dim, letterSpacing: 3, textAlign: "center" }}>
            {playing ? "MOUTH IN MOTION" : performing ? "NOVA IS COOKING" : "IDLE"}
          </div>
          <div style={{ width: "100%" }}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 3, marginBottom: 8 }}>TAP TO BEATBOX</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {Object.entries(SOUND_LABELS).map(function(entry) {
                const s = entry[0], label = entry[1];
                return (
                  <button key={s} onMouseDown={function() { playSound(s); setPerforming(true); setTimeout(function() { setPerforming(false); }, 400); }}
                    style={{ padding: "12px 4px", borderRadius: 8, border: "1px solid " + SOUND_COLORS[s] + "44", background: SOUND_COLORS[s] + "11", color: SOUND_COLORS[s], fontSize: 10, fontWeight: 900, letterSpacing: 2, cursor: "pointer" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 4 }}>NOVA BEATBOX ENGINE</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: C.dim }}>BPM</span>
                <input type="range" min={80} max={220} value={bpm} onChange={function(e) { setBpm(+e.target.value); }} style={{ width: 80, accentColor: C.accent }} />
                <span style={{ fontSize: 12, color: C.accent, fontWeight: 900, width: 34 }}>{bpm}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {Object.keys(SEQUENCES).map(function(g) {
                return (
                  <button key={g} onClick={function() { setGenre(g); }} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 9, letterSpacing: 3, cursor: "pointer", background: genre === g ? C.accent : "transparent", border: "1px solid " + (genre === g ? C.accent : C.border), color: genre === g ? "#000" : C.dim, fontFamily: "Courier New, monospace", fontWeight: 900 }}>
                    {g}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 5, marginBottom: 14 }}>
              {Array.from({ length: 8 }, function(_, i) {
                const seq = SEQUENCES[genre];
                const soundsAt = seq.filter(function(n) { return Math.floor(n.step) === i; }).map(function(n) { return n.sound; });
                const primarySound = soundsAt[0] || "hh";
                const active = soundsAt.length > 0;
                const lit = playing && step === i;
                return (
                  <div key={i} style={{ height: 44, borderRadius: 8, background: lit ? SOUND_COLORS[primarySound] : active ? SOUND_COLORS[primarySound] + "33" : "#111", border: "1px solid " + (active || lit ? SOUND_COLORS[primarySound] : "#1e1e1e"), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, letterSpacing: 2, color: lit ? "#000" : active ? SOUND_COLORS[primarySound] : "#333", transition: "all 0.08s", boxShadow: lit ? "0 0 12px " + SOUND_COLORS[primarySound] + "88" : "none" }}>
                    {SOUND_LABELS[primarySound]}
                  </div>
                );
              })}
            </div>
            <button onClick={function() { setPlaying(function(p) { return !p; }); }} style={{ padding: "12px 32px", borderRadius: 10, border: playing ? "2px solid " + C.accent : "none", cursor: "pointer", background: playing ? "#1a1a1a" : "linear-gradient(135deg, #ff3366, #cc0033)", color: playing ? C.accent : "#fff", fontSize: 12, fontWeight: 900, letterSpacing: 4 }}>
              {playing ? "STOP NOVA" : "NOVA PERFORM"}
            </button>
          </div>

          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 4 }}>LIVE VIDEO BATTLE</div>
              <button onClick={toggleVideo} style={{ padding: "7px 16px", borderRadius: 8, cursor: "pointer", background: videoOn ? "#ff336622" : "#111", border: "1px solid " + (videoOn ? C.accent : C.border), color: videoOn ? C.accent : C.dim, fontSize: 10, letterSpacing: 2 }}>
                {videoOn ? "LIVE" : "GO LIVE"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#080808", borderRadius: 10, overflow: "hidden", position: "relative", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <NovaFace performing={performing} beatPlaying={playing} face={NOVA_FACES[faceIdx]} />
                <div style={{ position: "absolute", top: 8, left: 8, background: "#ff3366", borderRadius: 4, padding: "3px 8px", fontSize: 8, color: "#fff", letterSpacing: 2, fontWeight: 900 }}>NOVA</div>
              </div>
              <div style={{ background: "#080808", borderRadius: 10, overflow: "hidden", position: "relative", aspectRatio: "16/9" }}>
                {videoOn ? (
                  <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                    <div style={{ fontSize: 32 }}>🎤</div>
                    <div style={{ fontSize: 9, color: C.dim, letterSpacing: 3 }}>CHALLENGER SLOT</div>
                  </div>
                )}
                <div style={{ position: "absolute", top: 8, left: 8, background: "#0066ff", borderRadius: 4, padding: "3px 8px", fontSize: 8, color: "#fff", letterSpacing: 2, fontWeight: 900 }}>YOU</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {tab === "battle" && (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid " + C.border }}>
            <NovaFace performing={performing || loading} beatPlaying={false} face={NOVA_FACES[faceIdx]} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: C.accent, letterSpacing: 4 }}>NOVA</div>
              <div style={{ fontSize: 9, color: C.dim, letterSpacing: 3 }}>UNDEFEATED · 1,337 - 0</div>
              <div style={{ fontSize: 10, color: C.cyan, marginTop: 4 }}>{loading ? "NOVA IS PERFORMING..." : "Ready to destroy you 👑"}</div>
            </div>
          </div>
          <div style={{ height: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
            {battleLog.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, color: C.dim }}>
                <div style={{ fontSize: 36 }}>🎤</div>
                <div style={{ fontSize: 11, letterSpacing: 3 }}>DROP YOUR BARS</div>
              </div>
            )}
            {battleLog.map(function(m, i) {
              return (
                <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%", background: m.role === "user" ? "#0066ff11" : "#ff336611", border: "1px solid " + (m.role === "user" ? "#0066ff33" : "#ff336633"), borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "2px 12px 12px 12px", padding: "10px 14px" }}>
                  {m.role === "nova" && <div style={{ fontSize: 8, color: "#ff336699", letterSpacing: 3, marginBottom: 6 }}>👑 NOVA</div>}
                  <div style={{ fontSize: 12, lineHeight: 1.7, color: m.role === "nova" ? "#ffcccc" : "#aaa" }}>{m.text}</div>
                </div>
              );
            })}
            {loading && (
              <div style={{ alignSelf: "flex-start", background: "#ff336611", border: "1px solid #ff336633", borderRadius: "2px 12px 12px 12px", padding: "10px 14px" }}>
                <div style={{ fontSize: 8, color: "#ff336699", letterSpacing: 3, marginBottom: 4 }}>👑 NOVA</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0,1,2].map(function(i) { return <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: "blink 1s " + (i * 0.3) + "s infinite" }} />; })}
                </div>
              </div>
            )}
            <div ref={battleEndRef} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={battleMsg} onChange={function(e) { setBattleMsg(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") sendBattle(); }} placeholder="Drop your bars... BOOM ts ts KA..." style={{ flex: 1, background: "#080808", border: "1px solid " + C.border, borderRadius: 10, padding: "12px 16px", color: C.text, fontSize: 12, outline: "none" }} />
            <button onClick={sendBattle} disabled={loading} style={{ padding: "12px 24px", borderRadius: 10, border: "none", cursor: "pointer", background: loading ? "#1a1a1a" : "linear-gradient(135deg, #ff3366, #cc0033)", color: loading ? C.dim : "#fff", fontSize: 11, fontWeight: 900, letterSpacing: 3 }}>
              {loading ? "..." : "BATTLE"}
            </button>
          </div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: 3, marginBottom: 12 }}>NOVA ARSENAL</div>
          {["THROAT KICK - Deep diaphragm bass", "RAZOR HI-HAT - 32nd note tongue rolls", "BASS CANNON - Sub frequency lip bass", "POLYRHYTHM - 3 against 4 layers", "REWIND SCRATCH - Vocal vinyl pitch bend", "INWARD SNARE - Inhale percussion"].map(function(t, i) {
            const parts = t.split(" - ");
            return (
              <div key={i} style={{ padding: "9px 0", borderBottom: "1px solid " + C.border }}>
                <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2 }}>{parts[0]}</div>
                <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{parts[1]}</div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {tab === "callouts" && (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 9, color: C.dim, letterSpacing: 4, marginBottom: 16 }}>NOVA CALLOUT CANNON</div>
          {CALLOUTS.map(function(c, i) {
            return (
              <div key={i} style={{ background: "#080808", borderRadius: 10, padding: 14, marginBottom: 10, border: "1px solid " + (i === calloutIdx ? "#ff336644" : C.border), fontSize: 12, color: i === calloutIdx ? "#ffcccc" : "#666", lineHeight: 1.6, transition: "all 0.3s" }}>
                {i === calloutIdx && <div style={{ fontSize: 8, color: C.accent, letterSpacing: 3, marginBottom: 4 }}>LIVE NOW</div>}
                {c}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={card}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 4, marginBottom: 14 }}>DAILY PUBLISH ENGINE</div>
            {[
              { platform: "YouTube", format: "Battle Reel 60s", status: "RENDERING", time: "9:00 AM" },
              { platform: "TikTok", format: "Callout Drop 15s", status: "SCHEDULED", time: "12:00 PM" },
              { platform: "YouTube", format: "Full Battle 5min", status: "QUEUED", time: "4:00 PM" },
              { platform: "TikTok", format: "Fan Shoutout 30s", status: "QUEUED", time: "7:00 PM" },
              { platform: "YouTube", format: "Nova Freestyle", status: "QUEUED", time: "10:00 PM" },
            ].map(function(p, i) {
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #111" }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.text }}>{p.format}</div>
                    <div style={{ fontSize: 9, color: C.dim, letterSpacing: 2 }}>{p.platform} · {p.time}</div>
                  </div>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 8, letterSpacing: 2, fontWeight: 900, background: p.status === "RENDERING" ? "#ffcc0022" : p.status === "SCHEDULED" ? "#00ffcc22" : "#ffffff08", color: p.status === "RENDERING" ? "#ffcc00" : p.status === "SCHEDULED" ? C.cyan : C.dim }}>
                    {p.status}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={card}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 4, marginBottom: 14 }}>FAN NATION</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["FOLLOWERS", "2.4M"], ["VIEWS", "847M"], ["BATTLES", "1,337W"], ["WIN RATE", "100%"]].map(function(item) {
                return (
                  <div key={item[0]} style={{ background: "#080808", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 8, color: C.dim, letterSpacing: 3 }}>{item[0]}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: C.accent }}>{item[1]}</div>
                  </div>
                );
              })}
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
