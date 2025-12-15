/**
 * ArtifactsGallery - Component for displaying workflow artifacts with thumbnails and downloads
 */
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, ExternalLink, Image as ImageIcon } from "lucide-react";
import type { Artifact } from "@/types/workflow";
import { cn } from "@/lib/utils";

interface ArtifactsGalleryProps {
  artifacts: Artifact[];
  className?: string;
}

export const ArtifactsGallery: React.FC<ArtifactsGalleryProps> = ({ artifacts, className }) => {
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleDownload = (artifact: Artifact) => {
    const link = document.createElement("a");
    link.href = artifact.url;
    link.download = artifact.id || `artifact-${Date.now()}`;
    link.target = "_blank";
    link.click();
  };

  const handleOpenInNewTab = (artifact: Artifact) => {
    window.open(artifact.url, "_blank");
  };

  if (artifacts.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No artifacts generated yet</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", className)}>
        {artifacts.map((artifact) => (
          <Card
            key={artifact.id}
            className="group cursor-pointer overflow-hidden hover:shadow-lg transition-shadow"
            onClick={() => {
              setSelectedArtifact(artifact);
              setLightboxOpen(true);
            }}
          >
            <CardContent className="p-0">
              <div className="relative aspect-square bg-muted">
                {artifact.thumbnail ? (
                  <img
                    src={artifact.thumbnail}
                    alt={`Artifact ${artifact.id}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to main URL if thumbnail fails
                      if (e.currentTarget.src !== artifact.url) {
                        e.currentTarget.src = artifact.url;
                      }
                    }}
                  />
                ) : artifact.mime.startsWith("image/") ? (
                  <img
                    src={artifact.url}
                    alt={`Artifact ${artifact.id}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(artifact);
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInNewTab(artifact);
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm font-medium truncate">
                  {artifact.meta?.format || artifact.mime.split("/")[1] || "Artifact"}
                </p>
                {artifact.meta?.seed && (
                  <p className="text-xs text-muted-foreground">Seed: {artifact.meta.seed}</p>
                )}
                {artifact.meta?.model_version && (
                  <p className="text-xs text-muted-foreground">
                    Model: {artifact.meta.model_version}
                  </p>
                )}
                {artifact.created_at && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(artifact.created_at).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Artifact Details</DialogTitle>
          </DialogHeader>
          {selectedArtifact && (
            <div className="space-y-4">
              {selectedArtifact.mime.startsWith("image/") ? (
                <img
                  src={selectedArtifact.url}
                  alt={`Artifact ${selectedArtifact.id}`}
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Preview not available</p>
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button onClick={() => handleDownload(selectedArtifact)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={() => handleOpenInNewTab(selectedArtifact)}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="font-medium">Type:</span> {selectedArtifact.mime}
                  </p>
                  {selectedArtifact.meta && (
                    <div className="space-y-1">
                      {selectedArtifact.meta.seed && (
                        <p>
                          <span className="font-medium">Seed:</span> {selectedArtifact.meta.seed}
                        </p>
                      )}
                      {selectedArtifact.meta.model_version && (
                        <p>
                          <span className="font-medium">Model:</span>{" "}
                          {selectedArtifact.meta.model_version}
                        </p>
                      )}
                      {selectedArtifact.meta.dimensions && (
                        <p>
                          <span className="font-medium">Dimensions:</span>{" "}
                          {selectedArtifact.meta.dimensions.width} x{" "}
                          {selectedArtifact.meta.dimensions.height}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedArtifact.created_at && (
                    <p>
                      <span className="font-medium">Created:</span>{" "}
                      {new Date(selectedArtifact.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
