import type { Fandom } from '../types/fandom';
import { BRAND } from './branding';

interface CompositorAssets {
  emblem: HTMLImageElement;
  emblemCircle: HTMLImageElement;
  wordogram: HTMLImageElement;
  stripImage: HTMLImageElement;
  qrImage?: HTMLImageElement;
}

function isImageReady(img: HTMLImageElement): boolean {
  return img.complete && img.naturalWidth > 0;
}

export function compositeImage(
  canvas: HTMLCanvasElement,
  photoSource: CanvasImageSource,
  fandom: Fandom,
  wishText: string,
  assets: CompositorAssets
): void {
  const { width: W, height: H, borderWidth: B } = BRAND.compositor;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext('2d')!;
  const innerW = W - 2 * B;
  const accent = fandom.accentColor;

  // Layer 1: Gold border frame
  ctx.fillStyle = BRAND.colors.gold;
  ctx.fillRect(0, 0, W, H);

  // Layer 2: Navy base
  ctx.fillStyle = BRAND.colors.navy;
  ctx.fillRect(B, B, innerW, H - 2 * B);

  // Layer 3: Visitor photo -- top portion
  const photoH = Math.round(H * 0.38);
  ctx.save();
  ctx.translate(W, B);
  ctx.scale(-1, 1);
  ctx.drawImage(photoSource, B, 0, innerW, photoH);
  ctx.restore();

  // Layer 4: Emblem watermark on photo
  if (isImageReady(assets.emblem)) {
    try {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(assets.emblem, B + 20, B + 18, 48, 48);
      ctx.globalAlpha = 1;
    } catch { /* graceful fallback */ }
  }

  // Seasonal badge (top-right corner of photo area)
  if (BRAND.seasonal.active) {
    const badgeText = BRAND.seasonal.badge;
    ctx.font = 'bold 13px Georgia,serif';
    const metrics = ctx.measureText(badgeText);
    const bw = metrics.width + 20;
    const bh = 26;
    const bx = W - B - bw - 14;
    const by = B + 14;

    ctx.fillStyle = 'rgba(12,20,40,0.8)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 4);
    ctx.fill();
    ctx.strokeStyle = BRAND.seasonal.frameAccent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 4);
    ctx.stroke();
    ctx.fillStyle = BRAND.seasonal.frameAccent;
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, bx + bw / 2, by + 17);
  }

  // Layer 5: Fandom atmosphere -- bottom portion
  const atmY = B + photoH;
  const atmH = H - 2 * B - photoH;

  if (isImageReady(assets.stripImage)) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(B, atmY, innerW, atmH);
    ctx.clip();
    const natW = assets.stripImage.naturalWidth;
    const natH = assets.stripImage.naturalHeight;
    const coverScale = Math.max(innerW / natW, atmH / natH);
    const dw = natW * coverScale;
    const dh = natH * coverScale;
    ctx.drawImage(
      assets.stripImage,
      B + (innerW - dw) / 2,
      atmY + (atmH - dh) / 2,
      dw, dh
    );
    ctx.restore();

    // Layer 6: Dark readability overlay with stronger gradient
    const overlay = ctx.createLinearGradient(0, atmY, 0, atmY + atmH);
    overlay.addColorStop(0, 'rgba(12,20,40,0.4)');
    overlay.addColorStop(0.25, 'rgba(12,20,40,0.55)');
    overlay.addColorStop(0.5, 'rgba(12,20,40,0.65)');
    overlay.addColorStop(0.8, 'rgba(12,20,40,0.7)');
    overlay.addColorStop(1, 'rgba(12,20,40,0.75)');
    ctx.fillStyle = overlay;
    ctx.fillRect(B, atmY, innerW, atmH);
  }

  // Layer 7: Photo-to-atmosphere blend
  const blend = ctx.createLinearGradient(0, atmY - 50, 0, atmY + 30);
  blend.addColorStop(0, 'rgba(12,20,40,0)');
  blend.addColorStop(1, 'rgba(12,20,40,0.5)');
  ctx.fillStyle = blend;
  ctx.fillRect(B, atmY - 50, innerW, 80);

  // Layer 8: Accent stripe pair
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(B, atmY, innerW, 2);
  ctx.globalAlpha = 0.2;
  ctx.fillRect(B, atmY + 3, innerW, 1);
  ctx.globalAlpha = 1;

  // --- Branding section: compute sizes & center vertically ---
  const embSize = 110;
  const wmW = 220;
  const wmH = isImageReady(assets.wordogram)
    ? wmW * assets.wordogram.naturalHeight / assets.wordogram.naturalWidth
    : 60;

  const GAP_TITLE_BADGE = 8;
  const GAP_BADGE_WISH = 10;
  const GAP_WISH_DIVIDER = 16;
  const GAP_DIVIDER_EMBLEM = 20;
  const GAP_EMBLEM_WORD = 14;
  const GAP_WORD_TAG = 16;
  const GAP_TAG_EVENT = 10;
  const GAP_EVENT_SOCIAL = 6;
  const FOOTER_BOTTOM_PAD = 12;

  const fandomLabel = fandom.displayName.toUpperCase();
  let fontSize = 58;
  ctx.font = `bold ${fontSize}px Georgia,serif`;
  while (ctx.measureText(fandomLabel).width > innerW - 60 && fontSize > 26) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px Georgia,serif`;
  }
  const titleH = fontSize + 4;
  const badgeH = 26;
  const wishH = wishText ? 24 : 0;
  const dividerH = 18;
  const tagH = 20;
  const eventH = 15;
  const socialH = 13;

  let totalH = titleH + GAP_TITLE_BADGE
    + badgeH + GAP_BADGE_WISH
    + (wishText ? wishH + GAP_WISH_DIVIDER : GAP_WISH_DIVIDER)
    + dividerH + GAP_DIVIDER_EMBLEM
    + embSize + GAP_EMBLEM_WORD
    + wmH + GAP_WORD_TAG
    + tagH + GAP_TAG_EVENT
    + eventH + GAP_EVENT_SOCIAL
    + socialH + FOOTER_BOTTOM_PAD;

  let y = atmY + Math.max(20, (atmH - totalH) / 2);
  ctx.textAlign = 'center';

  // Layer 9: Fandom name
  ctx.font = `bold ${fontSize}px Georgia,serif`;
  ctx.fillStyle = accent;
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 3;
  ctx.fillText(fandomLabel, W / 2, y + fontSize * 0.82);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  y += titleH + GAP_TITLE_BADGE;

  // Layer 10: Fan badge
  ctx.font = '300 22px Georgia,serif';
  ctx.fillStyle = BRAND.colors.gold;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(BRAND.text.fanBadge, W / 2, y + 18);
  ctx.shadowBlur = 0;
  y += badgeH + GAP_BADGE_WISH;

  // Layer 11: Wish text
  if (wishText) {
    ctx.font = 'italic 20px Georgia,serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    const maxWishW = innerW - 100;
    let wishStr = `\u201C${wishText}\u201D`;
    if (ctx.measureText(wishStr).width > maxWishW) {
      while (ctx.measureText(wishStr + '\u2026\u201D').width > maxWishW && wishStr.length > 10) {
        wishStr = wishStr.slice(0, -2);
      }
      wishStr = wishStr.trimEnd() + '\u2026\u201D';
    }
    ctx.fillText(wishStr, W / 2, y + 16);
    ctx.shadowBlur = 0;
    y += wishH + GAP_WISH_DIVIDER;
  } else {
    y += GAP_WISH_DIVIDER;
  }

  // Layer 12: Divider with diamond
  const divLineW = 120;
  ctx.strokeStyle = 'rgba(197,165,90,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - divLineW, y + 9);
  ctx.lineTo(W / 2 - 10, y + 9);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 + 10, y + 9);
  ctx.lineTo(W / 2 + divLineW, y + 9);
  ctx.stroke();
  ctx.fillStyle = BRAND.colors.gold;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(W / 2, y + 3);
  ctx.lineTo(W / 2 + 6, y + 9);
  ctx.lineTo(W / 2, y + 15);
  ctx.lineTo(W / 2 - 6, y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  y += dividerH + GAP_DIVIDER_EMBLEM;

  // Emblem Circle with glow ring
  if (isImageReady(assets.emblemCircle)) {
    const ex = W / 2 - embSize / 2;
    const ey = y;
    ctx.shadowColor = 'rgba(197,165,90,0.4)';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(197,165,90,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(W / 2, ey + embSize / 2, embSize / 2 + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.drawImage(assets.emblemCircle, ex, ey, embSize, embSize);
    ctx.shadowBlur = 0;
    y += embSize + GAP_EMBLEM_WORD;
  }

  // Wordogram
  if (isImageReady(assets.wordogram)) {
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 10;
    ctx.drawImage(assets.wordogram, W / 2 - wmW / 2, y, wmW, wmH);
    ctx.shadowBlur = 0;
    y += wmH + GAP_WORD_TAG;
  }

  // Tagline
  ctx.font = '600 16px Georgia,serif';
  ctx.fillStyle = 'rgba(197,165,90,0.75)';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 6;
  ctx.fillText(BRAND.text.tagline, W / 2, y + 13);
  ctx.shadowBlur = 0;
  y += tagH + GAP_TAG_EVENT;

  // Event footer
  ctx.font = '12px Georgia,serif';
  ctx.fillStyle = 'rgba(197,165,90,0.55)';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.fillText(BRAND.text.eventLine, W / 2, y + 11);
  ctx.shadowBlur = 0;
  y += eventH + GAP_EVENT_SOCIAL;

  // Social + hashtags footer
  ctx.font = '11px Georgia,serif';
  ctx.fillStyle = 'rgba(197,165,90,0.5)';
  ctx.fillText(BRAND.text.socialFooter, W / 2, y + 9);

  // QR Code (bottom-right corner, properly padded)
  if (assets.qrImage && isImageReady(assets.qrImage)) {
    const qrSize = 64;
    const qrPad = 24;
    const qrX = W - B - qrSize - qrPad;
    const qrY = H - B - qrSize - qrPad - 12;

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.roundRect(qrX - 5, qrY - 5, qrSize + 10, qrSize + 22, 5);
    ctx.fill();

    ctx.drawImage(assets.qrImage, qrX, qrY, qrSize, qrSize);

    ctx.font = '7px Georgia,serif';
    ctx.fillStyle = 'rgba(12,20,40,0.65)';
    ctx.textAlign = 'center';
    ctx.fillText('VISIT US', qrX + qrSize / 2, qrY + qrSize + 12);
  }

  // Gold corner ornaments
  ctx.textAlign = 'center';
  ctx.strokeStyle = BRAND.colors.gold;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;
  const co = 14;
  const cl = BRAND.compositor.cornerArmLength;

  ctx.beginPath();
  ctx.moveTo(B + co, B + co + cl);
  ctx.lineTo(B + co, B + co);
  ctx.lineTo(B + co + cl, B + co);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(W - B - co - cl, B + co);
  ctx.lineTo(W - B - co, B + co);
  ctx.lineTo(W - B - co, B + co + cl);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(B + co, H - B - co - cl);
  ctx.lineTo(B + co, H - B - co);
  ctx.lineTo(B + co + cl, H - B - co);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(W - B - co - cl, H - B - co);
  ctx.lineTo(W - B - co, H - B - co);
  ctx.lineTo(W - B - co, H - B - co - cl);
  ctx.stroke();

  ctx.globalAlpha = 1;
}
