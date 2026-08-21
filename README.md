# OpenFolio AI

**AI-powered portfolio generator**: a guest-only web app that interviews you and builds a
premium, personalized portfolio website. Built with React 19 SPA + Express API (deployed as a Vercel
serverless function), powered by **Google Gemini API** (`gemini-2.0-flash`), Firebase for anonymous auth & storage, and
Cloudinary for image uploads.

> **AI Attribution**: This project integrates with the **Google Gemini API** via the official `@google/genai` SDK for intelligent portfolio generation and interactive chat-based revisions. It is not an independently trained proprietary AI model.

- No accounts, no sign-up: visitors get a silent anonymous session and start building immediately.
- Server-enforced daily quotas prevent API abuse.
- MIT licensed and ready to self-host.

## Features

- **Guided Studio Workspace**: Step-by-step section builder (Navbar, Hero, About, Skills, Projects, Career, Contact).
- **AI Layout Intelligence**: Structured, truth-preserving rendering with dynamic visual behavior, typography balance, and theme styling.
- **Interactive AI Chat Revisions**: Ask for changes in plain natural language; the AI edit pipeline merges revisions cleanly into your live portfolio data.
- **Realtime Cockpit Preview**: Live responsive preview rendered in a sandboxed iframe.
- **Publish & Share**: Get a fast public URL (`/p/{slug}`) hosted directly from Firestore.
- **Uploads & Exports**: Profile image uploads via Cloudinary and clean standalone HTML/Tailwind CSS download.
- **Daily Quota**: 5 generates and 7 edits per user per day.

## Architecture

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│  Browser (React 19 SPA)     │      │  Vercel                      │
│  - Firebase Web SDK         │◄────►│  - /api/* → api/index.ts     │
│  - Gemini via API routes    │      │    (Express serverless fn)   │
└─────────────────────────────┘      │  - /* → dist (static SPA)    │
                                     └──────────────┬───────────────┘
                                            ┌───────┴────────┐
                                            │  Firebase       │
                                            │  - Anonymous    │
                                            │    Auth         │
                                            │  - Firestore    │
                                            │    (usage +     │
                                            │     portfolios) │
                                            │  - Cloudinary   │
                                            │  - Gemini API   │
                                            └─────────────────┘
```

- **Client**: React 19 + React Router 8 + Vite 6. Firebase Anonymous Auth for the session,
  Firestore to read quota and published portfolios.
- **Server**: Express, bundled by Vercel from `api/index.ts`. Verifies Firebase ID tokens,
  enforces quotas and rate limits, proxies Gemini, handles uploads, and renders/publishes HTML.
- **Deployment**: `vercel.json` rewrites all `/api/*` to the serverless function and serves
  the SPA from `dist`; security headers (CSP, `frame-ancestors 'none'`, nosniff) are applied.

## Local setup

**Prerequisites:** Node.js `>=22.22.0` (see `.nvmrc`).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Set the required values in `.env.local`:
   - `GEMINI_API_KEY`: your [Google AI Studio](https://aistudio.google.com/app/apikey) key.
   - Firebase client config: **either** copy `firebase-applet-config.example.json` to
     `firebase-applet-config.json` and fill in your Firebase web config, **or** set the
     `VITE_FIREBASE_*` variables in `.env.local`. (The real `firebase-applet-config.json`
     is gitignored; the example is committed.)
   - Firebase Admin service account: `FIREBASE_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`,
     `FIREBASE_ADMIN_PRIVATE_KEY` (needed for authenticated API endpoints; see below).
   - Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

4. Run the dev server (Express + Vite middleware on `http://localhost:3001`):

   ```bash
   npm run dev
   ```

### Config precedence

The client picks its Firebase web config in this order:

1. `VITE_FIREBASE_*` env vars (custom project), if `VITE_FIREBASE_API_KEY` is set;
2. `firebase-applet-config.json` (auto-provisioned AI Studio / local file);
3. If neither exists (or the config lacks a `projectId`), the module logs a clear warning and
   the app renders a "Firebase belum dikonfigurasi" notice instead of mounting. It never
   crashes at import. Configure one of the above to enable auth and Firestore.

## Deploy to Vercel

1. Push the repository to GitHub and import it in the Vercel dashboard (or use the CLI:
   `vercel`). The framework preset is picked up automatically; `vercel.json` is included.
2. Set the following environment variables in **Vercel → Project → Settings → Environment
   Variables**:

   | Variable | Required | Notes |
   |---|---|---|
   | `GEMINI_API_KEY` | Yes | Gemini API key. |
   | `FIREBASE_PROJECT_ID` | Yes | Firebase Admin service account `project_id`. |
   | `FIREBASE_ADMIN_CLIENT_EMAIL` | Yes | Firebase Admin service account `client_email`. |
   | `FIREBASE_ADMIN_PRIVATE_KEY` | Yes | Service account private key (quoted; `\n` escaped). |
   | `VITE_FIREBASE_API_KEY` | Yes | Firebase web config `apiKey` (client-side). |
   | `VITE_FIREBASE_AUTH_DOMAIN` | Yes | e.g. `your-project.firebaseapp.com`. |
   | `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase web config `projectId`. |
   | `VITE_FIREBASE_STORAGE_BUCKET` | Yes | e.g. `your-project.appspot.com`. |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase web config `messagingSenderId`. |
   | `VITE_FIREBASE_APP_ID` | Yes | Firebase web config `appId`. |
   | `CLOUDINARY_CLOUD_NAME` | Recommended | Required for `/api/upload`. |
   | `CLOUDINARY_API_KEY` | Recommended | Required for `/api/upload`. |
   | `CLOUDINARY_API_SECRET` | Recommended | Required for `/api/upload`. |
   | `CORS_ORIGIN` | No | Comma-separated allowed origins. Defaults to `http://localhost:3001`. |
   | `APP_URL` | No | Reserved; the public URL of the deployment. Not currently read by the server. |

   > The `VITE_FIREBASE_*` variables are what make the client work on Vercel, since the
   > gitignored `firebase-applet-config.json` is not present in a fresh clone. There is no
   > runtime secret in them: Firebase web config is public by design.

3. Deploy. Vercel runs `vite build` and bundles `api/index.ts` as the serverless function.

## Firebase setup

1. Create a project at <https://console.firebase.google.com>.
2. **Enable Anonymous Auth**: Authentication → Sign-in method → *Anonymous* → Enable. This
   powers the silent guest session (no email/password UI).
3. **Deploy Firestore rules**: deploy the included `firestore.rules` file, either with the
   Firebase CLI:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules
   ```

   or by pasting the contents into Firestore → Rules in the console. The rules allow public
   reads of published portfolios, owner-only writes to `portfolios`, and read-only `usage`.

4. **Create a service account** (for `firebase-admin` server-side auth & quota): Project
   settings → Service accounts → *Generate new private key*. Use the JSON's `project_id`,
   `client_email`, and `private_key` as `FIREBASE_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`,
   and `FIREBASE_ADMIN_PRIVATE_KEY`.

5. **Add the web app** (for the client config): Project settings → General → *Your apps* →
   Add web app. Use its config values either in `firebase-applet-config.json` (copy the
   example file) or as `VITE_FIREBASE_*` env vars.

## Cloudinary setup

1. Create a free account at <https://cloudinary.com>.
2. Copy the **Cloud name**, **API key**, and **API secret** from the dashboard into the
   corresponding `CLOUDINARY_*` variables.
3. Uploads are stored under the `openfolio` folder. If `CLOUDINARY_API_KEY` is unset, the
   upload endpoint returns `503` ("Upload belum dikonfigurasi").

## Gemini setup

1. Get an API key at <https://aistudio.google.com/app/apikey>.
2. Set it as `GEMINI_API_KEY`. If it is missing, the server logs a warning and all AI
   endpoints return `503` ("AI belum dikonfigurasi").

## Default daily quota

Per user, enforced server-side in Firestore and reset daily (UTC):

| Operation | Limit / day |
|---|---|
| Generate | 5 |
| Edit | 7 |

When a limit is reached the API returns `429` and the UI shows a notification. The remaining
quota is displayed in the app's Settings page.

## API endpoints

All routes except `GET /api/health` require an `Authorization: Bearer <Firebase ID token>`
header. The ID token comes from the client's Firebase Anonymous Auth session.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Liveness probe: `{ "status": "ok" }`. |
| POST | `/api/pdf/parse` | ✅ | Multipart `file` (PDF, ≤ 2 MB). Returns `{ "text": string }`. |
| POST | `/api/upload` | ✅ | Multipart `file` (JPG/PNG/WebP, ≤ 2 MB). Uploads to Cloudinary. Returns `{ "url": string }`. |
| POST | `/api/gemini/generate` | ✅ | Generate portfolio JSON. Body: `{ messages?, selectedTemplate?, structuredData? }`. Returns the portfolio object. |
| POST | `/api/gemini/edit` | ✅ | Revise portfolio JSON. Body: `{ currentData, userMessage, history? }`. Returns `{ explanation, data }`. |
| POST | `/api/portfolio/inject` | ✅ | Render portfolio HTML (used by the live preview). Body: `{ data }`. Returns HTML string. |
| POST | `/api/portfolio/publish` | ✅ | Publish a public portfolio. Body: `{ data, slug? }`. Returns `{ url: "/p/{slug}" }`. |

Rate limits: `/api/gemini/*` 15 req/min, `/api/upload` + `/api/pdf/parse` 10 req/min,
`/api/portfolio/publish` 5 req/min (per IP). Upload body is limited to 5 MB via
`express.json` and files to 2 MB.

## Author

@miqdadbadjuber

## License

[MIT](LICENSE) © 2026 Miqdad Badjuber
