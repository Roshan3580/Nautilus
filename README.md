# Nautilus Email Builder

Take-home submission: a drag-and-drop marketing email builder on Next.js App Router, Puck, React Email, and Resend.

**Live demo:** [email-builder-eight-delta.vercel.app](https://email-builder-eight-delta.vercel.app)  
**Source (Vercel deploy):** [github.com/Roshan3580/email-builder](https://github.com/Roshan3580/email-builder)

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy the example file for local development:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Enables real sends through Resend. If missing, `/api/send` returns a successful mock response so the UI flow still works. |
| `RESEND_FROM_EMAIL` | Sender address. Defaults to `onboarding@resend.dev`. |

Restart the dev server after editing `.env.local`.

**Vercel:** add the same variables under Project → Settings → Environment Variables, then redeploy. Do not commit secrets.

### Verification

```bash
npm run lint
npm run build
```

## Deployed demo behavior

- The hosted app is the same codebase as this repo (deployed from `email-builder` on Vercel).
- **Send Now** uses Resend when `RESEND_API_KEY` is set in Vercel; otherwise it returns mock success with an explicit message (no crash, no silent failure).
- **Schedule / cancel** work against the server-side JSON store. Due emails are sent by calling `POST /api/schedule/run-due` (not automatic on Vercel — see scheduling execution below).
- On Vercel’s serverless runtime, scheduled data is ephemeral per instance — fine for demoing the API and UI, not for durable production scheduling (see limitations below).

## Features

**Tier 1**

- Puck editor: Heading, Text, Button, Image, Section, Container
- Editable props: content, colors, font size, padding, alignment, image URLs, links
- Live preview synced to editor state
- Send with recipient, subject, and inline status feedback

**Tier 2**

- Desktop / mobile preview widths (600px / 390px)
- Schedule date-time picker, scheduled list, cancellation
- `POST /api/schedule`, `GET /api/schedule`, `DELETE /api/schedule/[id]`
- `POST /api/schedule/run-due` — execute due scheduled sends

**Tier 3**

- Undo / redo (toolbar + `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`)
- Starter templates: Welcome Email, Newsletter, Promo
- Dark mode on app chrome; Puck canvas and email preview stay light

## Architecture

```
Puck editor state (JSON)
        ↓
src/lib/puck-config.tsx     — block schema, defaults, canvas render
src/lib/email-render.tsx    — map blocks → React Email components → HTML
        ↓
Live preview iframe + /api/send
```

**Why two render paths in Puck?** Puck’s canvas uses inline React for editing. Preview and send both call `renderEmailHtml()` so what you preview is what Resend receives.

**Key files**

| Path | Role |
|------|------|
| `src/app/page.tsx` | UI shell: compose bar, Puck, preview, schedule panel |
| `src/lib/puck-config.tsx` | Puck component definitions and field schema |
| `src/lib/email-render.tsx` | React Email render pipeline |
| `src/lib/templates.ts` | Starter template data + subjects |
| `src/lib/scheduler.ts` | Scheduling adapter (swappable) |
| `src/lib/scheduler-executor.ts` | Finds due jobs and sends them |
| `src/lib/email-send.ts` | Shared Resend send used by Send Now and scheduler |
| `src/app/api/send/route.ts` | Send Now HTTP handler |
| `src/app/api/schedule/*` | Schedule CRUD + run-due execution |

## Resend sending

Both **Send Now** and scheduled execution call `sendEmail()` in `src/lib/email-send.ts`:

1. Render HTML via `renderEmailHtml(data, subject)`.
2. If `RESEND_API_KEY` is set → `resend.emails.send()`.
3. If not → mock success with an explicit message (no crash).

Send Now posts to `/api/send`. The scheduler executor reuses the same function.

## Scheduling and execution

Scheduling goes through a small adapter in `src/lib/scheduler.ts`:

```ts
list() | schedule(input) | cancel(id) | listDue(now?) | markSent(id)
```

Storage is `.data/scheduled-emails.json` locally, `/tmp` on Vercel. Status values: `scheduled`, `cancelled`, `sent`.

**Executing due emails:** `runDueScheduledEmails()` in `src/lib/scheduler-executor.ts` loads items with `status === "scheduled"` and `scheduledAt <= now`, sends each via `sendEmail()`, and marks successful ones `sent`. Failures are collected per item without aborting the batch.

Trigger manually:

```bash
curl -X POST http://localhost:3000/api/schedule/run-due
```

Scheduled emails can be created, listed, cancelled, and executed through `/api/schedule/run-due`. In production, this route would be invoked by Temporal, a cron job, or a background worker on an interval.

**Vercel note:** there is no persistent worker in this deployment. Automatic background execution is intentionally represented as an adapter boundary — you schedule in the UI, then call `run-due` when the time passes (or wire an external cron to hit that route).

## Temporal later

Temporal would replace the storage/execution adapter while keeping the same HTTP contracts. `schedule()` starts a workflow/timer; `cancel()` signals it; a worker calls the same `sendEmail()` path at `scheduledAt` (equivalent to today’s `run-due` loop).

## Assumptions

- Reviewers care most about editor quality and render fidelity, not auth or multi-tenant persistence.
- Image blocks use URLs only (no upload pipeline).
- Mock send without a Resend key is acceptable for demos and grading.

## Known limitations

- Editor state is in-memory in the browser; refresh clears unsaved work.
- Scheduled email storage is file-based and ephemeral on Vercel; there is no always-on cron in this repo — call `POST /api/schedule/run-due` to process due sends.
- No rich-text editor; content fields are plain text / textarea.
- No automated tests in this submission.
- Puck field labels are generic (`Font Size`, `Text Color`) rather than per-block copy from the mockups.

## Time spent

~5–6 hours total:

- Puck schema + editor wiring — 1.5h
- React Email render + send route — 1h
- Preview, templates, undo/redo — 1h
- Scheduling (UI, API, adapter) — 1.5h
- UI polish, dark mode scoping, docs — 1h
