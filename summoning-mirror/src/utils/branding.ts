export const BRAND = {
  colors: {
    navy: '#0C1428',
    navyLight: '#131E35',
    navyDark: '#060A14',
    gold: '#C5A55A',
  },
  text: {
    title: 'THE SUMMONING MIRROR',
    subtitle: 'Fan Curation Days 2026',
    handle: '@houseofspellsnyc',
    tagline: 'CURATE YOUR UNIVERSE',
    eventLine: 'Fan Curation Days 2026 \u00B7 Times Square, New York',
    socialFooter: '@houseofspellsnyc  \u00B7  #CurateYourUniverse  \u00B7  houseofspells.com',
    shareText: 'I curated my universe at House of Spells Times Square! \u2728 #CurateYourUniverse #HouseOfSpellsNYC #FanCurationDays @houseofspellsnyc',
    wishPlaceholder: 'My universe needs...',
    fanBadge: '\u2014  F A N  \u2014',
    fansBadge: '\u2014  F A N S  \u2014',
    cta: 'BEGIN YOUR SUMMONING',
  },
  hashtags: [
    '#CurateYourUniverse',
    '#HouseOfSpellsNYC',
    '#FanCurationDays',
    '#SummoningMirror',
    '#HouseOfSpells',
    '#TimesSquare',
  ],
  qrUrl: 'https://houseofspells.com/nyc',
  assets: {
    emblem: '/branding/emblem.png',
    emblemCircle: '/branding/emblem-circle.png',
    wordogram: '/branding/wordogram.png',
  },
  compositor: {
    width: 1080,
    height: 1350,
    jpegQuality: 0.92,
    borderWidth: 3,
    photoRatio: 0.42,
    cornerArmLength: 40,
  },
  seasonal: {
    active: true,
    theme: 'opening-week' as const,
    badge: 'OPENING WEEK \u00B7 NYC LAUNCH 2026',
    frameAccent: '#C5A55A',
  },
} as const;

export function getShareTextForFandom(fandomName: string, isGroup = false): string {
  const cleanTag = fandomName.replace(/[^a-zA-Z0-9]/g, '');
  if (isGroup) {
    return `We're ${fandomName} fans and we curated our universe at House of Spells Times Square! \u2728 #CurateYourUniverse #HouseOfSpellsNYC #${cleanTag}Fans #FanCurationDays #SquadGoals @houseofspellsnyc`;
  }
  return `I'm a ${fandomName} fan and I curated my universe at House of Spells Times Square! \u2728 #CurateYourUniverse #HouseOfSpellsNYC #${cleanTag}Fan #FanCurationDays @houseofspellsnyc`;
}
