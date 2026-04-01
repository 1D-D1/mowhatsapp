"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Square,
  Trash2,
  RefreshCw,
  QrCode,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { QRDisplay } from "@/components/QRDisplay";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

interface SessionItem {
  id: string;
  sessionName: string;
  phoneNumber: string | null;
  displayName: string | null;
  status: "PENDING" | "SCAN_QR" | "WORKING" | "FAILED" | "STOPPED";
  proxy: { server: string } | null;
  brands: Array<{ brand: { id: string; name: string; slug: string } }>;
  _count: { publishLogs: number };
  lastSeenAt: string | Date | null;
}

interface BrandOption {
  id: string;
  name: string;
  slug: string;
}

const statusConfig = {
  PENDING: { label: "En attente", variant: "secondary" as const },
  SCAN_QR: { label: "Scan QR", variant: "outline" as const },
  WORKING: { label: "Connectée", variant: "default" as const },
  FAILED: { label: "Erreur", variant: "destructive" as const },
  STOPPED: { label: "Arrêtée", variant: "secondary" as const },
};

export function SessionList({
  initialSessions,
  allBrands,
}: {
  initialSessions: SessionItem[];
  allBrands: BrandOption[];
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [qrSession, setQrSession] = useState<string | null>(null);
  const [brandsDialogSession, setBrandsDialogSession] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  async function refreshSessions() {
    const res = await fetch("/api/sessions");
    if (res.ok) setSessions(await res.json());
  }

  async function handleAction(id: string, action: "stop" | "start") {
    await fetch("/api/sessions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    toast.success("Session mise à jour");
    await refreshSessions();
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/sessions?id=${id}`, { method: "DELETE" });
    setSessions((s) => s.filter((x) => x.id !== id));
    toast.success("Session supprimée");
    router.refresh();
  }

  async function handleRefreshStatus(sessionName: string) {
    await fetch(`/api/sessions/${sessionName}/status`);
    await refreshSessions();
  }

  function openBrandsDialog(session: SessionItem) {
    setSelectedBrands(session.brands.map((b) => b.brand.id));
    setBrandsDialogSession(session.id);
  }

  async function saveBrands() {
    if (!brandsDialogSession) return;
    await fetch("/api/sessions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: brandsDialogSession, brandIds: selectedBrands }),
    });
    toast.success("Marques mises à jour");
    setBrandsDialogSession(null);
    await refreshSessions();
    router.refresh();
  }

  function toggleBrand(brandId: string) {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    );
  }

  return (
    <div className="space-y-3">
      {sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucune session. Les WhatsAppeurs peuvent s&apos;inscrire via /join.
        </p>
      ) : (
        sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between rounded-md border px-4 py-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">
                  {session.sessionName}
                </span>
                <Badge variant={statusConfig[session.status].variant}>
                  {statusConfig[session.status].label}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {session.brands.map((b) => (
                  <Badge key={b.brand.id} variant="outline" className="text-xs">
                    {b.brand.name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {session.phoneNumber || "—"} |{" "}
                Proxy: {session.proxy?.server || "aucun"} |{" "}
                {session._count.publishLogs} pub(s)
              </p>
            </div>

            <div className="flex items-center gap-1">
              {session.status === "SCAN_QR" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQrSession(session.sessionName)}
                >
                  <QrCode className="mr-1 h-3 w-3" />
                  QR
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRefreshStatus(session.sessionName)}
                title="Rafraîchir le statut"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => openBrandsDialog(session)}
                title="Gérer les marques"
              >
                <Tag className="h-3 w-3" />
              </Button>

              {session.status === "WORKING" || session.status === "SCAN_QR" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction(session.id, "stop")}
                >
                  <Square className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction(session.id, "start")}
                >
                  <Play className="h-3 w-3" />
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Supprimer {session.sessionName} ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      La session sera supprimée de WAHA et de la base de données.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(session.id)}
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))
      )}

      {/* QR Code Dialog */}
      <Dialog open={!!qrSession} onOpenChange={() => setQrSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code — {qrSession}</DialogTitle>
            <DialogDescription>
              Scannez ce QR code avec WhatsApp pour connecter la session
            </DialogDescription>
          </DialogHeader>
          {qrSession && (
            <QRDisplay
              sessionName={qrSession}
              onConnected={() => {
                setQrSession(null);
                refreshSessions();
                toast.success("Session connectée !");
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Brands Assignment Dialog */}
      <Dialog
        open={!!brandsDialogSession}
        onOpenChange={() => setBrandsDialogSession(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner des marques</DialogTitle>
            <DialogDescription>
              Sélectionnez les marques pour cette session
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            {allBrands.map((brand) => (
              <label
                key={brand.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border px-4 py-2 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.id)}
                  onChange={() => toggleBrand(brand.id)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">{brand.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {brand.slug}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={saveBrands} disabled={selectedBrands.length === 0}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
