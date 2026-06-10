import { NextRequest, NextResponse } from "next/server";
import { getKompendiumPlannerDocument } from "@/lib/originalModules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const viewParam = request.nextUrl.searchParams.get("view") ?? "list";
    if (viewParam !== "list" && viewParam !== "client") {
      return new NextResponse("Invalid view", { status: 400 });
    }

    const view = viewParam;
    let clientIndex: number | undefined;

    if (view === "client") {
      const indexRaw = request.nextUrl.searchParams.get("index");
      if (!indexRaw || !/^\d+$/.test(indexRaw)) {
        return new NextResponse("Invalid index", { status: 400 });
      }
      clientIndex = Number.parseInt(indexRaw, 10);
    }

    const planner = await getKompendiumPlannerDocument({ view, clientIndex });
    if (!planner) {
      return new NextResponse("Planner not found", { status: 404 });
    }

    return new NextResponse(planner.document, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    console.error("[api/plany/document]", error);
    return new NextResponse("Planner load failed", { status: 500 });
  }
}
