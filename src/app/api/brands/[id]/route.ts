import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const brand = await prisma.brand.findUnique({
      where: { id: params.id },
      include: {
        campaigns: {
          include: { _count: { select: { contents: true } } },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { sessions: true } },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    return NextResponse.json(brand);
  } catch (error) {
    console.error(`GET /api/brands/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch brand" },
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
    const { name, slug, logoUrl, ctaUrl, ctaType, ctaPhone, active } = body;

    const brand = await prisma.brand.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && {
          slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(ctaUrl !== undefined && { ctaUrl }),
        ...(ctaType !== undefined && { ctaType }),
        ...(ctaPhone !== undefined && { ctaPhone }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json(brand);
  } catch (error) {
    console.error(`PUT /api/brands/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Failed to update brand" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.brand.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/brands/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Failed to delete brand" },
      { status: 400 }
    );
  }
}
