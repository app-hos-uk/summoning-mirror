import { useFanCounter } from '../hooks/useAnalytics';
import type { Lang } from '../types/fandom';
import { t } from '../utils/i18n';

interface Props {
  lang: Lang;
  fandomName?: string;
}

export default function FanCounter({ lang, fandomName }: Props) {
  const count = useFanCounter();
  const i = t(lang);

  if (count === null || count === 0) return null;

  const ordinal = count + 1;

  return (
    <div className="fan-counter-reveal text-center">
      <p className="text-xs md:text-sm tracking-wider" style={{ color: 'rgba(197,165,90,0.5)' }}>
        {fandomName ? (
          <>
            <span className="font-bold" style={{ color: '#C5A55A' }}>
              {ordinal.toLocaleString()}{lang === 'en' ? getSuffix(ordinal) : ''}
            </span>{' '}
            {fandomName} {i.fanCounter}
          </>
        ) : (
          <>
            <span className="font-bold" style={{ color: '#C5A55A' }}>
              {count.toLocaleString()}+
            </span>{' '}
            {i.fanCounter}
          </>
        )}
      </p>
    </div>
  );
}

function getSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
