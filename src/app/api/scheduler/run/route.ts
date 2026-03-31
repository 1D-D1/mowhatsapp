import { NextRequest, NextResponse } from "next/server";
import { runScheduler } from "@/lib/scheduler";

export async function POST(request: NextRequest) {
  // Verify CRON_SECRET
  const cronSecret = request.headers.get("x-cron-secret");

  if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Scheduler triggered at", new Date().toISOString());
    const result = await runScheduler();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scheduler error:", error);
    return NextResponse.json(
      { error: "Scheduler failed", details: String(error) },
      { status: 500 }
    );
  }
}
