import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, LoaderCircle, Mic, Pause, Play, Send, Volume2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const LANGUAGES = [
  { value: "auto", label: "Auto-Detect" },
  { value: "isiZulu", label: "isiZulu" },
  { value: "isiXhosa", label: "isiXhosa" },
  { value: "Sesotho", label: "Sesotho" },
  { value: "Setswana", label: "Setswana" },
  { value: "Sepedi", label: "Sepedi" },
  { value: "itsonga", label: "itsonga" },
  { value: "Tshivenda", label: "Tshivenda" },
  { value: "isiNdebele", label: "isiNdebele" },
  { value: "Siswati", label: "Siswati" },
  { value: "Afrikaans", label: "Afrikaans" },
  { value: "English", label: "English" },
] as const;

const QUICK_HELP = [
  "How do I get my SETA/YES certificate?",
  "Find catering jobs near me",
  "Help with registration",
];

type LanguageName = (typeof LANGUAGES)[number]["label"];
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  language?: string;
  audioBase64?: string | null;
  audioMimeType?: string | null;
  isError?: boolean;
};
type ChatTurn = { role: "user" | "assistant"; content: string };
type AssistantResponse = {
  detectedLanguage: string;
  userTranscript: string;
  replyText: string;
  replyAudioBase64: string | null;
  replyAudioMimeType: string | null;
};

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function languageLocale(language?: string) {
  const locales: Record<string, string> = {
    isiZulu: "zu-ZA",
    isiXhosa: "xh-ZA",
    Sesotho: "st-ZA",
    Setswana: "tn-ZA",
    Sepedi: "nso-ZA",
    Xitsonga: "ts-ZA",
    Tshivenda: "ve-ZA",
    isiNdebele: "nr-ZA",
    Siswati: "ss-ZA",
    Afrikaans: "af-ZA",
    English: "en-ZA",
  };
  return locales[language ?? ""] ?? "en-ZA";
}

function Waveform({ active = false }: { active?: boolean }) {
  const heights = ["h-2", "h-4", "h-3", "h-5", "h-2", "h-4", "h-3", "h-5", "h-2", "h-4", "h-3", "h-5"];
  return (
    <span className="inline-flex h-6 items-center gap-0.5" aria-hidden="true">
      {heights.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={`w-0.5 rounded-full bg-primary ${height} ${active ? "animate-pulse" : "opacity-70"}`}
          style={active ? { animationDelay: `${index * 65}ms` } : undefined}
        />
      ))}
    </span>
  );
}

function VoiceNotePlayer({
  audioBase64,
  mimeType,
  text,
  language,
  autoPlay,
  onAutoPlayConsumed,
}: {
  audioBase64?: string | null;
  mimeType?: string | null;
  text: string;
  language?: string;
  autoPlay: boolean;
  onAutoPlayConsumed: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const fallbackDuration = Math.max(1, Math.round(text.trim().split(/\s+/).length / 2.5));
  const source = audioBase64 && mimeType ? `data:${mimeType};base64,${audioBase64}` : undefined;

  useEffect(() => {
    if (!autoPlay) return;
    onAutoPlayConsumed();
    if (source && audioRef.current) {
      void audioRef.current.play().catch(() => setPlaying(false));
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageLocale(language);
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setPlaying(true);
    }
  }, [autoPlay, language, onAutoPlayConsumed, source, text]);

  const togglePlayback = async () => {
    if (source && audioRef.current) {
      if (audioRef.current.paused) {
        try {
          await audioRef.current.play();
        } catch {
          setPlaying(false);
        }
      } else {
        audioRef.current.pause();
      }
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
      return;
    }
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPlaying(true);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageLocale(language);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  };

  return (
    <div className="mt-2 flex min-w-44 items-center gap-2 rounded-md border border-primary/25 bg-background/70 px-2 py-1.5">
      <audio
        ref={audioRef}
        src={source}
        preload="metadata"
        className="hidden"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? Math.round(event.currentTarget.duration) : 0)}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-10 w-10 shrink-0 rounded-full"
        title={playing ? "Pause voice reply" : "Play voice reply"}
        aria-label={playing ? "Pause voice reply" : "Play voice reply"}
        onClick={() => void togglePlayback()}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Waveform active={playing} />
      <span className="ml-auto text-xs tabular-nums text-muted-foreground">{formatClock(duration || fallbackDuration)}</span>
    </div>
  );
}

export function WrcanHelper() {
  const { user } = useAuth();
  const route = useRouterState({ select: (state) => state.location.pathname });
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<LanguageName>("Auto-Detect");
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: "Hi! Ask me about training, certificates, jobs, or registration." },
  ]);
  const [sending, setSending] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [autoPlayMessageId, setAutoPlayMessageId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, open]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    requestControllerRef.current?.abort();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const appendError = (message: string) => {
    setMessages((current) => [...current, { id: makeId(), role: "assistant", content: message, isError: true }]);
  };

  const sendRequest = async ({ text, audio }: { text?: string; audio?: Blob }) => {
    if (!user) {
      appendError("Please sign in to use the WRCAN Helper.");
      return;
    }
    if (sending) return;
    const cleanText = text?.trim() ?? "";
    if (!cleanText && !audio) return;
    const history: ChatTurn[] = messages
      .filter((message) => !message.isError && message.id !== "welcome")
      .slice(-8)
      .map((message) => ({ role: message.role, content: message.content }));
    if (cleanText) setMessages((current) => [...current, { id: makeId(), role: "user", content: cleanText }]);
    setSending(true);
    setSetupRequired(false);
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please sign in again to continue.");
      const form = new FormData();
      if (cleanText) form.append("message", cleanText);
      if (audio) {
        const audioType = audio.type.startsWith("audio/") ? audio.type : "audio/webm";
        form.append("audio", new File([audio], `voice-note-${Date.now()}.webm`, { type: audioType }));
      }
      form.append("language", language === "Auto-Detect" ? "auto" : language);
      form.append("route", route);
      form.append("history", JSON.stringify(history));
      const response = await fetch("/api/wrcan-helper", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
        signal: controller.signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        if (payload != null && typeof payload === "object") {
          const errorPayload = payload as Record<string, unknown>;
          if (errorPayload["setupRequired"] === true) setSetupRequired(true);
          const message = errorPayload["error"];
          throw new Error(typeof message === "string" ? message : `The assistant returned ${response.status}.`);
        }
        throw new Error(`The assistant returned ${response.status}.`);
      }
      if (payload == null || typeof payload !== "object") throw new Error("The assistant sent an unreadable reply. Please try again.");
      const result = payload as AssistantResponse;
      if (audio && result.userTranscript) {
        setMessages((current) => [...current, { id: makeId(), role: "user", content: result.userTranscript }]);
      }
      const replyId = makeId();
      setMessages((current) => [...current, {
        id: replyId,
        role: "assistant",
        content: result.replyText,
        language: result.detectedLanguage,
        audioBase64: result.replyAudioBase64,
        audioMimeType: result.replyAudioMimeType,
      }]);
      setAutoPlayMessageId(autoSpeak ? replyId : null);
      if (audio) setRecordingSeconds(0);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const message = error instanceof Error ? error.message : "The assistant could not answer right now.";
      appendError(message);
      if (cleanText) setDraft(cleanText);
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
      setSending(false);
    }
  };

  const submitText = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft;
    if (!text.trim() || sending) return;
    setDraft("");
    void sendRequest({ text });
  };

  const toggleRecording = async () => {
    if (recording) {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
      setRecording(false);
      return;
    }
    if (sending) return;
    if (!user) {
      appendError("Please sign in to use the WRCAN Helper.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      appendError("Voice recording is not available in this browser. You can still type your question.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (blob.size > 0) void sendRequest({ audio: blob });
      };
      setRecordingSeconds(0);
      setRecording(true);
      recorder.start();
    } catch {
      appendError("Microphone access was not available. Check your browser permission or type your question instead.");
    }
  };

  const closeDrawer = () => {
    if (sending) requestControllerRef.current?.abort();
    if (recording && recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    setRecording(false);
    setOpen(false);
  };

  const launchQuickHelp = (question: string) => {
    setDraft("");
    void sendRequest({ text: question });
  };

  return (
    <>
      {open ? (
        <section
          aria-label="WRCAN language assistant"
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[86dvh] flex-col overflow-hidden rounded-t-2xl border border-primary/35 bg-card text-card-foreground shadow-2xl pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:right-5 sm:bottom-20 sm:h-[min(640px,calc(100dvh-7rem))] sm:w-[min(340px,calc(100vw-1.5rem))] sm:rounded-xl"
        >
          <header className="flex items-center gap-3 border-b border-border/70 bg-background/70 px-3 py-3">
            <span className="rose-metal flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">WRCAN Helper</p>
              <p className="text-xs text-muted-foreground">Online · All 11 SA languages</p>
            </div>
            <Button type="button" size="icon" variant="ghost" className="h-11 w-11" onClick={closeDrawer} aria-label="Close assistant" title="Close assistant">
              <X />
            </Button>
          </header>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 px-3 py-2">
            <Select value={language} onValueChange={(value) => setLanguage(value as LanguageName)}>
              <SelectTrigger className="h-11 min-w-0" aria-label="Choose reply language">
                <SelectValue placeholder="Auto-Detect" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((item) => <SelectItem key={item.value} value={item.label}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground" htmlFor="wrcan-auto-speak">
              <Volume2 className="h-4 w-4" />
              <span>Speak</span>
              <Switch id="wrcan-auto-speak" checked={autoSpeak} onCheckedChange={setAutoSpeak} aria-label="Auto-speak replies" />
            </label>
          </div>

          {setupRequired ? (
            <div className="border-b border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
              The assistant is not configured yet. Please contact the WRCAN app administrator.
            </div>
          ) : null}

          <div ref={feedRef} className="flex min-h-40 flex-1 flex-col gap-3 overflow-y-auto px-3 py-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-xl border px-3 py-2 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "border-primary/50 bg-primary text-primary-foreground"
                    : message.isError
                      ? "border-destructive/50 bg-destructive/10 text-foreground"
                      : "border-border bg-background/80 text-foreground"
                }`}>
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  {message.role === "assistant" && !message.isError && message.id !== "welcome" ? (
                    <VoiceNotePlayer
                      audioBase64={message.audioBase64}
                      mimeType={message.audioMimeType}
                      text={message.content}
                      language={message.language}
                      autoPlay={autoPlayMessageId === message.id}
                      onAutoPlayConsumed={() => setAutoPlayMessageId((current) => current === message.id ? null : current)}
                    />
                  ) : null}
                  {message.language ? <p className="mt-1 text-[0.65rem] text-muted-foreground">{message.language}</p> : null}
                </div>
              </div>
            ))}
            {sending ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>Preparing your reply…</span>
              </div>
            ) : null}
          </div>

          {!user ? (
            <div className="border-t border-border/70 px-3 py-3">
              <p className="mb-2 text-sm text-muted-foreground">Sign in to ask the WRCAN Helper.</p>
              <Button asChild className="min-h-11 w-full">
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          ) : (
            <div className="border-t border-border/70 bg-background/65 px-3 pt-2 pb-3">
              <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Quick help">
                {QUICK_HELP.map((question) => (
                  <Button
                    key={question}
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={sending}
                    className="h-auto min-h-9 whitespace-normal px-2 py-1 text-left text-[0.68rem] leading-tight"
                    onClick={() => launchQuickHelp(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
              {recording ? (
                <div className="mb-2 flex items-center justify-between rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2" role="status">
                  <span className="flex items-center gap-2 text-sm text-destructive">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
                    Recording {formatClock(recordingSeconds)}
                  </span>
                  <Waveform active />
                </div>
              ) : null}
              <form className="flex items-center gap-2" onSubmit={submitText}>
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask in your language…"
                  aria-label="Message the WRCAN Helper"
                  maxLength={1600}
                  disabled={sending || recording}
                  className="h-12 min-w-0 rounded-full"
                />
                <Button
                  type="button"
                  size="icon"
                  variant={recording ? "destructive" : "outline"}
                  className="h-12 w-12 shrink-0 rounded-full"
                  onClick={() => void toggleRecording()}
                  aria-label={recording ? "Stop voice recording" : "Record a voice message"}
                  title={recording ? "Stop recording" : "Record a voice message"}
                  disabled={sending}
                >
                  <Mic />
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  className="rose-metal h-12 w-12 shrink-0 rounded-full"
                  aria-label="Send message"
                  title="Send message"
                  disabled={sending || !draft.trim() || recording}
                >
                  <Send />
                </Button>
              </form>
            </div>
          )}
        </section>
      ) : (
        <div className="fixed right-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 flex items-center gap-2 sm:right-5 sm:bottom-5">
          <span className="rounded-full border border-primary/30 bg-background/90 px-3 py-2 text-xs font-medium text-foreground shadow-lg">Ask in your language</span>
          <Button
            type="button"
            size="icon"
            className="rose-metal relative h-14 w-14 rounded-full shadow-xl"
            onClick={() => setOpen(true)}
            aria-label="Ask in your language"
            title="Ask in your language"
          >
            <span className="absolute inset-0 rounded-full border border-primary/70 animate-ping" aria-hidden="true" />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-primary-foreground/35">
              <Mic className="h-5 w-5" />
            </span>
          </Button>
        </div>
      )}
    </>
  );
}