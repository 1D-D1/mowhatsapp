export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye } from "lucide-react";

const statusColors = {
  ACTIVE: "default" as const,
  PAUSED: "secondary" as const,
  COMPLETED: "outline" as const,
};

async function getCampaigns() {
  return prisma.campaign.findMany({
    include: {
      brand: true,
      _count: { select: { contents: true, publishLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campagnes</h1>
        <p className="text-muted-foreground">
          Toutes les campagnes publicitaires
        </p>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Aucune campagne. Créez-en une depuis la page d&apos;une marque.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {campaign.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {campaign.brand.name} | Boucle: {campaign.loopDays}j |
                      Heure: {campaign.publishTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[campaign.status]}>
                      {campaign.status}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/campaigns/${campaign.id}`}>
                        <Eye className="mr-1 h-3 w-3" />
                        Détail
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{campaign._count.contents} contenu(s)</span>
                  <span>{campaign._count.publishLogs} publication(s)</span>
                  <span>
                    Début:{" "}
                    {new Date(campaign.startDate).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
