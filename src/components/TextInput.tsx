"use client";

/**
 * Aegis Bridge — Free-text Medical Notes Input
 * Auto-expanding textarea with char count, paste-optimised UX
 * a11y: label, aria-describedby, live char count
 */
import { useRef, useCallback } from "react";
import { FileText } from "lucide-react";

interface TextInputProps {
  value: string;
  onChange: (val: string) => void;
  maxChars?: number;
}

export default function TextInput({ value, onChange, maxChars = 4000 }: TextInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea to content height
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      onChange(el.value.slice(0, maxChars));
    },
    [maxChars, onChange]
  );

  const remaining = maxChars - value.length;
  const nearLimit = remaining < 200;

  return (
    <section aria-labelledby="notes-label" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <FileText
          size={16}
          style={{ color: "var(--color-text-secondary)" }}
          aria-hidden="true"
        />
        <label
          id="notes-label"
          htmlFor="medical-notes"
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Medical Notes &amp; Allergy List
        </label>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          id="medical-notes"
          name="medical-notes"
          value={value}
          onChange={handleChange}
          rows={5}
          aria-label="Paste medical notes, allergy list, or any relevant text"
          aria-describedby="notes-hint notes-count"
          placeholder="Paste allergy lists, doctor notes, medication details, or describe the situation…"
          className="w-full resize-none rounded-xl px-4 py-3 text-sm transition-all focus:outline-none"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--color-border-bright)",
            color: "var(--color-text-primary)",
            lineHeight: "1.6",
            minHeight: "120px",
          }}
          // When focused, brighten border
          onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--color-border-bright)"; }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p
          id="notes-hint"
          className="text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          Any text input: medication names, allergies, incident description, vital signs
        </p>
        <p
          id="notes-count"
          aria-live="polite"
          aria-atomic="true"
          aria-label={`${remaining} characters remaining`}
          className="text-xs tabular-nums"
          style={{ color: nearLimit ? "var(--color-urgent)" : "var(--color-text-muted)" }}
        >
          {remaining.toLocaleString()} / {maxChars.toLocaleString()}
        </p>
      </div>
    </section>
  );
}
