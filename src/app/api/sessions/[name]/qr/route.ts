import { NextRequest, NextResponse } from "next/server";
import { getQrCode } from "@/lib/waha";

export async function GET(
  _request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const qrBuffer = await getQrCode(params.name);
    return new NextResponse(new Uint8Array(qrBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error(`GET /api/sessions/${params.name}/qr error:`, error);
    return NextResponse.json(
      { error: "Failed to get QR code" },
      { status: 502 }
    );
  }
}
