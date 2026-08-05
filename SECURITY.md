# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Instead, report them privately.

- Open a [GitHub security advisory](https://github.com/miqdadbadzubair-design/openfolio/security/advisories/new)
  (preferred), or
- Email the maintainers at the address listed on your GitHub profile.

Please include:

- The affected version(s) and dependency, if known
- A description of the vulnerability and its impact
- Steps to reproduce, or a minimal proof-of-concept
- Any suggested fix, if you have one

You should receive an acknowledgement within 5 business days. We will coordinate a
disclosure timeline with you and will credit you for the finding unless you prefer to
stay anonymous.

## Supported versions

Only the latest commit on `main` is supported. Releases are not produced yet; please
always deploy from the latest `main`.

## Security model

- **Guest-only access.** No accounts or login UI. Clients authenticate silently with
  Firebase **Anonymous Auth**; server endpoints verify the ID token (`verifyIdToken`)
  before doing any work.
- **Server-enforced daily quotas** (`generate` 5, `edit` 7, `chat` 15) are enforced in
  Firestore, not on the client, so quota cannot be bypassed by editing local state.
- **Rate limiting** per IP on AI, upload, and publish endpoints (`express-rate-limit`).
- **Uploads** are capped at 2 MB, validated by magic bytes (JPG/PNG/WebP), and stored via
  Cloudinary — never executed.
- **CSP** and clickjacking protection (`frame-ancestors 'none'`) are applied in `vercel.json`.
- **Portfolio rendering** is sandboxed in an opaque-origin iframe with `sandbox` attributes.

## Dependencies with accepted residual vulnerabilities

`npm audit --omit=dev` reports **6 moderate** vulnerabilities as of the
`react-router@^8.3.0` + `firebase-admin@^14.2.0` upgrade. These are **accepted transitives**
of the required `firebase-admin` SDK:

| Package | Advisory | Severity | Reason accepted |
|---|---|---|---|
| `uuid` <11.1.1 | GHSA-w5hq-g745-h8pq | Moderate | Pulled in transitively via `gaxios` / `teeny-request` / `google-gax`. No upstream fix without breaking changes to `firebase-admin`. |
| `@google-cloud/storage` | (via `uuid` above) | Moderate | Flagged only through the `uuid` advisory; required transitively by `firebase-admin`. |
| `retry-request` | (via `uuid` above) | Moderate | Flagged only through the `uuid` advisory; required transitively by `firebase-admin`. |
| `teeny-request` | (via `uuid` above) | Moderate | Flagged only through the `uuid` advisory; required transitively by `firebase-admin`. |
| `gaxios` | (via `uuid` above) | Moderate | Flagged only through the `uuid` advisory; required transitively by `firebase-admin`. |
| `firebase-admin` | (via `uuid` above) | Moderate | Required for server-side auth (`verifyIdToken`) and quota tracking (Firestore). |

**Rationale for accepting:** there is no upstream fix without breaking changes, and
`firebase-admin` is required for the app's security model (ID-token verification and
server-enforced quotas). These residuals are monitored on every CI run via
`npm audit --omit=dev --audit-level=high` (moderate findings do not fail CI, but they are
visible in logs and reviewed on upgrade).

The previous high-severity `react-router` RSC-mode CSRF advisory (GHSA-qwww-vcr4-c8h2)
is **resolved** by the upgrade to `react-router@8.3.0` (the only patched line).

If any of these advisories gains a non-breaking upstream fix, upgrade promptly. To check
the current state locally:

```bash
npm audit --omit=dev
```
