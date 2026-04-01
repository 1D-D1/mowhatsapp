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

    // Manual proxy add: { mode: "manual", server, username, password, country }
    // Bulk paste: { mode: "bulk", proxies: "host:port:user:pass\n..." }
    // IPRoyal API: { mode: "iproyal", count, country }
    const mode = body.mode || "iproyal";

    if (mode === "manual") {
      const { server, username, password, country = "GF" } = body;
      if (!server || !username || !password) {
        return NextResponse.json(
          { error: "server, username, and password are required" },
          { status: 400 }
        );
      }
      const proxy = await prisma.proxy.create({
        data: { server, username, password, country: country.toUpperCase(), maxSessions: 2, active: true },
      });
      return NextResponse.json({ created: 1, proxies: [proxy] }, { status: 201 });
    }

    if (mode === "bulk") {
      const { proxies: raw, country = "GF" } = body;
      if (!raw || typeof raw !== "string") {
        return NextResponse.json(
          { error: "proxies string is required (one per line: host:port:user:pass)" },
          { status: 400 }
        );
      }
      const lines = raw.trim().split("\n").filter((l: string) => l.trim());
      const created = [];
      for (const line of lines) {
        const parts = line.trim().split(":");
        if (parts.length < 4) continue;
        const server = `${parts[0]}:${parts[1]}`;
        const username = parts[2];
        const password = parts.slice(3).join(":");
        const proxy = await prisma.proxy.create({
          data: { server, username, password, country: country.toUpperCase(), maxSessions: 2, active: true },
        });
        created.push(proxy);
      }
      return NextResponse.json({ created: created.length, proxies: created }, { status: 201 });
    }

    // Default: IPRoyal API generation
    const { count = 5, country = "gf" } = body;
    const proxies = await generateNewBatch(count, country);
    return NextResponse.json(
      { created: proxies.length, proxies },
      { status: 201 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/proxies error:", msg);
    return NextResponse.json(
      { error: `Failed to add proxies: ${msg}` },
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

    const proxy = await prisma.proxy.findUnique({
      where: { id },
      include: { _count: { select: { sessions: true } } },
    });

    if (!proxy) {
      return NextResponse.json({ error: "Proxy not found" }, { status: 404 });
    }

    if (proxy._count.sessions > 0) {
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
