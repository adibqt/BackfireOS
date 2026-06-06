import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveDbContext } from "@/lib/supabase/persistence";
import { createBranch, listOrSeedBranches } from "@/lib/branches/store";
import { getCampaignSeed } from "@/lib/store";

export const runtime = "nodejs";

const ToneEnum = z.enum(["playful", "formal", "aggressive", "warm"]);
const LangEnum = z.enum(["en", "bn", "mixed"]);

const CreateSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  campaignId: z.string().uuid().nullable(),
  createdAt: z.number().int().nonnegative(),
  label: z.string().max(120),
  author: z.string().max(80),
  slogan: z.string().max(400),
  cast: z.string().max(400),
  tagline: z.string().max(400),
  cta: z.string().max(400),
  riskyLine: z.string().max(400),
  tone: ToneEnum,
  language: LangEnum,
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

    // A real campaign tree seeds its root from the campaign (and its verdict).
    let seed = null;
    if (campaignId) {
      seed = await getCampaignSeed(supabase, userId, campaignId);
      if (!seed) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
    }

    const branches = await listOrSeedBranches(supabase, userId, campaignId, seed);
    return NextResponse.json({
      branches,
      persisted: true,
      mode: ctx.mode,
      campaignId: campaignId ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list branches";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = CreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid branch payload" },
        { status: 400 }
      );
    }

    const ctx = await resolveDbContext();
    const blocked = gate(ctx);
    if (blocked) return blocked;

    const supabase = ctx.mode === "db" ? ctx.supabase : null;
    const userId = ctx.mode === "db" ? ctx.userId : null;

    const branch = await createBranch(supabase, userId, parsed.data);
    return NextResponse.json({ branch }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create branch";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
