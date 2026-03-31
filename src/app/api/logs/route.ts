import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    const sessionId = searchParams.get("sessionId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = {};

    if (brandId) {
      where.campaign = { brandId };
    }
    if (sessionId) {
      where.sessionId = sessionId;
    }
    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.publishLog.findMany({
        where,
        include: {
          campaign: { include: { brand: true } },
          content: true,
          session: true,
        },
        orderBy: { publishedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.publishLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, limit, offset });
  } catch (error) {
    console.error("GET /api/logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
