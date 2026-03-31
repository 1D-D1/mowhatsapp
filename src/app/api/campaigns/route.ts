import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");

    const campaigns = await prisma.campaign.findMany({
      where: brandId ? { brandId } : undefined,
      include: {
        brand: true,
        _count: { select: { contents: true, publishLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("GET /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandId, name, loopDays, publishTime, startDate } = body;

    if (!brandId || !name || !loopDays) {
      return NextResponse.json(
        { error: "brandId, name, and loopDays are required" },
        { status: 400 }
      );
    }

    if (loopDays < 1 || loopDays > 7) {
      return NextResponse.json(
        { error: "loopDays must be between 1 and 7" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        brandId,
        name,
        loopDays,
        publishTime: publishTime || "09:00",
        startDate: startDate ? new Date(startDate) : new Date(),
      },
      include: { brand: true },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 400 }
    );
  }
}
