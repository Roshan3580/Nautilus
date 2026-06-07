import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email-send";
import type { EmailBuilderData } from "@/lib/puck-config";

type SendRequest = {
  to: string;
  subject: string;
  data: EmailBuilderData;
};

const parseBody = async (request: Request): Promise<SendRequest | null> => {
  try {
    const body = (await request.json()) as Partial<SendRequest>;

    if (
      typeof body.to !== "string" ||
      typeof body.subject !== "string" ||
      !body.data ||
      !Array.isArray(body.data.content)
    ) {
      return null;
    }

    if (!body.to.trim() || !body.subject.trim()) {
      return null;
    }

    return {
      to: body.to.trim(),
      subject: body.subject.trim(),
      data: body.data,
    };
  } catch {
    return null;
  }
};

export async function POST(request: Request) {
  const payload = await parseBody(request);

  if (!payload) {
    return NextResponse.json(
      { success: false, message: "Invalid payload. Provide to, subject, and data." },
      { status: 400 },
    );
  }

  const result = await sendEmail(payload);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        message: result.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: result.message,
    mock: result.mock,
    to: payload.to,
    subject: payload.subject,
    id: result.id ?? null,
  });
}
