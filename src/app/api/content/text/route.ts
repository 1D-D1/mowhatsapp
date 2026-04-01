import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, text, backgroundColor } = body;

    if (!campaignId || !text) {
      return NextResponse.json(
        { error: "campaignId and text are required" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { _count: { select: { contents: true } } },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const content = await prisma.content.create({
      data: {
        campaignId,
        type: "TEXT",
        fileUrl: backgroundColor || "#1a1a2e",
        fileName: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
        mimeType: "text/plain",
        caption: text,
        position: campaign._count.contents,
      },
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error("POST /api/content/text error:", error);
    return NextResponse.json(
      { error: "Failed to create text content" },
      { status: 500 }
    );
  }
}
