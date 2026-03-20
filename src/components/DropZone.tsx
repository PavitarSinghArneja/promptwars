"use client";

/**
 * Aegis Bridge — Image Drop Zone
 * Drag-and-drop image upload with file type/size validation and previews
 * a11y: keyboard-accessible, ARIA live regions, role="region"
 */
import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { Upload, X, ImageIcon, AlertCircle } from "lucide-react";

export interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
}

interface DropZoneProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_EXT = ".jpg, .jpeg, .png, .webp, .gif";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix — send only the base64 payload
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DropZone({
  onFilesChange,
  maxFiles = 4,
  maxSizeMB = 10,
}: DropZoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndProcess = useCallback(
    async (rawFiles: File[]) => {
      setError(null);
      const remaining = maxFiles - files.length;
      const toProcess = rawFiles.slice(0, remaining);

      if (rawFiles.length > remaining) {
        setError(`Max ${maxFiles} images allowed. Extra files ignored.`);
      }

      const results: UploadedFile[] = [];
      for (const file of toProcess) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError(`"${file.name}" is not a supported image type.`);
          continue;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(`"${file.name}" exceeds ${maxSizeMB}MB limit.`);
          continue;
        }
        const base64 = await fileToBase64(file);
        const previewUrl = URL.createObjectURL(file);
        results.push({ id: crypto.randomUUID(), file, previewUrl, base64 });
      }

      setFiles((prev) => {
        const updated = [...prev, ...results];
        onFilesChange(updated);
        return updated;
      });
    },
    [files.length, maxFiles, maxSizeMB, onFilesChange]
  );

  const removeFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const updated = prev.filter((f) => {
          if (f.id === id) {
            URL.revokeObjectURL(f.previewUrl);
            return false;
          }
          return true;
        });
        onFilesChange(updated);
        return updated;
      });
    },
    [onFilesChange]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      validateAndProcess(dropped);
    },
    [validateAndProcess]
  );

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      validateAndProcess(selected);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [validateAndProcess]
  );

  const openPicker = () => inputRef.current?.click();

  return (
    <section aria-labelledby="dropzone-label" className="flex flex-col gap-4">
      <h3 id="dropzone-label" className="text-sm font-semibold" style={{ color: "var(--color-text-secondary)" }}>
        Photos &amp; Documents
      </h3>

      {/* Drop target */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload images. ${files.length} of ${maxFiles} uploaded. Accepted: ${ACCEPTED_EXT}`}
        aria-describedby={error ? "dropzone-error" : undefined}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={openPicker}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPicker(); } }}
        className="relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all"
        style={{
          borderColor: isDragging ? "var(--color-accent)" : "var(--color-border-bright)",
          background: isDragging ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.02)",
          minHeight: "140px",
        }}
      >
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl"
          style={{ background: "rgba(99,102,241,0.1)" }}
          aria-hidden="true"
        >
          {isDragging ? (
            <ImageIcon size={24} style={{ color: "var(--color-accent)" }} />
          ) : (
            <Upload size={24} style={{ color: "var(--color-accent)" }} />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {isDragging ? "Release to upload" : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Medication bottles, IDs, wounds &bull; {ACCEPTED_EXT} &bull; max {maxSizeMB}MB
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={onInputChange}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          id="dropzone-error"
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg"
          style={{
            background: "rgba(239,68,68,0.1)",
            color: "var(--color-critical)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Previews */}
      {files.length > 0 && (
        <div
          role="list"
          aria-label="Uploaded images"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {files.map((f) => (
            <div
              key={f.id}
              role="listitem"
              className="relative group rounded-lg overflow-hidden aspect-square"
              style={{ border: "1px solid var(--color-border)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.previewUrl}
                alt={`Preview of ${f.file.name}`}
                className="w-full h-full object-cover"
              />
              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                aria-label={`Remove ${f.file.name}`}
                className="absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                <X size={12} style={{ color: "#fff" }} aria-hidden="true" />
              </button>
              <p className="sr-only">{f.file.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Screen-reader live status */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {files.length > 0
          ? `${files.length} image${files.length > 1 ? "s" : ""} uploaded.`
          : "No images uploaded yet."}
      </div>
    </section>
  );
}
