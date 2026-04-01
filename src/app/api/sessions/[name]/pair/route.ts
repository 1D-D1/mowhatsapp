import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "phoneNumber is required" },
        { status: 400 }
      );
    }

    // Clean phone number — WAHA expects international format without +
    const cleanPhone = phoneNumber.replace(/\D/g, "");

    const res = await fetch(
      `${process.env.WAHA_API_URL}/api/${params.name}/auth/request-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": process.env.WAHA_API_KEY!,
        },
        body: JSON.stringify({ phoneNumber: cleanPhone }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`WAHA request-code ${res.status}: ${text}`);
      return NextResponse.json(
        { error: `Code non disponible: ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ code: data.code || data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`POST /api/sessions/${params.name}/pair error:`, msg);
    return NextResponse.json(
      { error: `Erreur: ${msg}` },
      { status: 500 }
    );
  }
}
