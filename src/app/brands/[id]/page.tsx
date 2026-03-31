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
import { ArrowLeft, ExternalLink, Megaphone } from "lucide-react";
import { CampaignsList } from "@/components/CampaignsList";

async function getBrand(id: string) {
  return prisma.brand.findUnique({
    where: { id },
    include: {
      campaigns: {
        include: {
          _count: { select: { contents: true, publishLogs: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { sessions: true } },
    },
  });
}

export default async function BrandDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const brand = await getBrand(params.id);
  if (!brand) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/brands">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{brand.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {brand.slug}
          </p>
        </div>
        <Badge variant={brand.active ? "default" : "secondary"}>
          {brand.active ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Campagnes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brand.campaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brand._count.sessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">CTA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {brand.ctaType === "LINK" ? (
                brand.ctaUrl ? (
                  <a
                    href={brand.ctaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {brand.ctaUrl}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Non configuré</span>
                )
              ) : (
                <span>{brand.ctaPhone || "Non configuré"}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Campagnes
              </CardTitle>
              <CardDescription>
                Campagnes publicitaires de {brand.name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CampaignsList brandId={brand.id} initialCampaigns={brand.campaigns} />
        </CardContent>
      </Card>
    </div>
  );
}
