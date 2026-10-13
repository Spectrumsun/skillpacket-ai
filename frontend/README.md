[Project overview](../README.md) · [Current status](../docs/STATUS.md) · [Architecture](../docs/ARCHITECTURE.md)

# SkillPacket web PWA

React + TypeScript + Vite frontend for the SkillPacket backend in the sibling `../backend` directory. Requires Node.js 24 or newer. The web interface supports mobile and desktop browsers.

## Run the whole app

Install dependencies in both `backend` and `frontend` with `npm ci`, then run the launcher from the SkillPacket project root:

```sh
node start.mjs
```

It builds the frontend, starts the backend on port **3101**, and serves the production PWA at **http://127.0.0.1:4173/**. Ctrl+C stops both child processes. Existing saved backend records use `backend/data/skillpacket.sqlite`.

For frontend development with live reload:

```sh
node start.mjs --dev
```

Development opens on **http://127.0.0.1:5173/**. The service worker is deliberately disabled in development so old bundles do not interfere with live changes. Use the production preview for offline testing.

`SKILLPACKET_BACKEND_PORT` overrides the launcher's backend port. `API_TOKEN`, if set, is passed to the backend and to the server-side frontend proxy; it is never embedded in the client bundle. Keep this development instance local: the backend currently has a shared token, not learner-level authentication.

### Run separately

Backend, from `../backend`:

```sh
PORT=3101 npm start
```

Frontend, from this directory:

```sh
npm ci
npm test
npm run build
BACKEND_URL=http://127.0.0.1:3101 npm run preview
```

The frontend's standalone default proxy points at `http://127.0.0.1:3001` to match the backend's original default. Override `BACKEND_URL` if that port belongs to a different service. No CORS changes are needed; `/api` is proxied by Vite in development and preview.

## What works

- A public landing page at `/` with project introduction, career cards, workflow, FAQ and links into `/learn`.
- A responsive learning dashboard, offline library, preferences screen, and six-node roadmaps for Flutter Mobile Developer, Solar Inverter Technician, Frontend Web Developer, and Data Analyst.
- Mix (original), Dark and Light themes with header/Settings controls and a saved device preference.
- A hand-authored introductory Dart packet that can be explored before backend setup.
- A career picker that selects the backend's corresponding curated pathway and stores learner preferences.
- Notes/transcript input, including `.txt`, `.srt`, and `.vtt` attachments; optional source links.
- Durable backend generation jobs, local tracking, polling, and automatic packet download into IndexedDB. Pending jobs resume after reopening when the backend is available.
- Packet reading, takeaways, examples, practical tasks, attribution, and quiz feedback.
- Quiz answers and study completion stored on the current device.
- Offline packet storage with schema validation and the same strict <100,000 UTF-8 byte limit as the backend.
- Packet JSON import/export, local deletion, and library search.
- Device speech using local English voices only. The Listen button is unavailable when there is no suitable local voice.
- Web app manifest, PNG icons, install guidance, and a versioned service worker that precaches the app shell and static assets.

The API contract is reused from `../backend/src/schema.ts`; keep the frontend and backend directories together.

## Try the learning flow

1. Open `/`, select Start learning to enter `/learn`, then open and save the starter packet.
2. Take its quiz, check answers, and mark the packet as studied.
3. Reopen the reader: answers and study progress remain on this device.
4. Select **Set up my pathway** or **New pathway**, choose one of the four careers, and supply a region and study goal.
5. Select **Create a packet**, paste a source, and wait for the offline library to update.

The current backend uses a development extractor. Generated packets are clearly labeled source previews and are unreviewed; their quiz checks the preview's status, not career skill mastery. The starter packet is hand-authored and also marked unreviewed. Each pathway is a fixed career-specific template, not an AI-personalized curriculum. Saved packets remain in the library when a new pathway is created. Solar content prepares learners for supervised training; it does not qualify them for practical electrical work. Region is recorded without claiming verified regional job demand.

## Offline behavior

The production service worker precaches `index.html`, compiled JavaScript/CSS, and local icons. Navigation uses the cached shell; API requests bypass caching. Packets, profile/roadmap, pending job IDs, and quiz progress live in IndexedDB. Source text is submitted only when creating a new packet. Progress does not sync to a server yet.

A build derives the cache version from the contents of the built assets. Updates install a new cache and activate after old tabs close. Close all SkillPacket tabs and reopen to pick up a new production build. The Offline app shell status is Ready only after a cached shell is found. Browser storage may still be cleared by the user or operating system; JSON export provides a manual backup.

For a real-device offline check, load the production preview, save a packet, and wait for the app shell to be Ready in Settings. Turn on airplane mode, close/reopen the app, open the saved packet, and take a quiz. Reconnect and confirm the quiz progress remains. HTTPS is required for deployment; loopback localhost is supported for development.

## Validation

`npm test` runs ten tests covering IndexedDB persistence/removal, import validation, UTF-8 size limits, quiz scoring, unsafe source links, cached shell/asset responses, API cache bypass, cache lifecycle, and theme preference behavior. `npm run build` type-checks and generates the production bundle and precache manifest.

Browser checks verified landing-page navigation, career-card preselection, three theme palettes and theme persistence, and the real pathway/source/job/download flow, saved quiz results after reloading, library/reader layouts on a small viewport without horizontal overflow, and unavailable local-voice behavior. Cold reload with the local preview server stopped did not render in the embedded Codex browser; a standard-browser/real-device airplane-mode check remains necessary. The isolated service-worker tests pass. Do not treat those unit tests as completed device validation.

## Deployment boundary

This is a local app build. A static frontend deployment needs a same-origin `/api` reverse proxy to the backend plus HTTPS. Vite's development/preview proxy is not included in `dist`. Do not embed the shared backend API token in browser JavaScript. PDF/OCR, YouTube retrieval, live AI generation, server progress sync, and learner authentication remain backend follow-up work.

The initial app shell is larger than a learning packet. The <100KB budget applies to each JSON packet, not to installation assets or source uploads. System fonts and local illustrations keep the UI free of remote font/image downloads.
