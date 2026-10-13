# Development roadmap

These are proposed delivery stages with acceptance criteria, not promised dates. The original product vision is broader than the implemented foundation.

## Phase 1: Complete the learning MVP

### Already built

Local API and PWA; four curated career pathways; text/transcript ingestion; persistent jobs; packet validation/download; local library, quizzes and progress; basic app-shell caching.

### Remaining priorities

1. **Grounded teaching generator.** Replace the development adapter with an AI provider behind `PacketGenerator`. Select source passages for a milestone; retain locators; generate explanations, examples, practical exercises, narration and subject-specific quiz feedback. Validate references, schema and byte size. Add provider failure handling and generation cost measurement.
2. **PDF ingestion.** Extract text from text-based PDFs with file/page limits and source locators. Keep scanned PDFs as an explicitly separate OCR path. Support a local-extraction approach where practical; document actual upload/download data costs.
3. **Offline acceptance.** Investigate the observed cold-reload failure. Verify cache control, app updates, packet storage, installed launch, quiz persistence and recovery on standard browsers and representative phones. Resolve failures before advertising full offline reopening.
4. **Content quality review.** Add an instructor review flow and distinguish draft, reviewed and published material. Assess whether a source supports the lesson objective. Electrical-trade content requires qualified review and supervision boundaries.

### Sign-off gate

A learner can choose a supported career, attach a supported source, receive a source-grounded packet under 100,000 UTF-8 bytes, download it, close/reopen without internet, complete a meaningful quiz, and reconnect without losing progress. Test on a specified browser/device. Do not count a status-check preview quiz as a subject assessment.

## Phase 2: Pilot-ready product

- Learner identity and authorization; isolate records by owner.
- Review a complete curriculum for one pilot career/region.
- Use experience, study time and prerequisites to adapt pacing and milestones.
- Manage and switch saved pathways rather than overwriting the current session only.
- Sync progress through an offline outbox with clear conflict rules.
- Add retry/idempotency, quotas, retention/deletion and operational visibility.
- Improve accessibility, source error states, download feedback and storage recovery.
- Verify installation and local speech on target devices.

### Pilot gate

Run a small learner pilot with reviewed content. Measure packet completion, practical task outcomes, actual total data consumption, generation cost, failure rates and device usability. Local data persistence and user authorization must work under interrupted connections.

## Phase 3: Broader resource and opportunity support

- YouTube transcript retrieval with explicit availability and permission fallbacks.
- Open-access resource discovery with source quality, attribution and access metadata.
- OCR with a separate bandwidth/cost budget.
- Reviewed regional competency catalogs and dated market evidence.
- Additional careers and languages, validated for teaching quality and device speech availability.

### Evidence gate

Every claim about local opportunity links to reviewed, dated evidence. Discovery failures are visible. Unsupported source types do not silently fall back to invented teaching content.

## Phase 4: Production operations and scale

- HTTPS deployment and a same-origin API proxy; secrets remain server-side.
- PostgreSQL or another documented multi-process persistence strategy.
- Separately leased workers, bounded concurrency and provider budgets.
- Deployment/recovery monitoring, secure backups and tested restoration.
- Security/privacy review and load testing appropriate to the intended audience.
- Reliability checks under unstable networks and low-memory devices.

## Decisions to make before implementation

AI provider and budget; PDF extraction strategy; first reviewed pilot career/region; target browsers/devices; learner authentication approach; hosting environment; source retention policy. These choices are pending and should not be presented as existing configuration.
