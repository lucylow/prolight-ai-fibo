import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Trash2, Award } from "lucide-react";
import type { ArtifactInfo } from "@/api/text-to-image";
import { cn } from "@/lib/utils";

interface VariantGridProps {
  artifacts: ArtifactInfo[];
  onSelectPrimary?: (artifactId: string) => void;
  onDelete?: (artifactId: string) => void;
  primaryId?: string;
  showScores?: boolean;
}

export function VariantGrid({
  artifacts,
  onSelectPrimary,
  onDelete,
  primaryId,
  showScores = true,
}: VariantGridProps) {
  const sortedArtifacts = [...artifacts].sort((a, b) => {
    // Sort by evaluator score if available
    const scoreA = a.evaluator_score ?? 0;
    const scoreB = b.evaluator_score ?? 0;
    return scoreB - scoreA;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedArtifacts.map((artifact) => {
        const isPrimary = artifact.id === primaryId;
        return (
          <Card
            key={artifact.id}
            className={cn(
              "relative group overflow-hidden",
              isPrimary && "ring-2 ring-primary"
            )}
          >
            <CardContent className="p-0">
              <div className="relative aspect-square bg-muted">
                <img
                  src={artifact.thumb_url || artifact.url}
                  alt={`Variant ${artifact.variant_index + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {onSelectPrimary && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onSelectPrimary(artifact.id)}
                      disabled={isPrimary}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      {isPrimary ? "Primary" : "Set Primary"}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(artifact.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>

                {/* Primary badge */}
                {isPrimary && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="default" className="bg-primary">
                      <Award className="w-3 h-3 mr-1" />
                      Primary
                    </Badge>
                  </div>
                )}

                {/* Score badges */}
                {showScores && artifact.evaluator_score !== undefined && (
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {artifact.semantic_score !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        Semantic: {artifact.semantic_score.toFixed(2)}
                      </Badge>
                    )}
                    {artifact.perceptual_score !== undefined && (
                      <Badge variant="secondary" className="text-xs">
                        LPIPS: {artifact.perceptual_score.toFixed(2)}
                      </Badge>
                    )}
                    <Badge variant="default" className="text-xs">
                      Score: {artifact.evaluator_score.toFixed(2)}
                    </Badge>
                  </div>
                )}

                {/* Variant index */}
                <div className="absolute bottom-2 left-2">
                  <Badge variant="outline">Variant {artifact.variant_index + 1}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

