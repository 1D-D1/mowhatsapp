import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";

export async function GET() {
  try {
    const now = new Date();
    const sevenDaysAgo = subDays(startOfDay(now), 6);

    // Daily publications for the last 7 days
    const dailyLogs = await prisma.publishLog.groupBy({
      by: ["status"],
      where: { publishedAt: { gte: sevenDaysAgo } },
      _count: true,
    });

    // Per-day breakdown
    const rawLogs = await prisma.publishLog.findMany({
      where: { publishedAt: { gte: sevenDaysAgo } },
      select: { publishedAt: true, status: true },
      orderBy: { publishedAt: "asc" },
    });

    const dailyMap = new Map<string, { sent: number; failed: number }>();
    for (let i = 0; i < 7; i++) {
      const day = subDays(startOfDay(now), 6 - i);
      const key = day.toISOString().slice(0, 10);
      dailyMap.set(key, { sent: 0, failed: 0 });
    }
    for (const log of rawLogs) {
      const key = new Date(log.publishedAt).toISOString().slice(0, 10);
      const entry = dailyMap.get(key);
      if (entry) {
        if (log.status === "SENT") entry.sent++;
        else if (log.status === "FAILED") entry.failed++;
      }
    }

    const dailyChart = Array.from(dailyMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    // Totals
    const totalSent = dailyLogs
      .filter((l) => l.status === "SENT")
      .reduce((sum, l) => sum + l._count, 0);
    const totalFailed = dailyLogs
      .filter((l) => l.status === "FAILED")
      .reduce((sum, l) => sum + l._count, 0);
    const total = totalSent + totalFailed;
    const successRate = total > 0 ? Math.round((totalSent / total) * 100) : 0;

    // Top brands by publications
    const topBrands = await prisma.publishLog.groupBy({
      by: ["campaignId"],
      where: { publishedAt: { gte: sevenDaysAgo }, status: "SENT" },
      _count: true,
      orderBy: { _count: { campaignId: "desc" } },
      take: 5,
    });

    const campaignIds = topBrands.map((t) => t.campaignId);
    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: campaignIds } },
      include: { brand: { select: { name: true } } },
    });

    const topBrandsData = topBrands.map((t) => {
      const campaign = campaigns.find((c) => c.id === t.campaignId);
      return {
        brand: campaign?.brand.name ?? "—",
        campaign: campaign?.name ?? "—",
        count: t._count,
      };
    });

    return NextResponse.json({
      dailyChart,
      totalSent,
      totalFailed,
      successRate,
      topBrands: topBrandsData,
    });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
