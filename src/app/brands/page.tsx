export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { BrandsList } from "@/components/BrandsList";

async function getBrands() {
  return prisma.brand.findMany({
    include: {
      _count: { select: { campaigns: true, sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marques</h1>
          <p className="text-muted-foreground">
            Gérez vos marques clientes et leurs campagnes
          </p>
        </div>
      </div>
      <BrandsList initialBrands={brands} />
    </div>
  );
}
