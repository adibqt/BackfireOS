import { NextRequest, NextResponse } from "next/server";
import type { AgentVerdict } from "@/lib/agents/types";
import { generateMemes } from "@/lib/memes";
import { computeScores } from "@/lib/scoring";
import { completeRun, getRun } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      runId: string;
      verdicts?: AgentVerdict[];
    };

    const run = getRun(body.runId);
    if (!run?.campaign) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const verdicts = body.verdicts ?? run.verdicts ?? [];
    if (verdicts.length === 0) {
      return NextResponse.json({ error: "No verdicts available" }, { status: 400 });
    }

    const memes = await generateMemes(run.campaign, verdicts);
    const campaignText = `${run.campaign.slogan} ${run.campaign.brief ?? ""}`;
    const scores = computeScores(
      verdicts,
      memes.map((m) => m.memeabilityScore),
      campaignText,
      run.campaign.brandValues ?? ""
    );

    const completed = completeRun(body.runId, scores, memes);

    return NextResponse.json({
      run: completed,
      scores,
      memes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Meme generation failed" },
      { status: 500 }
    );
  }
}
