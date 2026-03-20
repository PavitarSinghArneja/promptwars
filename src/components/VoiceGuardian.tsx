"use client";

/**
 * Aegis Bridge — Voice Guardian
 * Zero-barrier voice mode for visually impaired users.
 *
 * Flow:
 *   1. Auto-activates if screen reader detected, else shows "Start Voice Mode" button.
 *   2. Uses browser SpeechRecognition to capture user voice.
 *   3. Sends transcript to /api/triage (notes field) and optional Drive files.
 *   4. Speaks Gemini results back via ElevenLabs TTS (/api/voice/speak).
 *   5. Falls back to browser SpeechSynthesis if ElevenLabs returns 503.
 *
 * Drive commands: if transcript contains "search my drive for X" or "from drive X"
 * the component searches Drive and injects the file into the Gemini request.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Volume2, VolumeX, Loader2, X } from "lucide-react";
import type { TriageOutput } from "@/lib/triageSchema";
import { useAuth } from "@/lib/firebase/AuthContext";

interface VoiceGuardianProps {
  onResult: (result: TriageOutput) => void;
}

// Check if a screen reader is likely active
function detectScreenReader(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  // Known screen reader signatures in user agent or platform
  if (/NVDA|JAWS|VoiceOver|TalkBack|Orca|ChromeVox/i.test(ua)) return true;
  // Some ATs set a custom media feature
  try {
    if (window.matchMedia("(forced-colors: active)").matches) return true;
  } catch { /* ignore */ }
  return false;
}

type VGState = "idle" | "listening" | "processing" | "speaking" | "error";

// Parse Drive commands from transcript
function parseDriveCommand(text: string): string | null {
  const m =
    text.match(/search (?:my )?drive for (.+)/i) ??
    text.match(/from (?:my )?drive[,:]? (.+)/i) ??
    text.match(/get (.+) from (?:my )?drive/i);
  return m ? m[1].trim() : null;
}

export default function VoiceGuardian({ onResult }: VoiceGuardianProps) {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<VGState>("idle");
  const [transcript, setTranscript] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [muted, setMuted] = useState(false);
  const { driveToken } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-show if screen reader detected
  useEffect(() => {
    if (detectScreenReader()) {
      setVisible(true);
      setStatusMsg("Screen reader detected. Press Start to activate voice mode.");
    }
  }, []);

  // ── Text-to-Speech: ElevenLabs → browser SpeechSynthesis fallback ─────────
  const speak = useCallback(async (text: string) => {
    if (muted) return;
    setState("speaking");
    setStatusMsg("Speaking…");

    // Try ElevenLabs
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          audio.play().catch(() => resolve());
        });
        setState("idle");
        setStatusMsg("Ready. Say something or press the mic.");
        return;
      }
    } catch { /* fall through to browser TTS */ }

    // Browser SpeechSynthesis fallback
    if ("speechSynthesis" in window) {
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.95;
      utt.pitch = 1;
      utt.onend = () => {
        setState("idle");
        setStatusMsg("Ready. Say something or press the mic.");
      };
      window.speechSynthesis.speak(utt);
    } else {
      setState("idle");
      setStatusMsg("Ready.");
    }
  }, [muted]);

  // ── Run triage on transcript (+ optional Drive file) ─────────────────────
  const runTriage = useCallback(async (text: string) => {
    setState("processing");
    setStatusMsg("Analysing…");

    const driveQuery = parseDriveCommand(text);
    const images: { base64: string; mimeType: string; name: string }[] = [];

    // If Drive command detected and token available, fetch the file
    if (driveQuery && driveToken) {
      try {
        setStatusMsg(`Searching Drive for "${driveQuery}"…`);
        const searchRes = await fetch(
          `/api/drive/search?q=${encodeURIComponent(driveQuery)}&token=${encodeURIComponent(driveToken)}`
        );
        if (searchRes.ok) {
          const { files } = await searchRes.json() as { files: { id: string; name: string; mimeType: string }[] };
          if (files.length > 0) {
            const file = files[0];
            setStatusMsg(`Fetching "${file.name}" from Drive…`);
            const fetchRes = await fetch(
              `/api/drive/fetch?id=${encodeURIComponent(file.id)}&token=${encodeURIComponent(driveToken)}`
            );
            if (fetchRes.ok) {
              const data = await fetchRes.json() as { base64: string; mimeType: string; name: string };
              images.push({ base64: data.base64, mimeType: data.mimeType, name: data.name });
              await speak(`Found ${file.name} in your Drive. Analysing it now.`);
            }
          } else {
            await speak(`Could not find "${driveQuery}" in your Drive. Proceeding without it.`);
          }
        }
      } catch { /* proceed without Drive file */ }
    }

    // Submit to /api/triage
    try {
      const body = new FormData();
      body.append("notes", text);
      if (images.length > 0) {
        body.append("imagesJson", JSON.stringify(images));
      }

      const res = await fetch("/api/triage", { method: "POST", body });
      const data = await res.json() as TriageOutput & { error?: string };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      onResult(data);

      // Speak summary back
      const summary =
        `Triage complete. Level ${data.triageLevel}. ${data.summary}. ` +
        `Recommended specialty: ${data.recommendedSpecialty}. ` +
        (data.actions[0]?.instruction
          ? `First action: ${data.actions[0].instruction}`
          : "");
      await speak(summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Triage failed.";
      setState("error");
      setStatusMsg(msg);
      await speak("I encountered an error. Please try again.");
    }
  }, [driveToken, onResult, speak]);

  // ── Start listening ───────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
    if (!SR) {
      setState("error");
      setStatusMsg("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    setState("listening");
    setStatusMsg("Listening… speak now.");
    setTranscript("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const interim = Array.from(e.results as unknown[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r) => (r as any)[0].transcript as string)
        .join(" ");
      setTranscript(interim);
    };

    recognition.onend = () => {
      if (transcript.trim()) {
        runTriage(transcript.trim());
      } else {
        setState("idle");
        setStatusMsg("Didn't catch that. Press the mic to try again.");
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => {
      if (e.error === "no-speech") {
        setState("idle");
        setStatusMsg("No speech detected. Press the mic to try again.");
      } else {
        setState("error");
        setStatusMsg(`Microphone error: ${e.error}`);
      }
    };

    recognition.start();
  }, [transcript, runTriage]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    audioRef.current?.pause();
  }, []);

  const toggleMic = () => {
    if (state === "listening") stopListening();
    else if (state === "idle") startListening();
  };

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => {
          setVisible(true);
          setStatusMsg("Voice mode ready. Press the mic to begin.");
        }}
        aria-label="Start Voice Mode — hands-free triage for accessibility"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold shadow-lg transition-all hover:opacity-90 active:scale-95"
        style={{ background: "var(--color-accent)", color: "#fff" }}
      >
        <Mic size={16} aria-hidden="true" />
        <span>Voice Mode</span>
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Voice Guardian — hands-free triage mode"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 glass-bright rounded-2xl p-4 w-72 shadow-2xl flex flex-col gap-3"
      style={{ border: "1px solid var(--color-border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic size={14} style={{ color: "var(--color-accent)" }} aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
            Voice Guardian
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute voice responses" : "Mute voice responses"}
            className="p-1.5 rounded-lg transition-all hover:bg-white/10"
            style={{ color: "var(--color-text-muted)" }}
          >
            {muted ? <VolumeX size={14} aria-hidden="true" /> : <Volume2 size={14} aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => { stopListening(); setVisible(false); }}
            aria-label="Close voice mode"
            className="p-1.5 rounded-lg transition-all hover:bg-white/10"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Status */}
      <p
        className="text-xs leading-relaxed min-h-[2.5rem]"
        style={{ color: "var(--color-text-secondary)" }}
        aria-live="assertive"
      >
        {statusMsg || "Press the mic to begin."}
      </p>

      {/* Transcript */}
      {transcript && (
        <p
          className="text-xs italic px-3 py-2 rounded-lg"
          style={{ background: "rgba(255,255,255,0.05)", color: "var(--color-text-muted)" }}
          aria-label="Current transcript"
        >
          &ldquo;{transcript}&rdquo;
        </p>
      )}

      {/* Drive hint */}
      {!driveToken && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Tip: Link your Google account to say &ldquo;search my drive for [filename]&rdquo;.
        </p>
      )}

      {/* Mic button */}
      <button
        type="button"
        onClick={toggleMic}
        disabled={state === "processing" || state === "speaking"}
        aria-label={state === "listening" ? "Stop listening" : "Start listening"}
        aria-pressed={state === "listening"}
        className="mx-auto flex items-center justify-center w-14 h-14 rounded-full transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        style={{
          background: state === "listening"
            ? "var(--color-critical)"
            : state === "processing" || state === "speaking"
            ? "rgba(255,255,255,0.1)"
            : "var(--color-accent)",
        }}
      >
        {state === "processing" || state === "speaking" ? (
          <Loader2 size={22} className="animate-spin text-white" aria-hidden="true" />
        ) : state === "listening" ? (
          <MicOff size={22} className="text-white" aria-hidden="true" />
        ) : (
          <Mic size={22} className="text-white" aria-hidden="true" />
        )}
      </button>

      <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
        {state === "listening" ? "Tap to stop" : "Tap to speak"}
      </p>
    </div>
  );
}
