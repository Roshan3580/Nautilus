import { NextResponse } from "next/server";

import type { EmailBuilderData } from "@/lib/puck-config";
import { scheduler } from "@/lib/scheduler";
import type { ScheduleEmailInput } from "@/lib/scheduler-types";

const isFutureDate = (value: string): boolean => {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return timestamp > Date.now();
};

const parseBody = async (request: Request): Promise<ScheduleEmailInput | null> => {
  try {
    const body = (await request.json()) as Partial<ScheduleEmailInput>;
    if (
      typeof body.to !== "string" ||
      typeof body.subject !== "string" ||
      typeof body.scheduledAt !== "string" ||
      !body.data ||
      !Array.isArray((body.data as EmailBuilderData).content)
    ) {
      return null;
    }
    const to = body.to.trim();
    const subject = body.subject.trim();
    if (!to || !subject || !isFutureDate(body.scheduledAt)) {
      return null;
    }
    return {
      to,
      subject,
      scheduledAt: new Date(body.scheduledAt).toISOString(),
      data: body.data as EmailBuilderData,
    };
  } catch {
    return null;
  }
};

export async function GET() {
  const items = await scheduler.list();
  return NextResponse.json({ success: true, items });
}

export async function POST(request: Request) {
  const payload = await parseBody(request);
  if (!payload) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid payload. Provide to, subject, data, and a future scheduledAt.",
      },
      { status: 400 },
    );
  }

  const scheduled = await scheduler.schedule(payload);
  return NextResponse.json({ success: true, item: scheduled });
}
