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
- **Schedule / cancel** work against the server-side JSON store. On Vercel’s serverless runtime, scheduled data is ephemeral per instance — fine for demoing the API and UI, not for durable production scheduling (see limitations below).

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
| `src/app/api/send/route.ts` | Resend delivery |
| `src/app/api/schedule/*` | Schedule CRUD |

## Resend sending

1. Client posts `{ to, subject, data }` to `/api/send`.
2. Server renders HTML via `renderEmailHtml(data, subject)`.
3. If `RESEND_API_KEY` is set → `resend.emails.send()`.
4. If not → `{ success: true, mock: true, message: "…not set…" }`.

This keeps local review and CI usable without API keys.

## Scheduling and the Temporal tradeoff

Scheduling goes through a small adapter interface in `src/lib/scheduler.ts`:

```ts
list() | schedule(input) | cancel(id)
```

Current implementation writes to `.data/scheduled-emails.json` on disk. Status values: `scheduled`, `cancelled`, `sent` (reserved for a future worker).

**Why not Temporal here?** The take-home asks for scheduling UX and API shape, not running a worker cluster. A JSON adapter is zero-infra and easy to review locally. Temporal fits later: `schedule()` starts a workflow/timer, `cancel()` signals it, a worker calls the same render + send path at `scheduledAt`. The UI and route contracts stay the same — only the adapter implementation changes.

## Assumptions

- Reviewers care most about editor quality and render fidelity, not auth or multi-tenant persistence.
- Image blocks use URLs only (no upload pipeline).
- Mock send without a Resend key is acceptable for demos and grading.

## Known limitations

- Editor state is in-memory in the browser; refresh clears unsaved work.
- Scheduled emails are stored locally (`.data/`) — not durable on Vercel serverless; nothing actually fires at `scheduledAt` yet.
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
