export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { listSessions as wahaListSessions } from "@/lib/waha";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Smartphone, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { SessionList } from "@/components/SessionList";

function mapWahaStatus(s: string): "WORKING" | "SCAN_QR" | "FAILED" | "STOPPED" | "PENDING" {
  if (s === "WORKING") return "WORKING";
  if (s === "SCAN_QR_CODE" || s === "SCAN_QR") return "SCAN_QR";
  if (s === "FAILED") return "FAILED";
  if (s === "STOPPED") return "STOPPED";
  return "PENDING";
}

async function syncWahaToDB() {
  try {
    const wahaSessions = await wahaListSessions();
    const dbSessions = await prisma.wahaSession.findMany();
    const dbMap = new Map(dbSessions.map((s) => [s.sessionName, s]));

    for (const ws of wahaSessions) {
      if (!ws.name.startsWith("wa-")) continue;
      const db = dbMap.get(ws.name);
      const status = mapWahaStatus(ws.status);

      if (!db) {
        // WAHA session not in DB — create it
        const phone = ws.name.replace("wa-", "");
        await prisma.wahaSession.create({
          data: {
            sessionName: ws.name,
            phoneNumber: phone,
            status,
            ...(status === "WORKING" ? { lastSeenAt: new Date() } : {}),
          },
        });
      } else if (db.status !== status) {
        // Status mismatch — sync
        await prisma.wahaSession.update({
          where: { id: db.id },
          data: { status, ...(status === "WORKING" ? { lastSeenAt: new Date() } : {}) },
        });
      }
    }
  } catch (e) {
    console.error("Session sync error (non-blocking):", e);
  }
}

async function getSessionsData() {
  // Sync WAHA → DB before loading
  await syncWahaToDB();

  const sessions = await prisma.wahaSession.findMany({
    include: {
      proxy: true,
      brands: { include: { brand: true } },
      _count: { select: { publishLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const brands = await prisma.brand.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const total = sessions.length;
  const working = sessions.filter((s) => s.status === "WORKING").length;
  const scanQr = sessions.filter((s) => s.status === "SCAN_QR").length;
  const failed = sessions.filter(
    (s) => s.status === "FAILED" || s.status === "STOPPED"
  ).length;

  return { sessions, brands, total, working, scanQr, failed };
}

export default async function SessionsPage() {
  const { sessions, brands, total, working, scanQr, failed } =
    await getSessionsData();

  const statCards = [
    { title: "Total", value: total, icon: Smartphone },
    { title: "Connectées", value: working, icon: CheckCircle },
    { title: "En attente QR", value: scanQr, icon: Clock },
    { title: "Erreur/Arrêt", value: failed, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Sessions WhatsApp
        </h1>
        <p className="text-muted-foreground">
          Gestion des sessions WAHA connectées
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Chaque session WhatsApp est liée à un proxy et des marques
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionList initialSessions={sessions} allBrands={brands} />
        </CardContent>
      </Card>
    </div>
  );
}
