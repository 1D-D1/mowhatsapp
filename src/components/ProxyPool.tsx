"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Wifi, WifiOff, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProxySession {
  sessionName: string;
  status: string;
}

interface ProxyItem {
  id: string;
  server: string;
  username: string;
  password: string;
  country: string;
  maxSessions: number;
  active: boolean;
  _count: { sessions: number };
  sessions: ProxySession[];
}

export function ProxyPool({
  initialProxies,
}: {
  initialProxies: ProxyItem[];
}) {
  const router = useRouter();
  const [proxies, setProxies] = useState(initialProxies);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Manual form
  const [manualServer, setManualServer] = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [manualCountry, setManualCountry] = useState("GF");

  // Bulk paste
  const [bulkText, setBulkText] = useState("");

  async function refreshProxies() {
    const res = await fetch("/api/proxies");
    if (res.ok) {
      const stats = await res.json();
      setProxies(stats.proxies);
    }
    router.refresh();
  }

  async function handleManualAdd() {
    if (!manualServer || !manualUsername || !manualPassword) {
      toast.error("Tous les champs sont requis");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/proxies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "manual",
          server: manualServer,
          username: manualUsername,
          password: manualPassword,
          country: manualCountry,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success("Proxy ajouté");
      setManualServer("");
      setManualUsername("");
      setManualPassword("");
      setDialogOpen(false);
      await refreshProxies();
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkAdd() {
    if (!bulkText.trim()) {
      toast.error("Collez au moins un proxy");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/proxies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "bulk",
          proxies: bulkText,
          country: manualCountry,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur");
        return;
      }
      const data = await res.json();
      toast.success(`${data.created} proxy(s) ajouté(s)`);
      setBulkText("");
      setDialogOpen(false);
      await refreshProxies();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/proxies?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Proxy supprimé");
      await refreshProxies();
    }
  }

  function capacityBadge(proxy: ProxyItem) {
    const used = proxy._count.sessions;
    const max = proxy.maxSessions;
    if (!proxy.active) return <Badge variant="outline">Inactif</Badge>;
    if (used >= max) return <Badge variant="destructive">{used}/{max}</Badge>;
    if (used > 0) return <Badge variant="secondary">{used}/{max}</Badge>;
    return <Badge variant="default">{used}/{max}</Badge>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter des proxies
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Ajouter des proxies</DialogTitle>
              <DialogDescription>
                Ajoutez vos proxies IPRoyal manuellement ou collez une liste
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="bulk">
              <TabsList className="w-full">
                <TabsTrigger value="bulk" className="flex-1">
                  <ClipboardPaste className="mr-2 h-4 w-4" />
                  Coller une liste
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex-1">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajout manuel
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bulk" className="space-y-4">
                <div className="grid gap-2">
                  <Label>
                    Proxies (un par ligne, format host:port:user:pass)
                  </Label>
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                    placeholder={"geo.iproyal.com:12321:user1:pass1\ngeo.iproyal.com:12321:user2:pass2"}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {bulkText.trim()
                      ? `${bulkText.trim().split("\n").filter((l) => l.trim()).length} proxy(s) détecté(s)`
                      : "Collez vos proxies depuis IPRoyal"}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Pays</Label>
                  <Input
                    value={manualCountry}
                    onChange={(e) => setManualCountry(e.target.value)}
                    placeholder="GF"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleBulkAdd} disabled={loading || !bulkText.trim()}>
                    {loading ? "Ajout..." : "Ajouter"}
                  </Button>
                </DialogFooter>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4">
                <div className="grid gap-2">
                  <Label>Serveur (host:port)</Label>
                  <Input
                    value={manualServer}
                    onChange={(e) => setManualServer(e.target.value)}
                    placeholder="geo.iproyal.com:12321"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Username</Label>
                  <Input
                    value={manualUsername}
                    onChange={(e) => setManualUsername(e.target.value)}
                    placeholder="username_country-gf"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={manualPassword}
                    onChange={(e) => setManualPassword(e.target.value)}
                    placeholder="password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Pays</Label>
                  <Input
                    value={manualCountry}
                    onChange={(e) => setManualCountry(e.target.value)}
                    placeholder="GF"
                  />
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleManualAdd}
                    disabled={loading || !manualServer || !manualUsername || !manualPassword}
                  >
                    {loading ? "Ajout..." : "Ajouter"}
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {proxies.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun proxy dans le pool. Ajoutez vos proxies IPRoyal.
        </p>
      ) : (
        <div className="space-y-2">
          {proxies.map((proxy) => (
            <div
              key={proxy.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {proxy.active ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="font-mono text-sm">{proxy.server}</p>
                  <p className="text-xs text-muted-foreground">
                    {proxy.country} | {proxy.username.substring(0, 30)}
                    {proxy.username.length > 30 ? "..." : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {proxy.sessions.length > 0 && (
                  <div className="flex gap-1">
                    {proxy.sessions.map((s) => (
                      <Badge key={s.sessionName} variant="outline" className="text-xs">
                        {s.sessionName}
                      </Badge>
                    ))}
                  </div>
                )}

                {capacityBadge(proxy)}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce proxy ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {proxy._count.sessions > 0
                          ? "Ce proxy a des sessions actives. Il sera désactivé."
                          : "Ce proxy sera définitivement supprimé."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(proxy.id)}>
                        {proxy._count.sessions > 0 ? "Désactiver" : "Supprimer"}
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
