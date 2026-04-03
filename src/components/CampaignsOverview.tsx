"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Eye, ArrowUpDown, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Campaign {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  loopDays: number;
  publishTime: string;
  startDate: string;
  discountPercent: number | null;
  brand: { id: string; name: string };
  _count: { contents: number; publishLogs: number };
}

const statusColors = {
  ACTIVE: "default" as const,
  PAUSED: "secondary" as const,
  COMPLETED: "outline" as const,
};

type SortKey = "name" | "brand" | "date" | "publications" | "status";

export function CampaignsOverview({
  campaigns,
  brands,
}: {
  campaigns: Campaign[];
  brands: { id: string; name: string }[];
}) {
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    let result = [...campaigns];

    if (filterBrand !== "all") {
      result = result.filter((c) => c.brand.id === filterBrand);
    }
    if (filterStatus !== "all") {
      result = result.filter((c) => c.status === filterStatus);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "brand":
          cmp = a.brand.name.localeCompare(b.brand.name);
          break;
        case "date":
          cmp = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case "publications":
          cmp = a._count.publishLogs - b._count.publishLogs;
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDesc ? -cmp : cmp;
    });

    return result;
  }, [campaigns, filterBrand, filterStatus, sortBy, sortDesc]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(key);
      setSortDesc(true);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterBrand} onValueChange={setFilterBrand}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Marque" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les marques</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">En pause</SelectItem>
            <SelectItem value="COMPLETED">Terminée</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          {(["name", "brand", "date", "publications", "status"] as SortKey[]).map((key) => (
            <Button
              key={key}
              variant={sortBy === key ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => toggleSort(key)}
            >
              {{ name: "Nom", brand: "Marque", date: "Date", publications: "Publis", status: "Statut" }[key]}
              {sortBy === key && (sortDesc ? " ↓" : " ↑")}
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} campagne{filtered.length !== 1 ? "s" : ""}
        {filterBrand !== "all" || filterStatus !== "all" ? " (filtrées)" : ""}
      </p>

      {/* Campaign cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Aucune campagne{filterBrand !== "all" || filterStatus !== "all" ? " avec ces filtres" : ""}. Créez-en une depuis la page d&apos;une marque.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {campaign.name}
                      {campaign.discountPercent && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                          -{campaign.discountPercent}%
                        </Badge>
                      )}
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
