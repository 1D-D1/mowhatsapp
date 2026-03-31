"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  ctaUrl: string | null;
  ctaType: "LINK" | "WHATSAPP";
  ctaPhone: string | null;
  active: boolean;
  _count: { campaigns: number; sessions: number };
}

interface BrandFormData {
  name: string;
  slug: string;
  logoUrl: string;
  ctaUrl: string;
  ctaType: "LINK" | "WHATSAPP";
  ctaPhone: string;
}

const emptyForm: BrandFormData = {
  name: "",
  slug: "",
  logoUrl: "",
  ctaUrl: "",
  ctaType: "LINK",
  ctaPhone: "",
};

export function BrandsList({ initialBrands }: { initialBrands: Brand[] }) {
  const router = useRouter();
  const [brands, setBrands] = useState(initialBrands);
  const [form, setForm] = useState<BrandFormData>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  function onNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      slug: editingId
        ? f.slug
        : name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
    }));
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const url = editingId ? `/api/brands/${editingId}` : "/api/brands";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur");
        return;
      }

      toast.success(editingId ? "Marque modifiée" : "Marque créée");
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      router.refresh();

      const brandsRes = await fetch("/api/brands");
      if (brandsRes.ok) setBrands(await brandsRes.json());
    } finally {
      setLoading(false);
    }
  }

  function openEdit(brand: Brand) {
    setForm({
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl || "",
      ctaUrl: brand.ctaUrl || "",
      ctaType: brand.ctaType,
      ctaPhone: brand.ctaPhone || "",
    });
    setEditingId(brand.id);
    setDialogOpen(true);
  }

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBrands((b) => b.filter((x) => x.id !== id));
      toast.success("Marque supprimée");
    } else {
      toast.error("Erreur lors de la suppression");
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle marque
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Modifier la marque" : "Nouvelle marque"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Modifiez les informations de la marque"
                  : "Ajoutez une nouvelle marque cliente"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="JungleTech"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  placeholder="jungletech"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="logoUrl">URL du logo</Label>
                <Input
                  id="logoUrl"
                  value={form.logoUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, logoUrl: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ctaType">Type de CTA</Label>
                <Select
                  value={form.ctaType}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      ctaType: v as "LINK" | "WHATSAPP",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LINK">Lien web</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.ctaType === "LINK" ? (
                <div className="grid gap-2">
                  <Label htmlFor="ctaUrl">URL du CTA</Label>
                  <Input
                    id="ctaUrl"
                    value={form.ctaUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ctaUrl: e.target.value }))
                    }
                    placeholder="https://jungletech.gf"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="ctaPhone">Numero WhatsApp</Label>
                  <Input
                    id="ctaPhone"
                    value={form.ctaPhone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ctaPhone: e.target.value }))
                    }
                    placeholder="0594..."
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={loading || !form.name || !form.slug}>
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

      {brands.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Aucune marque pour le moment. Créez-en une !
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <Card key={brand.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{brand.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {brand.slug}
                    </CardDescription>
                  </div>
                  <Badge variant={brand.active ? "default" : "secondary"}>
                    {brand.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{brand._count.campaigns} campagne(s)</span>
                  <span>{brand._count.sessions} session(s)</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/brands/${brand.id}`}>
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Détail
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(brand)}
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
                        <AlertDialogTitle>Supprimer {brand.name} ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Toutes les campagnes et
                          contenus associés seront supprimés.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(brand.id)}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
