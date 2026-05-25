import { NextRequest, NextResponse } from "next/server";
import { resolveDbContext } from "@/lib/supabase/persistence";
import { deleteBrand, getBrand } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const brand = await getBrand(supabase, userId, id);
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }
    return NextResponse.json({ brand });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load brand";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    await deleteBrand(supabase, userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete brand";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
