import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: { select: { campaigns: true, sessions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(brands);
  } catch (error) {
    console.error("GET /api/brands error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, logoUrl, ctaUrl, ctaType, ctaPhone } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "name and slug are required" },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        logoUrl: logoUrl || null,
        ctaUrl: ctaUrl || null,
        ctaType: ctaType || "LINK",
        ctaPhone: ctaPhone || null,
      },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("POST /api/brands error:", error);
    const message =
      error instanceof Error && error.message.includes("Unique")
        ? "A brand with this name or slug already exists"
        : "Failed to create brand";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
