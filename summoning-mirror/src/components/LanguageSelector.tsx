import type { Lang } from '../types/fandom';
import { ALL_LANGS, LANG_LABELS } from '../utils/i18n';

interface Props {
  lang: Lang;
  onChange: (lang: Lang) => void;
}

export default function LanguageSelector({ lang, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-center">
      {ALL_LANGS.map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className="px-2.5 py-1 text-[10px] md:text-xs tracking-wider rounded-full border cursor-pointer transition-all duration-200 hover:scale-105"
          style={{
            borderColor: lang === l ? 'rgba(197,165,90,0.6)' : 'rgba(197,165,90,0.15)',
            backgroundColor: lang === l ? 'rgba(197,165,90,0.15)' : 'transparent',
            color: lang === l ? '#C5A55A' : 'rgba(197,165,90,0.4)',
            fontWeight: lang === l ? 700 : 400,
          }}>
          {LANG_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
