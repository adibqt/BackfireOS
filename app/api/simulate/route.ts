import { NextRequest } from "next/server";
import { getRun, saveVerdicts } from "@/lib/store";
import { parseCampaignImage, runAllAgents } from "@/lib/orchestrator";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { runId: string };
  const run = getRun(body.runId);

  if (!run?.campaign) {
    return new Response(JSON.stringify({ error: "Run not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

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

        for (const agentId of [
          "meme_engineer",
          "regional_outsider",
          "cynical_journalist",
          "rival_brand",
          "regulatory_activist",
        ]) {
          send("agent_start", { agentId });
        }

        const verdicts = await runAllAgents(run.campaign!, imageDescription);

        for (const verdict of verdicts) {
          send("agent_verdict", verdict);
        }

        saveVerdicts(body.runId, verdicts);
        send("complete", { verdicts, imageDescription });
      } catch (error) {
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
