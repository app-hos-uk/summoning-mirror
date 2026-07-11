import { useEffect, useState } from 'react';
import { Download, Share2, Crown, ExternalLink } from 'lucide-react';
import { fetchPassport } from '../hooks/useAnalytics';
import { getFounderRegisterUrl } from '../utils/loyalty';
import { getStatusTierLabel } from '../utils/loyaltyTiers';
import { getShareTextForFandom } from '../utils/branding';
import type { PassportData } from '../types/loyalty';
import type { StatusTier } from '../types/loyalty';
import { BRAND } from '../utils/branding';

export default function PassportPage() {
  const photoId = window.location.pathname.split('/card/')[1]?.split('/')[0] || '';
  const [data, setData] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!photoId) {
      setError(true);
      setLoading(false);
      return;
    }
    fetchPassport(photoId)
      .then((d) => {
        if (!d) setError(true);
        else setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [photoId]);

  const handleDownload = () => {
    if (!data) return;
    const link = document.createElement('a');
    link.href = data.imageUrl;
    link.download = `SummoningMirror_${data.serialNumber}.jpg`;
    link.click();
  };

  const handleShare = async () => {
    if (!data) return;
    const text = getShareTextForFandom(data.fandomName);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Summoning Mirror Card', text, url: data.passportUrl });
      } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${data.passportUrl}`);
      } catch { /* ignore */ }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full"
        style={{ backgroundColor: BRAND.colors.navy }}>
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-4 p-8"
        style={{ backgroundColor: BRAND.colors.navy, color: BRAND.colors.gold }}>
        <p className="text-lg tracking-wider">Passport not found</p>
        <a href="/" className="text-sm underline" style={{ color: 'rgba(197,165,90,0.6)' }}>
          Return to Summoning Mirror
        </a>
      </div>
    );
  }

  const tierLabel = getStatusTierLabel(data.statusTier as StatusTier, 'en');

  return (
    <div className="passport-page screen-enter overflow-y-auto h-full w-full"
      style={{ backgroundColor: BRAND.colors.navy }}>
      <div className="sparkle-field absolute inset-0 pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto p-6 flex flex-col items-center gap-5">
        <div className="text-center">
          <p className="text-xs tracking-[0.2em] mb-1" style={{ color: 'rgba(197,165,90,0.5)' }}>
            THE SUMMONING MIRROR
          </p>
          <h1 className="text-xl font-bold tracking-wider text-glow-gold"
            style={{ color: BRAND.colors.gold }}>
            Your Digital Passport
          </h1>
          {data.guestName && (
            <p className="text-sm mt-2 italic" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Welcome, {data.guestName}
            </p>
          )}
        </div>

        <img
          src={data.imageUrl}
          alt={`${data.fandomName} fan card`}
          className="rounded shadow-2xl w-full max-w-sm"
          style={{ border: '2px solid rgba(197,165,90,0.3)' }}
        />

        <div className="passport-info-card w-full">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs tracking-wider" style={{ color: 'rgba(197,165,90,0.5)' }}>
              {data.serialNumber}
            </span>
            <span className={`status-badge-tier status-tier-${data.statusTier}`}>
              {tierLabel}
            </span>
          </div>
          <p className="text-sm font-bold tracking-wider mb-1" style={{ color: BRAND.colors.gold }}>
            {data.fandomName.toUpperCase()} — FAN —
          </p>
          <p className="text-xs tracking-wider" style={{ color: 'rgba(197,165,90,0.6)' }}>
            {data.fandomOrdinal.toLocaleString()}th {data.fandomName} fan
            {' · '}{data.fandomTotal.toLocaleString()} {data.fandomName} fans total
          </p>
          {data.wishText && (
            <p className="text-xs italic mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              &ldquo;{data.wishText}&rdquo;
            </p>
          )}
        </div>

        <div className="share-to-earn-banner w-full">
          <p className="text-[10px] font-bold tracking-[0.12em] mb-1" style={{ color: '#C5A55A' }}>
            SHARE-TO-EARN CODE
          </p>
          <p className="ugc-code-display">{data.ugcCode}</p>
          <p className="text-[9px] mt-1 tracking-wider" style={{ color: 'rgba(197,165,90,0.4)' }}>
            Tag @houseofspellsnyc + #CurateYourUniverse to unlock perks
          </p>
        </div>

        <div className="passport-collection w-full text-center">
          <p className="text-[10px] tracking-[0.15em] mb-1" style={{ color: 'rgba(197,165,90,0.4)' }}>
            FANDOM COLLECTION
          </p>
          <p className="text-sm font-bold" style={{ color: BRAND.colors.gold }}>
            1 / {data.totalFandoms}
          </p>
          <p className="text-[10px] mt-1" style={{ color: 'rgba(197,165,90,0.45)' }}>
            Visit the mirror to collect all universes
          </p>
        </div>

        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="btn-gold-shimmer flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold tracking-[0.12em] rounded-sm border-2 cursor-pointer"
            style={{ borderColor: BRAND.colors.gold, color: BRAND.colors.gold }}>
            <Share2 size={16} />
            SHARE
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs tracking-[0.12em] rounded-sm border cursor-pointer"
            style={{ borderColor: 'rgba(197,165,90,0.3)', color: 'rgba(197,165,90,0.7)' }}>
            <Download size={16} />
            SAVE
          </button>
        </div>

        <a
          href={getFounderRegisterUrl(data.fandomName)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold tracking-[0.12em] rounded-sm border-2"
          style={{
            borderColor: BRAND.colors.gold,
            color: BRAND.colors.gold,
            backgroundColor: 'rgba(197,165,90,0.08)',
            textDecoration: 'none',
          }}>
          <Crown size={14} />
          BECOME A FOUNDING MEMBER
          <ExternalLink size={12} />
        </a>

        <a href="/" className="text-[10px] tracking-wider mt-2"
          style={{ color: 'rgba(197,165,90,0.35)' }}>
          Summoning Mirror Kiosk
        </a>
      </div>
    </div>
  );
}
