import { NextRequest, NextResponse } from "next/server";
import { assignProxyToSession } from "@/lib/proxy-manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionName } = body;

    if (!sessionName) {
      return NextResponse.json(
        { error: "sessionName is required" },
        { status: 400 }
      );
    }

    const result = await assignProxyToSession(sessionName);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/proxies/assign error:", error);
    return NextResponse.json(
      { error: "Failed to assign proxy" },
      { status: 500 }
    );
  }
}
