"use client";

import "@puckeditor/core/puck.css";

import { useEffect, useState } from "react";
import { Puck, createUsePuck, type Data } from "@puckeditor/core";

import { renderEmailHtml } from "@/lib/email-render";
import { puckConfig, type EmailBuilderData } from "@/lib/puck-config";
import { ensureEmailDataIds } from "@/lib/puck-data";
import type { ScheduledEmail } from "@/lib/scheduler-types";
import { defaultTemplate, starterTemplates } from "@/lib/templates";
import {
  BuilderNavbar,
  CalendarIcon,
  ClockIcon,
  CodeIcon,
  ComposeDivider,
  ComposeField,
  Kbd,
  MonitorIcon,
  RedoIcon,
  SendIcon,
  SmartphoneIcon,
  UndoIcon,
} from "@/components/builder/chrome";
import { cn } from "@/lib/utils";
import { puckBlockLibraryOverrides } from "@/lib/puck-block-library-ui";

type PreviewMode = "desktop" | "mobile";
type Theme = "light" | "dark";

type SendState = {
  kind: "idle" | "success" | "error";
  message: string;
};

type ScheduleListResponse = {
  success: boolean;
  items: ScheduledEmail[];
};

const puckViewports = [
  { width: 600, height: "auto" as const, icon: "Monitor" as const, label: "Desktop" },
  { width: 390, height: "auto" as const, icon: "Smartphone" as const, label: "Mobile" },
];

const usePuck = createUsePuck<typeof puckConfig>();

const cloneData = (value: EmailBuilderData): EmailBuilderData =>
  ensureEmailDataIds(JSON.parse(JSON.stringify(value)) as EmailBuilderData);

const fieldClassName =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20";

const EditorControls = ({
  onTemplateSelect,
  selectedTemplateId,
}: {
  onTemplateSelect: (templateId: string) => void;
  selectedTemplateId: string;
}) => {
  const history = usePuck((s) => s.history);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedTemplateId}
          onChange={(event) => onTemplateSelect(event.target.value)}
          className="h-9 w-[180px] rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
          aria-label="Email template"
        >
          {starterTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <div className="mx-1 h-6 w-px bg-border" />
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-lg px-2 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
          onClick={() => history.back()}
          disabled={!history.hasPast}
          aria-label="Undo"
          title="Undo"
        >
          <UndoIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-9 items-center rounded-lg px-2 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
          onClick={() => history.forward()}
          disabled={!history.hasFuture}
          aria-label="Redo"
          title="Redo"
        >
          <RedoIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="hidden items-center gap-3 text-[11px] text-muted-foreground md:flex">
        <Kbd>⌘</Kbd>
        <Kbd>Z</Kbd>
        <span>Undo</span>
        <span className="mx-2 h-3 w-px bg-border" />
        <Kbd>⌘</Kbd>
        <Kbd>⇧</Kbd>
        <Kbd>Z</Kbd>
        <span>Redo</span>
      </div>
    </div>
  );
};

const KeyboardShortcuts = () => {
  const history = usePuck((s) => s.history);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isUndo(event)) {
        event.preventDefault();
        if (history.hasPast) {
          history.back();
        }
      } else if (isRedo(event)) {
        event.preventDefault();
        if (history.hasFuture) {
          history.forward();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [history]);

  return null;
};

const isUndo = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "z";

const isRedo = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "z";

const StatusBadge = ({ status }: { status: ScheduledEmail["status"] }) => {
  if (status === "scheduled") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Queued
      </span>
    );
  }

  const styles =
    status === "cancelled"
      ? "bg-muted text-muted-foreground"
      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", styles)}>
      {status}
    </span>
  );
};

export default function Home() {
  const [data, setData] = useState<EmailBuilderData>(() => cloneData(defaultTemplate.data));
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate.id);
  const [puckInstanceKey, setPuckInstanceKey] = useState(0);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [theme, setTheme] = useState<Theme>("light");
  const [recipient, setRecipient] = useState("candidate@nautilus.test");
  const [subject, setSubject] = useState(defaultTemplate.subject);
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [sendState, setSendState] = useState<SendState>({ kind: "idle", message: "" });
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);

  const [htmlPreview, setHtmlPreview] = useState("");
  const previewWidthClass = previewMode === "desktop" ? "max-w-[600px]" : "max-w-[390px]";

  useEffect(() => {
    const stored = window.localStorage.getItem("nautilus-theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("nautilus-theme", theme);
  }, [theme]);

  useEffect(() => {
    let canceled = false;

    const buildPreview = async () => {
      const html = await renderEmailHtml(data, subject);
      if (!canceled) {
        setHtmlPreview(html);
      }
    };

    void buildPreview();

    return () => {
      canceled = true;
    };
  }, [data, subject]);

  useEffect(() => {
    const loadScheduled = async () => {
      setIsLoadingScheduled(true);
      try {
        const response = await fetch("/api/schedule");
        const result = (await response.json()) as ScheduleListResponse;
        if (response.ok && result.success) {
          setScheduledEmails(result.items);
        }
      } finally {
        setIsLoadingScheduled(false);
      }
    };
    void loadScheduled();
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    const template = starterTemplates.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    setSelectedTemplateId(template.id);
    setSubject(template.subject);
    setData(cloneData(template.data));
    setPuckInstanceKey((current) => current + 1);
    setSendState({ kind: "idle", message: "" });
  };

  const handleSend = async () => {
    if (!recipient.trim() || !subject.trim()) {
      setSendState({
        kind: "error",
        message: "Please provide both recipient and subject before sending.",
      });
      return;
    }

    setIsSending(true);
    setSendState({ kind: "idle", message: "" });

    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: recipient,
          subject,
          data,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message: string;
        mock?: boolean;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to send email.");
      }

      setSendState({
        kind: "success",
        message: result.message,
      });
    } catch (error) {
      setSendState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to send email.",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!recipient.trim() || !subject.trim() || !scheduleAt.trim()) {
      setSendState({
        kind: "error",
        message: "Provide recipient, subject, and a future schedule time.",
      });
      return;
    }

    const when = new Date(scheduleAt);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      setSendState({
        kind: "error",
        message: "Please choose a valid future schedule time.",
      });
      return;
    }

    setIsScheduling(true);
    setSendState({ kind: "idle", message: "" });

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject,
          data,
          scheduledAt: when.toISOString(),
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        item?: ScheduledEmail;
      };

      if (!response.ok || !result.success || !result.item) {
        throw new Error(result.message ?? "Failed to schedule email.");
      }

      const scheduledItem = result.item;
      setScheduledEmails((prev) =>
        [...prev, scheduledItem].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
      );
      setSendState({
        kind: "success",
        message: `Email scheduled for ${new Date(result.item.scheduledAt).toLocaleString()}.`,
      });
    } catch (error) {
      setSendState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to schedule email.",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCancelScheduled = async (id: string) => {
    try {
      const response = await fetch(`/api/schedule/${id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        item?: ScheduledEmail;
      };
      if (!response.ok || !result.success || !result.item) {
        throw new Error(result.message ?? "Failed to cancel scheduled email.");
      }

      const updatedItem = result.item;
      setScheduledEmails((prev) =>
        prev.map((item) => (item.id === id && updatedItem ? updatedItem : item)),
      );
      setSendState({ kind: "success", message: "Scheduled email cancelled." });
    } catch (error) {
      setSendState({
        kind: "error",
        message: error instanceof Error ? error.message : "Unable to cancel scheduled email.",
      });
    }
  };

  const scheduledCount = scheduledEmails.filter((item) => item.status === "scheduled").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BuilderNavbar dark={theme === "dark"} onThemeChange={(dark) => setTheme(dark ? "dark" : "light")} />

      <section className="mx-auto mt-6 max-w-[1600px] px-6">
        <div className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-md)]">
          <div className="flex flex-wrap items-end gap-4 p-4 md:flex-nowrap">
            <ComposeField label="Recipient" className="min-w-[220px] flex-1">
              <input
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                type="email"
                className={fieldClassName}
              />
            </ComposeField>
            <ComposeDivider />
            <ComposeField label="Subject" className="min-w-[260px] flex-[1.4]">
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                type="text"
                className={fieldClassName}
              />
            </ComposeField>
            <ComposeDivider />
            <ComposeField label="Schedule" className="min-w-[220px] flex-1">
              <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-foreground shadow-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <input
                  value={scheduleAt}
                  onChange={(event) => setScheduleAt(event.target.value)}
                  type="datetime-local"
                  aria-label="Schedule date and time"
                  className="w-full bg-transparent outline-none [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </ComposeField>
            <div className="flex shrink-0 items-center gap-2 pl-2">
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="btn-send-primary inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold"
              >
                <SendIcon className="mr-2 h-4 w-4" />
                {isSending ? "Sending…" : "Send Now"}
              </button>
              <button
                type="button"
                onClick={handleSchedule}
                disabled={isScheduling}
                className="inline-flex h-10 items-center rounded-xl border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-60"
              >
                <ClockIcon className="mr-2 h-4 w-4" />
                {isScheduling ? "Scheduling…" : "Schedule"}
              </button>
            </div>
          </div>
        </div>

        {sendState.kind !== "idle" ? (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "mt-3 rounded-xl px-4 py-2.5 text-sm shadow-[var(--shadow-sm)]",
              sendState.kind === "success"
                ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                : "border border-destructive/20 bg-destructive/10 text-destructive",
            )}
          >
            {sendState.message}
          </div>
        ) : null}
      </section>

      <main className="mx-auto mt-6 grid max-w-[1600px] gap-6 px-6 pb-10 lg:grid-cols-[7fr_3fr]">
        <section className="email-builder-shell puck-light-scope overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-md)]">
          <Puck
              key={`${selectedTemplateId}-${puckInstanceKey}`}
              config={puckConfig}
              data={data as Data}
              height="calc(100vh - 260px)"
              _experimentalFullScreenCanvas
              viewports={puckViewports}
              overrides={puckBlockLibraryOverrides}
              ui={{
                leftSideBarWidth: 240,
                rightSideBarWidth: 280,
              }}
              onChange={(nextData) =>
                setData(ensureEmailDataIds(nextData as EmailBuilderData))
              }
              onPublish={(publishedData) =>
                setData(ensureEmailDataIds(publishedData as EmailBuilderData))
              }
              headerTitle="Email canvas"
              renderHeader={({ children }) => (
                <div className="border-b border-border bg-surface">
                  <KeyboardShortcuts />
                  <EditorControls
                    onTemplateSelect={handleTemplateSelect}
                    selectedTemplateId={selectedTemplateId}
                  />
                  {children}
                </div>
              )}
            />
        </section>

        <aside className="flex max-h-[calc(100vh-10rem)] flex-col gap-6 overflow-y-auto">
          <section className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-md)]">
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Live Preview</h2>
                <p className="text-xs text-muted-foreground">React Email output used for send</p>
              </div>
              <div
                className="inline-flex rounded-lg border border-border bg-background p-0.5"
                role="tablist"
                aria-label="Preview device size"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewMode === "desktop"}
                  onClick={() => setPreviewMode("desktop")}
                  className={cn(
                    "grid h-7 w-8 place-items-center rounded-md transition-colors",
                    previewMode === "desktop"
                      ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="desktop"
                >
                  <MonitorIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewMode === "mobile"}
                  onClick={() => setPreviewMode("mobile")}
                  className={cn(
                    "grid h-7 w-8 place-items-center rounded-md transition-colors",
                    previewMode === "mobile"
                      ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="mobile"
                >
                  <SmartphoneIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="grid place-items-center rounded-xl border border-border bg-background/80 p-4">
                <div
                  className={cn(
                    "preview-email-light w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-lg)] ring-1 ring-black/5 transition-all",
                    previewWidthClass,
                  )}
                >
                  <div className="flex h-9 items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                    <span className="ml-3 truncate text-[11px] font-medium text-slate-500">
                      {subject || "No subject"}
                    </span>
                  </div>
                  <div className="max-h-[min(560px,52vh)] overflow-auto bg-white">
                    {htmlPreview ? (
                      <iframe
                        title="Email preview"
                        srcDoc={htmlPreview}
                        sandbox=""
                        className="h-[min(520px,50vh)] w-full border-0 bg-white"
                      />
                    ) : (
                      <div className="flex h-[min(320px,40vh)] flex-col items-center justify-center gap-3 p-6 text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
                        <p className="text-sm text-muted-foreground">Generating preview…</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <details className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-md)]">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
              <CodeIcon className="h-4 w-4 text-primary" />
              View generated HTML payload
            </summary>
            <pre className="mx-5 mb-5 max-h-[260px] overflow-auto rounded-xl border border-border bg-[oklch(0.15_0.03_265)] p-4 font-mono text-[11px] leading-relaxed text-[oklch(0.92_0.02_220)]">
              {htmlPreview || "Generating React Email HTML preview…"}
            </pre>
          </details>

          <section className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">Scheduled Emails</h3>
              {isLoadingScheduled ? (
                <span className="text-xs text-muted-foreground">Loading…</span>
              ) : (
                <span className="inline-flex h-5 items-center rounded-full border border-border bg-background px-2 text-[10px] font-medium text-muted-foreground">
                  {scheduledCount} queued
                </span>
              )}
            </div>

            <div className="max-h-56 space-y-2 overflow-auto p-3">
              {isLoadingScheduled ? (
                <div className="space-y-2">
                  {[0, 1].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-xl border border-border bg-background p-3"
                    >
                      <div className="mb-2 h-3 w-2/3 rounded bg-muted" />
                      <div className="h-2.5 w-1/2 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : scheduledEmails.length === 0 ? (
                <div className="grid place-items-center rounded-xl border border-dashed border-border px-4 py-10 text-center">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                    <CalendarIcon className="h-4 w-4" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">No scheduled emails</p>
                  <p className="text-xs text-muted-foreground">
                    Pick a future time and click Schedule to queue one.
                  </p>
                </div>
              ) : (
                scheduledEmails.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{item.subject}</p>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.to}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                          <ClockIcon className="h-3 w-3" />
                          {new Date(item.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                      {item.status === "scheduled" ? (
                        <button
                          type="button"
                          onClick={() => handleCancelScheduled(item.id)}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-destructive"
                          aria-label="Cancel"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
