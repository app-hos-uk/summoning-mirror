import { Gift } from 'lucide-react';
import type { Lang } from '../types/fandom';
import { t } from '../utils/i18n';

interface Props {
  ugcCode: string;
  lang: Lang;
}

export default function ShareToEarnBanner({ ugcCode, lang }: Props) {
  const i = t(lang);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(ugcCode);
    } catch { /* ignore */ }
  };

  return (
    <div className="share-to-earn-banner w-full" onClick={copyCode} role="button" tabIndex={0}>
      <div className="flex items-start gap-2">
        <Gift size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#C5A55A' }} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs font-bold tracking-[0.12em] mb-1"
            style={{ color: '#C5A55A' }}>
            {i.shareToEarnTitle}
          </p>
          <p className="text-[9px] sm:text-[10px] leading-relaxed tracking-wider"
            style={{ color: 'rgba(197,165,90,0.6)' }}>
            {i.shareToEarnBody}
          </p>
          <p className="ugc-code-display mt-2">{ugcCode}</p>
          <p className="text-[8px] sm:text-[9px] mt-1 tracking-wider"
            style={{ color: 'rgba(197,165,90,0.35)' }}>
            {i.ugcCodeHint}
          </p>
        </div>
      </div>
    </div>
  );
}
