import { useState, useEffect, useCallback } from 'react';
import type { AnalyticsSnapshot } from '../types/fandom';
import type { PhotoReserve, PassportData } from '../types/loyalty';
import { adminHeaders } from '../utils/adminAuth';

export function useFanCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/analytics/counter')
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setCount(d.totalCards))
      .catch(() => {});
  }, []);

  return count;
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/analytics', {
        headers: adminHeaders(),
      });
      if (res.status === 401) {
        setError('Session expired');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch analytics');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export async function trackCardGenerated(fandomId: string, fandomName: string): Promise<void> {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'card_generated', fandomId, fandomName }),
    });
  } catch {
    // non-critical
  }
}

export async function trackShare(fandomId: string): Promise<void> {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'share', fandomId }),
    });
  } catch {
    // non-critical
  }
}

export async function submitEmail(
  email: string,
  fandomId: string,
  extras?: {
    firstName?: string;
    photoId?: string;
    wishText?: string;
    preferredFandom?: string;
  }
): Promise<boolean> {
  try {
    const res = await fetch('/api/email/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fandomId, ...extras }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function reservePhoto(
  fandomId: string,
  fandomName: string
): Promise<PhotoReserve | null> {
  try {
    const res = await fetch('/api/photos/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fandomId, fandomName }),
    });
    if (!res.ok) return null;
    return await res.json() as PhotoReserve;
  } catch {
    return null;
  }
}

export async function uploadPhoto(
  blob: Blob,
  fandomId: string,
  fandomName: string,
  metadata: {
    photoId: string;
    guestName?: string;
    wishText?: string;
    captureMode?: string;
    serialNumber: string;
    visitOrdinal: number;
    fandomOrdinal: number;
    ugcCode: string;
    statusTier: string;
  }
): Promise<string | null> {
  try {
    const form = new FormData();
    form.append('image', blob, 'SummoningMirror_HouseOfSpells.jpg');
    form.append('fandomId', fandomId);
    form.append('fandomName', fandomName);
    form.append('photoId', metadata.photoId);
    if (metadata.guestName) form.append('guestName', metadata.guestName);
    if (metadata.wishText) form.append('wishText', metadata.wishText);
    if (metadata.captureMode) form.append('captureMode', metadata.captureMode);
    form.append('serialNumber', metadata.serialNumber);
    form.append('visitOrdinal', String(metadata.visitOrdinal));
    form.append('fandomOrdinal', String(metadata.fandomOrdinal));
    form.append('ugcCode', metadata.ugcCode);
    form.append('statusTier', metadata.statusTier);

    const res = await fetch('/api/photos/upload', {
      method: 'POST',
      body: form,
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.id as string;
  } catch {
    return null;
  }
}

export async function sendPhotoEmail(
  photoId: string,
  email: string,
  firstName: string,
  fandomName: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/photos/${photoId}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, firstName, fandomName }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPassport(photoId: string): Promise<PassportData | null> {
  try {
    const res = await fetch(`/api/photos/${photoId}/passport`);
    if (!res.ok) return null;
    return await res.json() as PassportData;
  } catch {
    return null;
  }
}
