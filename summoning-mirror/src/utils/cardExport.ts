import { toPng } from 'html-to-image';

const CARD_WIDTH = 560;
const CARD_HEIGHT = 760;
const RETINA_SCALE = 2;

export async function cardElementToPngBlob(element: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(element, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    pixelRatio: RETINA_SCALE,
    cacheBust: true,
    style: {
      transform: 'scale(1)',
      transformOrigin: 'top left',
    },
  });

  const res = await fetch(dataUrl);
  return res.blob();
}

export async function cardElementToDataUrl(element: HTMLElement): Promise<string> {
  return toPng(element, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    pixelRatio: RETINA_SCALE,
    cacheBust: true,
  });
}

export function downloadBlob(blob: Blob, filename = 'SummoningMirror_HouseOfSpells.png'): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareCardBlob(
  blob: Blob,
  fandomName: string,
  shareText: string
): Promise<'shared' | 'saved' | 'error'> {
  try {
    const file = new File([blob], `SummoningMirror_${fandomName.replace(/\s+/g, '')}.png`, {
      type: 'image/png',
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: `${fandomName} Fan Card — House of Spells`,
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
      downloadBlob(blob);
      return 'saved';
    } catch {
      return 'error';
    }
  }
}
