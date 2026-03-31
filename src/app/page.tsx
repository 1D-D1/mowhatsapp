export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tag,
  Megaphone,
  Smartphone,
  Clock,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

async function getStats() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const sevenDaysAgo = subDays(todayStart, 6);

  const [
    brandsCount,
    campaignsCount,
    sessionsCount,
    todayPublished,
    todayFailed,
    weekSent,
    weekFailed,
    recentLogs,
  ] = await Promise.all([
    prisma.brand.count({ where: { active: true } }),
    prisma.campaign.count({ where: { status: "ACTIVE" } }),
    prisma.wahaSession.count({ where: { status: "WORKING" } }),
    prisma.publishLog.count({
      where: { publishedAt: { gte: todayStart }, status: "SENT" },
    }),
    prisma.publishLog.count({
      where: { publishedAt: { gte: todayStart }, status: "FAILED" },
    }),
    prisma.publishLog.count({
      where: { publishedAt: { gte: sevenDaysAgo }, status: "SENT" },
    }),
    prisma.publishLog.count({
      where: { publishedAt: { gte: sevenDaysAgo }, status: "FAILED" },
    }),
    prisma.publishLog.findMany({
      take: 10,
      orderBy: { publishedAt: "desc" },
      include: {
        campaign: { include: { brand: true } },
        session: true,
        content: true,
      },
    }),
  ]);

  const weekTotal = weekSent + weekFailed;
  const successRate = weekTotal > 0 ? Math.round((weekSent / weekTotal) * 100) : 0;

  // Daily breakdown for mini chart display
  const rawLogs = await prisma.publishLog.findMany({
    where: { publishedAt: { gte: sevenDaysAgo } },
    select: { publishedAt: true, status: true },
  });

  const dailyMap = new Map<string, { sent: number; failed: number }>();
  for (let i = 0; i < 7; i++) {
    const day = subDays(todayStart, 6 - i);
    dailyMap.set(day.toISOString().slice(0, 10), { sent: 0, failed: 0 });
  }
  for (const log of rawLogs) {
    const key = new Date(log.publishedAt).toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    if (entry) {
      if (log.status === "SENT") entry.sent++;
      else if (log.status === "FAILED") entry.failed++;
    }
  }

  const dailyChart = Array.from(dailyMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  return {
    brandsCount,
    campaignsCount,
    sessionsCount,
    todayPublished,
    todayFailed,
    weekSent,
    successRate,
    dailyChart,
    recentLogs,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const statCards = [
    {
      title: "Marques actives",
      value: stats.brandsCount,
      icon: Tag,
      description: "Marques avec campagnes en cours",
    },
    {
      title: "Campagnes actives",
      value: stats.campaignsCount,
      icon: Megaphone,
      description: "Campagnes en publication",
    },
    {
      title: "Sessions connectées",
      value: stats.sessionsCount,
      icon: Smartphone,
      description: "Sessions WORKING",
    },
    {
      title: "Publiées aujourd'hui",
      value: stats.todayPublished,
      icon: Clock,
      description: `${stats.todayFailed} échouée(s)`,
    },
  ];

  // Find peak day
  const peakDay = stats.dailyChart.reduce(
    (max, d) => (d.sent > max.sent ? d : max),
    stats.dailyChart[0] || { date: "—", sent: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de la régie Mo&apos;WhatsApp
        </p>
      </div>

      {/* Main stat cards */}
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
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Week overview row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Taux de succès (7j)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.weekSent} envoyées cette semaine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Publications (7 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1">
              {stats.dailyChart.map((day) => {
                const total = day.sent + day.failed;
                const maxH = 40;
                const height = total > 0 ? Math.max(4, (total / Math.max(...stats.dailyChart.map(d => d.sent + d.failed), 1)) * maxH) : 2;
                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-col items-center">
                      {day.failed > 0 && (
                        <div
                          className="w-full max-w-[20px] rounded-t bg-destructive/60"
                          style={{ height: `${(day.failed / (total || 1)) * height}px` }}
                        />
                      )}
                      <div
                        className="w-full max-w-[20px] rounded-t bg-primary"
                        style={{ height: `${(day.sent / (total || 1)) * height}px`, minHeight: "2px" }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {day.date.slice(8)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pic de la semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-xl font-bold">{peakDay.sent}</span>
                </div>
                <p className="text-xs text-muted-foreground">envoyées le {peakDay.date?.slice(5).replace("-", "/")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent publications */}
      <Card>
        <CardHeader>
          <CardTitle>Publications récentes</CardTitle>
          <CardDescription>
            Dernières publications de Stories WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune publication pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {stats.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {log.campaign.brand.name} — {log.campaign.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Session: {log.session.sessionName} | Contenu:{" "}
                      {log.content.fileName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        log.status === "SENT"
                          ? "default"
                          : log.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {log.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {log.publishedAt.toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
