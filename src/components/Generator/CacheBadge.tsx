import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles } from "lucide-react";

interface CacheBadgeProps {
  cached: boolean;
  onClick?: () => void;
}

export function CacheBadge({ cached, onClick }: CacheBadgeProps) {
  if (!cached) return null;

  return (
    <Badge
      variant="default"
      className="bg-green-600 hover:bg-green-700 cursor-pointer"
      onClick={onClick}
    >
      <Sparkles className="w-3 h-3 mr-1" />
      Cache Hit
      <CheckCircle2 className="w-3 h-3 ml-1" />
    </Badge>
  );
}

