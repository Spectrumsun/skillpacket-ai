# Testing and acceptance

## Automated checks

From the project root:

```sh
npm --prefix backend test
npm --prefix backend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
```

The suites currently contain **12 backend tests and 10 frontend tests**. Backend tests require permission to bind ephemeral loopback sockets. They use temporary or in-memory databases rather than the running application's data.

Backend coverage includes the HTTP learner/source/job/download flow, malformed and oversized input, authentication, packet byte limits, invalid quizzes, generator failures and mismatched references, restart recovery, every career's graph/generation flow, unsupported careers and legacy roadmap migration.

Frontend coverage includes IndexedDB persistence/removal, packet import validation, multibyte size limits, quiz scoring, safe source links, legacy career identity, isolated service-worker shell/asset behavior, API cache bypass, cache lifecycle, and default/persisted theme preferences.

## Browser smoke check

1. Start `node start.mjs` and use one origin consistently.
2. Check landing-page links and FAQ, select Start learning to enter `/learn`, then open/save the Dart starter packet. Take its quiz, check feedback, mark it studied, and reload. Saved answers and progress should remain.
3. Create a new pathway for each supported career. Verify its title, six milestones, first selected node and work-task connection.
4. Submit a source for a chosen milestone. Observe queued state and a downloaded packet in the local library. Verify references, byte size and development-preview labeling.
5. Check import/export, library search and local removal using disposable test packets.
6. Verify small-screen navigation, forms and reader without horizontal scrolling, keyboard focus, labels and dialog dismissal.
7. Select Mix, Light and Dark from header/Settings. Check controls, reader, quiz feedback and library contrast. Reload and confirm the last selection persists. Theme switching must work without backend connectivity.

## Offline acceptance gate

Use the production preview; the development server does not register the service worker.

1. Wait for app-shell setup and download a packet.
2. Save quiz progress and record the packet's ID.
3. Disconnect the test browser/device from the network. Verify reading and quiz submission while the app remains open.
4. Close the app and reopen without connectivity. The cached shell and packet must load without a server/authentication request.
5. Complete a quiz, close/reopen again, and confirm progress persists.
6. Reconnect; verify no progress loss. Server sync is not implemented and must not be expected.
7. Where supported, install the PWA and repeat the cold-reopen test. With a local English voice, verify audible narration without connectivity.

Record browser, operating system, device, build, connection state and outcomes. Standard-browser/real-device completion is required before claiming full offline-first delivery.

## Recorded evidence and limits

Prior browser checks passed career setup, source generation, packet saving, quiz feedback and progress after online reload. A Solar pathway and its first packet worked, with previous Flutter packets preserved. Small-screen library and reader checks showed no horizontal overflow.

Saved reading and quiz submission succeeded with both services stopped while the app remained open. Cold reload with both services stopped rendered a blank page in the embedded browser, including on a fresh localhost origin. Standard-browser/native-device verification was unavailable during that audit. Isolated service-worker tests pass, but do not override that observed failure.

The historical phase-one audit predates the additional careers and theme work. The maintained current inventory is [Status](STATUS.md). Do not present a previous test count or screenshot as verification of a newer build.
