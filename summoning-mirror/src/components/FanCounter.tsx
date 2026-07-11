import { useFanCounter } from '../hooks/useAnalytics';
import type { Lang } from '../types/fandom';
import { getOrdinalSuffix } from '../utils/loyaltyTiers';
import { t } from '../utils/i18n';

interface Props {
  lang: Lang;
  fandomName?: string;
  fandomOrdinal?: number;
  fandomTotal?: number;
}

export default function FanCounter({
  lang,
  fandomName,
  fandomOrdinal,
  fandomTotal,
}: Props) {
  const globalCount = useFanCounter();
  const i = t(lang);

  if (fandomOrdinal && fandomName) {
    const suffix = getOrdinalSuffix(fandomOrdinal, lang);
    return (
      <div className="fan-counter-reveal text-center">
        <p className="text-xs md:text-sm tracking-wider" style={{ color: 'rgba(197,165,90,0.5)' }}>
          <span className="font-bold" style={{ color: '#C5A55A' }}>
            {fandomOrdinal.toLocaleString()}{suffix}
          </span>{' '}
          {fandomName} {i.fanCounter}
        </p>
        {fandomTotal !== undefined && (
          <p className="text-[9px] sm:text-[10px] tracking-wider mt-1"
            style={{ color: 'rgba(197,165,90,0.35)' }}>
            {(fandomTotal + 1).toLocaleString()} {fandomName} {i.fandomTotal}
          </p>
        )}
      </div>
    );
  }

  if (globalCount === null || globalCount === 0) return null;

  return (
    <div className="fan-counter-reveal text-center">
      <p className="text-xs md:text-sm tracking-wider" style={{ color: 'rgba(197,165,90,0.5)' }}>
        <span className="font-bold" style={{ color: '#C5A55A' }}>
          {globalCount.toLocaleString()}+
        </span>{' '}
        {i.fanCounter}
      </p>
    </div>
  );
}
