"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [generating, setGenerating] = useState(false);
  const [batchCount, setBatchCount] = useState("5");

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/proxies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: parseInt(batchCount), country: "gf" }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur de génération");
        return;
      }

      toast.success("Proxies générés");
      router.refresh();
      const statsRes = await fetch("/api/proxies");
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setProxies(stats.proxies);
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/proxies?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Proxy supprimé");
      router.refresh();
      const statsRes = await fetch("/api/proxies");
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setProxies(stats.proxies);
      }
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
        <Select value={batchCount} onValueChange={setBatchCount}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 5, 10, 20].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} proxy{n > 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleGenerate} disabled={generating}>
          <Plus className="mr-2 h-4 w-4" />
          {generating ? "Génération..." : "Générer via IPRoyal"}
        </Button>
      </div>

      {proxies.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun proxy dans le pool. Générez-en via IPRoyal.
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
                    {proxy.country} | {proxy.username.substring(0, 30)}...
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Sessions list */}
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
