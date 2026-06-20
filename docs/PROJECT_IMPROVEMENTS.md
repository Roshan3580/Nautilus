# Project Improvements

This document tracks current capabilities, completed work, and a prioritized backlog for Nautilus Email Builder. It is written for portfolio maintenance and interview preparation — what the project demonstrates today and what would come next in a production setting.

---

## Current capabilities

What the project does reliably today:

| Capability | Status | Notes |
|---|---|---|
| Visual block authoring (6 block types) | ✅ | Puck-powered, desktop + mobile viewports |
| Starter templates (Welcome, Newsletter, Promo) | ✅ | One-click switch with editor remount |
| Live HTML preview via shared render pipeline | ✅ | Same `renderEmailHtml()` as send path |
| Send Now through Resend | ✅ | Real delivery when `RESEND_API_KEY` is set |
| Mock send fallback | ✅ | Explicit `mock: true` when key is absent |
| Schedule future sends | ✅ | POST with ISO timestamp validation |
| List and cancel scheduled sends | ✅ | Scheduler panel + REST API |
| Execute due sends | ✅ | `POST /api/schedule/run-due` (manual/cron trigger) |
| Graceful store recovery | ✅ | Corrupt JSON → empty array, auto-seed |
| Partial batch success on run-due | ✅ | Failures collected, others continue |
| Light/dark app chrome | ✅ | Puck canvas forced light for email accuracy |
| Vercel deployment | ✅ | Live demo at email-builder-eight-delta.vercel.app |

What is intentionally out of scope in the demo:

- Temporal worker implementation (packages declared only)
- Automatic cron for due-send execution
- Durable scheduler storage on serverless
- API authentication
- Automated test suite
- Draft persistence beyond scheduled snapshots

---

## Completed improvements

Work already reflected in the current codebase:

- **Shared render pipeline** — `email-render.tsx` centralizes React Email output for preview, send, and scheduled execution
- **SchedulerAdapter boundary** — `scheduler.ts` isolates persistence from API routes and executor
- **Explicit run-due endpoint** — separates queue from execution, making serverless cron wiring obvious
- **Resend mock fallback** — demo-safe send path with visible `mock: true` response field
- **Block ID normalization** — `ensureEmailDataIds()` prevents unstable keys across editor mutations
- **Template system with clean remount** — `puckInstanceKey` prevents stale editor state on template switch
- **Structured API validation** — consistent `parseBody()` helpers with 400/404/500 response shapes
- **Portfolio documentation** — README, architecture doc, and improvement tracker optimized for reviewer context

---

## GitHub settings

Recommended repository configuration for portfolio visibility:

| Setting | Recommendation |
|---|---|
| Repository description | Visual email authoring workflow — shared render pipeline, Resend delivery, scheduler API |
| Topics | `nextjs`, `react-email`, `puck`, `resend`, `email-builder`, `typescript`, `vercel` |
| About website | https://email-builder-eight-delta.vercel.app |
| README image | `screenshots/editor-overview.png` as social preview if using Open Graph |
| Branch protection | Optional for solo portfolio; enable if collaborating |
| Secrets | Store `RESEND_API_KEY` in GitHub Actions secrets if adding CI send tests — never commit |

---

## Screenshots

Maintain these four images in `screenshots/` for README and portfolio links:

| File | Shows |
|---|---|
| `screenshots/editor-overview.png` | Full authoring workflow — compose fields, editor, live preview |
| `screenshots/scheduler-panel.png` | Scheduled email queue and cancel controls |
| `screenshots/newsletter-template.png` | Newsletter template with image and section blocks |
| `screenshots/promo-template.png` | Promo template demonstrating template switching |

Re-capture screenshots when making visible UI changes. Keep dimensions consistent for README layout.

---

## Loom walkthrough

<!-- TODO: Record and link -->

**Placeholder:** Record a 60–90 second Loom covering:

1. Open live demo or local dev
2. Select Newsletter template — show preview update
3. Edit a heading and button — show live preview sync
4. Send Now without Resend — show mock success message
5. Schedule a send for 2 minutes ahead — show scheduler panel
6. (Optional) curl `run-due` and show sent status

Suggested title: *"Nautilus Email Builder — Visual Authoring Workflow in 60 Seconds"*

Embed link here when recorded:

```
[LOOM_URL_PLACEHOLDER]
```

---

## Medium-priority improvements

Ordered by impact for turning the demo into a production-credible system:

### 1. Durable scheduler backend

Replace JSON file store with a Postgres or Redis implementation of `SchedulerAdapter`. Eliminates Vercel `/tmp` data loss and enables reliable queue inspection.

**Effort:** Medium | **Impact:** High for scheduling credibility

### 2. Vercel Cron for run-due

Add `vercel.json` cron entry calling `POST /api/schedule/run-due` every minute. Makes scheduled sends work end-to-end on the live demo without manual curl.

**Effort:** Low | **Impact:** High for demo completeness

### 3. Unified style tokens

Extract shared style constants used by both `puck-config.tsx` canvas renderers and `email-render.tsx` React Email mappers. Reduces preview/canvas drift.

**Effort:** Medium | **Impact:** Medium for render fidelity

### 4. API authentication

Add API key middleware on mutation routes (`POST /api/send`, `POST /api/schedule`, `DELETE`, `run-due`). Prevents public abuse on deployed demo.

**Effort:** Low | **Impact:** Medium for security posture

### 5. Server-side email validation

Validate recipient format in API routes, not just client trim checks. Return 400 with specific field errors.

**Effort:** Low | **Impact:** Low–Medium

### 6. Draft autosave

Persist editor state to localStorage or a drafts API endpoint. Recover work on refresh.

**Effort:** Medium | **Impact:** Medium for UX

### 7. Temporal workflow implementation

Replace JSON scheduler + manual run-due with a Temporal workflow: `schedule → sleep until scheduledAt → send with retry`. Uses already-declared `@temporalio/*` packages.

**Effort:** High | **Impact:** High for workflow architecture story

### 8. Integration tests

Add Playwright or API-level tests for send (mock mode), schedule CRUD, and run-due partial failure. Run in CI on every PR.

**Effort:** Medium | **Impact:** High for engineering credibility

### 9. Move preview render server-side

Call `renderEmailHtml()` from an API route or Server Action instead of client bundle. Reduces client JS and aligns preview with server-only rendering.

**Effort:** Medium | **Impact:** Medium

### 10. OpenAPI spec

Generate or hand-write OpenAPI 3 document for the five API routes. Useful for portfolio API design discussion.

**Effort:** Low | **Impact:** Low–Medium

---

## Resume bullets

Copy-ready bullets emphasizing engineering themes (adjust tense/voice as needed):

- Built a visual email authoring workflow in Next.js where a single `EmailBuilderData` schema feeds live preview, immediate send, and scheduled delivery through one shared React Email render pipeline.
- Designed a REST API with explicit validation, predictable JSON response contracts, and separated concerns across send, queue, cancel, and execute endpoints.
- Integrated Resend for production email delivery with a graceful mock fallback path that keeps demos and CI functional without API secrets.
- Implemented a `SchedulerAdapter` interface with JSON file persistence and a dedicated run-due executor, making scheduler storage swappable and serverless cron boundaries explicit.
- Documented serverless scheduling tradeoffs (ephemeral storage, external cron, no distributed locking) and mapped a production evolution path toward Temporal workflows and durable storage.

---

## Interview stories unlocked

Talking points this project supports in system design and behavioral interviews:

### "Tell me about a time you designed for graceful degradation."

**Story:** Resend integration with mock fallback. Without `RESEND_API_KEY`, the send path returns `{ success: true, mock: true }` instead of failing or silently dropping the request. Scheduled execution treats mock success as sent in demo mode — a conscious tradeoff documented for production gating. Corrupt scheduler JSON recovers to `[]` instead of crashing the app.

**Themes:** Graceful fallback, demo-safe engineering, explicit vs implicit behavior.

### "How would you design an email preview and send system?"

**Story:** Walk through `EmailBuilderData` → `renderEmailHtml()` → three consumers (iframe preview, Resend send, scheduled executor). Explain why Puck canvas HTML is separate from React Email output and how shared style tokens would close the gap in production.

**Themes:** Shared render pipeline, single source of truth, preview/send parity.

### "What are the tradeoffs of scheduling on serverless?"

**Story:** JSON file in `/tmp` on Vercel, no in-app cron, explicit `run-due` endpoint, ephemeral storage loss on redeploy, no distributed lock on concurrent execution. Contrast with Temporal (durable timers, retries, observability) and Vercel Cron as the near-term fix.

**Themes:** Serverless tradeoffs, scheduler boundaries, production evolution.

### "How do you structure APIs for clarity?"

**Story:** Five small routes with `parseBody()` validation, consistent `{ success, message }` shapes, HTTP status codes mapped to validation/not-found/server errors, and thin route handlers that delegate to `lib/` modules.

**Themes:** API design, separation of concerns, predictable contracts.

### "Tell me about a boundary you introduced to keep code swappable."

**Story:** `SchedulerAdapter` interface — demo uses JSON file, production would use Postgres or Temporal activity storage. API routes and UI never import storage details. Same pattern applies to `sendEmail()` as the delivery adapter over Resend.

**Themes:** Workflow architecture, adapter pattern, testability.

### "What would you do differently for production?"

**Story:** Reference the Production evolution section in ARCHITECTURE.md — durable storage, Temporal workflows, API auth, idempotent send, server-side preview render, integration tests, unified style tokens.

**Themes:** Production thinking, prioritization, honest scope management.
