import { NextRequest, NextResponse } from "next/server";
import { resolveDbContext } from "@/lib/supabase/persistence";
import { getBrand, getRun, listDebates, saveDebate } from "@/lib/store";
import { listOrSeedBranches } from "@/lib/branches/store";
import { toIterationSummary } from "@/lib/db/boardroom";
import {
  branchWorstSeverity,
  buildBranchRedTeamSummary,
  buildMarketSummary,
  buildRedTeamSummary,
  maxSeverity,
  runDebate,
  type EmitFn,
} from "@/lib/boardroom/engine";
import type { BoardroomTranscript, DebateContext } from "@/lib/boardroom/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Lists every saved debate iteration for a run so the boardroom can present a
 * browsable timeline. Returns full transcripts (small) plus compact summaries.
 */
export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ error: "runId required" }, { status: 400 });
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

  try {
    const iterations = await listDebates(supabase, userId, runId);
    return NextResponse.json({
      // Newest first; the latest is the default view.
      transcript: iterations[0] ?? null,
      iterations,
      summaries: iterations.map(toIterationSummary),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load debate",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    runId: string;
    /** Optional counterfactual slogan variant to debate instead of the original. */
    slogan?: string;
    branchId?: string | null;
    branchLabel?: string | null;
  };

  const dbCtx = await resolveDbContext();
  if (dbCtx.mode === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (dbCtx.mode === "db_unconfigured") {
    return NextResponse.json(
      { error: "Database persistence is not configured" },
      { status: 503 }
    );
  }

  const supabase = dbCtx.mode === "db" ? dbCtx.supabase : null;
  const userId = dbCtx.mode === "db" ? dbCtx.userId : null;

  const run = await getRun(supabase, body.runId, userId);
  if (!run?.campaign) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const brand = run.campaign.brandId
    ? await getBrand(supabase, userId, run.campaign.brandId)
    : null;

  // A counterfactual variant slogan, when supplied, is debated in place of the
  // campaign's original copy. The brief and brand stay the same, but the
  // red-team grounding is sourced from THAT branch's own verdict (below) so the
  // room argues the variant against the findings that actually pertain to it.
  const debatedSlogan =
    typeof body.slogan === "string" && body.slogan.trim().length > 0
      ? body.slogan.trim()
      : run.campaign.slogan;
  const branchId = body.branchId ?? null;
  const branchLabel = body.branchLabel ?? null;

  // Default grounding: the campaign's original red-team verdicts.
  const verdicts = run.verdicts ?? [];
  let redTeamSummary = buildRedTeamSummary(verdicts);
  let worstSeverity = maxSeverity(verdicts);

  // When a branch variant is debated and it carries its own persisted AI
  // verdict, prefer that — it scored this exact slogan. Falls back silently to
  // the campaign findings when the branch was never scored (or lookup fails).
  if (branchId) {
    try {
      const branches = await listOrSeedBranches(
        supabase,
        userId,
        run.campaignId,
        null
      );
      const branchAi = branches.find((b) => b.id === branchId)?.ai ?? null;
      if (branchAi) {
        const branchSummary = buildBranchRedTeamSummary(branchAi);
        if (branchSummary.trim().length > 0) {
          redTeamSummary = branchSummary;
          worstSeverity = branchWorstSeverity(branchAi);
        }
      }
    } catch (error) {
      console.error(
        "Failed to load branch verdict for boardroom debate; using campaign findings:",
        error instanceof Error ? error.message : error
      );
    }
  }

  // Per-market cultural-stress grounding so the room argues regional fit
  // (Dhaka vs. Sylhet vs. rural), not just the single worst severity number.
  const marketSummary = buildMarketSummary(run.culturalStressMap);

  const debateContext: DebateContext = {
    slogan: debatedSlogan,
    brandValues: run.campaign.brandValues ?? "",
    brief: run.campaign.brief ?? "",
    imageDescription: run.campaign.imageDescription ?? "",
    brandName: brand?.name ?? "",
    region: "Bangladesh",
    marketSummary,
    redTeamSummary,
    messages: [],
  };

  // Abort the in-flight debate if the client navigates away — stop spending the
  // request budget on a transcript nobody is watching.
  const abortController = new AbortController();
  request.signal.addEventListener("abort", () => abortController.abort());

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit: EmitFn = (event, data) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Controller already closed (client gone) — ignore.
        }
      };

      try {
        const result = await runDebate(
          debateContext,
          worstSeverity,
          emit,
          abortController.signal
        );

        let transcript: BoardroomTranscript = {
          id: crypto.randomUUID(),
          runId: body.runId,
          // iteration is assigned by the store on save; 0 is a placeholder.
          iteration: 0,
          campaignSlogan: debatedSlogan,
          branchId,
          branchLabel,
          messages: result.messages,
          synthesis: result.synthesis,
          rounds: result.rounds,
          converged: result.converged,
          degraded: result.degraded,
          createdAt: new Date().toISOString(),
        };

        // Persist only a debate that actually ran to completion (not aborted).
        // The save returns the transcript with its iteration number filled in.
        if (!abortController.signal.aborted) {
          try {
            transcript = await saveDebate(supabase, userId, transcript);
          } catch (error) {
            console.error(
              "Failed to persist boardroom debate:",
              error instanceof Error ? error.message : error
            );
          }
        }

        emit("complete", transcript);
      } catch (error) {
        emit("error", {
          message:
            error instanceof Error ? error.message : "Debate failed",
        });
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
