import { NextRequest, NextResponse } from "next/server";
import { resolveDbContext } from "@/lib/supabase/persistence";
import {
  attachImageBase64,
  createCampaignAndRun,
  getBrand,
  getCampaignImageBase64,
  getRun,
  listRuns,
} from "@/lib/store";
import type { CampaignInput } from "@/lib/agents/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CampaignInput;
    if (!body.slogan?.trim()) {
      return NextResponse.json({ error: "Slogan is required" }, { status: 400 });
    }

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

    if (body.brandId) {
      const brand = await getBrand(supabase, userId, body.brandId);
      if (!brand) {
        return NextResponse.json(
          { error: "Brand not found or not owned by user" },
          { status: 400 }
        );
      }
    }

    const { campaignId, runId } = await createCampaignAndRun(
      supabase,
      userId,
      body
    );

    return NextResponse.json({ campaignId, runId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create campaign" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const runId = request.nextUrl.searchParams.get("runId");
    const list = request.nextUrl.searchParams.get("list");

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

    if (list === "true") {
      const runs = await listRuns(supabase, userId);
      return NextResponse.json({ runs });
    }

    if (!runId) {
      return NextResponse.json({ error: "runId required" }, { status: 400 });
    }

    const run = await getRun(supabase, runId, userId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    const imageBase64 = getCampaignImageBase64(run.campaignId);
    return NextResponse.json(attachImageBase64(run, imageBase64));
  } catch (error) {
    console.error("GET /api/campaigns failed:", error);
    const message = error instanceof Error ? error.message : "Failed to load runs";
    const hint =
      message.includes("permission denied") ?
        "Run supabase/fix-grants.sql in the Supabase SQL Editor, then reload."
      : message;
    return NextResponse.json({ error: hint }, { status: 500 });
  }
}
