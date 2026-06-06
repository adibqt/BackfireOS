import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveDbContext } from "@/lib/supabase/persistence";
import { appendEvent, listEvents } from "@/lib/branches/store";

export const runtime = "nodejs";

const CreateSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid().nullable(),
  branchId: z.string().uuid().nullable(),
  type: z.enum(["fork", "edit", "prune", "score", "baseline"]),
  message: z.string().max(400),
  ts: z.number().int().nonnegative(),
});

function gate(ctx: Awaited<ReturnType<typeof resolveDbContext>>) {
  if (ctx.mode === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (ctx.mode === "db_unconfigured") {
    return NextResponse.json(
      { error: "Database persistence is not configured" },
      { status: 503 }
    );
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const campaignId = request.nextUrl.searchParams.get("campaign");

    const ctx = await resolveDbContext();
    const blocked = gate(ctx);
    if (blocked) return blocked;

    const supabase = ctx.mode === "db" ? ctx.supabase : null;
    const userId = ctx.mode === "db" ? ctx.userId : null;

    const events = await listEvents(supabase, userId, campaignId ?? null);
    return NextResponse.json({ events });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = CreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    }

    const ctx = await resolveDbContext();
    const blocked = gate(ctx);
    if (blocked) return blocked;

    const supabase = ctx.mode === "db" ? ctx.supabase : null;
    const userId = ctx.mode === "db" ? ctx.userId : null;

    const event = await appendEvent(supabase, userId, parsed.data);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to append event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
