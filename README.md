# Aegis Bridge — Precision in Chaos

> **"Zero Cognitive Load When It Matters Most"**
>
> A Gemini-powered emergency triage system that acts as a Universal Bridge between messy real-world inputs (voice, photos, medical documents) and structured, life-saving emergency actions.

---

## Live Demo

🚀 **Live App:** `https://aegis-bridge-[hash]-uc.a.run.app` *(deployed to Cloud Run)*
📁 **GitHub:** `https://github.com/PavitarSinghArneja/promptwars`

---

## The Problem

In an emergency, cognitive load is lethal. A panicked bystander has:
- A phone with a camera and a microphone
- Chaotic, unstructured information: a shouted description, a photo of a medication bottle, scribbled allergy notes
- Zero time to structure any of it

Emergency services need **structured** data: triage level, medications, allergies, vitals. The gap between what bystanders *have* and what paramedics *need* costs lives.

**Aegis Bridge closes that gap in seconds.**

---

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MESSY REAL-WORLD INPUTS                  │
│  Voice recording  │  Drag-drop photos  │  Medical text notes│
└──────────────────────────────┬──────────────────────────────┘
                               │
                   ┌───────────▼───────────┐
                   │   Next.js API Route   │  ← Server-side only
                   │   /api/triage         │  ← API key never exposed
                   │   Input Validation    │  ← Sanitization + rate limit
                   └───────────┬───────────┘
                               │
                   ┌───────────▼───────────┐
                   │  Vertex AI Gemini     │
                   │  2.0 Flash            │  ← Multimodal
                   │  (image+audio+text)   │  ← temp=0.1 (deterministic)
                   └───────────┬───────────┘
                               │
              ┌────────────────▼─────────────────────┐
              │           STRUCTURED OUTPUTS          │
              │  ER Handover Card  │  Bystander       │
              │  (name, allergies, │  Checklist       │
              │   meds, vitals,    │  (numbered steps) │
              │   triage level)    │                  │
              └──────────────────────────────────────┘
                               │
                   ┌───────────▼───────────┐
                   │   Google Maps API     │  ← Server proxy
                   │   Nearest Hospital   │  ← By specialty
                   │   + Directions ETA   │
                   └───────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router) + TypeScript |
| **Styling** | Tailwind CSS v4 + custom emergency design system |
| **AI** | Google Vertex AI — Gemini 2.0 Flash (multimodal) |
| **Auth** | Firebase Authentication (Google Sign-In) |
| **Database** | Cloud Firestore (triage report persistence + RLS) |
| **Maps** | Google Maps Platform — Places API + Directions Embed |
| **Deployment** | Google Cloud Run (containerised, auto-scaling) |
| **Testing** | Jest (17 unit tests) + Playwright (E2E) |

---

## Key Features

### Multi-Modal Input Engine
- **Voice**: `MediaRecorder` API with real-time waveform visualisation → base64 audio passed to Gemini
- **Images**: Drag-and-drop with file type/size validation, image previews, base64 export (max 4 images, 10MB each)
- **Text**: Auto-expanding medical notes textarea with character count

### Gemini 2.0 Flash Processing
- Server-side API route — API key **never** reaches the browser
- Multimodal prompt: image parts + audio part + text → single inference call
- `temperature: 0.1` for deterministic, reproducible medical output
- Strict JSON output schema with markdown fence stripping
- Input sanitisation: MIME allowlist, base64 validation, size guards, rate limiting

### ER Handover Card
- Patient name, age, allergies, medications, vital signs
- Triage level badge: 🔴 CRITICAL (pulse animation) / 🟠 URGENT / 🟡 STANDARD / 🟢 MINOR
- Copy-to-clipboard with formatted plain-text output
- Print-ready layout via `window.print()`

### Bystander Checklist
- Large-text, high-contrast numbered first-aid steps
- Urgency tags: **NOW** / **SOON** / **MONITOR**
- Interactive checkboxes with progress bar and completion banner
- Keyboard navigable with `aria-pressed` state

### Hospital Routing
- Auto-geolocation via browser Geolocation API on mount
- Specialty-aware hospital search (triage result `recommendedSpecialty` → Places keyword)
- Google Maps Directions embed with ETA (server-side key proxy)
- External navigation link to Google Maps

### Security
- All Google API keys server-side only (Next.js API routes)
- Input sanitisation: control character stripping, MIME allowlists, 20MB size limit
- Rate limiting: 10 requests/IP/minute sliding window (env-configurable)
- Firestore RLS: users can only read/write their own records, immutable after create
- HTTP security headers: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Permissions-Policy`

### Accessibility (a11y)
- Skip-navigation link (visually hidden, focus-activated)
- Semantic HTML landmarks: `<header role="banner">`, `<main role="main">`, `<nav>`, `<footer role="contentinfo">`
- ARIA labels on all interactive elements
- `role="alert"` + `aria-live="assertive"` for errors
- `role="status"` + `aria-live="polite"` for system state
- Keyboard navigation throughout (focus rings, `tabIndex`, `aria-pressed`, `aria-busy`)
- Screen-reader announcements for recording state, upload count, step completion, progress

---

## Local Development

### Prerequisites
- Node.js ≥ 20
- Google Cloud project with Vertex AI API enabled
- Firebase project with Authentication + Firestore enabled
- Google Maps API key with Places API + Maps Embed API enabled

### Setup

```bash
git clone https://github.com/PavitarSinghArneja/promptwars.git
cd promptwars
npm install
```

Edit `.env.local` with your API keys (template already in repo):

```bash
# Required
GOOGLE_GEMINI_API_KEY=your_key
GOOGLE_MAPS_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
# ... (see .env.local for full list)
```

```bash
npm run dev          # http://localhost:3000
npm test             # 17 Jest unit tests
npm run build        # Production build check
```

---

## Deployment — Google Cloud Run

```bash
gcloud auth login
gcloud config set project sodium-sublime-490805-t9

gcloud run deploy aegis-bridge \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --project sodium-sublime-490805-t9 \
  --port 8080
```

---

## Assumptions

1. **Audio input**: Gemini 2.0 Flash accepts `audio/webm` directly. Fallback: ElevenLabs ASR transcription.
2. **Rate limiting**: In-memory per Cloud Run instance. Production: replace with Redis/Cloud Memorystore.
3. **Geolocation**: Requires HTTPS (Cloud Run provides automatically).
4. **Triage output**: AI-generated — not a substitute for certified medical assessment.
5. **Firebase**: Client SDK only (no Admin SDK needed for this scope).

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── triage/route.ts      # Gemini inference endpoint
│   │   └── hospitals/route.ts   # Google Places proxy
│   ├── layout.tsx               # Root layout + AuthProvider + skip-nav
│   ├── page.tsx                 # Home page with all sections
│   └── globals.css              # Emergency design system (tokens, glass, badges)
├── components/
│   ├── Header.tsx               # Auth-aware sticky nav
│   ├── DropZone.tsx             # Image drag-and-drop + validation
│   ├── AudioRecorder.tsx        # Voice recording + waveform
│   ├── TextInput.tsx            # Medical notes textarea
│   ├── TriageWorkspace.tsx      # Input orchestration + /api/triage call
│   ├── HandoverCard.tsx         # ER handover output (printable)
│   ├── BystanderChecklist.tsx   # Interactive first-aid steps
│   ├── TriageResults.tsx        # Results wrapper with scroll + reset
│   ├── HospitalMap.tsx          # Geolocation + Maps embed + hospital list
│   ├── TriageBadge.tsx          # Triage level color indicator
│   ├── ErrorBoundary.tsx        # React error boundary with retry
│   └── SkeletonCard.tsx         # Loading placeholder
└── lib/
    ├── gemini.ts                # Vertex AI Gemini 2.0 Flash client
    ├── rateLimit.ts             # Sliding-window in-memory limiter
    ├── triageSchema.ts          # Shared TypeScript types
    └── firebase/
        ├── client.ts            # Firebase client SDK singleton
        ├── AuthContext.tsx      # Auth state React context
        └── firestoreService.ts  # Triage report CRUD
```

---

## Evaluation Rubric

| Criterion | Score Target | Implementation |
|-----------|-------------|----------------|
| **Code Quality** | Max | TypeScript throughout, modular components, JSDoc comments, DRY schema types |
| **Security** | Max | Server-side keys, input sanitisation, rate limiting, Firestore RLS, security headers |
| **Efficiency** | Max | `temp=0.1` fast inference, Places 5-min cache, `useCallback` memoisation, debounced waveform |
| **Testing** | Max | 17 Jest unit tests (schema + rate limiter) + Playwright E2E (keyboard, a11y, input) |
| **Accessibility** | Max | Skip-nav, ARIA landmarks, live regions, focus rings, keyboard nav, semantic HTML |
| **Google Services** | Max | Vertex AI Gemini, Firebase Auth, Cloud Firestore, Google Maps Platform, Cloud Run |
| **Problem Alignment** | Max | Voice + image + text → structured triage + hospital routing |
