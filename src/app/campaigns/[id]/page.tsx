export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ContentManager } from "@/components/ContentManager";

async function getCampaign(id: string) {
  const [campaign, sessions] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id },
      include: {
        brand: true,
        contents: { orderBy: { position: "asc" } },
        _count: { select: { publishLogs: true } },
      },
    }),
    prisma.wahaSession.findMany({
      select: { id: true, sessionName: true, status: true },
      orderBy: { sessionName: "asc" },
    }),
  ]);
  return { campaign, sessions };
}

const statusColors = {
  ACTIVE: "default" as const,
  PAUSED: "secondary" as const,
  COMPLETED: "outline" as const,
};

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { campaign, sessions } = await getCampaign(params.id);
  if (!campaign) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/brands/${campaign.brandId}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {campaign.brand.name}
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {campaign.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {campaign.brand.name} | Boucle: {campaign.loopDays}j | Heure:{" "}
            {campaign.publishTime} | {campaign._count.publishLogs}{" "}
            publication(s)
          </p>
        </div>
        <Badge variant={statusColors[campaign.status]}>
          {campaign.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contenus de la boucle</CardTitle>
          <CardDescription>
            {campaign.contents.length} contenu(s) dans la rotation.
            Glissez pour réordonner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContentManager
            campaignId={campaign.id}
            initialContents={campaign.contents}
            sessions={sessions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
