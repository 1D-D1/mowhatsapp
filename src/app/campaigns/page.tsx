export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { CampaignsOverview } from "@/components/CampaignsOverview";

async function getCampaigns() {
  return prisma.campaign.findMany({
    include: {
      brand: true,
      _count: { select: { contents: true, publishLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getBrands() {
  return prisma.brand.findMany({ where: { active: true }, orderBy: { name: "asc" } });
}

export default async function CampaignsPage() {
  const [campaigns, brands] = await Promise.all([getCampaigns(), getBrands()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campagnes</h1>
        <p className="text-muted-foreground">
          Toutes les campagnes publicitaires
        </p>
      </div>
      <CampaignsOverview
        campaigns={JSON.parse(JSON.stringify(campaigns))}
        brands={brands.map((b) => ({ id: b.id, name: b.name }))}
      />
    </div>
  );
}
