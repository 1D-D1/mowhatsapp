"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  Image as ImageIcon,
  Video,
  Type,
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  Send,
  Plus,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ContentItem {
  id: string;
  campaignId: string;
  type: "IMAGE" | "VIDEO" | "TEXT";
  fileUrl: string;
  fileName: string;
  mimeType: string;
  caption: string | null;
  position: number;
}

interface SessionOption {
  id: string;
  sessionName: string;
  status: string;
}

export function ContentManager({
  campaignId,
  initialContents,
  sessions,
}: {
  campaignId: string;
  initialContents: ContentItem[];
  sessions: SessionOption[];
}) {
  const router = useRouter();
  const [contents, setContents] = useState(initialContents);
  const [uploading, setUploading] = useState(false);

  // Text content form
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [textBgColor, setTextBgColor] = useState("#1a1a2e");

  // Test send
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testContentId, setTestContentId] = useState("");
  const [testSessionId, setTestSessionId] = useState("");
  const [testSending, setTestSending] = useState(false);

  const workingSessions = sessions.filter((s) => s.status === "WORKING");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      try {
        for (const file of acceptedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("campaignId", campaignId);

          const res = await fetch("/api/content/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const data = await res.json();
            toast.error(`Erreur upload ${file.name}: ${data.error}`);
            continue;
          }

          const newContent = await res.json();
          setContents((prev) => [...prev, newContent]);
        }
        toast.success("Contenu uploadé");
        router.refresh();
      } finally {
        setUploading(false);
      }
    },
    [campaignId, router]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "video/mp4": [".mp4"],
    },
    maxSize: 50 * 1024 * 1024,
  });

  async function handleAddText() {
    if (!textContent.trim()) return;
    const res = await fetch("/api/content/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        text: textContent,
        backgroundColor: textBgColor,
      }),
    });
    if (res.ok) {
      const newContent = await res.json();
      setContents((prev) => [...prev, newContent]);
      setTextContent("");
      setTextDialogOpen(false);
      toast.success("Texte ajouté");
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error || "Erreur");
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/content?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setContents((prev) => prev.filter((c) => c.id !== id));
      toast.success("Contenu supprimé");
    }
  }

  async function handleMove(index: number, direction: "up" | "down") {
    const newContents = [...contents];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newContents.length) return;

    [newContents[index], newContents[swapIndex]] = [
      newContents[swapIndex],
      newContents[index],
    ];

    const ordered = newContents.map((c, i) => ({ ...c, position: i }));
    setContents(ordered);

    await fetch("/api/content/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ordered.map((c) => c.id) }),
    });
  }

  async function handleCaptionUpdate(id: string, caption: string) {
    setContents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, caption } : c))
    );
    await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, caption }),
    });
  }

  async function handleTestSend() {
    if (!testContentId || !testSessionId) return;
    setTestSending(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: testContentId,
          sessionId: testSessionId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Story envoyée sur ${data.sessionName}`);
        setTestDialogOpen(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur d'envoi");
      }
    } finally {
      setTestSending(false);
    }
  }

  function openTestDialog(contentId: string) {
    setTestContentId(contentId);
    setTestSessionId(workingSessions[0]?.id || "");
    setTestDialogOpen(true);
  }

  const typeIcon = (type: string) => {
    if (type === "IMAGE") return <ImageIcon className="mr-1 h-3 w-3" />;
    if (type === "VIDEO") return <Video className="mr-1 h-3 w-3" />;
    return <Type className="mr-1 h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload zone + Add text button */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {uploading ? "Upload..." : "Images / Vidéos"}
          </p>
          <p className="text-xs text-muted-foreground">JPG, PNG, MP4</p>
        </div>

        <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
          <DialogTrigger asChild>
            <button className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center transition-colors hover:border-primary/50">
              <Type className="h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Ajouter du texte
              </p>
              <p className="text-xs text-muted-foreground">
                Status texte + variables
              </p>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un texte</DialogTitle>
              <DialogDescription>
                Variables disponibles : {`{{CODE_PROMO}}`}, {`{{PRENOM}}`}, {`{{MARQUE}}`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Texte</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder={"Utilise le code {{CODE_PROMO}} pour -10% chez {{MARQUE}} !"}
                />
              </div>
              <div className="grid gap-2">
                <Label>Couleur de fond</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={textBgColor}
                    onChange={(e) => setTextBgColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border"
                  />
                  <Input
                    value={textBgColor}
                    onChange={(e) => setTextBgColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddText} disabled={!textContent.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content list */}
      {contents.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Aucun contenu dans cette campagne
        </p>
      ) : (
        <div className="space-y-2">
          {contents.map((content, index) => (
            <div
              key={content.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              {/* Position */}
              <div className="flex flex-col items-center gap-0.5">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  {index + 1}
                </span>
              </div>

              {/* Move buttons */}
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => handleMove(index, "up")}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => handleMove(index, "down")}
                  disabled={index === contents.length - 1}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Preview */}
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
                {content.type === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={content.fileUrl}
                    alt={content.fileName}
                    className="h-full w-full object-cover"
                  />
                ) : content.type === "TEXT" ? (
                  <div
                    className="flex h-full w-full items-center justify-center p-1"
                    style={{ backgroundColor: content.fileUrl }}
                  >
                    <span className="line-clamp-3 text-center text-[8px] text-white">
                      {content.caption?.substring(0, 40)}
                    </span>
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Video className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {content.type === "TEXT"
                      ? content.caption?.substring(0, 50) || "Texte"
                      : content.fileName}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {typeIcon(content.type)}
                    {content.type}
                  </Badge>
                </div>
                {content.type !== "TEXT" && (
                  <Input
                    placeholder="Caption + variables: {{CODE_PROMO}}, {{PRENOM}}, {{MARQUE}}"
                    defaultValue={content.caption || ""}
                    className="h-7 text-xs"
                    onBlur={(e) =>
                      handleCaptionUpdate(content.id, e.target.value)
                    }
                  />
                )}
              </div>

              {/* Test send */}
              {workingSessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openTestDialog(content.id)}
                  title="Tester l'envoi"
                >
                  <Send className="h-3 w-3" />
                </Button>
              )}

              {/* Delete */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce contenu ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {content.fileName} sera supprimé de la boucle.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(content.id)}
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      {/* Test Send Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test d&apos;envoi</DialogTitle>
            <DialogDescription>
              Envoyer ce contenu comme Story sur un compte WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Session WhatsApp</Label>
              <Select value={testSessionId} onValueChange={setTestSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un compte" />
                </SelectTrigger>
                <SelectContent>
                  {workingSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.sessionName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleTestSend}
              disabled={testSending || !testSessionId}
            >
              {testSending ? "Envoi..." : "Envoyer la Story"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
