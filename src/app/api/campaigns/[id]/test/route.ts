import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import {
  publishStatusText,
  publishStatusImage,
  publishStatusVideo,
  getSession as wahaGetSession,
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
        { error: `Session ${session.sessionName} n'est pas connectée (status: ${session.status})` },
        { status: 400 }
      );
    }

    // Verify session is truly WORKING on WAHA (not just in our DB)
    try {
      const wahaSession = await wahaGetSession(session.sessionName);
      if (wahaSession.status !== "WORKING") {
        // Sync DB status
        const mapped = wahaSession.status === "FAILED" ? "FAILED"
          : wahaSession.status === "STOPPED" ? "STOPPED"
          : "PENDING";
        await prisma.wahaSession.update({
          where: { id: session.id },
          data: { status: mapped as "FAILED" | "STOPPED" | "PENDING" },
        });
        return NextResponse.json(
          { error: `Session ${session.sessionName} n'est pas prête sur WAHA (status WAHA: ${wahaSession.status}). Actualisez la page.` },
          { status: 400 }
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: `Impossible de vérifier la session WAHA: ${msg}` },
        { status: 502 }
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

    if (content.type === "TEXT") {
      const text = resolveVariables(content.caption || content.fileName, variables);
      await publishStatusText(session.sessionName, text);
    } else if (content.type === "IMAGE" || content.type === "VIDEO") {
      const caption = content.caption
        ? resolveVariables(content.caption, variables)
        : undefined;

      // Read file from disk and send as base64 (avoids URL accessibility issues)
      const filePath = path.join(process.cwd(), "public", content.fileUrl);
      let fileData: string;
      try {
        const buffer = await readFile(filePath);
        fileData = buffer.toString("base64");
      } catch {
        return NextResponse.json(
          { error: `Fichier introuvable: ${content.fileUrl}` },
          { status: 404 }
        );
      }

      const file = { data: fileData, mimetype: content.mimeType };

      if (content.type === "IMAGE") {
        await publishStatusImage(session.sessionName, file, caption);
      } else {
        await publishStatusVideo(session.sessionName, file, caption);
      }
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
