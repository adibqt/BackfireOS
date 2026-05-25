import { NextRequest, NextResponse } from "next/server";
import type { AgentVerdict } from "@/lib/agents/types";
import { generateMemes } from "@/lib/memes";
import { computeScores } from "@/lib/scoring";
import { completeRun, getRun } from "@/lib/store";
import { resolveDbContext } from "@/lib/supabase/persistence";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      runId: string;
      verdicts?: AgentVerdict[];
    };

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

    const run = await getRun(supabase, body.runId, userId);
    if (!run?.campaign) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const verdicts = body.verdicts ?? run.verdicts ?? [];
    if (verdicts.length === 0) {
      return NextResponse.json({ error: "No verdicts available" }, { status: 400 });
    }

    const { memes, imageWarning } = await generateMemes(run.campaign, verdicts);
    const campaignText = `${run.campaign.slogan} ${run.campaign.brief ?? ""}`;
    const scores = computeScores(
      verdicts,
      memes.map((m) => m.memeabilityScore),
      campaignText,
      run.campaign.brandValues ?? ""
    );

    const completed = await completeRun(
      supabase,
      userId,
      body.runId,
      scores,
      memes,
      imageWarning
    );

    return NextResponse.json({
      run: completed,
      scores,
      memes,
      imageWarning,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Meme generation failed" },
      { status: 500 }
    );
  }
}
