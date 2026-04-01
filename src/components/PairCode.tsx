"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, AlertCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PairCodeProps {
  sessionName: string;
  phoneNumber: string;
  onConnected?: () => void;
}

export function PairCode({ sessionName, phoneNumber, onConnected }: PairCodeProps) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const requestCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionName}/pair`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Erreur ${res.status}`);
        setCode(null);
        return;
      }

      const rawCode = typeof data.code === "string" ? data.code : String(data.code);
      // Format code with dash for readability: XXXX-XXXX
      const formatted =
        rawCode.length === 8
          ? `${rawCode.slice(0, 4)}-${rawCode.slice(4)}`
          : rawCode;
      setCode(formatted);
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  }, [sessionName, phoneNumber]);

  // Poll session status
  useEffect(() => {
    requestCode();

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionName}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.wahaStatus === "WORKING" || data.dbStatus === "WORKING") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onConnected?.();
        }
      } catch {
        // Ignore
      }
    }, 3000);

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(timeout);
    };
  }, [requestCode, sessionName, onConnected]);

  if (loading && !code) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Génération du code de liaison...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        {error.includes("FAILED") ? (
          <XCircle className="h-8 w-8 text-destructive" />
        ) : (
          <AlertCircle className="h-8 w-8 text-destructive" />
        )}
        <p className="max-w-xs text-center text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={requestCode}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {code && (
        <div className="rounded-xl border-2 border-primary bg-primary/5 px-8 py-6">
          <p className="text-center font-mono text-4xl font-bold tracking-[0.3em]">
            {code}
          </p>
        </div>
      )}
      <div className="max-w-xs space-y-2 text-center">
        <p className="text-sm font-medium">
          Entrez ce code dans WhatsApp :
        </p>
        <ol className="text-left text-xs text-muted-foreground space-y-1">
          <li>1. Ouvrez <strong>WhatsApp</strong></li>
          <li>2. Allez dans <strong>Appareils connectés</strong></li>
          <li>3. Appuyez sur <strong>Connecter un appareil</strong></li>
          <li>4. Appuyez sur <strong>Lier avec numéro de téléphone</strong></li>
          <li>5. Entrez le code ci-dessus</li>
        </ol>
      </div>
      <Button variant="outline" size="sm" onClick={requestCode} disabled={loading}>
        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Nouveau code
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        La connexion sera détectée automatiquement.
      </p>
    </div>
  );
}
