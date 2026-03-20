@AGENTS.md

## CRITICAL — Never change these
- The Gemini model ID in `src/lib/gemini.ts` MUST stay `"gemini-2.5-flash"`. Do NOT change it to any other string (e.g. "gemini-3-flash-preview", "gemini-2.0-flash", etc.). This exact ID is confirmed available on the Vertex AI project `sodium-sublime-490805-t9`.
- All display text referencing the model should read "Gemini 2.5 Flash".
