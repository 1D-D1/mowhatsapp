export const dynamic = "force-dynamic";

import { getProxyStats } from "@/lib/proxy-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Server, CheckCircle, AlertTriangle } from "lucide-react";
import { ProxyPool } from "@/components/ProxyPool";

export default async function ProxiesPage() {
  const stats = await getProxyStats();

  const statCards = [
    { title: "Total proxies", value: stats.total, icon: Server },
    { title: "Actifs", value: stats.active, icon: CheckCircle },
    { title: "Disponibles", value: stats.available, icon: Shield },
    { title: "Saturés", value: stats.full, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Proxies IPRoyal</h1>
        <p className="text-muted-foreground">
          Pool de proxies résidentiels pour les sessions WhatsApp
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
          <CardTitle>Pool de proxies</CardTitle>
          <CardDescription>
            Max 2 sessions par proxy. Les proxies saturés ne sont plus assignés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProxyPool initialProxies={stats.proxies} />
        </CardContent>
      </Card>
    </div>
  );
}
