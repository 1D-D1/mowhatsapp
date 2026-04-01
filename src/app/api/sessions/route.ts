import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSession as wahaCreateSession,
  deleteSession as wahaDeleteSession,
  stopSession as wahaStopSession,
  startSession as wahaStartSession,
} from "@/lib/waha";
import { assignProxyToSession } from "@/lib/proxy-manager";

export async function GET() {
  try {
    const sessions = await prisma.wahaSession.findMany({
      include: {
        proxy: true,
        brands: { include: { brand: true } },
        _count: { select: { publishLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sessions);
  } catch (error) {
    console.error("GET /api/sessions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, displayName, brandIds } = body as {
      phoneNumber: string;
      displayName?: string;
      brandIds: string[];
    };

    if (!phoneNumber || !brandIds || brandIds.length === 0) {
      return NextResponse.json(
        { error: "phoneNumber and brandIds are required" },
        { status: 400 }
      );
    }

    // Generate session name from phone
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const sessionName = `wa-${cleanPhone}`;

    // Check if session already exists
    const existing = await prisma.wahaSession.findUnique({
      where: { sessionName },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A session with this phone number already exists" },
        { status: 409 }
      );
    }

    // Assign proxy (optional — session can work without proxy)
    let proxyId: string | null = null;
    let wahaProxy: { server: string; username: string; password: string } | undefined;
    try {
      const result = await assignProxyToSession(sessionName);
      proxyId = result.proxy.id;
      wahaProxy = result.wahaProxy;
    } catch (error) {
      console.error("Proxy assignment failed (continuing without proxy):", error);
    }

    // Get brand slugs for metadata
    const brands = await prisma.brand.findMany({
      where: { id: { in: brandIds } },
    });
    const brandSlugs = brands.map((b) => b.slug);

    // Create WAHA session
    const webhookUrl = `${process.env.NEXTAUTH_URL || "https://mowhatsapp.aseta.fr"}/api/webhooks/waha`;

    try {
      await wahaCreateSession({
        name: sessionName,
        brands: brandSlugs,
        phone: phoneNumber,
        proxy: wahaProxy,
        webhookUrl,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("WAHA createSession error:", msg);
      return NextResponse.json(
        { error: `Failed to create WAHA session: ${msg}` },
        { status: 502 }
      );
    }

    // Save to DB
    const session = await prisma.wahaSession.create({
      data: {
        sessionName,
        phoneNumber,
        displayName: displayName || null,
        status: "SCAN_QR",
        proxyId,
        brands: {
          create: brandIds.map((brandId) => ({ brandId })),
        },
      },
      include: {
        proxy: true,
        brands: { include: { brand: true } },
      },
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/sessions error:", msg);
    return NextResponse.json(
      { error: `Failed to create session: ${msg}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const session = await prisma.wahaSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Try to delete from WAHA (non-blocking)
    try {
      await wahaDeleteSession(session.sessionName);
    } catch (error) {
      console.error("WAHA deleteSession error (non-blocking):", error);
    }

    await prisma.wahaSession.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/sessions error:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, brandIds } = body as {
      id: string;
      action?: "stop" | "start";
      brandIds?: string[];
    };

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const session = await prisma.wahaSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Handle start/stop actions
    if (action === "stop") {
      try {
        await wahaStopSession(session.sessionName);
      } catch (error) {
        console.error("WAHA stopSession error:", error);
      }
      await prisma.wahaSession.update({
        where: { id },
        data: { status: "STOPPED" },
      });
    } else if (action === "start") {
      try {
        await wahaStartSession(session.sessionName);
      } catch (error) {
        console.error("WAHA startSession error:", error);
      }
      await prisma.wahaSession.update({
        where: { id },
        data: { status: "SCAN_QR" },
      });
    }

    // Handle brand assignment update
    if (brandIds) {
      // Remove all existing brand assignments, then add new ones
      await prisma.sessionBrand.deleteMany({
        where: { sessionId: id },
      });
      await prisma.sessionBrand.createMany({
        data: brandIds.map((brandId) => ({ sessionId: id, brandId })),
      });

      // Update WAHA metadata
      const brands = await prisma.brand.findMany({
        where: { id: { in: brandIds } },
      });
      try {
        const { updateSession } = await import("@/lib/waha");
        await updateSession(session.sessionName, {
          metadata: {
            brands: brands.map((b) => b.slug).join(","),
            managedBy: "mowhatsapp",
          },
        });
      } catch (error) {
        console.error("WAHA updateSession metadata error:", error);
      }
    }

    const updated = await prisma.wahaSession.findUnique({
      where: { id },
      include: {
        proxy: true,
        brands: { include: { brand: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/sessions error:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 400 }
    );
  }
}
