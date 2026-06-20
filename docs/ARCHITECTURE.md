# Architecture

This document describes how Nautilus Email Builder implements a **visual email authoring workflow** — from structured editor state through a shared render pipeline to immediate and scheduled delivery.

---

## System overview

Nautilus is a single-page Next.js application with four logical layers:

```text
┌─────────────────────────────────────────────────────────────┐
│  Authoring UI (page.tsx + Puck + chrome)                    │
│  - Block editing, templates, compose fields, scheduler UI   │
└──────────────────────────┬──────────────────────────────────┘
                           │ EmailBuilderData JSON
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Shared render pipeline (email-render.tsx)                  │
│  - Block → React Email components → HTML via @react-email   │
└──────────────┬──────────────────────────────┬─────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│  Live preview (iframe)   │   │  Delivery (email-send.ts)    │
│  Client-side render      │   │  Resend API or mock fallback │
└──────────────────────────┘   └──────────────┬───────────────┘
                                              │
                                              ▼
                               ┌──────────────────────────────┐
                               │  Scheduler (scheduler.ts)    │
                               │  JSON adapter + run-due exec │
                               └──────────────────────────────┘
```

**Source of truth:** `EmailBuilderData` — a typed JSON document `{ content: EmailBlock[] }` produced by Puck and passed unchanged through preview, send, and schedule APIs.

**Key design principle:** API routes are thin validators; business logic lives in `lib/` modules with explicit adapter boundaries for delivery and scheduling.

---

## Editor architecture

### Puck as the authoring engine

The editor is built on [Puck](https://puckeditor.com/) (`@puckeditor/core`). Configuration lives in `src/lib/puck-config.tsx`.

| Concern | Implementation |
|---|---|
| Block schema | Six block types: Heading, Text, Button, Image, Section, Container |
| Field types | `text`, `textarea`, `number`, `select` — no custom rich-text editors in app code |
| Categories | typography, content, layout |
| Viewports | 600px desktop, 390px mobile |
| Undo/redo | Puck history via `createUsePuck()` |
| Block library UI | Custom drawer override in `puck-block-library-ui.tsx` |
| ID normalization | `ensureEmailDataIds()` in `puck-data.ts` on every change |

### Canvas vs output renderers

Puck block `render` functions draw **browser HTML** with inline styles for a responsive authoring experience. This is intentionally separate from the React Email output path.

```text
Authoring canvas (puck-config.tsx render fns)
  → Plain HTML elements for WYSIWYG editing

Output pipeline (email-render.tsx renderBlock)
  → @react-email/components for email-client-safe HTML
```

Styles are duplicated in parallel helpers (`headingStyle`, `textStyle`, etc.) in both files. This is a known tradeoff: Puck canvas fidelity vs React Email compatibility. Production evolution would extract shared style tokens.

### Template switching

Templates are defined in `src/lib/templates.ts` as `{ id, name, subject, data }` records. Switching templates in `page.tsx`:

1. Deep-clones template `data` via `cloneData()`
2. Sets `subject` from template defaults
3. Increments `puckInstanceKey` to remount Puck cleanly
4. Resets send state

Available starters: **Welcome Email**, **Newsletter**, **Promo**.

### UI chrome

`src/components/builder/chrome.tsx` provides the navbar, recipient/subject compose fields, send and schedule actions, and theme toggle. Theme preference persists in `localStorage` under `nautilus-theme`. The Puck canvas is forced to light mode via `.puck-light-scope` CSS so email preview colors stay accurate regardless of app theme.

---

## Render pipeline

The shared render pipeline is the architectural center of the project. Every delivery path converges on `renderEmailHtml()`.

### Module: `src/lib/email-render.tsx`

| Export | Role |
|---|---|
| `renderBlock(block)` | Maps each `EmailBlock` discriminated union member to a React Email component |
| `EmailDocument({ data, subject })` | Wraps blocks in `<Html>`, `<Head>`, `<Preview>`, 600px `<Container>` |
| `renderEmailHtml(data, subject)` | Calls `@react-email/render` and returns HTML string |

### Consumers

| Consumer | Location | Trigger |
|---|---|---|
| Live preview | `page.tsx` `useEffect` | Editor state or subject change → iframe `srcDoc` |
| Send Now | `email-send.ts` `sendEmail()` | `POST /api/send` |
| Scheduled execution | `scheduler-executor.ts` `runDueScheduledEmails()` | `POST /api/schedule/run-due` |

All three call the same function with the same `EmailBuilderData` payload. This is what guarantees preview/send parity — not the Puck canvas, which is authoring-only.

### Block mapping

Each Puck block type maps 1:1 to a React Email primitive:

| Block type | React Email component |
|---|---|
| Heading | `<Heading>` |
| Text | `<Text>` |
| Button | `<Button>` |
| Image | `<Img>` |
| Section | `<Section>` |
| Container | `<Container>` |

Props (alignment, colors, padding, URLs) are passed through from block props to component props with parallel style computation.

---

## Send flow

```text
User clicks Send Now
        │
        ▼
page.tsx handleSend()
  - Validates recipient + subject (client)
  - POST /api/send { to, subject, data }
        │
        ▼
send/route.ts
  - parseBody(): validates to, subject, data.content is array
  - Calls sendEmail()
        │
        ▼
email-send.ts sendEmail()
  1. renderEmailHtml(data, subject)
  2. Read RESEND_API_KEY
        │
        ├── Key absent ──► { success: true, mock: true, message: "Dev mode..." }
        │
        └── Key present ──► Resend.emails.send({ from, to, subject, html })
                              ├── Success: { success: true, id }
                              └── Failure: { success: false, message }
```

### Resend integration

- Client: `resend` npm package v6
- From address: `process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"`
- HTML body: output of shared render pipeline — never hand-authored in the route
- Error handling: try/catch wraps Resend call; errors surface as `{ success: false, message }` with HTTP 500 from the route

### Graceful fallback

When `RESEND_API_KEY` is not set, `sendEmail()` returns `{ success: true, mock: true }` with an explicit message. The API still returns HTTP 200. This keeps local development, CI, and portfolio demos functional without secrets while making the simulated path visible in the response payload.

---

## Schedule flow

Scheduling is split into three concerns with explicit boundaries:

```text
Queue (POST /api/schedule)
  → scheduler.schedule() → persist ScheduledEmail

List / Cancel (GET / DELETE)
  → scheduler.list() / scheduler.cancel()

Execute (POST /api/schedule/run-due)
  → runDueScheduledEmails()
       → scheduler.listDue(now)
       → sendEmail() per item
       → scheduler.markSent(id) on success
```

### SchedulerAdapter interface

Defined in `src/lib/scheduler.ts`:

```typescript
type SchedulerAdapter = {
  list: () => Promise<ScheduledEmail[]>;
  schedule: (input: ScheduleEmailInput) => Promise<ScheduledEmail>;
  cancel: (id: string) => Promise<ScheduledEmail | null>;
  listDue: (now?: Date) => Promise<ScheduledEmail[]>;
  markSent: (id: string) => Promise<ScheduledEmail | null>;
};
```

The demo implements `localScheduler` — a JSON file adapter. Swapping to Postgres, Redis, or Temporal activity storage means implementing this interface without touching API routes or UI code.

### ScheduledEmail record

```typescript
{
  id: string;
  to: string;
  subject: string;
  data: EmailBuilderData;      // Full editor state snapshot
  scheduledAt: string;         // ISO 8601
  status: "scheduled" | "cancelled" | "sent";
  createdAt: string;
  updatedAt: string;
}
```

Cancel is a soft delete — status becomes `"cancelled"`, record is retained.

### Storage paths

| Environment | Path |
|---|---|
| Local dev | `{cwd}/.data/scheduled-emails.json` |
| Vercel | `/tmp/nautilus-email-builder/scheduled-emails.json` |

`ensureStore()` creates the directory and seeds an empty array. `readAll()` returns `[]` on corrupt or non-array JSON.

### Executor: `runDueScheduledEmails()`

Located in `src/lib/scheduler-executor.ts`:

1. Calls `scheduler.listDue(now)` — filters `status === "scheduled" && scheduledAt <= now`
2. Iterates sequentially (no parallelism in demo)
3. Calls `sendEmail()` for each item
4. On success: `scheduler.markSent(id)`
5. On failure: pushes to `failed[]`, continues remaining items
6. Returns `{ processed, sent, failed }`

Mock sends (`mock: true`) count as success and are marked sent — appropriate for demo, worth gating in production.

### Serverless tradeoffs

| Issue | Demo reality |
|---|---|
| No background worker | `run-due` is API-only; nothing polls automatically |
| Ephemeral `/tmp` | Scheduled data lost on Vercel redeploy or cold start |
| No distributed lock | Concurrent `run-due` calls could race on the same item |
| No retry/backoff | Failed sends appear in `failed[]` with no automatic retry |
| Temporal packages unused | `@temporalio/*` in dependencies signals production intent, not current behavior |

---

## Template system

Templates are static starter documents, not a CMS or database-backed catalog.

**File:** `src/lib/templates.ts`

| ID | Name | Default subject | Block highlights |
|---|---|---|---|
| `welcome` | Welcome Email | Welcome to Nautilus | Heading, Text, Button |
| `newsletter` | Newsletter | This week at Nautilus | Heading, Image, Section, Button |
| `promo` | Promo | Limited-time offer | Container, Heading, Text, Button |

Each template exports a full `EmailBuilderData` snapshot. Template selection replaces editor state entirely — there is no merge or partial apply. This keeps the mental model simple: template = starting document.

Production evolution would add template versioning, user-saved drafts, and server-side template storage.

---

## API surface

All routes live under `src/app/api/` and return JSON.

| Method | Path | Handler responsibility |
|---|---|---|
| `POST` | `/api/send` | Validate payload → `sendEmail()` |
| `GET` | `/api/schedule` | `scheduler.list()` sorted by `scheduledAt` |
| `POST` | `/api/schedule` | Validate future `scheduledAt` → `scheduler.schedule()` |
| `DELETE` | `/api/schedule/[id]` | `scheduler.cancel(id)` → 404 if missing |
| `POST` | `/api/schedule/run-due` | `runDueScheduledEmails()` |

### Validation patterns

- All POST bodies parsed through `parseBody()` helpers with try/catch → 400 on invalid shape
- Schedule POST requires `scheduledAt` strictly in the future (`timestamp > Date.now()`)
- Send POST requires non-empty trimmed `to` and `subject`; `data.content` must be an array
- No authentication middleware — demo scope only

### Response contract

Success responses always include `success: true` plus domain fields. Errors include `success: false` and a human-readable `message`. HTTP status codes: 200 success, 400 validation, 404 not found, 500 server error.

---

## Design decisions

### Why a shared render pipeline matters

Email builders fail when preview HTML diverges from sent HTML. By routing preview, send, and scheduled execution through `renderEmailHtml()`, Nautilus guarantees output parity. The Puck canvas is a separate authoring concern — it optimizes editing UX, not delivery fidelity.

### Why SchedulerAdapter exists

Scheduling persistence and execution are different problems. Queueing is a write-heavy CRUD concern; execution is a time-triggered side effect with failure semantics. The adapter interface lets the demo use a JSON file while production swaps in durable storage and a workflow engine — without rewriting routes.

### Why run-due is explicit

In serverless, you cannot rely on a long-running process to wake up and send emails. Separating queue (`POST /api/schedule`) from execution (`POST /api/schedule/run-due`) mirrors how Vercel Cron, AWS EventBridge, or Temporal schedules would trigger work in production. The demo makes that boundary visible instead of hiding it behind a fake in-process timer.

### Why mock send is first-class

Portfolio projects and CI pipelines should not require secrets to demonstrate the full workflow. Mock mode returns HTTP 200 with `mock: true` — never a silent no-op and never a crash. Reviewers can trace the code path and see where real Resend integration begins.

### Why Temporal is declared but not implemented

`@temporalio/client`, `worker`, `workflow`, and `activity` packages are in `package.json` to document the intended production scheduler: durable timers, automatic retries, workflow observability, and decoupled workers. Implementing a full Temporal deployment in a demo repo would add infra complexity without improving the core authoring story. The adapter boundary is the architectural proof point.

---

## Production evolution

A production deployment of this workflow would evolve along these axes:

### Render pipeline

- Extract shared style tokens used by both Puck canvas and React Email renderers
- Move preview rendering server-side or to a Web Worker to avoid bundling `@react-email/render` in client JS
- Add HTML inlining and linting (e.g., `@react-email/preview` or Maizzle) before send

### Delivery

- Verified sender domains and bounce webhook handling via Resend
- Idempotency keys on send to prevent duplicate delivery
- Rate limiting and recipient validation

### Scheduling

- Replace JSON file with Postgres or Redis implementing `SchedulerAdapter`
- Wire `run-due` to Vercel Cron (`vercel.json`) or external scheduler
- Implement Temporal workflow: `scheduleActivity` → `waitUntil(scheduledAt)` → `sendActivity` with retry policy
- Add distributed lock or lease semantics before `markSent`
- Separate mock success from real delivery in status transitions

### API and security

- Authentication (API keys or session) on all mutation routes
- Request logging and structured error reporting
- OpenAPI spec generated from route handlers

### Authoring

- Nested block drop zones for Section/Container children
- Draft autosave to durable storage
- Template versioning and user-created templates
- Collaborative editing (operational transform or CRDT on `EmailBuilderData`)

The current codebase is a deliberate slice: enough to demonstrate workflow architecture, shared rendering, API design, and honest serverless constraints — with clear seams for production hardening.
