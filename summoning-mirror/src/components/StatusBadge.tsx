import type { Lang } from '../types/fandom';
import type { StatusTier } from '../types/loyalty';
import { getStatusTierLabel } from '../utils/loyaltyTiers';
import { t } from '../utils/i18n';

interface Props {
  tier: StatusTier;
  lang: Lang;
}

export default function StatusBadge({ tier, lang }: Props) {
  const i = t(lang);
  const label = getStatusTierLabel(tier, lang);

  return (
    <div className="status-badge">
      <span className="status-badge-label">{i.statusLabel}</span>
      <span className={`status-badge-tier status-tier-${tier}`}>{label}</span>
    </div>
  );
}
