# Development and operations

## Setup

Run commands from the SkillPacket project root. Node.js 24+ is required.

```sh
npm --prefix backend ci
npm --prefix frontend ci
node start.mjs --dev
```

Development landing page: `http://localhost:5173/`; learning workspace: `/learn`. Production preview: `node start.mjs`, then `http://localhost:4173/`. The launcher builds first, starts both services, and stops both on Ctrl+C or when a service exits.

## Configuration

Export variables in your shell. Example files document the settings; copying them to `.env` is not a documented substitute for exporting the values read through `process.env` in the current configuration.

| Variable | Scope | Current default / behavior |
| --- | --- | --- |
| `SKILLPACKET_BACKEND_PORT` | Combined launcher | `3101` |
| `HOST` | Backend alone | `127.0.0.1`; launcher forces loopback |
| `PORT` | Backend alone | `3001`; launcher sets its selected port |
| `DATABASE_PATH` | Backend | `./data/skillpacket.sqlite`, relative to backend working directory |
| `API_TOKEN` | Backend / launcher | Optional on loopback; non-loopback hosting requires at least 24 characters |
| `BACKEND_URL` | Frontend alone | `http://127.0.0.1:3001`; launcher supplies its backend address |
| `BACKEND_API_TOKEN` | Frontend proxy | Shared server-side token, when needed |
| `API_URL` | Backend demo script | `http://127.0.0.1:3001` |

Do not commit secrets. There are no implemented AI-provider environment variables yet.

## Individual component commands

Backend: `npm --prefix backend start`, `npm --prefix backend run dev`, `npm --prefix backend test`, `npm --prefix backend run typecheck`.

The default backend data path is relative to the process working directory. The combined launcher sets it to `backend/`; when running through `npm --prefix backend`, npm runs the package script in its package directory.

Frontend: `npm --prefix frontend run dev`, `npm --prefix frontend run build`, `npm --prefix frontend run preview`, `npm --prefix frontend test`.

A separately started backend on 3101 requires `BACKEND_URL=http://127.0.0.1:3101` when starting the frontend. The backend demo on that port requires `API_URL=http://127.0.0.1:3101 npm --prefix backend run demo`.

## Extend a pathway

Edit `backend/src/careers.ts`: add an exact title to `careerNames` and its definition to `careers`. Provide stable, unique milestone IDs, objectives, work tasks and prerequisite IDs pointing to earlier milestones. The schema, API catalog and frontend picker share these definitions. Add meaningful catalog/generation tests and update documentation. Preserve old IDs when changing an existing pathway so stored packet associations remain valid.

## Themes

Mix is the original design. Light and Dark are explicit palettes controlled from the header and Settings. Preferences are stored locally under `skillpacket-theme`; theme changes do not call the backend. Keep the pre-render preference handling in `frontend/index.html` aligned with `frontend/src/themes.ts`. Test all three palettes on forms, reader, quiz feedback, library cards and mobile navigation.

## Persistence and backups

Run one backend service per SQLite file. Do not start multiple replicas sharing this database. Stop the backend before making a straightforward file copy backup; running WAL-mode backups require a consistent SQLite backup procedure including outstanding journal state. Never reset data merely to fix a schema mismatch.

Browser packets and progress are separate from server records. Export packet JSON before clearing browser storage. Export does not currently provide a complete progress/account backup. Removing a packet also removes its locally saved quiz progress.

## Troubleshooting

- **Address already in use:** stop only the process you own, or choose another backend port with `SKILLPACKET_BACKEND_PORT`. Frontend ports are strict; change Vite configuration if needed.
- **Unavailable learning service:** verify the proxy points to SkillPacket, not another service on 3001; check `/api/health` for `status: ok` and its development-generator label.
- **Changes absent in the production app:** service-worker updates activate after old app tabs close. Close/reopen the app after a completed build. Use development mode for normal source edits.
- **Library appears empty:** ensure you used the same hostname and port. `localhost` and `127.0.0.1` have different browser stores.
- **Offline app is blank:** this happened in embedded-browser cold-reload testing and is unresolved. Do not assume cached-shell readiness proves successful installed launch. Follow the acceptance procedure in Testing.
- **Listen unavailable:** the device needs a local English voice. Reading and quizzes remain usable.
- **Source rejected:** submit plain text or a transcript, 40–200,000 characters, and an HTTP(S) attribution URL if supplied. PDF/YouTube extraction is not implemented.
- **Theme resets:** browser storage may be disabled or cleared. Mix is the fallback.

## Deployment boundary

Vite preview is for local verification. Production deployment needs HTTPS, a same-origin API proxy, user authorization, quotas, appropriate persistence/worker deployment, and operational monitoring. These are pending features, not properties of the existing launcher.
