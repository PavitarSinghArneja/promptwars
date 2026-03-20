"use client";

/**
 * Aegis Bridge — Audio Recorder
 * MediaRecorder API with waveform visualization and base64 export
 * a11y: clear ARIA states, keyboard navigable, live status announcements
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Square, Loader2, AlertCircle } from "lucide-react";

export interface AudioRecording {
  blob: Blob;
  base64: string;
  durationSec: number;
  mimeType: string;
}

interface AudioRecorderProps {
  onRecordingComplete: (rec: AudioRecording | null) => void;
  maxDurationSec?: number;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function AudioRecorder({
  onRecordingComplete,
  maxDurationSec = 120,
}: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "requesting" | "recording" | "processing" | "done" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bars, setBars] = useState<number[]>(new Array(32).fill(4));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      animFrameRef.current && cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const animateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const step = Math.floor(data.length / 32);
    const newBars = Array.from({ length: 32 }, (_, i) => {
      const val = data[i * step] ?? 0;
      return Math.max(4, Math.round((val / 255) * 48));
    });
    setBars(newBars);
    animFrameRef.current = requestAnimationFrame(animateWaveform);
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Waveform analyser
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Choose supported mime type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        timerRef.current && clearInterval(timerRef.current);
        animFrameRef.current && cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((t) => t.stop());
        setState("processing");
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = (reader.result as string).split(",")[1];
          onRecordingComplete({
            blob,
            base64: b64,
            durationSec: elapsed,
            mimeType,
          });
          setState("done");
          setBars(new Array(32).fill(4));
        };
        reader.readAsDataURL(blob);
      };

      mr.start(250); // collect in 250ms chunks
      setState("recording");
      setElapsed(0);
      animateWaveform();

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= maxDurationSec) {
            stopRecording();
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      setErrorMsg("Microphone access denied. Please allow mic permissions and try again.");
      setState("error");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const resetRecording = () => {
    onRecordingComplete(null);
    setElapsed(0);
    setState("idle");
    setBars(new Array(32).fill(4));
  };

  const isRecording = state === "recording";

  return (
    <section aria-labelledby="audio-recorder-label" className="flex flex-col gap-4">
      <h3 id="audio-recorder-label" className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
        Voice Description
      </h3>

      {/* Waveform + controls */}
      <div
        className="glass rounded-xl p-5 flex flex-col gap-4"
        role="region"
        aria-label="Audio recorder"
      >
        {/* Waveform visualization */}
        <div
          aria-hidden="true"
          className="flex items-center justify-center gap-[2px] h-12"
        >
          {bars.map((h, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-75"
              style={{
                width: "3px",
                height: `${h}px`,
                background: isRecording
                  ? `hsl(${0 + i * 2}, 85%, 60%)`
                  : "var(--color-text-muted)",
                opacity: isRecording ? 1 : 0.4,
              }}
            />
          ))}
        </div>

        {/* Timer */}
        <div className="text-center">
          <span
            role="timer"
            aria-label={`Recording duration: ${formatTime(elapsed)}`}
            className="text-2xl font-700 tabular-nums"
            style={{ color: isRecording ? "var(--color-critical)" : "var(--color-text-muted)" }}
          >
            {formatTime(elapsed)}
          </span>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Max {formatTime(maxDurationSec)}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {state === "idle" || state === "error" ? (
            <button
              type="button"
              onClick={startRecording}
              aria-label="Start recording voice description"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ background: "var(--color-critical)", color: "#fff" }}
            >
              <Mic size={16} aria-hidden="true" />
              Start Recording
            </button>
          ) : state === "requesting" ? (
            <button
              type="button"
              disabled
              aria-label="Requesting microphone access"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm opacity-60"
              style={{ background: "var(--color-surface-700)", color: "var(--color-text-secondary)" }}
            >
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Requesting mic…
            </button>
          ) : state === "recording" ? (
            <button
              type="button"
              onClick={stopRecording}
              aria-label="Stop recording"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ background: "var(--color-surface-600)", color: "var(--color-text-primary)", border: "1px solid var(--color-critical)" }}
            >
              <Square size={16} aria-hidden="true" />
              Stop
            </button>
          ) : state === "processing" ? (
            <div
              role="status"
              aria-label="Processing audio"
              className="flex items-center gap-2 text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Processing audio…
            </div>
          ) : state === "done" ? (
            <div className="flex items-center gap-3">
              <div
                role="status"
                aria-label="Recording complete"
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg"
                style={{ background: "rgba(34,197,94,0.1)", color: "var(--color-minor)", border: "1px solid rgba(34,197,94,0.3)" }}
              >
                <MicOff size={14} aria-hidden="true" />
                Recorded ({formatTime(elapsed)})
              </div>
              <button
                type="button"
                onClick={resetRecording}
                aria-label="Clear recording and start over"
                className="text-xs underline"
                style={{ color: "var(--color-text-muted)" }}
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2 text-sm px-3 py-2 rounded-lg"
            style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-critical)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            {errorMsg}
          </div>
        )}
      </div>

      {/* Screen-reader live status */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {state === "recording" && `Recording in progress: ${formatTime(elapsed)}`}
        {state === "done" && "Voice recording complete."}
        {state === "error" && errorMsg}
      </div>
    </section>
  );
}
