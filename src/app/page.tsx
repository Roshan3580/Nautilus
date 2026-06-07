"use client";

import "@puckeditor/core/puck.css";

import { useEffect, useState } from "react";
import { Puck, createUsePuck, type Data } from "@puckeditor/core";

import { renderEmailHtml } from "@/lib/email-render";
import { puckConfig, type EmailBuilderData } from "@/lib/puck-config";
import { ensureEmailDataIds } from "@/lib/puck-data";
import type { ScheduledEmail } from "@/lib/scheduler-types";
import { defaultTemplate, starterTemplates } from "@/lib/templates";

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
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/20";

const EditorControls = ({
  onTemplateSelect,
  selectedTemplateId,
}: {
  onTemplateSelect: (templateId: string) => void;
  selectedTemplateId: string;
}) => {
  const history = usePuck((s) => s.history);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-950">
      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <span className="font-medium text-slate-800 dark:text-slate-100">Template</span>
        <select
          value={selectedTemplateId}
          onChange={(event) => onTemplateSelect(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {starterTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>

      <div className="hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-700" />

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={() => history.back()}
          disabled={!history.hasPast}
        >
          Undo
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={() => history.forward()}
          disabled={!history.hasFuture}
        >
          Redo
        </button>
      </div>

      <p className="ml-auto hidden text-xs text-slate-400 lg:block dark:text-slate-500">
        ⌘Z undo · ⌘⇧Z redo
      </p>
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
  const styles =
    status === "scheduled"
      ? "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300"
      : status === "cancelled"
        ? "bg-slate-100 text-slate-600 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-300"
        : "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300";

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${styles}`}>
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                N
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Nautilus Email Builder</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Drag-and-drop editor with live React Email preview
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mx-auto max-w-[1920px] px-5 py-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(220px,0.9fr)_auto_auto] lg:items-end">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Recipient
                </span>
                <input
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                  type="email"
                  placeholder="recipient@example.com"
                  className={fieldClassName}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Subject
                </span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  type="text"
                  placeholder="Email subject line"
                  className={fieldClassName}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Schedule
                </span>
                <input
                  value={scheduleAt}
                  onChange={(event) => setScheduleAt(event.target.value)}
                  type="datetime-local"
                  aria-label="Schedule date and time"
                  className={fieldClassName}
                />
              </label>

              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="h-[42px] rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                {isSending ? "Sending…" : "Send now"}
              </button>

              <button
                type="button"
                onClick={handleSchedule}
                disabled={isScheduling}
                className="h-[42px] rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {isScheduling ? "Scheduling…" : "Schedule"}
              </button>
            </div>

            {sendState.kind !== "idle" ? (
              <div
                role="status"
                aria-live="polite"
                className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${
                  sendState.kind === "success"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                    : "border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200"
                }`}
              >
                {sendState.message}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1920px] gap-6 px-5 py-6 xl:grid-cols-[minmax(0,2.85fr)_minmax(300px,0.72fr)]">
        <section className="email-builder-shell flex min-h-[calc(100vh-10rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="min-h-0 flex-1">
            <Puck
              key={`${selectedTemplateId}-${puckInstanceKey}`}
              config={puckConfig}
              data={data as Data}
              height="calc(100vh - 10rem)"
              _experimentalFullScreenCanvas
              viewports={puckViewports}
              ui={{
                leftSideBarWidth: 176,
                rightSideBarWidth: 248,
              }}
              onChange={(nextData) =>
                setData(ensureEmailDataIds(nextData as EmailBuilderData))
              }
              onPublish={(publishedData) =>
                setData(ensureEmailDataIds(publishedData as EmailBuilderData))
              }
              headerTitle="Email canvas"
              renderHeader={({ children }) => (
                <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                  <KeyboardShortcuts />
                  <EditorControls
                    onTemplateSelect={handleTemplateSelect}
                    selectedTemplateId={selectedTemplateId}
                  />
                  {children}
                </div>
              )}
            />
          </div>
        </section>

        <aside className="flex max-h-[calc(100vh-10rem)] flex-col gap-5 overflow-y-auto">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Live preview</h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  React Email output used for send
                </p>
              </div>
              <div
                className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900"
                role="tablist"
                aria-label="Preview device size"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewMode === "desktop"}
                  onClick={() => setPreviewMode("desktop")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    previewMode === "desktop"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewMode === "mobile"}
                  onClick={() => setPreviewMode("mobile")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    previewMode === "mobile"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Mobile
                </button>
              </div>
            </div>

            <div className="grid place-items-center rounded-xl border border-slate-200 bg-slate-100/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <div
                className={`w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md transition-all dark:border-slate-700 dark:bg-white ${previewWidthClass}`}
              >
                <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-200 dark:bg-slate-100">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 truncate text-xs text-slate-500">
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
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                      <p className="text-sm text-slate-500">Generating preview…</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                View generated HTML
              </summary>
              <pre className="mx-4 mb-4 max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
                {htmlPreview || "Generating React Email HTML preview…"}
              </pre>
            </details>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Scheduled sends</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {scheduledCount} upcoming · {scheduledEmails.length} total
                </p>
              </div>
              {isLoadingScheduled ? (
                <span className="text-xs text-slate-400">Loading…</span>
              ) : null}
            </div>

            <div className="max-h-56 space-y-2 overflow-auto">
              {isLoadingScheduled ? (
                <div className="space-y-2">
                  {[0, 1].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="mb-2 h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-2.5 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                  ))}
                </div>
              ) : scheduledEmails.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No scheduled emails yet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Choose a date above and click Schedule to queue a send.
                  </p>
                </div>
              ) : (
                scheduledEmails.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.subject}</p>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">To {item.to}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {new Date(item.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.status === "scheduled" ? (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCancelScheduled(item.id)}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : null}
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
