import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDocsConfig, saveDocsConfig } from "@/lib/docs/config-store";
import { getDocsAdmin } from "@/lib/docs/server";

export const dynamic = "force-dynamic";

const teamMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  role: z.string().max(160).default(""),
  email: z.string().max(160).default(""),
  avatarUrl: z.string().max(2048).optional(),
});

// Accept any parseable date string (ISO with offset preferred). We validate with
// Date.parse rather than zod's string-format helpers to stay version-agnostic.
const isoDate = z
  .string()
  .max(40)
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: "Invalid date" });

const patchSchema = z.object({
  visibility: z.enum(["on", "off", "scheduled"]).optional(),
  startsAt: isoDate.nullable().optional(),
  endsAt: isoDate.nullable().optional(),
  previewToken: z.string().max(200).nullable().optional(),
  teamName: z.string().max(160).optional(),
  team: z.array(teamMemberSchema).max(50).optional(),
  contentOverrides: z.record(z.string(), z.string()).optional(),
});

// Admin-only: returns the full config (including the preview token).
export async function GET() {
  const { isAdmin } = await getDocsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const config = await getDocsConfig();
  return NextResponse.json({ config });
}

// Admin-only: update visibility / schedule / team / content overrides.
export async function PUT(request: NextRequest) {
  const { isAdmin, userId } = await getDocsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const patch = parsed.data;
  // Guard: a scheduled window must have an end after its start.
  if (patch.startsAt && patch.endsAt && Date.parse(patch.endsAt) <= Date.parse(patch.startsAt)) {
    return NextResponse.json(
      { error: "End time must be after start time" },
      { status: 400 }
    );
  }

  try {
    const config = await saveDocsConfig(patch, userId);
    return NextResponse.json({ config });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
