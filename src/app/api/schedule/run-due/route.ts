import { NextResponse } from "next/server";

import { runDueScheduledEmails } from "@/lib/scheduler-executor";

export async function POST() {
  try {
    const result = await runDueScheduledEmails();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      message:
        result.processed === 0
          ? "No due scheduled emails."
          : `Processed ${result.processed} due email(s): ${result.sent.length} sent, ${result.failed.length} failed.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to run due scheduled emails.";

    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
