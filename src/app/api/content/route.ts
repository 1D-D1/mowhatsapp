import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 }
      );
    }

    const contents = await prisma.content.findMany({
      where: { campaignId },
      orderBy: { position: "asc" },
    });

    return NextResponse.json(contents);
  } catch (error) {
    console.error("GET /api/content error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contents" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, caption, position } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const content = await prisma.content.update({
      where: { id },
      data: {
        ...(caption !== undefined && { caption }),
        ...(position !== undefined && { position }),
      },
    });

    return NextResponse.json(content);
  } catch (error) {
    console.error("PUT /api/content error:", error);
    return NextResponse.json(
      { error: "Failed to update content" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    await prisma.content.delete({ where: { id } });

    if (content.type !== "TEXT" && content.fileUrl) {
      try {
        const filePath = path.join(process.cwd(), "public", content.fileUrl);
        await unlink(filePath);
      } catch (error) {
        console.error("File cleanup error (non-blocking):", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/content error:", error);
    return NextResponse.json(
      { error: "Failed to delete content" },
      { status: 400 }
    );
  }
}
