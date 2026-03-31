import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNewBatch, getProxyStats } from "@/lib/proxy-manager";

export async function GET() {
  try {
    const stats = await getProxyStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("GET /api/proxies error:", error);
    return NextResponse.json(
      { error: "Failed to fetch proxies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { count = 5, country = "gf" } = body;

    const proxies = await generateNewBatch(count, country);
    return NextResponse.json(
      { created: proxies.length, proxies },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/proxies error:", error);
    return NextResponse.json(
      { error: "Failed to generate proxies" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Check if proxy has active sessions
    const proxy = await prisma.proxy.findUnique({
      where: { id },
      include: { _count: { select: { sessions: true } } },
    });

    if (!proxy) {
      return NextResponse.json({ error: "Proxy not found" }, { status: 404 });
    }

    if (proxy._count.sessions > 0) {
      // Deactivate instead of delete if sessions are using it
      await prisma.proxy.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({ deactivated: true });
    }

    await prisma.proxy.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("DELETE /api/proxies error:", error);
    return NextResponse.json(
      { error: "Failed to delete proxy" },
      { status: 400 }
    );
  }
}
