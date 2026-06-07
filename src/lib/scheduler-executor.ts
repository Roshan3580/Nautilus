import { sendEmail } from "@/lib/email-send";
import { scheduler } from "@/lib/scheduler";
import type { ScheduledEmail } from "@/lib/scheduler-types";

export type RunDueFailure = {
  id: string;
  subject: string;
  message: string;
};

export type RunDueResult = {
  processed: number;
  sent: ScheduledEmail[];
  failed: RunDueFailure[];
};

export async function runDueScheduledEmails(now = new Date()): Promise<RunDueResult> {
  const due = await scheduler.listDue(now);
  const sent: ScheduledEmail[] = [];
  const failed: RunDueFailure[] = [];

  for (const item of due) {
    try {
      const result = await sendEmail({
        to: item.to,
        subject: item.subject,
        data: item.data,
      });

      if (!result.success) {
        failed.push({
          id: item.id,
          subject: item.subject,
          message: result.message,
        });
        continue;
      }

      const updated = await scheduler.markSent(item.id);
      if (updated) {
        sent.push(updated);
      } else {
        failed.push({
          id: item.id,
          subject: item.subject,
          message: "Scheduled email could not be marked as sent.",
        });
      }
    } catch (error) {
      failed.push({
        id: item.id,
        subject: item.subject,
        message: error instanceof Error ? error.message : "Unexpected error while sending.",
      });
    }
  }

  return {
    processed: due.length,
    sent,
    failed,
  };
}
