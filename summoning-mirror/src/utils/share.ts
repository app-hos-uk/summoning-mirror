import { BRAND, getShareTextForFandom } from './branding';

export type ShareResult = 'shared' | 'saved' | 'opened' | 'copied' | 'error';

export async function shareImage(
  canvas: HTMLCanvasElement,
  fandomName: string,
  isGroup = false
): Promise<'shared' | 'saved' | 'error'> {
  try {
    const blob = await canvasToBlob(canvas);
    const file = new File([blob], 'SummoningMirror_HouseOfSpells.jpg', {
      type: 'image/jpeg',
    });

    const shareText = getShareTextForFandom(fandomName, isGroup);

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: isGroup
          ? `${fandomName} Fans at House of Spells`
          : `${fandomName} Fan at House of Spells`,
        text: shareText,
        files: [file],
      });
      return 'shared';
    }

    downloadBlob(blob);
    return 'saved';
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      return 'error';
    }
    try {
      const blob = await canvasToBlob(canvas);
      downloadBlob(blob);
      return 'saved';
    } catch {
      return 'error';
    }
  }
}

export function saveImage(canvas: HTMLCanvasElement): void {
  const link = document.createElement('a');
  link.download = 'SummoningMirror_HouseOfSpells.jpg';
  link.href = canvas.toDataURL('image/jpeg', BRAND.compositor.jpegQuality);
  link.click();
}

export async function shareToWhatsApp(
  canvas: HTMLCanvasElement,
  shareText: string
): Promise<ShareResult> {
  try {
    const blob = await canvasToBlob(canvas);
    downloadBlob(blob);
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    return 'opened';
  } catch {
    return 'error';
  }
}

export async function shareToTwitter(
  canvas: HTMLCanvasElement,
  shareText: string
): Promise<ShareResult> {
  try {
    const blob = await canvasToBlob(canvas);
    downloadBlob(blob);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    return 'opened';
  } catch {
    return 'error';
  }
}

export async function shareToInstagram(
  canvas: HTMLCanvasElement,
  shareText: string
): Promise<ShareResult> {
  try {
    const blob = await canvasToBlob(canvas);
    downloadBlob(blob);
    const copied = await copyToClipboard(shareText);
    return copied ? 'copied' : 'saved';
  } catch {
    return 'error';
  }
}

export async function shareToTikTok(
  canvas: HTMLCanvasElement,
  shareText: string
): Promise<ShareResult> {
  try {
    const blob = await canvasToBlob(canvas);
    downloadBlob(blob);
    const copied = await copyToClipboard(shareText);
    return copied ? 'copied' : 'saved';
  } catch {
    return 'error';
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fallback below */ }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      'image/jpeg',
      BRAND.compositor.jpegQuality
    );
  });
}

function downloadBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = 'SummoningMirror_HouseOfSpells.jpg';
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function canvasToUploadBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return canvasToBlob(canvas);
}
