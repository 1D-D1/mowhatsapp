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
        // Parse WAHA error details
        const details = data.details || "";
        if (details.includes("FAILED")) {
          setStatus("failed");
          setErrorMsg("La session a échoué. Le proxy est peut-être invalide ou WhatsApp a rejeté la connexion.");
          setQrValue(null);
          clearIntervals();
          onFailed?.("Session FAILED");
          return;
        }
        if (details.includes("WORKING") || details.includes("CONNECTED")) {
          // Don't trigger success here — let pollStatus confirm it's stable
          setStatus("waiting");
          setErrorMsg("Connexion en cours, vérification...");
          setQrValue(null);
          return;
        }
        // QR not yet available — session might still be starting
        if (retryCount < 30) {
          setStatus("waiting");
          setErrorMsg("La session démarre... Le QR code arrive.");
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
  }, [sessionName, onFailed, retryCount, clearIntervals]);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionName}/status`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.dbStatus === "WORKING") {
        // Require 2 consecutive WORKING polls (~6s) before confirming
        workingCountRef.current += 1;
        if (workingCountRef.current >= 2) {
          clearIntervals();
          onConnected?.();
        } else {
          setStatus("waiting");
          setErrorMsg("Connexion détectée, vérification...");
          setQrValue(null);
        }
      } else if (data.wahaStatus === "FAILED" || data.dbStatus === "FAILED") {
        workingCountRef.current = 0;
        setStatus("failed");
        setErrorMsg("La session a échoué. Vérifiez le proxy ou réessayez.");
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
      setErrorMsg((e) => e || "Délai expiré — rechargez la page");
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
          <p className="text-sm font-medium text-destructive">Session échouée</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">{errorMsg}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Supprimez cette session dans l&apos;admin et réessayez.
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
          Réessayer
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
        Rafraîchir
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Rafraîchissement auto toutes les 10s. Le scan sera détecté automatiquement.
      </p>
    </div>
  );
}
