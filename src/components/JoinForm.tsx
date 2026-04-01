"use client";

import { useState } from "react";
import { Smartphone, QrCode, CheckCircle, Loader2 } from "lucide-react";
import { QRDisplay } from "@/components/QRDisplay";
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

type Step = "form" | "qr" | "done";

export function JoinForm({ brands }: { brands: BrandOption[] }) {
  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionName, setSessionName] = useState("");

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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de la création de la session");
        return;
      }

      const session = await res.json();
      setSessionName(session.sessionName);
      setStep("qr");
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
            Votre session est active. Les Stories des marques seront publiées
            automatiquement sur votre WhatsApp.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === "qr") {
    return (
      <Card>
        <CardHeader className="text-center">
          <QrCode className="mx-auto h-8 w-8" />
          <CardTitle>Scannez le QR Code</CardTitle>
          <CardDescription>
            Ouvrez WhatsApp &gt; Appareils connectés &gt; Connecter un appareil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QRDisplay
            sessionName={sessionName}
            onConnected={() => setStep("done")}
          />
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

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

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
