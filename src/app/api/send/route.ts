import { NextResponse } from "next/server";
import { Resend } from "resend";
import { renderEmailHtml } from "@/lib/email-render";
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
  const html = await renderEmailHtml(payload.data, payload.subject);

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      success: true,
      message:
        "Dev mode mock success: RESEND_API_KEY is not set. Email was not sent but payload was accepted.",
      mock: true,
      to: payload.to,
      subject: payload.subject,
    });
  }

  try {
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    const result = await resend.emails.send({
      from,
      to: [payload.to],
      subject: payload.subject,
      html,
    });

    return NextResponse.json({
      success: true,
      message: "Email sent successfully.",
      id: result.data?.id ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while sending email.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
