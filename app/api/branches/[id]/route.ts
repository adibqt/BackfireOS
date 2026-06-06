import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveDbContext } from "@/lib/supabase/persistence";
import { deleteBranchSubtree, updateBranch } from "@/lib/branches/store";

export const runtime = "nodejs";

const ToneEnum = z.enum(["playful", "formal", "aggressive", "warm"]);
const LangEnum = z.enum(["en", "bn", "mixed"]);

const ScoresSchema = z.object({
  resonance: z.number(),
  backfireRisk: z.number(),
  backfireScore: z.number(),
  memeability: z.number(),
  polarization: z.number(),
  drift: z.number(),
});

const AiSchema = z
  .object({
    source: z.enum(["ai", "mock", "heuristic"]),
    scores: ScoresSchema,
    topCritic: z
      .object({
        agentId: z.string(),
        agentName: z.string(),
        severity: z.number(),
        reasoning: z.string(),
        sampleAttack: z.string(),
      })
      .nullable(),
    contentKey: z.string(),
    scoredAt: z.string(),
  })
  .nullable();

const PatchSchema = z
  .object({
    label: z.string().max(120).optional(),
    author: z.string().max(80).optional(),
    slogan: z.string().max(400).optional(),
    cast: z.string().max(400).optional(),
    tagline: z.string().max(400).optional(),
    cta: z.string().max(400).optional(),
    riskyLine: z.string().max(400).optional(),
    tone: ToneEnum.optional(),
    language: LangEnum.optional(),
    ai: AiSchema.optional(),
  })
  .strict();

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = PatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid patch" }, { status: 400 });
    }

    const ctx = await resolveDbContext();
    const blocked = gate(ctx);
    if (blocked) return blocked;

    const supabase = ctx.mode === "db" ? ctx.supabase : null;
    const userId = ctx.mode === "db" ? ctx.userId : null;

    const branch = await updateBranch(supabase, userId, id, parsed.data);
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }
    return NextResponse.json({ branch });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update branch";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await resolveDbContext();
    const blocked = gate(ctx);
    if (blocked) return blocked;

    const supabase = ctx.mode === "db" ? ctx.supabase : null;
    const userId = ctx.mode === "db" ? ctx.userId : null;

    const deletedIds = await deleteBranchSubtree(supabase, userId, id);
    return NextResponse.json({ ok: true, deletedIds });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete branch";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
