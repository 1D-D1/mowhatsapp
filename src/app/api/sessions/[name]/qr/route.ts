import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    // Fetch QR as raw text from WAHA
    const res = await fetch(
      `${process.env.WAHA_API_URL}/api/${params.name}/auth/qr?format=raw`,
      {
        headers: {
          "X-Api-Key": process.env.WAHA_API_KEY!,
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`WAHA QR ${res.status}: ${body}`);
      return NextResponse.json(
        { error: "QR not available", details: body },
        { status: res.status }
      );
    }

    const data = await res.json();
    // WAHA returns { "value": "2@..." } for raw QR
    return NextResponse.json({
      value: data.value || data,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`GET /api/sessions/${params.name}/qr error:`, msg);
    return NextResponse.json(
      { error: `Failed to get QR code: ${msg}` },
      { status: 502 }
    );
  }
}
