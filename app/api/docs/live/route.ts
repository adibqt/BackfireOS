import { NextResponse } from "next/server";
import { getLiveStats } from "@/lib/docs/live";
import { getDocsAccess } from "@/lib/docs/server";

export const dynamic = "force-dynamic";

// Live system stats for the /docs dashboard. Gated by the same access decision as
// the page itself so stats are not exposed while /docs is private.
export async function GET() {
  const access = await getDocsAccess();
  if (!access.allowed) {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }
  const stats = await getLiveStats();
  return NextResponse.json({ stats });
}
