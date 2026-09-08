import type { RiskLevel } from '@/types';
import { riskConfig } from '@/utils/risk';
import { Badge } from './Badge';

interface RiskBadgeProps {
  level: RiskLevel;
  showDot?: boolean;
}

export function RiskBadge({ level, showDot = true }: RiskBadgeProps) {
  const cfg = riskConfig[level];
  return (
    <Badge variant={level}>
      {showDot && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.hex }} />}
      {cfg.label}
    </Badge>
  );
}
