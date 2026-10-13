# Implementation status

Updated 2026-10-13. This is the current project inventory; [earlier phase-one audit evidence](evidence/phase-one-audit.json) predates the three additional career tracks.

## Completed foundation

- TypeScript HTTP API; JSON validation, body limits, structured errors and request IDs.
- Persistent SQLite entities and jobs; embedded worker, restart recovery and atomic packet publication.
- Four six-node curated pathways, exposed through `GET /v1/careers`: Flutter Mobile Developer, Solar Inverter Technician, Frontend Web Developer and Data Analyst.
- Career-specific objectives, prerequisites and work-task connections; selected career stored on each roadmap.
- Legacy backend roadmaps recover career identity; older browser roadmaps default to their original Flutter identity.
- Text/transcript ingestion with attribution metadata. Text-file attachments are read in the browser and submitted as JSON text.
- Development source-preview generation; schema and strict UTF-8 packet size checks.
- Roadmap and packet APIs, generation status polling, packet download and OpenAPI documentation.
- Landing page at `/` with workflow, careers, FAQ and honest preview limitations; learning workspace at `/learn`.
- Responsive dashboard, career picker, milestone selection, source form, reader, quizzes, library search and settings.
- IndexedDB packet/session/job/progress storage; import/export and device removal.
- PWA manifest, local icons and versioned service-worker app-shell cache.
- Conditional local-device English narration and install guidance.
- Mix (original), Dark and Light themes; header and Settings controls; device preference persistence.
- Combined launcher and project/component documentation.

## Partial or not yet verified

| Area | What exists | Gap |
| --- | --- | --- |
| AI learning packets | Valid source previews with expected fields | No model calls, grounded teaching synthesis, generated examples or subject-specific assessment |
| Personalization | Career selection and stored preferences | Fixed pathway nodes; no adaptation by experience, time or region |
| Offline operation | Saved reading and quizzes work with services stopped | Cold reload failed in the embedded browser; standard-browser/installed-device acceptance remains pending |
| PWA install | Manifest, icons and browser guidance | Actual installation and installed-app cold reopening not verified |
| Speech | Selection of local English voices | Audible playback without connectivity not verified |
| Opportunity mapping | Work-task examples in each milestone | No verified local hiring evidence or job feed |
| Multiple pathways | New pathway creation; older packets remain in the library | No saved-pathway switcher or multi-pathway dashboard |
| Authentication | Shared optional service token | No learner identity, ownership checks or isolation |
| Progress | Saved on one device | No server sync or cross-device recovery |

## Pending features

PDF text extraction; separate scanned-document OCR; source-grounded AI lessons; content review; adaptive roadmaps; local opportunity evidence; YouTube retrieval; open-resource discovery; additional languages; server progress sync; learner authentication/authorization; rate limits and quotas; retry/idempotency; retention/deletion controls; production deployment; multi-process database/worker design; accessibility/device validation.

## Verification record

- Latest feature suite: **12 backend tests + 10 frontend tests = 22 passing tests**.
- Backend TypeScript check and frontend TypeScript/production build passed.
- API generation demo produced a 1,994-byte preview packet.
- Browser checks verified career setup, source submission, generation, downloads, quiz feedback, and progress after reload.
- Theme checks confirmed Mix, Light and Dark render, and Dark persists after reload. Landing career cards open the matching preselected setup; browser Back returns to the landing page.
- Solar selection survived reload; its milestone picker and first-node packet generation worked. Existing Flutter packets remained in the library.
- Mobile library and reader fit a small viewport without horizontal overflow during prior browser checks. Landing-page mobile layout and theme controls were checked during the latest work.
- With both application services stopped, the open app could read a saved lesson and submit quiz answers.
- Cold reload with both services stopped displayed a blank page in the embedded browser, including on a fresh localhost origin. This remains a failed observed check, not a proven cross-browser root cause.

Passing automated tests does not establish complete product acceptance. The application is a development foundation; first-phase sign-off remains blocked by real AI lessons, PDF ingestion, and offline reopening verification.
