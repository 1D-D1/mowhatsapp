import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePromoCode } from "@/lib/promo-code";
import {
  createSession as wahaCreateSession,
  deleteSession as wahaDeleteSession,
  stopSession as wahaStopSession,
  startSession as wahaStartSession,
  updateSession as wahaUpdateSession,
} from "@/lib/waha";

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
    const { phoneNumber, displayName, brandIds, publishesPerDay } = body as {
      phoneNumber: string;
      displayName?: string;
      brandIds: string[];
      publishesPerDay?: number;
    };

    if (!phoneNumber || !brandIds || brandIds.length === 0) {
      return NextResponse.json(
        { error: "phoneNumber and brandIds are required" },
        { status: 400 }
      );
    }

    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const sessionName = `wa-${cleanPhone}`;
    const pubPerDay = Math.min(Math.max(publishesPerDay || 1, 1), 3);

    // Get brands
    const brands = await prisma.brand.findMany({
      where: { id: { in: brandIds } },
    });

    // Check if session already exists — if so, add missing brands
    const existing = await prisma.wahaSession.findUnique({
      where: { sessionName },
      include: { brands: true },
    });

    if (existing) {
      const existingBrandIds = existing.brands.map((b) => b.brandId);
      const newBrandIds = brandIds.filter((id) => !existingBrandIds.includes(id));

      if (newBrandIds.length > 0) {
        await prisma.sessionBrand.createMany({
          data: newBrandIds.map((brandId) => {
            const brand = brands.find((b) => b.id === brandId);
            return {
              sessionId: existing.id,
              brandId,
              promoCode: generatePromoCode(phoneNumber, brand?.slug || "xx"),
            };
          }),
        });
      }

      // Update publishesPerDay if changed
      await prisma.wahaSession.update({
        where: { id: existing.id },
        data: { publishesPerDay: pubPerDay },
      });

      const updated = await prisma.wahaSession.findUnique({
        where: { id: existing.id },
        include: { proxy: true, brands: { include: { brand: true } } },
      });

      return NextResponse.json({ ...updated, alreadyConnected: existing.status === "WORKING" }, { status: 200 });
    }

    // New session
    const brandSlugs = brands.map((b) => b.slug);
    const webhookUrl = `${process.env.NEXTAUTH_URL || "https://mowhatsapp.aseta.fr"}/api/webhooks/waha`;

    try {
      await wahaCreateSession({
        name: sessionName,
        brands: brandSlugs,
        phone: phoneNumber,
        webhookUrl,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes("already exists")) {
        console.error("WAHA createSession error:", msg);
        return NextResponse.json(
          { error: `Failed to create WAHA session: ${msg}` },
          { status: 502 }
        );
      }
    }

    // Force-set webhook (GOWS workaround)
    try {
      await wahaUpdateSession(sessionName, {
        webhooks: [{ url: webhookUrl, events: ["session.status"] }],
      });
    } catch {
      console.error(`Failed to set webhook on ${sessionName}`);
    }

    const session = await prisma.wahaSession.create({
      data: {
        sessionName,
        phoneNumber,
        displayName: displayName || null,
        status: "SCAN_QR",
        publishesPerDay: pubPerDay,
        proxyId: null,
        brands: {
          create: brandIds.map((brandId) => {
            const brand = brands.find((b) => b.id === brandId);
            return {
              brandId,
              promoCode: generatePromoCode(phoneNumber, brand?.slug || "xx"),
            };
          }),
        },
      },
      include: { proxy: true, brands: { include: { brand: true } } },
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
