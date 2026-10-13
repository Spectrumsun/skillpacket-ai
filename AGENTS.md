# SkillPacket development guidance

## Read before changing code

Read `README.md`, `docs/STATUS.md`, and the relevant component README. Use `docs/ROADMAP.md` for planned work and `docs/ARCHITECTURE.md` for contracts. User instructions take precedence over this file. `AGENTS.md` is canonical; `Agent.md` and `adgent.md` point here.

## Repository structure and runtime

- Project root contains `backend/`, `frontend/`, `docs/`, and `start.mjs`.
- Node.js 24+ is required. Backend runs TypeScript directly using native stripping and native SQLite.
- Frontend uses React, TypeScript and Vite. Keep both component folders together: the frontend imports `../../backend/src` from its source files.
- Use `node start.mjs` for production preview or `node start.mjs --dev` for frontend hot reload. Combined backend port is 3101; web preview is 4173; development frontend is 5173.
- Backend alone defaults to 3001. Configure the frontend proxy accordingly; do not accidentally connect to another service using that port.
- Docker: `docker compose up --build -d --wait` starts the healthy backend before the Nginx frontend at localhost:8080. Build contexts must remain the project root for sibling imports. Keep the backend internal, token server-side, and SQLite in its persistent named volume. Never use `down -v` to troubleshoot existing data.
- Put intermediate work outside the deliverable code when a workspace scratch directory is available. Do not commit `node_modules`, build output, SQLite files, secrets, or local logs.

## Implementation contracts

- Authoritative career catalog: `backend/src/careers.ts`. Add a title to `careerNames` and a matching definition in `careers`; verify unique node IDs and prerequisites referencing earlier nodes.
- Authoritative backend schemas: `backend/src/schema.ts`. Frontend contract adaptation: `frontend/src/model.ts`.
- Preserve roadmap `targetCareer` and the fallback for legacy Flutter records. Preserve existing packets and progress when extending schemas or storage.
- Serialized packets must be strictly **under 100,000 UTF-8 bytes**. Measure bytes in code; never rely on a generation prompt or character count.
- Validate quiz indices and generated roadmap, milestone, and source references before publication.
- Store packet publication and job success atomically. Keep SQLite processing to one owning service process per database file.
- Keep API calls behind the same-origin `/api` proxy. Backend URLs and shared service tokens belong in server environment variables, not browser bundles or `VITE_` variables.
- Save local changes only after IndexedDB transaction completion. Do not label a packet saved if the write failed.
- Cache the app shell and assets with the service worker; keep API mutations outside shell caching. Service-worker unit tests do not establish real-device offline behavior.
- Use local speech voices for offline narration and provide a readable fallback when no suitable voice exists.
- Persist presentation preferences locally without changing packet schemas or requiring backend connectivity.

## Product accuracy

The generator currently extracts source previews and makes no AI calls. Do not describe it as AI summarization, verified teaching, or a mastery assessment. Career pathways are curated templates; learner region/experience/time are not yet used to personalize nodes. `marketEvidence: null` means no current local hiring evidence is verified.

Solar material prepares learners for supervised training. Keep the pathway's supervision guidance; do not invent credentials, practical qualification, or unsupervised electrical procedures.

Do not claim first-phase completion while AI lessons, PDF ingestion and cold offline reopening remain unresolved. Keep implemented features, proposed features and verification limits separate in the docs.

## Verification and handoff

For backend behavior changes: run `npm --prefix backend test` and `npm --prefix backend run typecheck`. For frontend behavior changes: run `npm --prefix frontend test` and `npm --prefix frontend run build`. Validate cross-component changes end to end where tooling permits. Use meaningful tests for contracts, persistence, recovery and failure paths; documentation-only edits need link/command checks rather than repeated application testing.

For offline changes, use the production build, verify downloaded packets and quiz persistence, then test closing/reopening without connectivity. Record browser/device and limitations. The last embedded-browser cold-reload check failed; do not silently treat that as a pass.

Update component READMEs and `docs/STATUS.md` when behavior changes. Update `docs/ROADMAP.md` when scope or acceptance criteria change. Preserve historical audit evidence and mark it as a snapshot rather than rewriting it as a current sign-off. Report what changed, how it was checked, and material limitations.

Do not delete or reset SQLite databases, browser storage, saved packets, or user progress as a shortcut to fix compatibility. Do not publish, initialize a remote repository, or send data to others unless the user's task authorizes it.
