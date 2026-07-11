import type { Fandom } from '../types/fandom';

interface Props {
  fandom: Fandom;
  selected: boolean;
  onSelect: (fandom: Fandom) => void;
}

export default function FandomCard({ fandom, selected, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(fandom)}
      className="flex flex-col items-center gap-1.5 md:gap-2 cursor-pointer group transition-transform duration-200 active:scale-95 min-w-[70px] md:min-w-[90px]"
      style={{ background: 'none', border: 'none', padding: '4px' }}>

      {/* Circular image with gradient ring */}
      <div
        className="relative rounded-full transition-all duration-300"
        style={{
          padding: selected ? '3px' : '2px',
          background: selected
            ? `linear-gradient(135deg, ${fandom.accentColor}, #C5A55A, ${fandom.accentColor})`
            : 'linear-gradient(135deg, rgba(197,165,90,0.3), rgba(197,165,90,0.1))',
          boxShadow: selected
            ? `0 0 20px ${fandom.accentColor}60, 0 0 40px ${fandom.accentColor}20`
            : 'none',
        }}>
        <div
          className="rounded-full overflow-hidden bg-navy"
          style={{
            width: 'clamp(58px, 10vw, 80px)',
            height: 'clamp(58px, 10vw, 80px)',
            padding: '2px',
            backgroundColor: '#0C1428',
          }}>
          <div className="w-full h-full rounded-full overflow-hidden relative">
            <img
              src={`/fandoms/${fandom.stripImage}`}
              alt={fandom.displayName}
              className="w-full h-full object-cover scale-150"
              loading="lazy"
            />
            {/* Dark overlay */}
            <div
              className="absolute inset-0 rounded-full transition-opacity duration-200"
              style={{
                background: selected
                  ? `radial-gradient(circle, transparent 30%, ${fandom.accentColor}30 100%)`
                  : 'radial-gradient(circle, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.5) 100%)',
                opacity: selected ? 1 : 0.7,
              }}
            />
            {/* Initial letter overlay for visual punch */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="font-bold drop-shadow-lg transition-all duration-200"
                style={{
                  color: selected ? fandom.accentColor : 'rgba(255,255,255,0.9)',
                  fontSize: 'clamp(20px, 4vw, 28px)',
                  fontFamily: 'Georgia, serif',
                  textShadow: '0 2px 10px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)',
                }}>
                {getInitials(fandom.displayName)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fandom name below circle */}
      <span
        className="text-center leading-tight transition-colors duration-200 max-w-[80px] md:max-w-[100px] truncate"
        style={{
          color: selected ? fandom.accentColor : 'rgba(255,255,255,0.6)',
          fontSize: 'clamp(9px, 1.5vw, 11px)',
          fontFamily: 'Georgia, serif',
          fontWeight: selected ? 700 : 400,
          letterSpacing: '0.02em',
        }}>
        {fandom.displayName}
      </span>
    </button>
  );
}

function getInitials(name: string): string {
  const words = name.split(' ');
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return words.map(w => w[0]).join('').substring(0, 3).toUpperCase();
}
