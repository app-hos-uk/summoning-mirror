import type { Lang } from '../types/fandom';
import type { StatusTier } from '../types/loyalty';

export function getStatusTier(visitOrdinal: number): StatusTier {
  if (visitOrdinal <= 100) return 'pioneer';
  if (visitOrdinal <= 500) return 'summoner';
  return 'archivist';
}

export function formatSerialNumber(ordinal: number): string {
  return `HOS-NYC-${String(ordinal).padStart(5, '0')}`;
}

export function generateUgcCode(ordinal: number): string {
  const base = ordinal.toString(36).toUpperCase().padStart(4, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HOS-${base}${rand}`;
}

export function getPassportUrl(photoId: string, origin?: string): string {
  const base = origin
    || (typeof window !== 'undefined' ? window.location.origin : 'https://houseofspells.com');
  return `${base}/card/${photoId}`;
}

const TIER_LABELS: Record<StatusTier, Record<Lang, string>> = {
  pioneer: {
    en: 'Pioneer Fan',
    es: 'Fan Pionero',
    zh: '先锋粉丝',
    ja: 'パイオニアファン',
    ko: '개척 팬',
    fr: 'Fan Pionnier',
  },
  summoner: {
    en: 'Summoner',
    es: 'Invocador',
    zh: '召唤师',
    ja: 'サモナー',
    ko: '소환사',
    fr: 'Invocateur',
  },
  archivist: {
    en: 'Archivist',
    es: 'Archivista',
    zh: '档案管理员',
    ja: 'アーキビスト',
    ko: '기록 보관자',
    fr: 'Archiviste',
  },
};

export function getStatusTierLabel(tier: StatusTier, lang: Lang = 'en'): string {
  return TIER_LABELS[tier][lang] || TIER_LABELS[tier].en;
}

export function getOrdinalSuffix(n: number, lang: Lang): string {
  if (lang !== 'en') return '';
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
