import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listSessions } from "@/lib/waha";

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all sessions from WAHA
    let wahaSessions;
    try {
      wahaSessions = await listSessions();
    } catch (error) {
      console.error("Failed to fetch WAHA sessions:", error);
      return NextResponse.json(
        { error: "Failed to connect to WAHA" },
        { status: 502 }
      );
    }

    // Get all DB sessions
    const dbSessions = await prisma.wahaSession.findMany();

    let synced = 0;
    let notFound = 0;

    for (const dbSession of dbSessions) {
      const wahaSession = wahaSessions.find(
        (w) => w.name === dbSession.sessionName
      );

      if (!wahaSession) {
        // Session exists in DB but not in WAHA — mark as FAILED
        if (dbSession.status !== "FAILED" && dbSession.status !== "STOPPED") {
          await prisma.wahaSession.update({
            where: { id: dbSession.id },
            data: { status: "FAILED" },
          });
          notFound++;
        }
        continue;
      }

      // Map WAHA status
      const newStatus = mapStatus(wahaSession.status);

      if (newStatus !== dbSession.status) {
        await prisma.wahaSession.update({
          where: { id: dbSession.id },
          data: {
            status: newStatus,
            ...(newStatus === "WORKING" ? { lastSeenAt: new Date() } : {}),
          },
        });
        synced++;
      } else if (newStatus === "WORKING") {
        // Update lastSeenAt even if status unchanged
        await prisma.wahaSession.update({
          where: { id: dbSession.id },
          data: { lastSeenAt: new Date() },
        });
      }
    }

    console.log(
      `Sync complete: ${synced} updated, ${notFound} not found in WAHA`
    );

    return NextResponse.json({
      total: dbSessions.length,
      synced,
      notFound,
    });
  } catch (error) {
    console.error("Scheduler sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}

function mapStatus(
  wahaStatus: string
): "PENDING" | "SCAN_QR" | "WORKING" | "FAILED" | "STOPPED" {
  switch (wahaStatus) {
    case "WORKING":
      return "WORKING";
    case "SCAN_QR_CODE":
    case "SCAN_QR":
      return "SCAN_QR";
    case "FAILED":
      return "FAILED";
    case "STOPPED":
      return "STOPPED";
    default:
      return "PENDING";
  }
}
