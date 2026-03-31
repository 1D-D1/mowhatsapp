export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { JoinForm } from "@/components/JoinForm";

async function getActiveBrands() {
  return prisma.brand.findMany({
    where: { active: true },
    select: { id: true, name: true, slug: true, logoUrl: true },
    orderBy: { name: "asc" },
  });
}

export default async function JoinPage() {
  const brands = await getActiveBrands();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Devenir WhatsAppeur
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connectez votre WhatsApp pour diffuser des Stories de marques
          </p>
        </div>
        <JoinForm brands={brands} />
      </div>
    </div>
  );
}
