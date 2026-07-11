import { useRef, useState } from 'react';
import SelfieCard, { type CardVariant } from '../components/SelfieCard';
import { cardElementToPngBlob, downloadBlob } from '../utils/cardExport';

const MOCK_SELFIE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#2a3550"/>
          <stop offset="100%" stop-color="#0b0d12"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <circle cx="200" cy="190" r="80" fill="#d4a94a" opacity="0.15"/>
      <text x="200" y="420" text-anchor="middle" fill="#d4a94a" font-family="sans-serif" font-size="14" opacity="0.5">QA SELFIE</text>
    </svg>`
  );

export default function CardPreviewScreen() {
  const card1ARef = useRef<HTMLDivElement>(null);
  const card1DRef = useRef<HTMLDivElement>(null);
  const [selectedVariant, setSelectedVariant] = useState<CardVariant>('midnight-foil');

  const cardProps = {
    fandomName: 'Dragon Ball',
    selfieUrl: MOCK_SELFIE,
    fandomArtUrl: '/fandoms/dragon-ball.jpg',
    serial: 'HOS-NYC-00007',
    stampedAt: new Date('2026-07-11'),
    tier: '◆ FOUNDER',
    memberLabel: 'MEMBER · 00007',
  };

  const handleExport = async (variant: CardVariant) => {
    const ref = variant === 'midnight-foil' ? card1ARef : card1DRef;
    if (!ref.current) return;
    const blob = await cardElementToPngBlob(ref.current);
    downloadBlob(blob, `QA_${variant}.png`);
  };

  return (
    <div style={{ background: '#0b0d12', minHeight: '100vh', padding: 24, color: '#eae6dc' }}>
      <p style={{ font: "500 11px/1 'JetBrains Mono', monospace", letterSpacing: '0.2em', color: '#8a8578', marginBottom: 16 }}>
        DEV CARD PREVIEW — FULL SCALE
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
        {(['midnight-foil', 'holo-passport'] as const).map((variant) => (
          <div key={variant} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              onClick={() => setSelectedVariant(variant)}
              style={{
                font: "600 10px/1 'JetBrains Mono', monospace",
                letterSpacing: '0.14em',
                color: selectedVariant === variant ? '#d4a94a' : '#6c6858',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}>
              {variant === 'midnight-foil' ? '1A · MIDNIGHT FOIL' : '1D · HOLO PASSPORT'}
            </button>
            <SelfieCard
              ref={variant === 'midnight-foil' ? card1ARef : card1DRef}
              variant={variant}
              {...cardProps}
            />
            <button
              type="button"
              onClick={() => handleExport(variant)}
              style={{
                padding: '8px 16px', border: '1px solid #d4a94a', borderRadius: 4,
                background: 'transparent', color: '#d4a94a', cursor: 'pointer',
                font: "600 10px/1 'JetBrains Mono', monospace", letterSpacing: '0.1em',
              }}>
              EXPORT PNG
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
