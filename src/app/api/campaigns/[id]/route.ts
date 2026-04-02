import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
      include: {
        brand: true,
        contents: { orderBy: { position: "asc" } },
        _count: { select: { publishLogs: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error(`GET /api/campaigns/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, loopDays, publishTime, status, startDate, discountPercent } = body;

    if (loopDays !== undefined && (loopDays < 1 || loopDays > 7)) {
      return NextResponse.json(
        { error: "loopDays must be between 1 and 7" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(loopDays !== undefined && { loopDays }),
        ...(publishTime !== undefined && { publishTime }),
        ...(status !== undefined && { status }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(discountPercent !== undefined && { discountPercent }),
      },
      include: { brand: true },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error(`PUT /api/campaigns/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.campaign.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/campaigns/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 400 }
    );
  }
}
