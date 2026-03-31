import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderedIds } = body as { orderedIds: string[] };

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds array is required" },
        { status: 400 }
      );
    }

    // Update positions in a transaction
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.content.update({
          where: { id },
          data: { position: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/content/reorder error:", error);
    return NextResponse.json(
      { error: "Failed to reorder contents" },
      { status: 400 }
    );
  }
}
