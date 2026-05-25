import { NextRequest, NextResponse } from "next/server";
import { resolveDbContext } from "@/lib/supabase/persistence";
import { createBrand, listBrands } from "@/lib/store";

export async function GET() {
  try {
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

    const brands = await listBrands(supabase, userId);
    return NextResponse.json({ brands });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list brands";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      statedValues?: string;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
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

    const brand = await createBrand(supabase, userId, {
      name: body.name,
      description: body.description,
      statedValues: body.statedValues,
    });

    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create brand";
    const hint = message.includes("duplicate key")
      ? "A brand with that name already exists."
      : message;
    return NextResponse.json({ error: hint }, { status: 500 });
  }
}
