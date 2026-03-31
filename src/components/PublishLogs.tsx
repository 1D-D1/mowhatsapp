"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LogItem {
  id: string;
  status: "PENDING" | "SENT" | "FAILED";
  error: string | null;
  publishedAt: string | Date;
  campaign: {
    name: string;
    brand: { name: string };
  };
  content: {
    fileName: string;
    type: string;
  };
  session: {
    sessionName: string;
  };
}

interface BrandOption {
  id: string;
  name: string;
}

interface SessionOption {
  id: string;
  sessionName: string;
}

const statusVariant = {
  SENT: "default" as const,
  FAILED: "destructive" as const,
  PENDING: "secondary" as const,
};

export function PublishLogs({
  initialLogs,
  brands,
  sessions,
}: {
  initialLogs: LogItem[];
  brands: BrandOption[];
  sessions: SessionOption[];
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [brandFilter, setBrandFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  async function applyFilters(
    brand: string,
    session: string,
    status: string
  ) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (brand !== "all") params.set("brandId", brand);
      if (session !== "all") params.set("sessionId", session);
      if (status !== "all") params.set("status", status);
      params.set("limit", "50");

      const res = await fetch(`/api/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
      }
    } finally {
      setLoading(false);
    }
  }

  function onBrandChange(value: string) {
    setBrandFilter(value);
    applyFilters(value, sessionFilter, statusFilter);
  }

  function onSessionChange(value: string) {
    setSessionFilter(value);
    applyFilters(brandFilter, value, statusFilter);
  }

  function onStatusChange(value: string) {
    setStatusFilter(value);
    applyFilters(brandFilter, sessionFilter, value);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={brandFilter} onValueChange={onBrandChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Marque" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les marques</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sessionFilter} onValueChange={onSessionChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sessions</SelectItem>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.sessionName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="SENT">Envoyé</SelectItem>
            <SelectItem value="FAILED">Échoué</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs list */}
      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Chargement...
        </p>
      ) : logs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucun log de publication
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {log.campaign.brand.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    — {log.campaign.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Session: {log.session.sessionName} | Fichier:{" "}
                  {log.content.fileName} ({log.content.type})
                </p>
                {log.error && (
                  <p className="text-xs text-destructive">{log.error}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant[log.status]}>
                  {log.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.publishedAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
