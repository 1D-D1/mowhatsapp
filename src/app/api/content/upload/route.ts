import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "video/mp4",
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const campaignId = formData.get("campaignId") as string | null;
    const caption = formData.get("caption") as string | null;

    if (!file || !campaignId) {
      return NextResponse.json(
        { error: "file and campaignId are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed. Accepted: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      );
    }

    // Verify campaign exists
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

    // Create upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", campaignId);
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name);
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileName = `${baseName}-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Determine content type
    const contentType = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";

    // Create content record
    const content = await prisma.content.create({
      data: {
        campaignId,
        type: contentType,
        fileUrl: `/uploads/${campaignId}/${fileName}`,
        fileName: file.name,
        mimeType: file.type,
        caption: caption || null,
        position: campaign._count.contents,
      },
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error("POST /api/content/upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload content" },
      { status: 500 }
    );
  }
}
