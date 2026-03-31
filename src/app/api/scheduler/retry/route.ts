import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  publishStatusImage,
  publishStatusVideo,
  publishStatusText,
} from "@/lib/waha";

const MAX_RETRIES = 3;

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find FAILED logs that haven't been retried too many times
    // We count retries by looking at how many FAILED logs exist for the same campaign+content+session combo
    const failedLogs = await prisma.publishLog.findMany({
      where: { status: "FAILED" },
      include: {
        campaign: { include: { brand: true } },
        content: true,
        session: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });

    // Group by unique combo to count retries
    const retryMap = new Map<string, typeof failedLogs>();
    for (const log of failedLogs) {
      const key = `${log.campaignId}:${log.contentId}:${log.sessionId}`;
      if (!retryMap.has(key)) retryMap.set(key, []);
      retryMap.get(key)!.push(log);
    }

    let retried = 0;
    let skipped = 0;
    let succeeded = 0;

    for (const logs of Array.from(retryMap.values())) {
      if (logs.length >= MAX_RETRIES) {
        skipped += logs.length;
        continue;
      }

      const log = logs[0]; // Most recent failure
      if (log.session.status !== "WORKING") {
        skipped++;
        continue;
      }

      retried++;
      const baseUrl = process.env.NEXTAUTH_URL || "https://mowhatsapp.aseta.fr";
      const fileUrl = `${baseUrl}${log.content.fileUrl}`;

      // Build caption
      const captionParts: string[] = [];
      if (log.content.caption) captionParts.push(log.content.caption);
      if (log.campaign.brand.ctaType === "LINK" && log.campaign.brand.ctaUrl) {
        captionParts.push(log.campaign.brand.ctaUrl);
      } else if (log.campaign.brand.ctaType === "WHATSAPP" && log.campaign.brand.ctaPhone) {
        captionParts.push(`WhatsApp: ${log.campaign.brand.ctaPhone}`);
      }
      const caption = captionParts.length > 0 ? captionParts.join("\n") : undefined;

      try {
        switch (log.content.type) {
          case "IMAGE":
            await publishStatusImage(log.session.sessionName, fileUrl, log.content.mimeType, caption);
            break;
          case "VIDEO":
            await publishStatusVideo(log.session.sessionName, fileUrl, log.content.mimeType, caption);
            break;
          case "TEXT":
            await publishStatusText(log.session.sessionName, caption || "");
            break;
        }

        // Mark original as retried by creating a new SENT log
        await prisma.publishLog.create({
          data: {
            campaignId: log.campaignId,
            contentId: log.contentId,
            sessionId: log.sessionId,
            status: "SENT",
          },
        });
        succeeded++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`Retry failed for log ${log.id}: ${msg}`);

        await prisma.publishLog.create({
          data: {
            campaignId: log.campaignId,
            contentId: log.contentId,
            sessionId: log.sessionId,
            status: "FAILED",
            error: `Retry: ${msg}`,
          },
        });
      }
    }

    console.log(`Retry complete: ${retried} retried, ${succeeded} succeeded, ${skipped} skipped (max retries or session down)`);

    return NextResponse.json({ retried, succeeded, skipped });
  } catch (error) {
    console.error("Scheduler retry error:", error);
    return NextResponse.json(
      { error: "Retry failed", details: String(error) },
      { status: 500 }
    );
  }
}
