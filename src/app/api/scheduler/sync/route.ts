import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listSessions } from "@/lib/waha";

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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

    const dbSessions = await prisma.wahaSession.findMany();
    const wahaMap = new Map(wahaSessions.map((w) => [w.name, w]));

    let synced = 0;
    let notFound = 0;
    let proxiesAssigned = 0;

    for (const dbSession of dbSessions) {
      const wahaSession = wahaMap.get(dbSession.sessionName);

      if (!wahaSession) {
        if (dbSession.status !== "FAILED" && dbSession.status !== "STOPPED") {
          await prisma.wahaSession.update({
            where: { id: dbSession.id },
            data: { status: "FAILED" },
          });
          notFound++;
        }
        continue;
      }

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
        await prisma.wahaSession.update({
          where: { id: dbSession.id },
          data: { lastSeenAt: new Date() },
        });
      }

      // Assign proxy to WORKING sessions that don't have one (DB only, no WAHA restart)
      if ((newStatus === "WORKING" || dbSession.status === "WORKING") && !dbSession.proxyId) {
        try {
          const availableProxy = await prisma.proxy.findFirst({
            where: {
              active: true,
              sessions: { every: { id: { not: dbSession.id } } },
            },
            include: { _count: { select: { sessions: true } } },
            orderBy: { createdAt: "asc" },
          });

          if (availableProxy && availableProxy._count.sessions < availableProxy.maxSessions) {
            await prisma.wahaSession.update({
              where: { id: dbSession.id },
              data: { proxyId: availableProxy.id },
            });
            proxiesAssigned++;
            console.log(`Proxy ${availableProxy.server} assigned to ${dbSession.sessionName} (DB only)`);
          }
        } catch (error) {
          console.error(`Proxy assignment error for ${dbSession.sessionName}:`, error);
        }
      }
    }

    // Create DB records for WAHA sessions not in DB
    for (const ws of wahaSessions) {
      if (!ws.name.startsWith("wa-")) continue;
      const inDb = dbSessions.some((d) => d.sessionName === ws.name);
      if (!inDb) {
        const phone = ws.name.replace("wa-", "");
        const status = mapStatus(ws.status);
        await prisma.wahaSession.create({
          data: {
            sessionName: ws.name,
            phoneNumber: phone,
            status,
            ...(status === "WORKING" ? { lastSeenAt: new Date() } : {}),
          },
        });
        synced++;
      }
    }

    console.log(
      `Sync: ${synced} updated, ${notFound} not in WAHA, ${proxiesAssigned} proxies assigned`
    );

    return NextResponse.json({
      total: dbSessions.length,
      synced,
      notFound,
      proxiesAssigned,
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
