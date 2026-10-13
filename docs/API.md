# API and packet contract

The maintained request examples, route table, errors and environment settings are in the [backend README](../backend/README.md). The runtime OpenAPI 3.1 contract is available at [the combined launcher's backend](http://127.0.0.1:3101/openapi.json), or `/api/openapi.json` through the frontend proxy.

## Main flow

1. `GET /v1/careers` lists the four supported career titles and descriptions.
2. `POST /v1/learners` creates a learner with one exact supported title.
3. `POST /v1/learners/:id/roadmaps` selects that career's curated template.
4. `POST /v1/sources` stores supplied plain text or a transcript.
5. `POST /v1/packet-jobs` validates roadmap/node/source references and returns 202 with a job polling URL.
6. `GET /v1/jobs/:id` supplies state and, on success, packet ID.
7. `GET /v1/packets/:id/download` returns the complete JSON attachment.

The source endpoint returns metadata without echoing the entire submitted text. The roadmap packet-list endpoint returns metadata and byte sizes rather than every packet body. The development generator is explicitly identified in health responses and generated packets.

## Career names

- `Flutter Mobile Developer`
- `Solar Inverter Technician`
- `Frontend Web Developer`
- `Data Analyst`

Other names are rejected with request validation errors. Use a node ID from the selected roadmap, not a hard-coded Flutter node such as `dart` for every career.

## Packet fields

| Field group | Purpose |
| --- | --- |
| `id`, `version`, `roadmapId`, `nodeId` | Identity and association |
| `title`, `language`, `estimatedMinutes` | Reader metadata; currently English only |
| `objective`, `prerequisites` | Learning target and prior milestones |
| `summary`, `takeaways` | Main content; generated previews contain excerpts |
| `workedExample`, `practicalTask` | Practice content; actual AI teaching is pending |
| `narrationScript` | Text for local device speech |
| `quiz` | Questions, options, valid `correctIndex`, feedback explanations |
| `careerConnection` | A work-task example, not evidence of hiring demand |
| `sources` | Source IDs, titles, optional URLs and locators |
| `generator`, `reviewStatus`, `createdAt` | Provenance and review labeling |

Validation is implemented in `backend/src/schema.ts`; the browser extends the contract to accept the hand-authored starter generator. The serialized packet is strictly below 100,000 UTF-8 bytes. All generated packets remain `unreviewed`.

## Authentication and deployment

When `API_TOKEN` is configured, all routes except `/health` require `Authorization: Bearer <token>`. The launcher passes that token to the backend and server-side Vite proxy. Never place the shared token in client source or a `VITE_` variable. No per-learner authorization currently exists.

The Vite proxy only runs in development/preview; it is not contained in the static `dist` artifact. A production deployment needs an equivalent same-origin proxy to the backend.
