import { BRAND, getShareTextForFandom } from './branding';

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
