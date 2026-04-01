import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignProxyToSession } from "@/lib/proxy-manager";
import { updateSession } from "@/lib/waha";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("WAHA webhook received:", JSON.stringify(body));

    const { event, session: sessionName, payload } = body;

    if (!sessionName) {
      return NextResponse.json({ ok: true });
    }

    // Find the session in DB
    const dbSession = await prisma.wahaSession.findUnique({
      where: { sessionName },
    });

    if (!dbSession) {
      console.log(`Webhook for unknown session: ${sessionName}`);
      return NextResponse.json({ ok: true });
    }

    // Handle session status changes
    if (event === "session.status") {
      const wahaStatus = payload?.status ?? payload;
      let newStatus: "PENDING" | "SCAN_QR" | "WORKING" | "FAILED" | "STOPPED" =
        dbSession.status;

      switch (wahaStatus) {
        case "WORKING":
          newStatus = "WORKING";
          break;
        case "SCAN_QR_CODE":
        case "SCAN_QR":
          newStatus = "SCAN_QR";
          break;
        case "FAILED":
          newStatus = "FAILED";
          break;
        case "STOPPED":
          newStatus = "STOPPED";
          break;
      }

      if (newStatus !== dbSession.status) {
        await prisma.wahaSession.update({
          where: { id: dbSession.id },
          data: {
            status: newStatus,
            ...(newStatus === "WORKING" ? { lastSeenAt: new Date() } : {}),
          },
        });
        console.log(
          `Session ${sessionName} status updated: ${dbSession.status} -> ${newStatus}`
        );

        // AUTO-ASSIGN PROXY when session becomes WORKING (connected)
        if (newStatus === "WORKING" && !dbSession.proxyId) {
          try {
            const { proxy, wahaProxy } = await assignProxyToSession(sessionName);

            // Update WAHA session with proxy config
            await updateSession(sessionName, {
              proxy: wahaProxy,
            });

            // Update DB
            await prisma.wahaSession.update({
              where: { id: dbSession.id },
              data: { proxyId: proxy.id },
            });

            console.log(
              `Proxy ${proxy.server} assigned to session ${sessionName} after connection`
            );
          } catch (error) {
            console.error(
              `Failed to assign proxy to ${sessionName} (session still works without proxy):`,
              error
            );
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/webhooks/waha error:", error);
    return NextResponse.json({ ok: true });
  }
}
