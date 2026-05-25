import { NextRequest } from "next/server";
import { resolveDbContext } from "@/lib/supabase/persistence";
import {
  attachImageBase64,
  getBrand,
  getCampaignImageBase64,
  getRun,
  listPastCampaigns,
  markRunFailed,
  saveImageDescription,
  saveStressMap,
  saveVerdicts,
} from "@/lib/store";
import { parseCampaignImage, runAllAgents } from "@/lib/orchestrator";
import { generateCulturalStressMap } from "@/lib/cultural-stress-map";
import {
  formatBrandContext,
  formatPastCampaigns,
} from "@/lib/agents/definitions";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    runId: string;
    imageBase64?: string;
  };

  const ctx = await resolveDbContext();
  if (ctx.mode === "unauthorized") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (ctx.mode === "db_unconfigured") {
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = ctx.mode === "db" ? ctx.supabase : null;
  const userId = ctx.mode === "db" ? ctx.userId : null;

  let run = await getRun(supabase, body.runId, userId);
  if (!run?.campaign) {
    return new Response(JSON.stringify({ error: "Run not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const imageBase64 =
    body.imageBase64 ?? getCampaignImageBase64(run.campaignId);
  run = attachImageBase64(run, imageBase64);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        send("status", { message: "Parsing campaign visual..." });
        const imageDescription = await parseCampaignImage(run.campaign!);

        if (imageDescription && run.campaign) {
          await saveImageDescription(
            supabase,
            run.campaignId,
            imageDescription
          );
        }

        for (const agentId of [
          "meme_engineer",
          "regional_outsider",
          "cynical_journalist",
          "rival_brand",
          "regulatory_activist",
          "brand_purist",
        ]) {
          send("agent_start", { agentId });
        }

        const brandId = run.campaign?.brandId ?? null;
        const brand = brandId
          ? await getBrand(supabase, userId, brandId)
          : null;

        const pastSnapshots = await listPastCampaigns(
          supabase,
          brand,
          run.campaignId,
          10
        );
        const pastCampaigns = formatPastCampaigns(pastSnapshots);
        const brandContext = formatBrandContext(brand);

        const verdicts = await runAllAgents(
          run.campaign!,
          imageDescription,
          pastCampaigns,
          brandContext
        );

        for (const verdict of verdicts) {
          send("agent_verdict", verdict);
        }

        send("status", { message: "Building cultural stress map..." });
        const culturalStressMap = await generateCulturalStressMap(
          run.campaign!,
          imageDescription,
          verdicts
        );
        send("stress_map", culturalStressMap);

        await saveVerdicts(supabase, body.runId, verdicts, userId);
        await saveStressMap(supabase, body.runId, culturalStressMap, userId);
        send("complete", { verdicts, imageDescription, culturalStressMap });
      } catch (error) {
        await markRunFailed(supabase, body.runId, userId);
        send("error", {
          message: error instanceof Error ? error.message : "Simulation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
