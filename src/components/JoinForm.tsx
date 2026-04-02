"use client";

import { useState, useEffect } from "react";
import { Smartphone, QrCode, CheckCircle, Loader2, Hash } from "lucide-react";
import { QRDisplay } from "@/components/QRDisplay";
import { PairCode } from "@/components/PairCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BrandOption {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

type Step = "form" | "connect" | "done";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );
    setIsMobile(check);
  }, []);
  return isMobile;
}

export function JoinForm({ brands }: { brands: BrandOption[] }) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [publishesPerDay, setPublishesPerDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [connectMode, setConnectMode] = useState<"qr" | "code">("qr");

  useEffect(() => {
    if (isMobile) setConnectMode("code");
  }, [isMobile]);

  function toggleBrand(id: string) {
    setSelectedBrands((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!phone || selectedBrands.length === 0) {
      setError("Veuillez entrer votre numéro et sélectionner au moins une marque");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phone,
          displayName: displayName || undefined,
          brandIds: selectedBrands,
          publishesPerDay,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de la création de la session");
        return;
      }

      const session = await res.json();
      setSessionName(session.sessionName);

      if (session.alreadyConnected) {
        setStep("done");
      } else {
        setStep("connect");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-4 text-xl font-bold">WhatsApp connecté !</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Votre session est active. Les Stories seront publiées
            automatiquement {publishesPerDay}x par jour sur votre WhatsApp.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === "connect") {
    return (
      <Card>
        <CardHeader className="text-center">
          {connectMode === "qr" ? (
            <QrCode className="mx-auto h-8 w-8" />
          ) : (
            <Hash className="mx-auto h-8 w-8" />
          )}
          <CardTitle>
            {connectMode === "qr"
              ? "Scannez le QR Code"
              : "Code de liaison"}
          </CardTitle>
          <CardDescription>
            {connectMode === "qr"
              ? "Ouvrez WhatsApp > Appareils connectés > Connecter un appareil"
              : "Entrez ce code dans WhatsApp > Appareils connectés > Lier avec numéro de téléphone"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectMode === "qr" ? (
            <QRDisplay
              sessionName={sessionName}
              onConnected={() => setStep("done")}
            />
          ) : (
            <PairCode
              sessionName={sessionName}
              phoneNumber={phone}
              onConnected={() => setStep("done")}
            />
          )}

          {/* Toggle between QR and Code */}
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setConnectMode((m) => (m === "qr" ? "code" : "qr"))
              }
              className="text-xs text-muted-foreground"
            >
              {connectMode === "qr" ? (
                <>
                  <Hash className="mr-1 h-3 w-3" />
                  Utiliser un code à la place
                </>
              ) : (
                <>
                  <QrCode className="mr-1 h-3 w-3" />
                  Utiliser un QR code à la place
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-center">
          <Smartphone className="h-8 w-8" />
        </div>
        <CardTitle className="text-center">Inscription</CardTitle>
        <CardDescription className="text-center">
          Entrez vos informations pour connecter votre WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0694 12 34 56"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Nom (optionnel)</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jean"
            />
          </div>

          <div className="space-y-2">
            <Label>Marques à diffuser</Label>
            <div className="grid gap-2">
              {brands.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune marque disponible
                </p>
              ) : (
                brands.map((brand) => (
                  <label
                    key={brand.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border px-4 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand.id)}
                      onChange={() => toggleBrand(brand.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium">{brand.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Publications par jour</Label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPublishesPerDay(n)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    publishesPerDay === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted hover:bg-muted/50"
                  }`}
                >
                  {n}x / jour
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !phone || selectedBrands.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              "Connecter mon WhatsApp"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
