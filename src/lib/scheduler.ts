import { prisma } from "@/lib/prisma";
import {
  publishStatusText,
  publishStatusImage,
  publishStatusVideo,
} from "@/lib/waha";
import { resolveVariables } from "@/lib/promo-code";
import { differenceInDays } from "date-fns";

export interface SchedulerResult {
  campaignsChecked: number;
  campaignsPublished: number;
  totalPublished: number;
  totalFailed: number;
  details: Array<{
    campaign: string;
    brand: string;
    content: string;
    sessionsTargeted: number;
    sent: number;
    failed: number;
  }>;
}

export async function runScheduler(): Promise<SchedulerResult> {
  const now = new Date();
  const result: SchedulerResult = {
    campaignsChecked: 0,
    campaignsPublished: 0,
    totalPublished: 0,
    totalFailed: 0,
    details: [],
  };

  const campaigns = await prisma.campaign.findMany({
    where: { status: "ACTIVE" },
    include: {
      brand: true,
      contents: { orderBy: { position: "asc" } },
    },
  });

  result.campaignsChecked = campaigns.length;

  for (const campaign of campaigns) {
    // 1. Calculate if today is a publish day
    const daysSinceStart = differenceInDays(now, campaign.startDate);
    if (daysSinceStart < 0) continue;
    if (daysSinceStart % campaign.loopDays !== 0) continue;

    // 2. Calculate which content to publish (circular rotation)
    if (campaign.contents.length === 0) continue;
    const cycleIndex = Math.floor(daysSinceStart / campaign.loopDays);
    const contentIndex = cycleIndex % campaign.contents.length;
    const content = campaign.contents[contentIndex];
    if (!content) continue;

    // 3. Find all WORKING sessions tagged for this brand (with promo codes)
    const sessions = await prisma.wahaSession.findMany({
      where: {
        status: "WORKING",
        brands: { some: { brandId: campaign.brandId } },
      },
      include: {
        brands: {
          where: { brandId: campaign.brandId },
        },
      },
    });

    if (sessions.length === 0) continue;

    result.campaignsPublished++;

    const detail = {
      campaign: campaign.name,
      brand: campaign.brand.name,
      content: content.fileName,
      sessionsTargeted: sessions.length,
      sent: 0,
      failed: 0,
    };

    // 4. Publish to each session with resolved variables
    for (const session of sessions) {
      try {
        const sessionBrand = session.brands[0];
        const variables = {
          promoCode: sessionBrand?.promoCode || "",
          displayName: session.displayName || "",
          brandName: campaign.brand.name,
        };
        await publishStatus(session.sessionName, content, campaign, variables);

        await prisma.publishLog.create({
          data: {
            campaignId: campaign.id,
            contentId: content.id,
            sessionId: session.id,
            status: "SENT",
          },
        });

        detail.sent++;
        result.totalPublished++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.error(
          `Publish failed: campaign=${campaign.name} session=${session.sessionName} error=${errorMessage}`
        );

        await prisma.publishLog.create({
          data: {
            campaignId: campaign.id,
            contentId: content.id,
            sessionId: session.id,
            status: "FAILED",
            error: errorMessage,
          },
        });

        detail.failed++;
        result.totalFailed++;
      }
    }

    result.details.push(detail);
  }

  console.log(
    `Scheduler complete: ${result.campaignsPublished}/${result.campaignsChecked} campaigns, ${result.totalPublished} sent, ${result.totalFailed} failed`
  );

  return result;
}

async function publishStatus(
  sessionName: string,
  content: {
    type: string;
    fileUrl: string;
    mimeType: string;
    caption: string | null;
  },
  campaign: {
    brand: { ctaUrl: string | null; ctaPhone: string | null; ctaType: string; name: string };
  },
  variables?: { promoCode?: string; displayName?: string; brandName?: string }
) {
  // Build caption with CTA, then resolve variables
  let caption = buildCaption(content.caption, campaign.brand);
  if (caption && variables) {
    caption = resolveVariables(caption, variables);
  }

  // Build full URL for the content file
  const baseUrl =
    process.env.NEXTAUTH_URL || "https://mowhatsapp.aseta.fr";
  const fileUrl = `${baseUrl}${content.fileUrl}`;

  switch (content.type) {
    case "IMAGE":
      await publishStatusImage(
        sessionName,
        fileUrl,
        content.mimeType,
        caption
      );
      break;

    case "VIDEO":
      await publishStatusVideo(
        sessionName,
        fileUrl,
        content.mimeType,
        caption
      );
      break;

    case "TEXT": {
      let text = content.caption || content.fileUrl || "";
      if (variables) text = resolveVariables(text, variables);
      await publishStatusText(sessionName, text);
      break;
    }

    default:
      throw new Error(`Unknown content type: ${content.type}`);
  }
}

function buildCaption(
  contentCaption: string | null,
  brand: { ctaUrl: string | null; ctaPhone: string | null; ctaType: string }
): string | undefined {
  const parts: string[] = [];

  if (contentCaption) {
    parts.push(contentCaption);
  }

  // Add CTA
  if (brand.ctaType === "LINK" && brand.ctaUrl) {
    parts.push(brand.ctaUrl);
  } else if (brand.ctaType === "WHATSAPP" && brand.ctaPhone) {
    parts.push(`WhatsApp: ${brand.ctaPhone}`);
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}
