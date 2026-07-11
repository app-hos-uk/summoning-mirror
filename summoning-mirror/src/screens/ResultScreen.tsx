import { useRef, useEffect, useState, useCallback } from 'react';
import { Share2, Download, RefreshCw, Crown } from 'lucide-react';
import QRCode from 'qrcode';
import type { Fandom, Lang, CaptureMode } from '../types/fandom';
import { BRAND, getShareTextForFandom } from '../utils/branding';
import { getFounderRegisterUrl } from '../utils/loyalty';
import { t } from '../utils/i18n';
import { compositeImage } from '../utils/compositor';
import {
  shareImage,
  saveImage,
  shareToInstagram,
  shareToTikTok,
  shareToWhatsApp,
  shareToTwitter,
  canvasToUploadBlob,
  type ShareResult,
} from '../utils/share';
import { useInactivityTimer } from '../hooks/useInactivityTimer';
import { playRevealSound } from '../utils/sounds';
import { trackCardGenerated, trackShare, uploadPhoto } from '../hooks/useAnalytics';
import FanCounter from '../components/FanCounter';
import EmailCapture from '../components/EmailCapture';

interface Props {
  photoSnapshot: HTMLCanvasElement;
  fandom: Fandom;
  wishText: string;
  onNewPhoto: () => void;
  onReset: () => void;
  lang: Lang;
  captureMode: CaptureMode;
}

export default function ResultScreen({
  photoSnapshot,
  fandom,
  wishText,
  onNewPhoto,
  onReset,
  lang,
  captureMode,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shareHint, setShareHint] = useState('');
  const [compositing, setCompositing] = useState(true);
  const [showPrideBanner, setShowPrideBanner] = useState(false);
  const [cardRevealed, setCardRevealed] = useState(false);
  const [interactionReady, setInteractionReady] = useState(false);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const i = t(lang);
  const isGroup = captureMode === 'group';
  const shareText = getShareTextForFandom(fandom.displayName, isGroup);

  // Keep the photo card visible for 5 seconds so users can share/save,
  // and also prevents ghost touch events from the capture button.
  useEffect(() => {
    const guard = setTimeout(() => setInteractionReady(true), 5000);
    return () => clearTimeout(guard);
  }, []);

  const safeNewPhoto = useCallback(() => {
    if (!interactionReady) return;
    onNewPhoto();
  }, [interactionReady, onNewPhoto]);

  useInactivityTimer(onReset, 300_000, cardRevealed, 3_000);

  const loadImage = useCallback((src: string, required = false): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        if (required) reject(new Error(`Failed to load: ${src}`));
        else resolve(img);
      };
      img.src = src;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!canvasRef.current) return;

      let qrDataUrl = '';
      try {
        qrDataUrl = await QRCode.toDataURL(BRAND.qrUrl, {
          width: 200,
          margin: 1,
          color: { dark: '#0C1428', light: '#FFFFFF' },
        });
      } catch { /* QR generation failed, continue without */ }

      const [emblem, emblemCircle, wordogram, stripImage, qrImage] = await Promise.all([
        loadImage(BRAND.assets.emblem),
        loadImage(BRAND.assets.emblemCircle),
        loadImage(BRAND.assets.wordogram),
        loadImage(`/fandoms/${fandom.stripImage}`, true).catch(() => new Image()),
        qrDataUrl ? loadImage(qrDataUrl) : Promise.resolve(new Image()),
      ]);

      if (cancelled) return;

      try {
        compositeImage(canvasRef.current, photoSnapshot, fandom, wishText, {
          emblem,
          emblemCircle,
          wordogram,
          stripImage,
          qrImage,
        });
      } catch (err) {
        console.error('Compositing failed:', err);
      }

      setCompositing(false);
      trackCardGenerated(fandom.id, fandom.displayName);

      if (canvasRef.current && !cancelled) {
        try {
          const blob = await canvasToUploadBlob(canvasRef.current);
          const id = await uploadPhoto(blob, fandom.id, fandom.displayName);
          if (!cancelled && id) setPhotoId(id);
        } catch {
          /* non-critical — sharing still works locally */
        }
      }

      const t1 = setTimeout(() => {
        if (!cancelled) {
          setCardRevealed(true);
          playRevealSound();
        }
      }, 300);

      const t2 = setTimeout(() => {
        if (!cancelled) setShowPrideBanner(true);
      }, 1200);

      timers.push(t1, t2);
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    render();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [photoSnapshot, fandom, wishText, loadImage]);

  const handleShare = async () => {
    if (!canvasRef.current || compositing) return;
    setShareHint(i.preparing);
    const result = await shareImage(canvasRef.current, fandom.displayName, isGroup);
    switch (result) {
      case 'shared':
        trackShare(fandom.id);
        setShareHint(i.sharedOk);
        break;
      case 'saved':
        setShareHint(i.savedGallery);
        break;
      case 'error':
        setShareHint('');
        break;
    }
  };

  const handleSave = () => {
    if (!canvasRef.current || compositing) return;
    saveImage(canvasRef.current);
    setShareHint(i.photoSaved);
  };

  const handleSocialShare = async (
    platform: 'instagram' | 'tiktok' | 'whatsapp' | 'twitter'
  ) => {
    if (!canvasRef.current || compositing) return;

    let result: ShareResult = 'error';
    switch (platform) {
      case 'instagram':
        result = await shareToInstagram(canvasRef.current, shareText);
        if (result === 'copied' || result === 'saved') trackShare(fandom.id);
        setShareHint(result === 'copied' ? i.instagramHint : i.savedGallery);
        break;
      case 'tiktok':
        result = await shareToTikTok(canvasRef.current, shareText);
        if (result === 'copied' || result === 'saved') trackShare(fandom.id);
        setShareHint(result === 'copied' ? i.tiktokHint : i.savedGallery);
        break;
      case 'whatsapp':
        result = await shareToWhatsApp(canvasRef.current, shareText);
        if (result === 'opened') {
          trackShare(fandom.id);
          setShareHint(i.whatsappHint);
        }
        break;
      case 'twitter':
        result = await shareToTwitter(canvasRef.current, shareText);
        if (result === 'opened') {
          trackShare(fandom.id);
          setShareHint(i.twitterHint);
        }
        break;
    }
  };

  const disabledStyle = compositing ? { opacity: 0.4, pointerEvents: 'none' as const } : {};

  return (
    <div className="screen-enter flex flex-col md:flex-row items-center md:justify-center h-full w-full gap-3 sm:gap-4 md:gap-10 p-3 sm:p-4 md:p-8 relative overflow-y-auto"
      style={{ backgroundColor: BRAND.colors.navy }}>

      <div className="sparkle-field absolute inset-0 pointer-events-none z-0" />

      {/* Composited image with cinematic reveal */}
      <div className="relative flex-shrink-0 flex items-center justify-center z-10">
        {compositing && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <span className="text-gold/60 text-sm tracking-wider">{i.summoningCard}</span>
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={`rounded shadow-2xl max-h-[35dvh] sm:max-h-[42dvh] md:max-h-[68vh] ${cardRevealed ? 'card-cinematic-reveal' : ''}`}
          style={{
            maxWidth: 'min(90vw, 480px)',
            width: 'auto',
            height: 'auto',
            border: '2px solid rgba(197,165,90,0.3)',
            opacity: compositing ? 0.2 : 1,
            transform: compositing ? 'scale(0.85)' : 'scale(1)',
            transition: 'opacity 0.6s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>

      {/* Actions panel */}
      <div className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4 z-10 max-w-xs sm:max-w-sm md:max-w-md w-full pb-4 sm:pb-6 md:pb-0">
        {showPrideBanner && (
          <div className="pride-banner text-center mb-0.5 sm:mb-1">
            <p className="text-base sm:text-lg md:text-2xl font-bold tracking-wider text-glow-gold"
              style={{ color: fandom.accentColor, fontFamily: 'Georgia, serif' }}>
              {fandom.displayName.toUpperCase()}
            </p>
            <p className="text-[10px] sm:text-xs md:text-sm tracking-[0.3em] mt-0.5 sm:mt-1"
              style={{ color: BRAND.colors.gold }}>
              {isGroup ? BRAND.text.fansBadge : BRAND.text.fanBadge}
            </p>
            <p className="text-[9px] sm:text-[10px] md:text-xs tracking-wider mt-1 sm:mt-2 italic"
              style={{ color: 'rgba(197,165,90,0.6)' }}>
              {i.cardSummoned}
            </p>
          </div>
        )}

        {showPrideBanner && (
          <div className="pride-banner">
            <FanCounter lang={lang} fandomName={fandom.displayName} />
          </div>
        )}

        <button
          onClick={handleShare}
          disabled={compositing}
          className="btn-gold-shimmer w-full flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 md:px-12 py-2.5 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base font-bold tracking-[0.15em] rounded-sm border-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
          style={{
            borderColor: BRAND.colors.gold,
            color: BRAND.colors.gold,
            backgroundColor: 'rgba(197,165,90,0.1)',
            ...disabledStyle,
          }}>
          <Share2 size={18} className="sm:hidden" />
          <Share2 size={20} className="hidden sm:block" />
          {i.share}
        </button>

        <div className="social-share-row w-full" style={disabledStyle}>
          <button
            type="button"
            onClick={() => handleSocialShare('instagram')}
            disabled={compositing}
            className="social-share-btn social-share-instagram"
            aria-label={i.shareInstagram}>
            {i.shareInstagram}
          </button>
          <button
            type="button"
            onClick={() => handleSocialShare('whatsapp')}
            disabled={compositing}
            className="social-share-btn social-share-whatsapp"
            aria-label={i.shareWhatsApp}>
            {i.shareWhatsApp}
          </button>
          <button
            type="button"
            onClick={() => handleSocialShare('twitter')}
            disabled={compositing}
            className="social-share-btn social-share-twitter"
            aria-label={i.shareTwitter}>
            {i.shareTwitter}
          </button>
          <button
            type="button"
            onClick={() => handleSocialShare('tiktok')}
            disabled={compositing}
            className="social-share-btn social-share-tiktok"
            aria-label={i.shareTikTok}>
            {i.shareTikTok}
          </button>
        </div>

        <div className="flex w-full gap-2 sm:gap-3">
          <button
            onClick={handleSave}
            disabled={compositing}
            className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm tracking-[0.12em] rounded-sm border cursor-pointer transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: 'rgba(197,165,90,0.3)',
              color: 'rgba(197,165,90,0.7)',
              ...disabledStyle,
            }}>
            <Download size={16} />
            {i.save}
          </button>

          <button
            onClick={safeNewPhoto}
            className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm tracking-[0.12em] rounded-sm border cursor-pointer transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: 'rgba(197,165,90,0.3)',
              color: 'rgba(197,165,90,0.7)',
            }}>
            <RefreshCw size={16} />
            {i.newPhoto}
          </button>
        </div>

        {shareHint && (
          <p className="text-xs tracking-wider text-center"
            style={{ color: 'rgba(197,165,90,0.5)' }}>
            {shareHint}
          </p>
        )}

        {/* Email capture */}
        {showPrideBanner && (
          <div className="pride-banner w-full flex justify-center">
            <EmailCapture
              fandomId={fandom.id}
              fandomName={fandom.displayName}
              lang={lang}
              photoId={photoId}
            />
          </div>
        )}

        {/* Founder member CTA */}
        {showPrideBanner && (
          <a
            href={getFounderRegisterUrl(fandom.displayName)}
            target="_blank"
            rel="noopener noreferrer"
            className="pride-banner w-full flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs md:text-sm font-bold tracking-[0.12em] rounded-sm border-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: BRAND.colors.gold,
              color: BRAND.colors.gold,
              backgroundColor: 'rgba(197,165,90,0.08)',
              textDecoration: 'none',
            }}>
            <Crown size={14} className="sm:hidden" />
            <Crown size={16} className="hidden sm:block" />
            {i.becomeFoundingMember}
          </a>
        )}

        {/* Suggested caption with fandom-specific hashtags */}
        <div className="mt-0.5 sm:mt-1 p-2 sm:p-3 md:p-4 rounded border w-full"
          style={{
            borderColor: 'rgba(197,165,90,0.15)',
            backgroundColor: 'rgba(197,165,90,0.03)',
          }}>
          <p className="text-[9px] sm:text-[10px] md:text-xs tracking-wider mb-1 sm:mb-2"
            style={{ color: 'rgba(197,165,90,0.4)' }}>
            {i.suggestedCaption}
          </p>
          <p className="text-[11px] sm:text-xs md:text-sm italic leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.6)' }}>
            {getShareTextForFandom(fandom.displayName, isGroup)}
          </p>
        </div>
      </div>
    </div>
  );
}
