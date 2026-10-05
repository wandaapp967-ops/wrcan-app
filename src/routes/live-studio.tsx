import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Camera, CameraOff, Circle, Coffee, Hand, Mic, MicOff, MessageSquare,
  MonitorUp, Radio, Send, Sparkles, ThumbsUp, Timer, UserPlus, Users, Wifi, X, BarChart3, Check,
} from "lucide-react";
import logoAsset from "@/assets/wanda-logo.png.asset.json";

export const Route = createFileRoute("/live-studio")({
  head: () => ({
    meta: [
      { title: "Live Studio — Wanda Broadcast Control Room" },
      { name: "description", content: "Practise running a live class or broadcast: scenes, preview and program, polls, Q&A, breakout rooms and a studio assistant." },
      { property: "og:title", content: "Wanda Live Studio" },
      { property: "og:description", content: "A broadcast control room for Wanda facilitators and media trainees." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LiveStudio,
});

type Scene = "Presenter" | "Interview" | "Panel" | "Screen share" | "Break";
const SCENES: Scene[] = ["Presenter", "Interview", "Panel", "Screen share", "Break"];
type P = { id: number; name: string; hand: boolean; muted: boolean; stage: boolean };
type Q = { id: number; text: string; votes: number; answered: boolean };

const KEY = "wanda-live-studio";
const initialPeople: P[] = [
  { id: 1, name: "Thandi Mokoena", hand: true, muted: false, stage: false },
  { id: 2, name: "Edward Sithole", hand: false, muted: true, stage: false },
  { id: 3, name: "Lerato Dlamini", hand: true, muted: false, stage: false },
  { id: 4, name: "Sipho Ndlovu", hand: false, muted: false, stage: false },
  { id: 5, name: "Ayanda Khumalo", hand: false, muted: true, stage: false },
];

function LiveStudio() {
  const [preview, setPreview] = useState<Scene>("Presenter");
  const [program, setProgram] = useState<Scene>("Break");
  const [fade, setFade] = useState(false);
  const [live, setLive] = useState(false);
  const [rec, setRec] = useState(false);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [overlay, setOverlay] = useState({ lower: true, logo: true, captions: false, timer: false });
  const [lowerName, setLowerName] = useState("Wanda Facilitator");
  const [tab, setTab] = useState<"people" | "chat" | "qa" | "poll">("people");
  const [people, setPeople] = useState<P[]>(initialPeople);
  const [chat, setChat] = useState<{ who: string; text: string }[]>([
    { who: "Thandi", text: "Good morning from Soweto!" },
    { who: "Sipho", text: "Audio is clear 👍" },
  ]);
  const [msg, setMsg] = useState("");
  const [qs, setQs] = useState<Q[]>([
    { id: 1, text: "How do I get my SETA certificate?", votes: 4, answered: false },
    { id: 2, text: "Is there radio training in Durban?", votes: 2, answered: false },
  ]);
  const [poll, setPoll] = useState<{ q: string; opts: { t: string; v: number }[]; live: boolean }>({
    q: "Which skill should we cover next?", opts: [{ t: "Interviews", v: 0 }, { t: "CV writing", v: 0 }, { t: "Radio voice", v: 0 }], live: false,
  });
  const [rooms, setRooms] = useState<string[][] | null>(null);
  const [secs, setSecs] = useState(0);
  const [ai, setAi] = useState("");
  const [aiLog, setAiLog] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const say = (t: string) => { setToast(t); setTimeout(() => setToast(""), 2200); };

  // persistence
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s) { setPreview(s.preview); setOverlay(s.overlay); setChat(s.chat); setLowerName(s.lowerName); }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ preview, overlay, chat: chat.slice(-30), lowerName }));
  }, [preview, overlay, chat, lowerName]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [live]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream, program]);
  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);

  const toggleCam = async () => {
    if (cam) { stream?.getTracks().forEach((t) => t.stop()); setStream(null); setCam(false); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(s); setCam(true);
    } catch { say("Camera not available — showing a placeholder"); }
  };

  const take = () => {
    setFade(true);
    setTimeout(() => { setProgram(preview); setFade(false); }, 250);
    say(`${preview} is now live on program`);
  };

  // keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.code === "Space") { e.preventDefault(); take(); }
      if (e.key === "r") setRec((r) => !r);
      if (e.key === "m") setMic((m) => !m);
      if (e.key === "c") toggleCam();
      if (e.key === "b") setPreview("Break");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const runAi = (cmd: string) => {
    const c = cmd.toLowerCase();
    let r = "Suggestion: try “interview layout”, “lower third”, “start a poll”, “break screen” or “summarize”.";
    if (c.includes("interview")) { setPreview("Interview"); r = "Interview layout placed in Preview. Press Take live when ready."; }
    else if (c.includes("speaker") || c.includes("presenter")) { setPreview("Presenter"); r = "Presenter scene placed in Preview."; }
    else if (c.includes("lower")) { setOverlay((o) => ({ ...o, lower: true })); r = `Lower third switched on for “${lowerName}”.`; }
    else if (c.includes("poll")) { setTab("poll"); r = "Poll panel opened — edit and launch it."; }
    else if (c.includes("break")) { setPreview("Break"); r = "Break screen placed in Preview."; }
    else if (c.includes("summar")) { r = `Summary: ${people.length} attendees, ${chat.length} chat messages, ${qs.filter((q) => q.answered).length}/${qs.length} questions answered, ${Math.floor(secs / 60)} min live.`; }
    setAiLog((l) => [`${cmd} → ${r}`, ...l].slice(0, 5));
    setAi("");
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const onStage = people.filter((p) => p.stage);
  const totalVotes = poll.opts.reduce((a, o) => a + o.v, 0) || 1;

  const Canvas = ({ scene, small }: { scene: Scene; small?: boolean }) => (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-card">
      {scene === "Break" ? (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <img src={logoAsset.url} alt="" className={small ? "h-8" : "h-20"} />
          <p className={`rose-text font-display ${small ? "text-xs" : "text-2xl"}`}>We'll be right back</p>
        </div>
      ) : (
        <div className={`grid h-full gap-1 p-1 ${scene === "Interview" || scene === "Screen share" ? "grid-cols-2" : scene === "Panel" ? "grid-cols-2 grid-rows-2" : ""}`}>
          {scene === "Screen share" ? (
            <div className="flex items-center justify-center rounded bg-muted text-xs text-muted-foreground"><MonitorUp className="mr-1 h-4 w-4" />Shared screen</div>
          ) : null}
          {Array.from({ length: scene === "Panel" ? 4 : scene === "Interview" ? 2 : 1 }).map((_, i) => (
            <div key={i} className="relative flex items-center justify-center overflow-hidden rounded bg-muted">
              {i === 0 && cam && !small ? (
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">{i === 0 ? "You" : onStage[i - 1]?.name ?? `Guest ${i}`}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {!small && overlay.logo && <img src={logoAsset.url} alt="" className="absolute top-2 right-2 h-8 opacity-90" />}
      {!small && overlay.lower && scene !== "Break" && (
        <div className="rose-metal absolute bottom-3 left-3 rounded px-3 py-1 text-xs font-semibold">{lowerName}</div>
      )}
      {!small && overlay.captions && <div className="absolute inset-x-0 bottom-10 text-center text-xs text-foreground"><span className="bg-background/80 px-2">Welcome to today's Wanda session…</span></div>}
      {!small && overlay.timer && <div className="absolute top-2 left-2 rounded bg-background/80 px-2 text-xs text-primary">{fmt(secs)}</div>}
    </div>
  );

  const Btn = ({ on, onClick, children, label }: { on?: boolean; onClick: () => void; children: React.ReactNode; label: string }) => (
    <button title={label} aria-label={label} onClick={onClick}
      className={`flex h-9 items-center gap-1 rounded-full border px-3 text-xs ${on ? "rose-metal border-transparent" : "border-border bg-card text-foreground hover:bg-accent"}`}>
      {children}
    </button>
  );

  return (
    <div className="gold-pattern min-h-screen text-foreground">
      <div className="mx-auto max-w-6xl space-y-3 p-3">
        <header className="glass-plate flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <Link to="/" aria-label="Back home"><ArrowLeft className="h-5 w-5 text-primary" /></Link>
            <img src={logoAsset.url} alt="Wanda" className="h-8" />
            <h1 className="font-display rose-text text-lg font-semibold uppercase tracking-wide">Live Studio</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground"><Wifi className="h-4 w-4 text-primary" />Good</span>
            <span className="flex items-center gap-1 text-muted-foreground"><Timer className="h-4 w-4" />{fmt(secs)}</span>
            {rec && <span className="balloon-red rounded-full px-2 py-0.5">● REC</span>}
            {live ? <span className="balloon-red rounded-full px-2 py-0.5">LIVE</span> : <span className="text-muted-foreground">Studio ready</span>}
          </div>
        </header>

        <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
              <div className="glass-plate rounded-xl p-2">
                <p className="mb-1 text-[0.6rem] uppercase tracking-widest text-muted-foreground">Preview</p>
                <Canvas scene={preview} small />
                <button onClick={take} className="rose-metal mt-2 w-full rounded-full py-2 text-xs font-semibold uppercase tracking-widest">Take live (Space)</button>
              </div>
              <div className={`glass-plate rounded-xl p-2 transition-opacity duration-200 ${fade ? "opacity-30" : ""}`}>
                <p className="mb-1 text-[0.6rem] uppercase tracking-widest text-primary">Program · live output</p>
                <Canvas scene={program} />
              </div>
            </div>

            <div className="glass-plate flex flex-wrap items-center gap-2 rounded-xl p-2">
              <Btn label="Microphone (M)" on={mic} onClick={() => setMic(!mic)}>{mic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</Btn>
              <Btn label="Camera (C)" on={cam} onClick={toggleCam}>{cam ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}</Btn>
              <Btn label="Record (R)" on={rec} onClick={() => setRec(!rec)}><Circle className="h-4 w-4" />Record</Btn>
              <Btn label="Breakout rooms" onClick={() => {
                const r: string[][] = [[], []]; people.forEach((p, i) => r[i % 2]?.push(p.name)); setRooms(r);
              }}><Users className="h-4 w-4" />Breakouts</Btn>
              <div className="ml-auto flex gap-2">
                <Btn label="Go live" on={live} onClick={() => { setLive(!live); say(live ? "Stream paused" : "You are live (practice mode)"); }}><Radio className="h-4 w-4" />{live ? "Pause" : "Go live"}</Btn>
                <Btn label="End session" onClick={() => setConfirmEnd(true)}><X className="h-4 w-4" />End</Btn>
              </div>
            </div>

            <div className="glass-plate grid grid-cols-3 gap-2 rounded-xl p-2 sm:grid-cols-5">
              {SCENES.map((s) => (
                <button key={s} onClick={() => setPreview(s)} className={`rounded-lg border p-1 text-left ${preview === s ? "border-primary" : "border-border"} ${program === s ? "ring-2 ring-destructive" : ""}`}>
                  <div className="flex aspect-video items-center justify-center rounded bg-muted">
                    {s === "Break" ? <Coffee className="h-4 w-4 text-primary" /> : s === "Screen share" ? <MonitorUp className="h-4 w-4 text-primary" /> : <Users className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-1 text-[0.65rem]">{s}</p>
                </button>
              ))}
            </div>

            <div className="glass-plate rounded-xl p-3">
              <p className="mb-2 text-[0.6rem] uppercase tracking-widest text-muted-foreground">Scene settings</p>
              <div className="flex flex-wrap gap-2">
                {(["lower", "logo", "captions", "timer"] as const).map((k) => (
                  <Btn key={k} label={k} on={overlay[k]} onClick={() => setOverlay({ ...overlay, [k]: !overlay[k] })}>
                    {{ lower: "Lower third", logo: "Logo", captions: "Captions", timer: "Timer" }[k]}
                  </Btn>
                ))}
                <input value={lowerName} onChange={(e) => setLowerName(e.target.value)} className="rose-plate h-9 rounded-full px-3 text-xs outline-none" aria-label="Lower third text" />
              </div>
            </div>

            <div className="glass-plate rounded-xl p-3">
              <form onSubmit={(e) => { e.preventDefault(); if (ai.trim()) runAi(ai.trim()); }} className="flex gap-2">
                <Sparkles className="mt-2 h-4 w-4 text-primary" />
                <input value={ai} onChange={(e) => setAi(e.target.value)} placeholder="Ask Wanda to prepare the studio…" className="rose-plate h-9 flex-1 rounded-full px-3 text-xs outline-none" />
              </form>
              <div className="mt-2 flex flex-wrap gap-1">
                {["Create an interview layout", "Show the current speaker", "Add a lower third", "Start a poll", "Prepare a break screen", "Summarize this session"].map((c) => (
                  <button key={c} onClick={() => runAi(c)} className="rounded-full border border-border px-2 py-1 text-[0.65rem] hover:bg-accent">{c}</button>
                ))}
              </div>
              {aiLog.length > 0 && (
                <ul className="mt-2 space-y-1 text-[0.7rem] text-muted-foreground">
                  {aiLog.map((l, i) => <li key={i}>✦ {l}</li>)}
                </ul>
              )}
              <p className="mt-1 text-[0.6rem] text-muted-foreground">Assistant suggestions are rule-based helpers for practice.</p>
            </div>
          </div>

          <aside className="glass-plate flex flex-col rounded-xl p-2 lg:max-h-[calc(100vh-90px)]">
            <div className="grid grid-cols-4 gap-1">
              {([["people", Users], ["chat", MessageSquare], ["qa", Hand], ["poll", BarChart3]] as const).map(([k, I]) => (
                <button key={k} onClick={() => setTab(k)} aria-label={k} className={`flex justify-center rounded-md py-2 ${tab === k ? "rose-metal" : "text-muted-foreground"}`}><I className="h-4 w-4" /></button>
              ))}
            </div>
            <div className="mt-2 flex-1 space-y-2 overflow-y-auto text-xs">
              {tab === "people" && (<>
                <p className="text-muted-foreground">{people.length} attending · {people.filter((p) => p.hand).length} hands raised</p>
                {people.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg bg-card/60 p-2">
                    <span className="flex-1 truncate">{p.name}{p.stage ? " · on stage" : ""}</span>
                    {p.hand && <Hand className="h-4 w-4 text-primary" />}
                    <button title="Mute" onClick={() => setPeople(people.map((x) => x.id === p.id ? { ...x, muted: !x.muted } : x))}>{p.muted ? <MicOff className="h-4 w-4 text-muted-foreground" /> : <Mic className="h-4 w-4" />}</button>
                    <button title="Promote to stage" onClick={() => { setPeople(people.map((x) => x.id === p.id ? { ...x, stage: !x.stage, hand: false } : x)); say(`${p.name} ${p.stage ? "left" : "joined"} the stage`); }}><UserPlus className="h-4 w-4 text-primary" /></button>
                    <button title="Remove" onClick={() => setPeople(people.filter((x) => x.id !== p.id))}><X className="h-4 w-4 text-destructive" /></button>
                  </div>
                ))}
              </>)}
              {tab === "chat" && (<>
                {chat.map((c, i) => <p key={i}><b className="text-primary">{c.who}:</b> {c.text}</p>)}
                <form onSubmit={(e) => { e.preventDefault(); if (msg.trim()) { setChat([...chat, { who: "You", text: msg.trim() }]); setMsg(""); } }} className="flex gap-1 pt-2">
                  <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Message" className="rose-plate h-8 flex-1 rounded-full px-3 outline-none" />
                  <button aria-label="Send" className="rose-metal rounded-full px-2"><Send className="h-4 w-4" /></button>
                </form>
              </>)}
              {tab === "qa" && [...qs].sort((a, b) => b.votes - a.votes).map((q) => (
                <div key={q.id} className={`rounded-lg bg-card/60 p-2 ${q.answered ? "opacity-50" : ""}`}>
                  <p>{q.text}</p>
                  <div className="mt-1 flex gap-2">
                    <button onClick={() => setQs(qs.map((x) => x.id === q.id ? { ...x, votes: x.votes + 1 } : x))} className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{q.votes}</button>
                    <button onClick={() => setQs(qs.map((x) => x.id === q.id ? { ...x, answered: true } : x))} className="flex items-center gap-1"><Check className="h-3 w-3" />Answered</button>
                    <button onClick={() => { setLowerName(q.text); setOverlay({ ...overlay, lower: true }); say("Question shown on stage"); }} className="text-primary">Show on stage</button>
                  </div>
                </div>
              ))}
              {tab === "poll" && (<>
                <input value={poll.q} onChange={(e) => setPoll({ ...poll, q: e.target.value })} className="rose-plate h-8 w-full rounded-full px-3 outline-none" />
                {poll.opts.map((o, i) => (
                  <div key={i}>
                    <div className="flex gap-1">
                      <input value={o.t} onChange={(e) => setPoll({ ...poll, opts: poll.opts.map((x, j) => j === i ? { ...x, t: e.target.value } : x) })} className="flex-1 rounded border border-border bg-transparent px-2 py-1" />
                      {poll.live && <button onClick={() => setPoll({ ...poll, opts: poll.opts.map((x, j) => j === i ? { ...x, v: x.v + 1 } : x) })} className="text-primary">Vote</button>}
                    </div>
                    {poll.live && <div className="mt-1 h-2 rounded bg-muted"><div className="rose-metal h-2 rounded transition-all" style={{ width: `${(o.v / totalVotes) * 100}%` }} /></div>}
                  </div>
                ))}
                <div className="flex gap-2">
                  <button onClick={() => setPoll({ ...poll, opts: [...poll.opts, { t: "New option", v: 0 }] })} className="text-primary">+ Option</button>
                  <button onClick={() => { setPoll({ ...poll, live: true, opts: poll.opts.map((o) => ({ ...o, v: Math.floor(Math.random() * 8) })) }); say("Poll launched"); }} className="rose-metal ml-auto rounded-full px-3 py-1">Launch</button>
                </div>
              </>)}
            </div>
          </aside>
        </div>
        <p className="text-center text-[0.6rem] text-muted-foreground">Practice studio · shortcuts: Space take live · R record · M mic · C camera · B break. For real group calls use the Media Studio live classroom.</p>
      </div>

      {rooms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="glass-plate w-full max-w-sm rounded-xl p-4">
            <h2 className="font-display rose-text text-lg">Breakout rooms</h2>
            {rooms.map((r, i) => <p key={i} className="mt-2 text-xs"><b className="text-primary">Room {i + 1}:</b> {r.join(", ")}</p>)}
            <button onClick={() => setRooms(null)} className="rose-metal mt-4 w-full rounded-full py-2 text-xs uppercase">Close rooms</button>
          </div>
        </div>
      )}
      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="glass-plate w-full max-w-sm rounded-xl p-4 text-center">
            <p className="text-sm">End this session for everyone?</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmEnd(false)} className="flex-1 rounded-full border border-border py-2 text-xs">Cancel</button>
              <button onClick={() => { setLive(false); setRec(false); setSecs(0); setProgram("Break"); setConfirmEnd(false); say("Session ended"); }} className="balloon-red flex-1 rounded-full py-2 text-xs">End session</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="balloon-red fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-xs">{toast}</div>}
    </div>
  );
}
