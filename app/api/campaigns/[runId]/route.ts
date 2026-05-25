import { NextRequest, NextResponse } from "next/server";
import { resolveDbContext } from "@/lib/supabase/persistence";
import { deleteRun } from "@/lib/store";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    const ctx = await resolveDbContext();
    if (ctx.mode === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (ctx.mode === "db_unconfigured") {
      return NextResponse.json(
        { error: "Database persistence is not configured" },
        { status: 503 }
      );
    }

    const supabase = ctx.mode === "db" ? ctx.supabase : null;
    const userId = ctx.mode === "db" ? ctx.userId : null;

    const deleted = await deleteRun(supabase, userId, runId);
    if (!deleted) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
