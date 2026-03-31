export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { PublishLogs } from "@/components/PublishLogs";

async function getLogsData() {
  const [logs, total, brands, sessions, sentCount, failedCount] =
    await Promise.all([
      prisma.publishLog.findMany({
        include: {
          campaign: { include: { brand: true } },
          content: true,
          session: true,
        },
        orderBy: { publishedAt: "desc" },
        take: 50,
      }),
      prisma.publishLog.count(),
      prisma.brand.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.wahaSession.findMany({
        select: { id: true, sessionName: true },
        orderBy: { sessionName: "asc" },
      }),
      prisma.publishLog.count({ where: { status: "SENT" } }),
      prisma.publishLog.count({ where: { status: "FAILED" } }),
    ]);

  return { logs, total, brands, sessions, sentCount, failedCount };
}

export default async function LogsPage() {
  const { logs, total, brands, sessions, sentCount, failedCount } =
    await getLogsData();

  const statCards = [
    { title: "Total", value: total, icon: Clock },
    { title: "Envoyées", value: sentCount, icon: CheckCircle },
    { title: "Échouées", value: failedCount, icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Logs de publication
        </h1>
        <p className="text-muted-foreground">
          Historique des publications Stories WhatsApp
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
          <CardTitle>Historique</CardTitle>
          <CardDescription>
            {total} publication(s) au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PublishLogs
            initialLogs={logs}
            brands={brands}
            sessions={sessions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
