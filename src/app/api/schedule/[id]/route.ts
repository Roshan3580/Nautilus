import { NextResponse } from "next/server";

import { scheduler } from "@/lib/scheduler";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id.trim()) {
    return NextResponse.json({ success: false, message: "Missing schedule id." }, { status: 400 });
  }

  try {
    const cancelled = await scheduler.cancel(id);

    if (!cancelled) {
      return NextResponse.json({ success: false, message: "Scheduled email not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: cancelled });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel scheduled email.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
