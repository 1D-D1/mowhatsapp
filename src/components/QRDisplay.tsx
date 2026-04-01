"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRDisplayProps {
  sessionName: string;
  onConnected?: () => void;
}

export function QRDisplay({ sessionName, onConnected }: QRDisplayProps) {
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQR = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionName}/qr`);
      const data = await res.json();

      if (!res.ok) {
        // If session moved past SCAN_QR, it might be connected
        if (data.details?.includes("WORKING") || data.details?.includes("CONNECTED")) {
          onConnected?.();
          return;
        }
        setError(data.error || "QR indisponible");
        setQrValue(null);
        return;
      }

      if (data.value) {
        setQrValue(data.value);
        setError(null);
      } else {
        setError("QR vide — réessayez");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, [sessionName, onConnected]);

  useEffect(() => {
    fetchQR();

    // Auto-refresh QR every 15s (WAHA QR codes expire)
    const qrInterval = setInterval(fetchQR, 15000);

    // Poll session status every 3s
    const statusInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionName}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.wahaStatus === "WORKING" || data.dbStatus === "WORKING") {
          onConnected?.();
        }
      } catch {
        // Ignore
      }
    }, 3000);

    return () => {
      clearInterval(qrInterval);
      clearInterval(statusInterval);
    };
  }, [fetchQR, sessionName, onConnected]);

  if (loading && !qrValue) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Chargement du QR code...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
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
          <QRCodeSVG
            value={qrValue}
            size={256}
            level="M"
            includeMargin
          />
        </div>
      )}
      <Button variant="outline" size="sm" onClick={fetchQR} disabled={loading}>
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Rafraîchir
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Le QR se rafraîchit automatiquement. Le scan sera détecté en quelques secondes.
      </p>
    </div>
  );
}
