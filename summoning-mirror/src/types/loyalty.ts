export type StatusTier = 'pioneer' | 'summoner' | 'archivist';

export interface PhotoReserve {
  id: string;
  serialNumber: string;
  visitOrdinal: number;
  fandomOrdinal: number;
  fandomTotal: number;
  totalCards: number;
  totalFandoms: number;
  statusTier: StatusTier;
  ugcCode: string;
  passportUrl: string;
}

export interface PassportData {
  id: string;
  serialNumber: string;
  guestName: string;
  fandomId: string;
  fandomName: string;
  wishText: string;
  visitOrdinal: number;
  fandomOrdinal: number;
  fandomTotal: number;
  statusTier: StatusTier;
  ugcCode: string;
  createdAt: string;
  imageUrl: string;
  passportUrl: string;
  totalFandoms: number;
}
