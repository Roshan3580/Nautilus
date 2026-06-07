import { Resend } from "resend";

import { renderEmailHtml } from "@/lib/email-render";
import type { EmailBuilderData } from "@/lib/puck-config";

export type SendEmailInput = {
  to: string;
  subject: string;
  data: EmailBuilderData;
};

export type SendEmailResult = {
  success: boolean;
  message: string;
  mock?: boolean;
  id?: string | null;
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const html = await renderEmailHtml(input.data, input.subject);
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: true,
      mock: true,
      message:
        "Dev mode mock success: RESEND_API_KEY is not set. Email was not sent but payload was accepted.",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    const result = await resend.emails.send({
      from,
      to: [input.to],
      subject: input.subject,
      html,
    });

    return {
      success: true,
      message: "Email sent successfully.",
      id: result.data?.id ?? null,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unexpected error while sending email.",
    };
  }
}
