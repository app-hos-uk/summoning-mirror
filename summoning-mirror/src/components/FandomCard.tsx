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
          className="rounded-full overflow-hidden"
          style={{
            width: 'clamp(58px, 10vw, 80px)',
            height: 'clamp(58px, 10vw, 80px)',
            padding: '4px',
            backgroundColor: '#0C1428',
          }}>
          <div className="w-full h-full rounded-full overflow-hidden relative flex items-center justify-center"
            style={{ backgroundColor: '#0C1428' }}>
            <img
              src={`/fandoms/${fandom.stripImage}`}
              alt={fandom.displayName}
              className="w-full h-full rounded-full"
              style={{ objectFit: 'contain' }}
              loading="lazy"
            />
            {/* Subtle ring highlight when selected */}
            {selected && (
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 8px ${fandom.accentColor}40`,
                }}
              />
            )}
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
