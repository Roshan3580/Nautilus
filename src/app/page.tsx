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

type SendState = {
  kind: "idle" | "success" | "error";
  message: string;
};

type ScheduleListResponse = {
  success: boolean;
  items: ScheduledEmail[];
};

const usePuck = createUsePuck<typeof puckConfig>();

const cloneData = (value: EmailBuilderData): EmailBuilderData =>
  ensureEmailDataIds(JSON.parse(JSON.stringify(value)) as EmailBuilderData);

const EditorControls = ({
  onTemplateSelect,
  selectedTemplateId,
}: {
  onTemplateSelect: (templateId: string) => void;
  selectedTemplateId: string;
}) => {
  const history = usePuck((s) => s.history);

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <span className="font-medium">Template</span>
        <select
          value={selectedTemplateId}
          onChange={(event) => onTemplateSelect(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-slate-500"
        >
          {starterTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>

      <div className="h-6 w-px bg-slate-200" />

      <button
        type="button"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        onClick={() => history.back()}
        disabled={!history.hasPast}
      >
        Undo
      </button>
      <button
        type="button"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        onClick={() => history.forward()}
        disabled={!history.hasFuture}
      >
        Redo
      </button>
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

export default function Home() {
  const [data, setData] = useState<EmailBuilderData>(() => cloneData(defaultTemplate.data));
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultTemplate.id);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [recipient, setRecipient] = useState("candidate@nautilus.test");
  const [subject, setSubject] = useState(defaultTemplate.subject);
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [sendState, setSendState] = useState<SendState>({ kind: "idle", message: "" });
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);

  const [htmlPreview, setHtmlPreview] = useState("");
  const previewWidthClass = previewMode === "desktop" ? "max-w-[680px]" : "max-w-[390px]";

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

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">Nautilus</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Visual Email Builder</h1>
            <p className="mt-1 text-sm text-slate-600">
              Build with drag-and-drop components, preview live, and send with Resend.
            </p>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-4xl">
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              type="email"
              placeholder="recipient@example.com"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
            />
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              type="text"
              placeholder="Email subject"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
            />
            <div className="sm:col-span-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input
                value={scheduleAt}
                onChange={(event) => setScheduleAt(event.target.value)}
                type="datetime-local"
                aria-label="Schedule date and time"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {isSending ? "Sending..." : "Send now"}
              </button>
              <button
                type="button"
                onClick={handleSchedule}
                disabled={isScheduling}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:opacity-60"
              >
                {isScheduling ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        </div>

        {sendState.kind !== "idle" ? (
          <div
            role="status"
            aria-live="polite"
            className={`mx-auto mb-4 max-w-[1600px] rounded-xl px-4 py-3 text-sm ${
              sendState.kind === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {sendState.message}
          </div>
        ) : null}
      </header>

      <main className="mx-auto grid max-w-[1800px] gap-5 px-4 py-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(340px,1fr)]">
        <section className="email-builder-shell flex min-h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <p className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
            Drag components from the left panel onto the canvas. Select any block to edit its
            properties in the right sidebar.
          </p>
          <div className="min-h-0 flex-1">
            <Puck
              config={puckConfig}
              data={data as Data}
              height="calc(100vh - 13rem)"
              _experimentalFullScreenCanvas
              onChange={(nextData) =>
                setData(ensureEmailDataIds(nextData as EmailBuilderData))
              }
              onPublish={(publishedData) =>
                setData(ensureEmailDataIds(publishedData as EmailBuilderData))
              }
              headerTitle="Email canvas"
              renderHeader={({ children }) => (
                <div className="border-b border-slate-200 bg-white">
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

        <section className="flex max-h-[calc(100vh-11rem)] flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Live Email Preview</h2>
              <p className="text-sm text-slate-500">
                Same React Email HTML rendered for send
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1 text-xs">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  previewMode === "desktop"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  previewMode === "mobile"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Mobile
              </button>
            </div>
          </div>

          <div className="grid flex-1 place-items-center rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div
              className={`w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all ${previewWidthClass}`}
            >
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Subject: {subject || "(No subject)"}
              </div>
              <div className="max-h-[70vh] overflow-auto">
                {htmlPreview ? (
                  <iframe
                    title="Email preview"
                    srcDoc={htmlPreview}
                    sandbox=""
                    className="h-[min(520px,50vh)] w-full border-0 bg-white"
                  />
                ) : (
                  <p className="p-4 text-sm text-slate-500">
                    Generating React Email preview...
                  </p>
                )}
              </div>
            </div>
          </div>

          <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              View generated HTML payload
            </summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {htmlPreview || "Generating React Email HTML preview..."}
            </pre>
          </details>

          <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Scheduled Emails</h3>
              <span className="text-xs text-slate-500">
                {isLoadingScheduled ? "Loading..." : `${scheduledEmails.length} items`}
              </span>
            </div>
            <div className="max-h-48 space-y-2 overflow-auto">
              {scheduledEmails.length === 0 ? (
                <p className="text-xs text-slate-500">No scheduled emails yet.</p>
              ) : (
                scheduledEmails.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  >
                    <div className="font-medium">{item.subject}</div>
                    <div>To: {item.to}</div>
                    <div>At: {new Date(item.scheduledAt).toLocaleString()}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span
                        className={`rounded px-1.5 py-0.5 ${
                          item.status === "scheduled"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.status === "scheduled" ? (
                        <button
                          type="button"
                          onClick={() => handleCancelScheduled(item.id)}
                          className="rounded bg-rose-50 px-2 py-1 font-medium text-rose-700 hover:bg-rose-100"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
