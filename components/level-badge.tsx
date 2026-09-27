import { Badge } from "@/components/ui/badge";
import { LEVEL_LABEL } from "@/lib/constants";

export function LevelBadge({ level }: { level: keyof typeof LEVEL_LABEL }) {
  const variant = level === "BERAT" ? "destructive" : level === "SEDANG" ? "warning" : "secondary";
  return <Badge variant={variant}>{LEVEL_LABEL[level]}</Badge>;
}
