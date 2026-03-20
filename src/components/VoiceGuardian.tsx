"use client";

/**
 * Aegis Bridge — Voice Guardian
 * ElevenLabs Conversational AI (agent_7701km5bbrxcfpbrqxkm8ypztmty)
 * via @elevenlabs/react with WebRTC (low latency).
 *
 * Works in silos — fully standalone, no dependency on Gemini triage pipeline.
 * API key stays server-side via /api/voice/token.
 *
 * Auto-activates panel when a screen reader is detected.
 */
import { useCallback, useEffect, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { Mic, MicOff, Volume2, VolumeX, X, Loader2, Radio } from "lucide-react";

// ── Screen reader detection ───────────────────────────────────────────────
function detectScreenReader(): boolean {
  if (typeof window === "undefined") return false;
  if (/NVDA|JAWS|VoiceOver|TalkBack|Orca|ChromeVox/i.test(navigator.userAgent)) return true;
  try { return window.matchMedia("(forced-colors: active)").matches; } catch { return false; }
}

// ── Status helpers ────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  connected: "Connected",
  connecting: "Connecting…",
  disconnected: "Disconnected",
  disconnecting: "Ending…",
};

export default function VoiceGuardian() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      setStarting(false);
      setError(null);
    },
    onDisconnect: () => {
      setStarting(false);
    },
    onError: (err) => {
      setStarting(false);
      const msg = typeof err === "string" ? err : (err as { message?: string }).message ?? "Connection error";
      setError(msg);
      console.error("[ElevenLabs]", err);
    },
  });

  // Apply mute whenever it changes
  useEffect(() => {
    conversation.setVolume({ volume: muted ? 0 : 1 });
  }, [muted, conversation]);

  // Auto-open panel for screen reader users
  useEffect(() => {
    if (detectScreenReader()) setPanelOpen(true);
  }, []);

  // ── Start session via server-side token (keeps API key safe) ─────────────
  const startSession = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const res = await fetch("/api/voice/token");
      const data = await res.json() as { token?: string; agentId?: string; error?: string };

      if (!res.ok || !data.token) {
        throw new Error(data.error ?? "Could not get session token");
      }

      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });
    } catch (err) {
      setStarting(false);
      const msg = err instanceof Error ? err.message : "Failed to start";
      // Mic denied
      if (msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("permission")) {
        setError("Microphone access denied. Allow mic in browser settings.");
      } else {
        setError(msg);
      }
    }
  }, [conversation]);

  const endSession = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const isConnected = conversation.status === "connected";
  const isConnecting = conversation.status === "connecting" || starting;

  // ── Floating trigger button ───────────────────────────────────────────────
  if (!panelOpen) {
    return (
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        aria-label="Open Aegis voice assistant — hands-free triage mode"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold shadow-xl transition-all hover:opacity-90 active:scale-95"
        style={{ background: "var(--color-accent)", color: "#fff" }}
      >
        <Mic size={16} aria-hidden="true" />
        Voice Mode
      </button>
    );
  }

  // ── Expanded panel ────────────────────────────────────────────────────────
  return (
    <div
      role="region"
      aria-label="Aegis voice assistant"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 glass-bright rounded-2xl shadow-2xl flex flex-col gap-4 overflow-hidden"
      style={{ width: 280, border: "1px solid var(--color-border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-4"
      >
        <div className="flex items-center gap-2">
          <Radio size={14} style={{ color: "var(--color-accent)" }} aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-primary)" }}>
            Aegis Voice
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute agent" : "Mute agent"}
            className="p-1.5 rounded-lg transition-all hover:bg-white/10"
            style={{ color: "var(--color-text-muted)" }}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            type="button"
            onClick={() => { endSession(); setPanelOpen(false); }}
            aria-label="Close voice mode"
            className="p-1.5 rounded-lg transition-all hover:bg-white/10"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Visualiser / status orb */}
      <div className="flex flex-col items-center gap-3 px-4">
        <div
          className="relative flex items-center justify-center w-20 h-20 rounded-full"
          style={{
            background: isConnected
              ? conversation.isSpeaking
                ? "rgba(239,68,68,0.15)"
                : "rgba(99,102,241,0.15)"
              : "rgba(255,255,255,0.05)",
            border: `2px solid ${
              isConnected
                ? conversation.isSpeaking
                  ? "var(--color-critical)"
                  : "var(--color-accent)"
                : "var(--color-border)"
            }`,
            transition: "all 0.3s ease",
          }}
          aria-hidden="true"
        >
          {isConnecting ? (
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--color-accent)" }} />
          ) : isConnected ? (
            conversation.isSpeaking ? (
              <Volume2 size={28} style={{ color: "var(--color-critical)" }} />
            ) : (
              <Mic size={28} style={{ color: "var(--color-accent)" }} />
            )
          ) : (
            <MicOff size={28} style={{ color: "var(--color-text-muted)" }} />
          )}

          {/* Pulse ring when speaking */}
          {isConnected && conversation.isSpeaking && (
            <span
              className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "rgba(239,68,68,0.2)" }}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Status text */}
        <p
          className="text-xs font-medium text-center"
          style={{
            color: isConnected
              ? conversation.isSpeaking
                ? "var(--color-critical)"
                : "var(--color-accent)"
              : "var(--color-text-muted)",
          }}
          aria-live="assertive"
        >
          {isConnected
            ? conversation.isSpeaking
              ? "Aegis is speaking…"
              : "Listening — speak now"
            : isConnecting
            ? "Connecting…"
            : STATUS_LABEL[conversation.status] ?? "Ready"}
        </p>
      </div>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="mx-4 text-xs px-3 py-2 rounded-lg"
          style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-critical)" }}
        >
          {error}
        </p>
      )}

      {/* Start / End button */}
      <div className="px-4 pb-4">
        {isConnected ? (
          <button
            type="button"
            onClick={endSession}
            aria-label="End voice session"
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: "rgba(239,68,68,0.15)", color: "var(--color-critical)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            End Session
          </button>
        ) : (
          <button
            type="button"
            onClick={startSession}
            disabled={isConnecting}
            aria-label="Start voice session with Aegis"
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            {isConnecting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Connecting…
              </span>
            ) : (
              "Start Voice Session"
            )}
          </button>
        )}
      </div>

      {/* Footer hint */}
      <p
        className="text-center text-xs pb-3"
        style={{ color: "var(--color-text-muted)" }}
      >
        Powered by ElevenLabs · Agent: Aegis
      </p>
    </div>
  );
}
