"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Campaign {
  id: string;
  brandId: string;
  name: string;
  loopDays: number;
  publishTime: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  startDate: string | Date;
  discountPercent: number | null;
  _count: { contents: number; publishLogs: number };
}

interface CampaignFormData {
  name: string;
  loopDays: number;
  publishTime: string;
  discountPercent: string;
}

const emptyForm: CampaignFormData = {
  name: "",
  loopDays: 1,
  publishTime: "09:00",
  discountPercent: "",
};

const statusColors = {
  ACTIVE: "default" as const,
  PAUSED: "secondary" as const,
  COMPLETED: "outline" as const,
};

export function CampaignsList({
  brandId,
  initialCampaigns,
}: {
  brandId: string;
  initialCampaigns: Campaign[];
}) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [form, setForm] = useState<CampaignFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      const url = editingId
        ? `/api/campaigns/${editingId}`
        : "/api/campaigns";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          discountPercent: form.discountPercent ? parseInt(form.discountPercent) : null,
          brandId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur");
        return;
      }

      setDialogOpen(false);
      setForm(emptyForm);
      const wasEditing = editingId !== null;
      setEditingId(null);
      toast.success(wasEditing ? "Campagne modifiée" : "Campagne créée");
      router.refresh();

      const campaignsRes = await fetch(`/api/campaigns?brandId=${brandId}`);
      if (campaignsRes.ok) setCampaigns(await campaignsRes.json());
    } finally {
      setLoading(false);
    }
  }

  function openEdit(campaign: Campaign) {
    setForm({
      name: campaign.name,
      loopDays: campaign.loopDays,
      publishTime: campaign.publishTime,
      discountPercent: campaign.discountPercent ? String(campaign.discountPercent) : "",
    });
    setEditingId(campaign.id);
    setDialogOpen(true);
  }

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCampaigns((c) => c.filter((x) => x.id !== id));
      toast.success("Campagne supprimée");
    }
  }

  async function handleToggleStatus(campaign: Campaign) {
    const newStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const res = await fetch(`/api/campaigns/${campaign.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setCampaigns((c) =>
        c.map((x) => (x.id === campaign.id ? { ...x, status: newStatus } : x))
      );
      toast.success("Statut mis à jour");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle campagne
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Modifier la campagne" : "Nouvelle campagne"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Modifiez les paramètres de la campagne"
                  : "Créez une nouvelle campagne publicitaire"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="campaignName">Nom</Label>
                <Input
                  id="campaignName"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Promo Noël 2026"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="loopDays">
                  Fréquence de boucle (jours)
                </Label>
                <Select
                  value={String(form.loopDays)}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, loopDays: parseInt(v) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d === 1 ? "Tous les jours" : `Tous les ${d} jours`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="publishTime">Heure de publication</Label>
                <Input
                  id="publishTime"
                  type="time"
                  value={form.publishTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, publishTime: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discountPercent">Réduction % (optionnel)</Label>
                <Input
                  id="discountPercent"
                  type="number"
                  min="0"
                  max="100"
                  value={form.discountPercent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountPercent: e.target.value }))
                  }
                  placeholder="ex: 10, 15, 20"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={loading || !form.name}>
                {loading
                  ? "Enregistrement..."
                  : editingId
                  ? "Enregistrer"
                  : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucune campagne. Créez-en une !
        </p>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{campaign.name}</span>
                  <Badge variant={statusColors[campaign.status]}>
                    {campaign.status}
                  </Badge>
                  {campaign.discountPercent && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                      -{campaign.discountPercent}%
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Boucle: {campaign.loopDays}j | Heure: {campaign.publishTime} |{" "}
                  {campaign._count.contents} contenu(s) |{" "}
                  {campaign._count.publishLogs} publication(s)
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/campaigns/${campaign.id}`}>
                    <Eye className="mr-1 h-3 w-3" />
                    Voir
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleStatus(campaign)}
                >
                  {campaign.status === "ACTIVE" ? "Pause" : "Activer"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit(campaign)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Supprimer {campaign.name} ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action supprimera la campagne et tous ses contenus.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(campaign.id)}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
