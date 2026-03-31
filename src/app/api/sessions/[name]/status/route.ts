import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession as wahaGetSession } from "@/lib/waha";

export async function GET(
  _request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    // Get status from WAHA
    let wahaStatus: string | null = null;
    try {
      const wahaSession = await wahaGetSession(params.name);
      wahaStatus = wahaSession.status;
    } catch (error) {
      console.error(`WAHA getSession ${params.name} error:`, error);
    }

    // Get DB record
    const dbSession = await prisma.wahaSession.findUnique({
      where: { sessionName: params.name },
      select: { status: true, id: true },
    });

    // Sync WAHA status to DB if needed
    if (wahaStatus && dbSession) {
      const mappedStatus = mapWahaStatus(wahaStatus);
      if (mappedStatus !== dbSession.status) {
        await prisma.wahaSession.update({
          where: { id: dbSession.id },
          data: {
            status: mappedStatus,
            ...(mappedStatus === "WORKING" ? { lastSeenAt: new Date() } : {}),
          },
        });
      }
    }

    return NextResponse.json({
      sessionName: params.name,
      wahaStatus,
      dbStatus: dbSession?.status ?? null,
    });
  } catch (error) {
    console.error(`GET /api/sessions/${params.name}/status error:`, error);
    return NextResponse.json(
      { error: "Failed to get session status" },
      { status: 500 }
    );
  }
}

function mapWahaStatus(
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
