import { useRef, useEffect, useState, useCallback } from 'react';
import { Share2, Download, RefreshCw, Crown, Mail } from 'lucide-react';
import type { Fandom, Lang, CaptureMode } from '../types/fandom';
import type { PhotoReserve, StatusTier } from '../types/loyalty';
import { BRAND, getShareTextForFandom } from '../utils/branding';
import { getFounderRegisterUrl } from '../utils/loyalty';
import { t } from '../utils/i18n';
import { useInactivityTimer } from '../hooks/useInactivityTimer';
import { playRevealSound } from '../utils/sounds';
import {
  trackShare,
  reservePhoto,
  uploadPhoto,
} from '../hooks/useAnalytics';
import SelfieCard, { type CardVariant } from '../components/SelfieCard';
import { cardElementToPngBlob, downloadBlob, shareCardBlob } from '../utils/cardExport';
import FanCounter from '../components/FanCounter';
import EmailCapture from '../components/EmailCapture';
import ShareToEarnBanner from '../components/ShareToEarnBanner';
import StatusBadge from '../components/StatusBadge';

interface Props {
  photoSnapshot: HTMLCanvasElement;
  fandom: Fandom;
  wishText: string;
  guestName: string;
  fandoms: Fandom[];
  onNewPhoto: () => void;
  onReset: () => void;
  lang: Lang;
  captureMode: CaptureMode;
}

export default function ResultScreen({
  photoSnapshot,
  fandom,
  wishText,
  guestName,
  fandoms,
  onNewPhoto,
  onReset,
  lang,
  captureMode,
}: Props) {
  const card1ARef = useRef<HTMLDivElement>(null);
  const card1DRef = useRef<HTMLDivElement>(null);
  const [selectedVariant, setSelectedVariant] = useState<CardVariant>('midnight-foil');
  const [shareHint, setShareHint] = useState('');
  const [cardsReady, setCardsReady] = useState(false);
  const [showPrideBanner, setShowPrideBanner] = useState(false);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [interactionReady, setInteractionReady] = useState(false);
  const [photoReserve, setPhotoReserve] = useState<PhotoReserve | null>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState('');
  const [exporting, setExporting] = useState(false);
  const i = t(lang);
  const isGroup = captureMode === 'group';
  const shareText = getShareTextForFandom(fandom.displayName, isGroup);

  useEffect(() => {
    const guard = setTimeout(() => setInteractionReady(true), 3000);
    return () => clearTimeout(guard);
  }, []);

  const safeNewPhoto = useCallback(() => {
    if (!interactionReady) return;
    onNewPhoto();
  }, [interactionReady, onNewPhoto]);

  useInactivityTimer(onReset, 300_000, cardRevealed, 3_000);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = photoSnapshot.width;
    canvas.height = photoSnapshot.height;
    const ctx = canvas.getContext('2d')!;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(photoSnapshot, 0, 0);
    setSelfieDataUrl(canvas.toDataURL('image/jpeg', 0.92));
  }, [photoSnapshot]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const reserve = await reservePhoto(fandom.id, fandom.displayName);
      if (cancelled) return;
      if (reserve) setPhotoReserve(reserve);

      setCardsReady(true);

      const t1 = setTimeout(() => {
        if (!cancelled) { setCardRevealed(true); playRevealSound(); }
      }, 600);
      const t2 = setTimeout(() => {
        if (!cancelled) setShowPrideBanner(true);
      }, 1400);
      timers.push(t1, t2);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    init();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [fandom]);

  useEffect(() => {
    if (!cardsReady || !photoReserve || !selfieDataUrl) return;
    let cancelled = false;

    async function upload() {
      if (!card1ARef.current || !card1DRef.current || !photoReserve) return;
      try {
        const selectedRef = selectedVariant === 'midnight-foil' ? card1ARef : card1DRef;
        const emailRef = selectedVariant === 'midnight-foil' ? card1DRef : card1ARef;
        const [mainBlob, emailBlob] = await Promise.all([
          cardElementToPngBlob(selectedRef.current!),
          cardElementToPngBlob(emailRef.current!),
        ]);
        if (cancelled) return;
        await uploadPhoto(mainBlob, fandom.id, fandom.displayName, {
          photoId: photoReserve.id,
          reserveToken: photoReserve.reserveToken,
          guestName: guestName || undefined,
          wishText: wishText || undefined,
          captureMode,
          serialNumber: photoReserve.serialNumber,
          visitOrdinal: photoReserve.visitOrdinal,
          fandomOrdinal: photoReserve.fandomOrdinal,
          ugcCode: photoReserve.ugcCode,
          statusTier: photoReserve.statusTier,
          emailCardBlob: emailBlob,
        });
      } catch { /* non-critical */ }
    }

    const timer = setTimeout(upload, 800);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [cardsReady, photoReserve, selfieDataUrl, selectedVariant, fandom, guestName, wishText, captureMode]);

  const getSelectedCardRef = () =>
    selectedVariant === 'midnight-foil' ? card1ARef : card1DRef;

  const handleShare = async () => {
    const ref = getSelectedCardRef();
    if (!ref.current || !cardsReady || exporting) return;
    setExporting(true);
    setShareHint(i.preparing);
    try {
      const blob = await cardElementToPngBlob(ref.current);
      const result = await shareCardBlob(blob, fandom.displayName, shareText);
      switch (result) {
        case 'shared': trackShare(fandom.id); setShareHint(i.sharedOk); break;
        case 'saved': setShareHint(i.savedGallery); break;
        case 'error': setShareHint(''); break;
      }
    } catch { setShareHint(''); }
    setExporting(false);
  };

  const handleSave = async () => {
    const ref = getSelectedCardRef();
    if (!ref.current || !cardsReady || exporting) return;
    setExporting(true);
    try {
      const blob = await cardElementToPngBlob(ref.current);
      downloadBlob(blob, `SummoningMirror_${fandom.displayName.replace(/\s+/g, '')}.png`);
      setShareHint(i.photoSaved);
    } catch { setShareHint(''); }
    setExporting(false);
  };

  const cardProps = {
    fandomName: fandom.displayName,
    selfieUrl: selfieDataUrl,
    fandomArtUrl: `/fandoms/${fandom.stripImage}`,
    serial: photoReserve?.serialNumber || 'HOS-NYC-00001',
    stampedAt: new Date(),
    tier: photoReserve ? (photoReserve.statusTier === 'pioneer' ? '◆ FOUNDER' : '◆ ' + photoReserve.statusTier.toUpperCase()) : '◆ FOUNDER',
    memberLabel: photoReserve ? `MEMBER · ${(photoReserve.serialNumber || '').replace('HOS-NYC-', '')}` : undefined,
  };

  const disabledStyle = (!cardsReady || exporting) ? { opacity: 0.4, pointerEvents: 'none' as const } : {};
  const otherVariant: CardVariant = selectedVariant === 'midnight-foil' ? 'holo-passport' : 'midnight-foil';

  return (
    <div className="screen-enter flex flex-col items-center h-full w-full relative overflow-y-auto"
      style={{ backgroundColor: '#0b0d12' }}>

      <div className="sparkle-field absolute inset-0 pointer-events-none z-0" />

      {/* Variant picker */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="flex items-center justify-center gap-2 mb-3">
          <p className="text-[10px] sm:text-xs tracking-[0.2em]"
            style={{ color: '#8a8578', fontFamily: "'JetBrains Mono', monospace" }}>
            TAP A CARD TO SELECT · THE OTHER WILL BE EMAILED
          </p>
        </div>

        {/* Card pair — scale cards and collapse wrapper to scaled size */}
        <div className="flex gap-4 sm:gap-6 justify-center items-start pb-2">
          {(['midnight-foil', 'holo-passport'] as const).map((variant) => {
            const scale = 0.44;
            const w = Math.round(560 * scale);
            const h = Math.round(760 * scale);
            const isSelected = selectedVariant === variant;
            return (
              <button
                key={variant}
                type="button"
                onClick={() => setSelectedVariant(variant)}
                className="cursor-pointer transition-all duration-300"
                style={{
                  width: w,
                  height: h,
                  position: 'relative',
                  overflow: 'visible',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  flexShrink: 0,
                }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  opacity: selfieDataUrl ? (cardRevealed ? 1 : 0.3) : 0.1,
                  transition: 'opacity 0.8s ease',
                  outline: isSelected ? '4px solid #d4a94a' : '4px solid transparent',
                  outlineOffset: 4,
                  borderRadius: variant === 'holo-passport' ? 22 : 6,
                }}>
                  <SelfieCard
                    ref={variant === 'midnight-foil' ? card1ARef : card1DRef}
                    variant={variant}
                    {...cardProps}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Variant labels */}
        <div className="flex justify-center gap-4 sm:gap-6 mt-2">
          {(['midnight-foil', 'holo-passport'] as const).map((variant) => {
            const isSelected = selectedVariant === variant;
            return (
              <button
                key={variant}
                type="button"
                onClick={() => setSelectedVariant(variant)}
                className="cursor-pointer transition-all"
                style={{
                  width: Math.round(560 * 0.44),
                  textAlign: 'center',
                  font: "600 9px/1 'JetBrains Mono', monospace",
                  letterSpacing: '0.14em',
                  color: isSelected ? '#d4a94a' : '#6c6858',
                  background: 'none', border: 'none', padding: '4px 0',
                  flexShrink: 0,
                }}>
                {variant === 'midnight-foil' ? '1A · MIDNIGHT FOIL' : '1D · HOLO PASSPORT'}
                <span style={{ marginLeft: 6 }}>
                  {isSelected
                    ? <Download size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    : <Mail size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-3 sm:px-4 flex flex-col items-center gap-2 sm:gap-3 pb-4 sm:pb-6 mt-2">
        {showPrideBanner && photoReserve && (
          <div className="pride-banner w-full flex flex-col items-center gap-2">
            <StatusBadge tier={photoReserve.statusTier as StatusTier} lang={lang} />
            <FanCounter
              lang={lang}
              fandomName={fandom.displayName}
              fandomOrdinal={photoReserve.fandomOrdinal}
              fandomTotal={photoReserve.fandomTotal}
            />
          </div>
        )}

        {/* Primary CTA: Share selected card */}
        <button
          onClick={handleShare}
          disabled={!cardsReady || exporting}
          className="btn-gold-shimmer w-full flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-bold tracking-[0.15em] rounded-sm border-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
          style={{
            borderColor: '#d4a94a',
            color: '#d4a94a',
            backgroundColor: 'rgba(212,169,74,0.1)',
            ...disabledStyle,
          }}>
          <Share2 size={18} />
          SHARE SELECTED CARD
        </button>

        {/* Secondary: Save + New Photo */}
        <div className="flex w-full gap-2 sm:gap-3">
          <button
            onClick={handleSave}
            disabled={!cardsReady || exporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm tracking-[0.12em] rounded-sm border cursor-pointer transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: 'rgba(212,169,74,0.3)',
              color: 'rgba(212,169,74,0.7)',
              ...disabledStyle,
            }}>
            <Download size={16} />
            {i.save}
          </button>

          <button
            onClick={safeNewPhoto}
            className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm tracking-[0.12em] rounded-sm border cursor-pointer transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: 'rgba(212,169,74,0.3)',
              color: 'rgba(212,169,74,0.7)',
              opacity: interactionReady ? 1 : 0.4,
              pointerEvents: interactionReady ? 'auto' : 'none',
            }}>
            <RefreshCw size={16} />
            {i.newPhoto}
          </button>
        </div>

        {shareHint && (
          <p className="text-xs tracking-wider text-center"
            style={{ color: 'rgba(212,169,74,0.5)' }}>
            {shareHint}
          </p>
        )}

        {showPrideBanner && photoReserve && (
          <div className="pride-banner w-full">
            <ShareToEarnBanner ugcCode={photoReserve.ugcCode} lang={lang} />
          </div>
        )}

        {/* Email capture — sends the OTHER variant */}
        {showPrideBanner && (
          <div className="pride-banner w-full">
            <p className="text-[9px] tracking-[0.15em] text-center mb-1"
              style={{ color: '#8a8578', fontFamily: "'JetBrains Mono', monospace" }}>
              THE {otherVariant === 'midnight-foil' ? 'MIDNIGHT FOIL' : 'HOLO PASSPORT'} CARD WILL BE EMAILED TO YOU
            </p>
            <EmailCapture
              fandomId={fandom.id}
              fandomName={fandom.displayName}
              lang={lang}
              photoId={photoReserve?.id}
              guestName={guestName}
              wishText={wishText}
              fandoms={fandoms}
            />
          </div>
        )}

        {/* Founder member CTA */}
        {showPrideBanner && (
          <a
            href={getFounderRegisterUrl(fandom.displayName)}
            target="_blank"
            rel="noopener noreferrer"
            className="pride-banner w-full flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs tracking-[0.1em] rounded-sm border cursor-pointer transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: 'rgba(212,169,74,0.2)',
              color: 'rgba(212,169,74,0.5)',
              backgroundColor: 'rgba(212,169,74,0.04)',
              textDecoration: 'none',
            }}>
            <Crown size={13} />
            {i.becomeFoundingMember}
          </a>
        )}

        <div className="mt-0.5 sm:mt-1 p-2 sm:p-3 rounded border w-full"
          style={{
            borderColor: 'rgba(212,169,74,0.15)',
            backgroundColor: 'rgba(212,169,74,0.04)',
          }}>
          <p className="text-[9px] sm:text-[10px] tracking-wider mb-1"
            style={{ color: 'rgba(212,169,74,0.4)' }}>
            {i.suggestedCaption}
          </p>
          <p className="text-[11px] sm:text-xs italic leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.6)' }}>
            {shareText}
          </p>
        </div>
      </div>

      {/* Loading overlay */}
      {!cardsReady && (
        <div className="absolute inset-0 flex items-center justify-center z-20" style={{ backgroundColor: '#0b0d12' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 rounded-full animate-spin"
              style={{ borderColor: '#d4a94a', borderTopColor: 'transparent' }} />
            <span className="text-sm tracking-wider" style={{ color: 'rgba(212,169,74,0.6)' }}>
              {i.summoningCard}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
