import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  publishStatusText,
  publishStatusImage,
  publishStatusVideo,
} from "@/lib/waha";
import { resolveVariables } from "@/lib/promo-code";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { contentId, sessionId } = body;

    if (!contentId || !sessionId) {
      return NextResponse.json(
        { error: "contentId and sessionId are required" },
        { status: 400 }
      );
    }

    const [campaign, content, session] = await Promise.all([
      prisma.campaign.findUnique({
        where: { id: params.id },
        include: { brand: true },
      }),
      prisma.content.findUnique({ where: { id: contentId } }),
      prisma.wahaSession.findUnique({
        where: { id: sessionId },
        include: {
          brands: { include: { brand: true } },
        },
      }),
    ]);

    if (!campaign || !content || !session) {
      return NextResponse.json(
        { error: "Campaign, content, or session not found" },
        { status: 404 }
      );
    }

    if (session.status !== "WORKING") {
      return NextResponse.json(
        { error: `Session ${session.sessionName} is not WORKING (status: ${session.status})` },
        { status: 400 }
      );
    }

    // Find promo code for this brand/session
    const sessionBrand = session.brands.find(
      (b) => b.brandId === campaign.brandId
    );

    // Resolve variables in caption/text
    const variables = {
      promoCode: sessionBrand?.promoCode || "",
      displayName: session.displayName || "",
      brandName: campaign.brand.name,
    };

    const baseUrl = process.env.NEXTAUTH_URL || "https://mowhatsapp.aseta.fr";

    if (content.type === "TEXT") {
      const text = resolveVariables(content.caption || content.fileName, variables);
      await publishStatusText(session.sessionName, text);
    } else if (content.type === "IMAGE") {
      const caption = content.caption
        ? resolveVariables(content.caption, variables)
        : undefined;
      await publishStatusImage(
        session.sessionName,
        `${baseUrl}${content.fileUrl}`,
        content.mimeType,
        caption
      );
    } else if (content.type === "VIDEO") {
      const caption = content.caption
        ? resolveVariables(content.caption, variables)
        : undefined;
      await publishStatusVideo(
        session.sessionName,
        `${baseUrl}${content.fileUrl}`,
        content.mimeType,
        caption
      );
    }

    // Log the test publish
    await prisma.publishLog.create({
      data: {
        campaignId: campaign.id,
        contentId: content.id,
        sessionId: session.id,
        status: "SENT",
      },
    });

    return NextResponse.json({ success: true, sessionName: session.sessionName });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`POST /api/campaigns/${params.id}/test error:`, msg);
    return NextResponse.json(
      { error: `Test d'envoi échoué: ${msg}` },
      { status: 500 }
    );
  }
}
