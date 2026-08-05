<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e49c9acc-f83c-4098-b993-2715318ccc45

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Known vulnerabilities

`npm audit --omit=dev` reports **6 moderate** vulnerabilities as of the `react-router@^8.3.0` + `firebase-admin@^14.2.0` upgrade. These are accepted transitives of the required `firebase-admin` SDK:

- `uuid` <11.1.1 (GHSA-w5hq-g745-h8pq), pulled in via `gaxios` / `teeny-request` / `google-gax`
- `@google-cloud/storage`, `retry-request`, `teeny-request`, `gaxios`, `firebase-admin` themselves, all flagged only through the `uuid` advisory above

There is no upstream fix without breaking changes; `firebase-admin` is required for server-side auth (`verifyIdToken`) and quota tracking (`Firestore`), so these are accepted and monitored. The previous high-severity `react-router` RSC-mode CSRF advisory (GHSA-qwww-vcr4-c8h2) is resolved by the upgrade to `react-router@8.3.0`.
