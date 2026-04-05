"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, AlertCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRDisplayProps {
  sessionName: string;
  onConnected?: () => void;
  onFailed?: (error: string) => void;
}

type Status = "loading" | "qr" | "waiting" | "error" | "failed";

export function QRDisplay({ sessionName, onConnected, onFailed }: QRDisplayProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);

  const workingCountRef = useRef(0);

  const clearIntervals = useCallback(() => {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  }, []);

  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionName}/qr`);
      const data = await res.json();

      if (!res.ok) {
        const details = data.details || "";
        if (details.includes("FAILED")) {
          setStatus("failed");
          setErrorMsg("La session a \u00e9chou\u00e9. Le proxy est peut-\u00eatre invalide ou WhatsApp a rejet\u00e9 la connexion.");
          setQrValue(null);
          clearIntervals();
          onFailed?.("Session FAILED");
          return;
        }
        if (details.includes("WORKING") || details.includes("CONNECTED")) {
          workingCountRef.current += 1;
          if (workingCountRef.current >= 2) {
            clearIntervals();
            onConnected?.();
            return;
          }
          setStatus("waiting");
          setErrorMsg("Connexion d\u00e9tect\u00e9e, v\u00e9rification finale...");
          setQrValue(null);
          return;
        }
        if (retryCount < 30) {
          setStatus("waiting");
          setErrorMsg("La session d\u00e9marre... Le QR code arrive.");
          setRetryCount((c) => c + 1);
          return;
        }
        setStatus("error");
        setErrorMsg(data.error || `Erreur ${res.status}`);
        return;
      }

      if (data.value) {
        setQrValue(data.value);
        setStatus("qr");
        setRetryCount(0);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Impossible de contacter le serveur");
    }
  }, [sessionName, onFailed, onConnected, retryCount, clearIntervals]);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionName}/status`);
      if (!res.ok) return;
      const data = await res.json();

      // Use WAHA status directly when available (more reliable than DB when webhook is broken)
      const effectiveStatus = data.wahaStatus === "WORKING" ? "WORKING" : data.dbStatus;

      if (effectiveStatus === "WORKING") {
        workingCountRef.current += 1;
        if (workingCountRef.current >= 2) {
          clearIntervals();
          onConnected?.();
        } else {
          setStatus("waiting");
          setErrorMsg("Connexion d\u00e9tect\u00e9e, v\u00e9rification...");
          setQrValue(null);
        }
      } else if (data.wahaStatus === "FAILED" || data.dbStatus === "FAILED") {
        workingCountRef.current = 0;
        setStatus("failed");
        setErrorMsg("La session a \u00e9chou\u00e9. V\u00e9rifiez le proxy ou r\u00e9essayez.");
        setQrValue(null);
        clearIntervals();
      } else {
        workingCountRef.current = 0;
      }
    } catch {
      // Ignore
    }
  }, [sessionName, onConnected, clearIntervals]);

  useEffect(() => {
    fetchQR();
    const qrId = setInterval(fetchQR, 5000);
    const statusId = setInterval(pollStatus, 3000);
    intervalsRef.current = [qrId, statusId];

    const timeout = setTimeout(() => {
      clearIntervals();
      setStatus((s) => (s === "qr" ? s : "error"));
      setErrorMsg((e) => e || "D\u00e9lai expir\u00e9 \u2014 rechargez la page");
    }, 5 * 60 * 1000);

    return () => {
      clearIntervals();
      clearTimeout(timeout);
    };
  }, [fetchQR, pollStatus, clearIntervals]);

  if (status === "loading" || status === "waiting") {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {status === "waiting" ? errorMsg : "Chargement du QR code..."}
        </p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <XCircle className="h-10 w-10 text-destructive" />
        <div className="text-center">
          <p className="text-sm font-medium text-destructive">Session \u00e9chou\u00e9e</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">{errorMsg}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Supprimez cette session dans l&apos;admin et r\u00e9essayez.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{errorMsg}</p>
        <Button variant="outline" size="sm" onClick={fetchQR}>
          <RefreshCw className="mr-2 h-4 w-4" />
          R\u00e9essayer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {qrValue && (
        <div className="rounded-lg border bg-white p-4">
          <QRCodeSVG value={qrValue} size={256} level="M" includeMargin />
        </div>
      )}
      <Button variant="outline" size="sm" onClick={fetchQR}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Rafra\u00eechir
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Rafra\u00eechissement auto toutes les 10s. Le scan sera d\u00e9tect\u00e9 automatiquement.
      </p>
    </div>
  );
}
