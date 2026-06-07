import type { EmailBuilderData } from "@/lib/puck-config";

export type ScheduledEmailStatus = "scheduled" | "cancelled" | "sent";

export type ScheduledEmail = {
  id: string;
  to: string;
  subject: string;
  data: EmailBuilderData;
  scheduledAt: string;
  status: ScheduledEmailStatus;
  createdAt: string;
  updatedAt: string;
};

export type ScheduleEmailInput = {
  to: string;
  subject: string;
  data: EmailBuilderData;
  scheduledAt: string;
};
