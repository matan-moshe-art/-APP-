import { NextResponse } from "next/server";
import { getStatus } from "@/lib/pending-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const correlationId = id.trim();

  if (!correlationId) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const entry = getStatus(correlationId);

  if (!entry) {
    return NextResponse.json(
      { error: "not_found", correlationId },
      { status: 404 },
    );
  }

  if (entry.status === "completed") {
    return NextResponse.json({
      status: "completed",
      result: entry.result,
    });
  }

  return NextResponse.json({ status: "pending" });
}
