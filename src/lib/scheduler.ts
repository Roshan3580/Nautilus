import { promises as fs } from "node:fs";
import path from "node:path";

import type { ScheduleEmailInput, ScheduledEmail } from "@/lib/scheduler-types";

export type SchedulerAdapter = {
  list: () => Promise<ScheduledEmail[]>;
  schedule: (input: ScheduleEmailInput) => Promise<ScheduledEmail>;
  cancel: (id: string) => Promise<ScheduledEmail | null>;
};

const dataDir =
  process.env.VERCEL === "1"
    ? path.join("/tmp", "nautilus-email-builder")
    : path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "scheduled-emails.json");

const ensureStore = async (): Promise<void> => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, "[]", "utf8");
  }
};

const readAll = async (): Promise<ScheduledEmail[]> => {
  await ensureStore();
  const raw = await fs.readFile(dataFile, "utf8");

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as ScheduledEmail[];
  } catch {
    return [];
  }
};

const writeAll = async (records: ScheduledEmail[]): Promise<void> => {
  await ensureStore();
  await fs.writeFile(dataFile, JSON.stringify(records, null, 2), "utf8");
};

const createId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const localScheduler: SchedulerAdapter = {
  async list() {
    const records = await readAll();
    return records.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  },
  async schedule(input) {
    const records = await readAll();
    const now = new Date().toISOString();
    const next: ScheduledEmail = {
      id: createId(),
      to: input.to,
      subject: input.subject,
      data: input.data,
      scheduledAt: input.scheduledAt,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    };
    records.push(next);
    await writeAll(records);
    return next;
  },
  async cancel(id) {
    const records = await readAll();
    const index = records.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }
    const current = records[index];
    const updated: ScheduledEmail = {
      ...current,
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    };
    records[index] = updated;
    await writeAll(records);
    return updated;
  },
};

export const scheduler: SchedulerAdapter = localScheduler;
