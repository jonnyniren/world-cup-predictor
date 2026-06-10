// FIFA Men's World Rankings — Official April 2026 update (last published before WC 2026)
// Source: FIFA/Coca-Cola Men's World Ranking, April 1 2026
// Next official update: June 11, 2026 (tournament start day)
export const FIFA_RANKINGS = {
  // Top 10
  'France': 1,
  'Spain': 2,
  'Argentina': 3,
  'England': 4,
  'Portugal': 5,
  'Brazil': 6,
  'Netherlands': 7,
  'Morocco': 8,
  'Belgium': 9,
  'Germany': 10,
  // 11–20
  'Croatia': 11,
  'Italy': 12,
  'Colombia': 13,
  'Senegal': 14,
  'Mexico': 15,
  'USA': 16, 'United States': 16,
  'Uruguay': 17,
  'Japan': 18,
  'Switzerland': 19,
  'Denmark': 20,
  // 21–30
  'Iran': 21,
  'Turkey': 22, 'Türkiye': 22,
  'Ecuador': 23,
  'Austria': 24,
  'South Korea': 25, 'Korea Republic': 25,
  'Hungary': 26,
  'Australia': 27,
  'Norway': 28,
  'Ukraine': 29,
  'Canada': 30,
  // 31–40
  'Peru': 31,
  'Venezuela': 32,
  'Sweden': 33,
  'Chile': 34,
  'Poland': 35,
  'Serbia': 36,
  'Slovakia': 37,
  'Albania': 38,
  'Romania': 39,
  'Czech Republic': 40, 'Czechia': 40,
  // 41–50
  'Algeria': 41,
  'Cameroon': 42,
  'Tunisia': 43,
  'Scotland': 44,
  'Egypt': 45,
  'Nigeria': 46,
  'Georgia': 47,
  'Ivory Coast': 48, "Côte d'Ivoire": 48, "Cote d'Ivoire": 48,
  'Greece': 49,
  'Slovenia': 50,
  // 51–65
  'Paraguay': 51,
  'Costa Rica': 52,
  'Saudi Arabia': 53,
  'South Africa': 54,
  'Ghana': 55,
  'Bosnia and Herzegovina': 56, 'Bosnia & Herzegovina': 56, 'Bosnia-Herzegovina': 56,
  'DR Congo': 57, 'Congo DR': 57,
  'Panama': 58,
  'Jamaica': 59,
  'Iraq': 60,
  'Montenegro': 61,
  'Qatar': 62,
  'Honduras': 63,
  'Bolivia': 64,
  'Uzbekistan': 65,
  // 66+
  'North Macedonia': 66,
  'El Salvador': 67,
  'New Zealand': 68,
  'Haiti': 69,
  'Trinidad and Tobago': 70, 'Trinidad & Tobago': 70,
  'Indonesia': 129,
  'Cuba': 163,
};

// Tier labels for display (based on rank)
export function getRankTier(rank) {
  if (!rank) return null;
  if (rank <= 10) return 'elite';
  if (rank <= 25) return 'strong';
  if (rank <= 50) return 'mid';
  return 'lower';
}

export function getRanking(teamName) {
  if (!teamName) return null;
  if (FIFA_RANKINGS[teamName] != null) return FIFA_RANKINGS[teamName];
  // Partial match fallback
  const lower = teamName.toLowerCase();
  for (const [key, rank] of Object.entries(FIFA_RANKINGS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return rank;
  }
  return null;
}
