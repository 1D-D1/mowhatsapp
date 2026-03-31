"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  Image as ImageIcon,
  Video,
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

export function ContentManager({
  campaignId,
  initialContents,
}: {
  campaignId: string;
  initialContents: ContentItem[];
}) {
  const router = useRouter();
  const [contents, setContents] = useState(initialContents);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      try {
        let hasError = false;
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
            hasError = true;
            continue;
          }

          const newContent = await res.json();
          setContents((prev) => [...prev, newContent]);
        }
        if (!hasError && acceptedFiles.length > 0) {
          toast.success("Contenu uploadé");
        }
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

    // Update positions
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

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          {uploading
            ? "Upload en cours..."
            : isDragActive
            ? "Déposez les fichiers ici"
            : "Glissez des images/vidéos ici, ou cliquez pour sélectionner"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPG, PNG, MP4 — max 50 Mo
        </p>
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
              {/* Position controls */}
              <div className="flex flex-col items-center gap-0.5">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">
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
                    {content.fileName}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {content.type === "IMAGE" ? (
                      <ImageIcon className="mr-1 h-3 w-3" />
                    ) : (
                      <Video className="mr-1 h-3 w-3" />
                    )}
                    {content.type}
                  </Badge>
                </div>
                <Input
                  placeholder="Caption (optionnel)"
                  defaultValue={content.caption || ""}
                  className="h-7 text-xs"
                  onBlur={(e) =>
                    handleCaptionUpdate(content.id, e.target.value)
                  }
                />
              </div>

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
    </div>
  );
}
