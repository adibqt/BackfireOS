import { NextRequest, NextResponse } from "next/server";
import {
  createRun,
  getRun,
  saveCampaign,
} from "@/lib/store";
import type { CampaignInput } from "@/lib/agents/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CampaignInput;
    if (!body.slogan?.trim()) {
      return NextResponse.json({ error: "Slogan is required" }, { status: 400 });
    }

    const campaignId = crypto.randomUUID();
    saveCampaign({
      id: campaignId,
      slogan: body.slogan.trim(),
      brandValues: body.brandValues?.trim(),
      brief: body.brief?.trim(),
      imageUrl: body.imageUrl,
      imageBase64: body.imageBase64,
    });

    const run = createRun(campaignId);
    return NextResponse.json({
      campaignId,
      runId: run.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create campaign" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId required" }, { status: 400 });
  }

  const run = getRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}
