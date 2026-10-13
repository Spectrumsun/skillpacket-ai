[Project overview](../README.md) · [Current status](../docs/STATUS.md) · [Architecture](../docs/ARCHITECTURE.md)

# SkillPacket AI backend

Runnable TypeScript backend foundation for the first SkillPacket learning flow. Requires Node.js 24 or newer (native TypeScript stripping and `node:sqlite`). No external database or AI credentials are needed to run the local demo.

## Run

For containers, run `docker compose up --build -d --wait` from the project root. Compose runs this API internally on port 3001, persists SQLite in a named volume, and waits for backend health before starting the frontend on `http://localhost:8080/`. See [Docker operations](../docs/DEVELOPMENT.md#docker-compose). The Docker database is separate from the local database.

From this directory:

```sh
npm ci
npm run typecheck
npm test
npm start
```

The API listens on `http://127.0.0.1:3001`. In another terminal, run the complete learner-to-packet demo:

```sh
node --experimental-strip-types scripts/demo.ts
```

The demo creates a learner, a Flutter roadmap, a text source, and a generation job; polls completion; and verifies the downloadable packet. Each invocation creates new resources.

## Implemented

- Strict request schemas, structured errors, and request IDs.
- Learner creation with career, region, experience, and daily study time.
- Four curated six-node pathways: Flutter Mobile Developer, Solar Inverter Technician, Frontend Web Developer, and Data Analyst. Each has prerequisites and career tasks.
- Text and transcript ingestion, optional source URL, source provenance.
- SQLite persistence, queued background processing, failed-job states, restart recovery.
- Atomic packet publication and job completion.
- Packet schema validation, valid quiz answer indices, and a strict **less than 100,000 UTF-8 bytes** size limit.
- JSON packet retrieval, metadata listing, and downloadable JSON.
- Optional shared bearer token; required for non-loopback hosting.
- HTTP integration tests and storage/worker tests.

## API

All POST bodies below use `Content-Type: application/json`. When `API_TOKEN` is configured, include `Authorization: Bearer <token>` on every route except health.

| Method | Route | Result |
|---|---|---|
| GET | `/health` | Health and active generator |
| GET | `/openapi.json` | OpenAPI 3.1 contract |
| GET | `/v1/careers` | Supported careers and pathway descriptions |
| POST | `/v1/learners` | Create learner (201) |
| POST | `/v1/learners/:id/roadmaps` | Create curated roadmap (201) |
| GET | `/v1/learners/:id/roadmaps` | List learner roadmaps |
| GET | `/v1/roadmaps/:id` | Roadmap and nodes |
| POST | `/v1/sources` | Store text/transcript; return metadata (201) |
| POST | `/v1/packet-jobs` | Queue generation (202 + Location header) |
| GET | `/v1/jobs/:id` | Job status, packet ID, or sanitized error |
| GET | `/v1/roadmaps/:id/packets` | Packet metadata and byte sizes |
| GET | `/v1/packets/:id` | Complete packet |
| GET | `/v1/packets/:id/download` | Packet JSON attachment |

Create a learner:

```json
{
  "targetCareer": "Flutter Mobile Developer",
  "region": "Lagos, Nigeria",
  "experience": "beginner",
  "minutesPerDay": 15
}
```

Create a source:

```json
{
  "title": "Dart fundamentals",
  "kind": "text",
  "text": "Dart variables hold values. Functions organize reusable logic. Collections group related values for processing.",
  "language": "en"
}
```

`kind` may also be `transcript`. `url` is optional metadata; this service never fetches that URL. Source text must contain 40–200,000 characters. JSON requests are capped at 850,000 bytes.

Queue a packet:

```json
{
  "roadmapId": "<roadmap UUID>",
  "nodeId": "dart",
  "sourceId": "<source UUID>"
}
```

Job lifecycle: `queued → running → succeeded | failed`. Poll the URL in the response's `Location` header. A successful job supplies `packetId`. Create a new job to retry a failed one. There is no automatic retry or request idempotency yet.

Errors use `{ "error": { "code", "message", "requestId" } }`, with field issues for validation errors. Status codes include 400 for malformed JSON, 401 for authentication, 404 for missing resources/routes, 413 for oversized requests, 415 for content type, and 422 for validation.

## Configuration

See `.env.example`. Export variables in the shell; `.env` is not automatically loaded.

- `HOST`: defaults to `127.0.0.1`.
- `PORT`: defaults to `3001`.
- `DATABASE_PATH`: defaults to `./data/skillpacket.sqlite` relative to the working directory.
- `API_TOKEN`: optional on loopback. Non-loopback hosting requires at least 24 characters. It is a shared service token, not learner authentication.
- `API_URL`: demo script only, defaults to `http://127.0.0.1:3001`.

One process must own a database file. The embedded worker recovers interrupted jobs when the service restarts. Do not run multiple replicas against the same file. PostgreSQL and separately leased workers are the next step for concurrent deployments. Preserve the entire database directory when backing up a running WAL database, or stop the service before copying the database.

## Current boundaries

**This is a backend foundation, not the complete AI product.** The development adapter extracts an excerpt and creates a clearly labeled preview. Its quiz checks the preview's status; it does not assess subject mastery. It does not generate real teaching examples, validate source relevance, or make AI calls. Packets are unreviewed. Replace `PacketGenerator` in `src/generator.ts` with a source-grounded teaching implementation before a learner pilot.

Roadmaps are fixed templates selected by career. Region, experience, and study time are stored for future personalization. Career connections describe work tasks; `marketEvidence: null` means there is no verified local hiring evidence. English and the four catalog careers are supported. `targetCareer` is saved on each roadmap; legacy roadmaps recover their career identity at database startup.

PDF parsing/OCR, YouTube retrieval, discovery, instructor review, learner authentication/authorization, server progress syncing, and retention controls are not implemented. Source uploads contain extracted text, not binary documents. The web PWA, IndexedDB storage, quizzes, and device speech are implemented in the sibling frontend; cold offline reopening and audible offline speech still require device verification. A packet's size excludes the app download and source ingestion.

The shared token gates the whole service; it does not isolate learners. Keep this instance local or behind a trusted development gateway until learner-level authorization, rate limits, and quotas are added. No CORS policy is enabled; use a same-origin frontend proxy initially.

## Validation

`npm test` covers the complete HTTP lifecycle, source/relationship validation, malformed and oversized requests, authentication, multibyte packet limits, invalid quizzes, generation failure, mismatched references, and restart recovery. Tests use temporary databases and ephemeral loopback ports.
