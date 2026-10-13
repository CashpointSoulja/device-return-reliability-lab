# Walkthrough production and review

Ayo Ahmed - Independent concept

I planned a 105-second vertical walkthrough of the working return flow. This package is a recording handoff, not completed footage. No public HTTPS demo has been observed in this run: deployment needs appropriately scoped Cloudflare authentication for the new Worker and SQLite Durable Object. Without that host, I cannot record the required public application. A voice recording has not been supplied either. I have not watched or listened to a completed walkthrough.

The capture source rejects HTTP, localhost and private-network hosts. It records actual browser actions against the supplied public URL, a visible cursor, the loaded HTTPS address, screenshots, an action manifest and observed synthetic server-state summaries. Each scene checks its expected API status; mismatched state stops the capture. It checks that every visible dialog control fits the 540 × 960 recording viewport. The final composition is 1080 × 1920 at 30 frames per second. The application stays labelled “Unofficial concept. Synthetic data. No live integrations.” throughout; all people, evidence and messages are synthetic.

## Storyboard and complete narration

Each scene is 15 seconds. The action timestamps are in [scenes.json](../recording/scenes.json). They are intentional narration timing, not waits used to make domain tests pass. If real actions exceed their allocated scene time, capture stops; I must revise the timing or rerecord rather than pretend an action happened.

| Time | Actual screen and actions | Spoken narration |
| --- | --- | --- |
| 0–15s | Show disclaimer. Attempt the zero-capacity slot. Choose the remaining slot, book and confirm. | I built this independent concept to explore reliable device returns. Everything is synthetic. Booking depends on supplier capacity: the full slot rejects this attempt, so I reserve the remaining slot and confirm it. |
| 15–30s | Advance the explicit simulation clock beyond notification cooldown. Trigger missed pickup. Show supplier-owned next action/deadline. Replay the supplier event and retry the employee notice; inspect unchanged outbox and suppression log. | Now the supplier misses pickup. The exception has a supplier owner, a recovery action and a deadline. This visible outbox never sends messages. Replaying the same event leaves its deduplicated messages unchanged. |
| 30–45s | Rebook the same return into available capacity, confirm, inspect SLA explanation and immutable audit. | I rebook into available capacity. The old reservation releases exactly once, and the return keeps its audit history. The service deadline is explainable from remaining time and missed events, with an owner who can act. |
| 45–60s | Try collection with no condition proof. Show rejection. Explicitly choose matching synthetic custody and distinct condition evidence; collect. | Collection requires a matching synthetic custody identifier and condition evidence. Missing proof is rejected. I enter distinct demonstration labels. This evidence describes a simulated handoff, and the application accepts no personal uploads. |
| 60–75s | Try mismatched receipt evidence and show rejection. Submit the continuous receipt custody and clear condition evidence. Show readiness rejection without wipe, then submit allowlisted synthetic wipe attestation. | Receipt needs a separate handoff record and a continuous custody chain. Incorrect identifiers cannot progress. Condition problems route to repair or quarantine. A wipe is only a synthetic attestation, and it requires receipt first. |
| 75–90s | Mark the recovered return redeploy-ready. Make its idle hold decision with explicit owner and rationale; show age and gates. | With custody, condition and wipe prerequisites satisfied, this recovered return becomes ready to redeploy. Holding a returned device idle is also an explicit decision, with its own owner, rationale and age. Nothing silently becomes available. |
| 90–105s | Run executable scenarios, inspect expected/actual results for a real case, show total honestly. Reload to show persistent isolated session state. | These scenarios execute the same domain rules as the app. Inspect the expected and actual invariants, including capacity races, duplicate events and missing evidence. Reload preserves this isolated session. The question is which exception needs action next. |

## Reproduce against a real public host

1. Deploy this repository to the new Cloudflare Worker only after valid scoped authentication is available. Open the real public HTTPS URL and verify the actual application loads anonymously. Do not substitute a local server, mock footage or screenshots.
2. Install project dependencies; the capture requires Chromium at `/usr/bin/chromium` or an explicit `CHROMIUM_PATH`, and inherits the environment’s HTTPS/HTTP proxy without logging credentials. Confirm the recording viewport is supported, including evidence, booking and idle dialogs. Capture begins in a fresh visitor-isolated session; reset is scoped to that session only.
3. Record each scene's narration as a WAV: `work/recording/voices/book.wav`, `exception.wav`, `recovery.wav`, `collection.wav`, `receipt.wav`, `decision.wav`, `results.wav`. Each voice take must fit its 15-second scene with at least 0.2 seconds remaining. Use Ayo's spoken takes or another properly authorized voice; no voice service is assumed.
4. Run `node recording/capture.mjs https://ACTUAL_PUBLIC_HOST recording/scenes.json work/recording/capture`. Check that the capture manifest records the observed public URL, successful HTTP response and every completed scene. Failed actions stop the recording and remain failures.
5. Inspect `work/recording/capture/raw.webm`. Find the exact first-scene start timestamp after browser loading and supply it to `python recording/compose.py --start-offset SECONDS`. The script normalizes the entire sparse source video to constant 30 fps **before** trimming and composition, pads spoken takes to scene duration, normalizes voice level and exports `work/recording/walkthrough.mp4`.
6. Inspect every scene's beginning, middle and end frames in `work/recording/capture/composition/`. Then watch the entire exported video with sound. Review transitions, all dialog controls, cursor alignment, spoken claims, actual test results and the opening disclaimer. The generated `review-handoff.json` stays pending until this full watch/listen happens.

I keep output outside the committed app in ignored `work/`. The sources and narration are reproducible; neither creates evidence automatically, changes scenario assertions, nor synthesizes successful app results.

## Release handoff

Recording status: **blocked, no final MP4**. Public-host status: **not deployed or observed**. Voice status: **narration script complete; spoken takes missing**. Full watch/listen status: **not performed; explicit handoff to Ayo required**.

Ayo must watch and listen to the full completed export, inspect every scene and boundary, and approve it before any outreach. Future outreach uses **Demo + Walkthrough only**, with no repository link. This build sends no outreach, role application or social message.
