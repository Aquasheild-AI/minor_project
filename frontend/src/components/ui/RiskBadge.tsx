import type { RiskLevel } from '@/types';
import { riskConfig } from '@/utils/risk';
import { Badge } from './Badge';
import { useTranslation } from 'react-i18next';

interface RiskBadgeProps {
  level: RiskLevel;
  showDot?: boolean;
}

export function RiskBadge({ level, showDot = true }: RiskBadgeProps) {
  const { t } = useTranslation();
  const cfg = riskConfig[level];
  const localizedLabel = t(`common.riskLevels.${level}`, { defaultValue: cfg?.label || level });

  return (
    <Badge variant={level}>
      {showDot && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg?.hex || '#94a3b8' }} />}
      {localizedLabel}
    </Badge>
  );
}
