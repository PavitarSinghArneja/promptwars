"use client";

/**
 * Aegis Bridge — Triage Workspace
 * Orchestrates all multi-modal inputs and fires the /api/triage pipeline.
 * a11y: fieldset/legend grouping, ARIA live regions, progress announcements
 */
import { useState, useCallback } from "react";
import { Zap, Loader2, AlertTriangle } from "lucide-react";
import DropZone, { type UploadedFile } from "./DropZone";
import AudioRecorder, { type AudioRecording } from "./AudioRecorder";
import TextInput from "./TextInput";
import type { TriageOutput } from "@/lib/triageSchema";

interface TriageWorkspaceProps {
  onResult: (result: TriageOutput) => void;
}

export default function TriageWorkspace({ onResult }: TriageWorkspaceProps) {
  const [images, setImages] = useState<UploadedFile[]>([]);
  const [audio, setAudio] = useState<AudioRecording | null>(null);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const hasInput = images.length > 0 || audio !== null || notes.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!hasInput || isLoading) return;
    setIsLoading(true);
    setApiError(null);

    try {
      const payload = {
        images: images.map((f) => ({
          base64: f.base64,
          mimeType: f.file.type,
          name: f.file.name,
        })),
        audio: audio
          ? { base64: audio.base64, mimeType: audio.mimeType, durationSec: audio.durationSec }
          : null,
        notes: notes.trim(),
      };

      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `Server error ${res.status}`);
      }

      const data: TriageOutput = await res.json();
      onResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error. Please try again.";
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  }, [hasInput, isLoading, images, audio, notes, onResult]);

  return (
    <div className="flex flex-col gap-6">
      {/* Input sections */}
      <fieldset className="border-0 m-0 p-0">
        <legend className="sr-only">Emergency triage inputs — voice, images, and text</legend>

        <div className="flex flex-col gap-6">
          {/* Row 1: Image drop zone */}
          <DropZone onFilesChange={setImages} maxFiles={4} maxSizeMB={10} />

          {/* Row 2: Audio recorder */}
          <AudioRecorder
            onRecordingComplete={setAudio}
            maxDurationSec={120}
          />

          {/* Row 3: Text notes */}
          <TextInput value={notes} onChange={setNotes} maxChars={4000} />
        </div>
      </fieldset>

      {/* API Error */}
      {apiError && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
          style={{
            background: "rgba(239,68,68,0.1)",
            color: "var(--color-critical)",
            border: "1px solid rgba(239,68,68,0.3)",
          }}
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Triage failed</p>
            <p className="mt-0.5 opacity-80">{apiError}</p>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!hasInput || isLoading}
        aria-label={isLoading ? "Analysing emergency inputs — please wait" : "Analyse inputs and generate triage report"}
        aria-busy={isLoading}
        className="flex items-center justify-center gap-3 w-full py-4 rounded-xl text-base font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: hasInput && !isLoading ? "var(--color-critical)" : "var(--color-surface-700)",
          color: "#fff",
          boxShadow: hasInput && !isLoading ? "0 0 24px rgba(239,68,68,0.25)" : "none",
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            Analysing with Gemini…
          </>
        ) : (
          <>
            <Zap size={20} aria-hidden="true" />
            Run Emergency Triage
          </>
        )}
      </button>

      {/* Screen-reader progress */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading && "Analysing emergency inputs with Gemini AI. Please wait."}
        {apiError && `Error: ${apiError}`}
      </div>
    </div>
  );
}
