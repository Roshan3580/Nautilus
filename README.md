# Nautilus Email Builder

Take-home submission: drag-and-drop marketing email builder built with Next.js App Router, Puck, React Email, and Resend.

**Live demo:** [email-builder-eight-delta.vercel.app](https://email-builder-eight-delta.vercel.app)

## Repositories

| Repo | Role |
|------|------|
| [github.com/Roshan3580/email-builder](https://github.com/Roshan3580/email-builder) (private) | **Vercel deployment source** — production deploys from this repo |
| [github.com/Roshan3580/nautilus-email-builder](https://github.com/Roshan3580/nautilus-email-builder) (public) | Public code mirror for reviewers |

Keep both repos aligned when shipping changes. Vercel does **not** deploy from the public repo.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

```bash
cp .env.example .env.local
```

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Real sends via Resend. If unset, `/api/send` and scheduled execution return explicit mock success (no crash). |
| `RESEND_FROM_EMAIL` | Sender address. Defaults to `onboarding@resend.dev`. |

Restart `npm run dev` after editing `.env.local`.

**Vercel:** Project → Settings → Environment Variables → redeploy. Never commit secrets.

### Verification

```bash
npm run lint
npm run build
```

Optional smoke tests:

```bash
curl -X POST http://localhost:3000/api/schedule/run-due
curl -X POST https://email-builder-eight-delta.vercel.app/api/schedule/run-due
```

## Deployed demo behavior

- Vercel builds from the private `email-builder` repo.
- **Send Now** calls Resend when `RESEND_API_KEY` is set; otherwise mock success with a clear message.
- **Schedule / cancel** persist to a file-backed store (`.data/` locally, `/tmp` on Vercel).
- **Due sends are not automatic.** After `scheduledAt`, call `POST /api/schedule/run-due` to execute queued emails. Vercel has no persistent background worker — see scheduling below.

## Features

**Tier 1**

- Puck editor: Heading, Text, Button, Image, Section, Container
- Editable props: content, colors, font size, padding, alignment, image URLs, links
- Live preview via the same React Email HTML used for send
- Send with recipient, subject, and status notifications

**Tier 2**

- Desktop / mobile preview (600px / 390px)
- Schedule date-time picker, scheduled list, cancellation
- `POST /api/schedule`, `GET /api/schedule`, `DELETE /api/schedule/[id]`
- `POST /api/schedule/run-due` — execute due scheduled sends

**Tier 3**

- Undo / redo + `Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`
- Templates: Welcome Email, Newsletter, Promo
- Dark mode on app chrome; Puck canvas and email preview stay light

## Architecture

```
Puck editor state (JSON)
        ↓
src/lib/puck-config.tsx     block schema + canvas render
src/lib/email-render.tsx    blocks → React Email → HTML
        ↓
Preview iframe, /api/send, scheduler executor
```

Puck’s canvas uses inline React for editing. Preview, Send Now, and scheduled execution all call `renderEmailHtml()` so output matches delivery.

| Path | Role |
|------|------|
| `src/app/page.tsx` | Compose bar, Puck, preview, schedule panel |
| `src/lib/puck-config.tsx` | Puck blocks and field schema |
| `src/lib/email-render.tsx` | React Email render pipeline |
| `src/lib/email-send.ts` | Shared Resend send (Send Now + scheduler) |
| `src/lib/templates.ts` | Starter templates |
| `src/lib/scheduler.ts` | Schedule adapter (`list`, `schedule`, `cancel`, `listDue`, `markSent`) |
| `src/lib/scheduler-executor.ts` | Finds due jobs, sends, marks `sent` |
| `src/app/api/send/route.ts` | Send Now |
| `src/app/api/schedule/*` | Schedule CRUD + `run-due` |

## Resend sending

`sendEmail()` in `src/lib/email-send.ts`:

1. `renderEmailHtml(data, subject)`
2. If `RESEND_API_KEY` → `resend.emails.send()`
3. Else → mock success with explicit message

Send Now uses `/api/send`. Scheduled execution reuses the same function.

## Scheduling and execution

Queued emails have status `scheduled` (shown as “Queued” in the UI), `cancelled`, or `sent`.

**Create / list / cancel:** standard schedule API routes.

**Execute due sends:** `runDueScheduledEmails()` selects `scheduled` items where `scheduledAt <= now`, sends each, marks successes `sent`, collects per-item failures without stopping the batch.

```bash
curl -X POST http://localhost:3000/api/schedule/run-due
```

In production, this endpoint would be called by Temporal, cron, or a background worker — not by Vercel itself. This repo intentionally stops at the adapter boundary: queue + manual/cron-triggered execution, no always-on worker process.

Storage: `.data/scheduled-emails.json` locally; `/tmp/nautilus-email-builder` on Vercel (ephemeral across cold starts).

## Temporal / cron tradeoff

Temporal (or cron hitting `run-due`) would replace the file adapter and manual trigger while keeping the same HTTP contracts. `schedule()` would start a durable timer/workflow; `cancel()` would signal it; execution would still call `sendEmail()` at fire time.

## Assumptions

- Reviewers prioritize editor quality and render fidelity over auth and persistence.
- Image blocks use URLs only.
- Mock send without a Resend key is acceptable for local review and demos.

## Known limitations

- Editor state is in-memory; refresh loses unsaved work.
- No automatic background execution on Vercel — must call `/api/schedule/run-due`.
- Scheduled storage is file-based and ephemeral on serverless.
- Plain text fields only (no rich-text editor).
- No automated tests in this submission.

## Time spent

~3–4 hours:

- Puck schema + editor — 1.5h
- React Email render + send — 1h
- Preview, templates, undo/redo, dark mode — 1.5h
- Scheduling UI, API, executor — 2h
- Docs, Vercel fixes, polish — 1h
