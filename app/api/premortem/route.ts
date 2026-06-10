import { NextRequest, NextResponse } from "next/server";
import { resolveDbContext } from "@/lib/supabase/persistence";
import { getBrand, getRun, listPreMortems, savePreMortem } from "@/lib/store";
import { listOrSeedBranches } from "@/lib/branches/store";
import {
  branchWorstSeverity,
  buildBranchRedTeamSummary,
  buildRedTeamSummary,
  maxSeverity,
} from "@/lib/boardroom/engine";
import { toPreMortemSummary } from "@/lib/db/premortem";
import { classifyFailure, failureForAgent } from "@/lib/premortem/strategies";
import { forwardPublishDate, runPreMortem } from "@/lib/premortem/engine";
import type { PreMortemContext, PreMortemReport } from "@/lib/premortem/types";
import type { CulturalStressMap } from "@/lib/agents/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Condensed view of the highest-stress markets, used to ground the report. */
function formatCulturalFlags(stressMap?: CulturalStressMap | null): string {
  const markets = [...(stressMap?.markets ?? [])]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 3)
    .filter((m) => m.severity > 0);
  if (markets.length === 0) return "";
  return markets
    .map((m) => `  - ${m.marketId} (severity ${m.severity}/100): ${m.summary}`)
    .join("\n");
}

/**
 * Lists every saved pre-mortem for a run so the UI can present a browsable
 * timeline of iterations. Returns full reports (small) plus compact summaries.
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
    const iterations = await listPreMortems(supabase, userId, runId);
    return NextResponse.json({
      // Newest first; the latest is the default view.
      report: iterations[0] ?? null,
      iterations,
      summaries: iterations.map(toPreMortemSummary),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load pre-mortems",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    runId: string;
    /** Optional counterfactual slogan variant to write the report against. */
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

  // A counterfactual variant slogan, when supplied, is written about in place of
  // the campaign's original copy. The brand stays the same, but the grounding is
  // sourced from THAT branch's own verdict (below) so the obituary dramatizes the
  // findings that actually pertain to the variant.
  const reportSlogan =
    typeof body.slogan === "string" && body.slogan.trim().length > 0
      ? body.slogan.trim()
      : run.campaign.slogan;
  const branchId = body.branchId ?? null;
  const branchLabel = body.branchLabel ?? null;

  const verdicts = run.verdicts ?? [];
  // Default grounding: the campaign's original red-team findings.
  let topCritic = verdicts[0] ?? null;
  for (const v of verdicts) {
    if (!topCritic || v.severity > topCritic.severity) topCritic = v;
  }

  let redTeamSummary = buildRedTeamSummary(verdicts);
  let worstSeverity = maxSeverity(verdicts);
  let topCriticName = topCritic?.agentName ?? "the red team";
  let failureType = classifyFailure(verdicts, run.culturalStressMap);
  let backfireScore = Math.round(
    run.scores?.backfireScore ?? maxSeverity(verdicts)
  );

  // When a branch variant is chosen and it carries its own persisted AI verdict,
  // prefer that — it scored THIS exact slogan. Falls back silently to the
  // campaign findings when the branch was never scored (or lookup fails).
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
        if (branchSummary.trim().length > 0) redTeamSummary = branchSummary;
        worstSeverity = branchWorstSeverity(branchAi);
        backfireScore = Math.round(branchAi.scores?.backfireScore ?? worstSeverity);
        if (branchAi.topCritic) {
          topCriticName = branchAi.topCritic.agentName;
          failureType = failureForAgent(branchAi.topCritic.agentId);
        }
      }
    } catch (error) {
      console.error(
        "Failed to load branch verdict for pre-mortem; using campaign findings:",
        error instanceof Error ? error.message : error
      );
    }
  }

  const premortemCtx: PreMortemContext = {
    slogan: reportSlogan,
    brandValues: run.campaign.brandValues ?? "",
    brief: run.campaign.brief ?? "",
    brandName: brand?.name ?? "",
    imageDescription: run.campaign.imageDescription ?? "",
    redTeamSummary,
    worstSeverity,
    topCriticName,
    failureType,
    backfireScore,
    culturalFlags: formatCulturalFlags(run.culturalStressMap),
    publishDate: forwardPublishDate(run.createdAt),
    runCreatedAt: run.createdAt,
  };

  // Abort the in-flight generation if the client navigates away.
  const abortController = new AbortController();
  request.signal.addEventListener("abort", () => abortController.abort());

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Controller already closed (client gone) — ignore.
        }
      };

      try {
        const result = await runPreMortem(
          premortemCtx,
          emit,
          abortController.signal
        );

        let report: PreMortemReport = {
          ...result.report,
          runId: body.runId,
          branchId,
          branchLabel,
        };

        // Persist only a report that finished (not aborted). The save returns it
        // with its iteration number filled in.
        if (!abortController.signal.aborted) {
          try {
            report = await savePreMortem(supabase, userId, report);
          } catch (error) {
            console.error(
              "Failed to persist pre-mortem:",
              error instanceof Error ? error.message : error
            );
          }
        }

        emit("complete", report);
      } catch (error) {
        emit("error", {
          message:
            error instanceof Error ? error.message : "Pre-mortem failed",
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
