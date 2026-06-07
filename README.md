# Email Builder with Drag & Drop

Nautilus take-home implementation: a polished single-page visual email builder in Next.js App Router with strict TypeScript, React 19, Tailwind 4, and `@puckeditor/core`.

## Setup

```bash
npm install
npm run dev
```

Environment variables for Resend (see `.env.example`):

- `RESEND_API_KEY`: Resend API key for real sends.
- `RESEND_FROM_EMAIL`: Sender address (defaults to `onboarding@resend.dev`).

**Local:** copy the example file and fill in your key:

```bash
cp .env.example .env.local
```

Restart `npm run dev` after editing `.env.local`.

**Vercel (production):** add the same variables in the [Vercel dashboard](https://vercel.com) → your project → **Settings** → **Environment Variables**. Apply to Production (and Preview if you want sends in preview deploys). Redeploy after saving. Never commit real keys to git.

Verify locally:

```bash
npm run lint
npm run build
```

Open [http://localhost:3000](http://localhost:3000).

## Features

### Tier 1 (Must Have)

- Puck drag-and-drop editor with Heading, Text, Button, Image, Section, Container.
- Editable props: content, colors, font size, padding, alignment, URLs/links.
- Live preview synced to editor state.
- Send via Resend with recipient, subject, and status feedback.

### Tier 2 (Expected)

- Desktop/mobile preview width toggle.
- Schedule date/time picker, Send now / Schedule actions.
- Scheduled email list with cancellation.
- Scheduling APIs and swappable scheduler adapter.

### Tier 3 (Selected)

- Undo/redo buttons and keyboard shortcuts (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`).
- Starter templates: Welcome Email, Newsletter, Promo.

## Architecture Decisions

- Keep all user-facing builder functionality in a single page (`src/app/page.tsx`) for fast iteration and a cohesive UX.
- Use `@puckeditor/core` as the source of truth for editable content structure and drag/drop behavior.
- Puck owns structured editor state; React Email owns final email-safe rendering from that state.
- Add a scheduler adapter (`src/lib/scheduler.ts`) so scheduling infrastructure is decoupled from delivery logic.
- Define component schema and defaults in `src/lib/puck-config.tsx` to separate UI orchestration from content model.
- Add `src/lib/templates.ts` for reusable starter template data with subjects.
- Add `src/lib/email-render.tsx` for React Email component mapping and deterministic HTML generation used by `/api/send`.
- Implement `/api/send` with Resend, but guard for missing API key with clear dev-mode mock success to avoid local crashes.

## Tradeoffs

- **Puck preview vs React Email preview:** Preview and send both use `renderEmailHtml()` so output matches Resend delivery.
- **Local JSON scheduler vs Temporal:** JSON file store is simpler to run in review environments; Temporal adapter can replace `src/lib/scheduler.ts` without changing UI/API contracts.
- **No persistence for drafts:** Editor state lives in the browser session; templates are static starters only.
- **URL-based images only:** No upload pipeline or asset hosting in this take-home scope.
- **Mock send without API key:** Returns explicit success in dev mode instead of failing, so reviewers can test flows without Resend credentials.

## Assumptions

- The take-home prioritizes builder/editor quality over production-grade persistence/auth.
- Live preview should reflect render output in-app and generated email HTML should be inspectable.
- Using URL-based image inputs is sufficient (no upload pipeline required).
- Mock-send mode is acceptable when `RESEND_API_KEY` is absent.

## Time Spent

Approximately 5–6 hours:

- Core editor + component schema: ~1.5h
- React Email rendering + send flow: ~1h
- Preview, templates, undo/redo shortcuts: ~1h
- Tier 2 scheduling (UI, APIs, adapter): ~1.5h
- Polish, docs, lint/build pass: ~1h

## What Works

- Drag/drop visual editor powered by Puck.
- Components: Heading, Text, Button, Image, Section, Container.
- Editable props for content, colors, font size, padding, alignment, and links/URLs.
- Live preview that updates as editor state changes.
- Desktop/mobile preview width toggle.
- Starter templates: Welcome Email, Newsletter, Promo.
- Undo/redo buttons and keyboard shortcuts (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`).
- Recipient + subject inputs and Send button.
- Tier 2 scheduling: schedule date/time picker, schedule action, scheduled-email list, and cancellation UI.
- Scheduling APIs: `POST /api/schedule`, `GET /api/schedule`, `DELETE /api/schedule/[id]`.
- Scheduled payload shape: `id`, `to`, `subject`, `data`, `scheduledAt`, `status`.
- `/api/send` route with Resend integration and dev-mode mock success fallback.

## Scheduling Implementation

- Uses a local adapter in `src/lib/scheduler.ts` backed by `.data/scheduled-emails.json`.
- Routes:
  - `POST /api/schedule` validates `to`, `subject`, and future `scheduledAt`, then stores schedule.
  - `GET /api/schedule` lists all scheduled items.
  - `DELETE /api/schedule/[id]` marks a scheduled item as `cancelled`.
- Status values are currently `scheduled | cancelled | sent` (with `sent` reserved for future processor integration).

## Why Local Adapter (vs Temporal)

- For the take-home, a local JSON-backed adapter is easier to run and deploy without extra infra.
- This keeps setup lightweight and deterministic for reviewers while still modeling real scheduling contracts.
- The adapter boundary keeps the app logic stable while the backend scheduler implementation changes.

## Temporal Integration Later

- Replace the `scheduler` adapter implementation with a Temporal-backed adapter while preserving the same interface (`list`, `schedule`, `cancel`).
- `schedule` would start a Temporal workflow/timer per job (or enqueue a durable schedule task).
- `cancel` would signal/cancel the workflow.
- A worker would execute due emails by calling the same rendering + send pathway used today.

## Future Improvements

- Save/load drafts and templates from a database.
- Add rich text controls and inline color pickers for better authoring UX.
- Add image upload support and hosted asset management.
- Add test coverage (unit tests for renderer + API route, E2E for send flow).
- Add accessibility audits and email-client compatibility snapshots.
