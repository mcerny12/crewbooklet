// City-to-Bundesland mapping for automatic federal-state derivation.
// TV FFS § 5.6.1: public holidays are determined by "gesetzliche Feiertage am Arbeitsort"
// (statutory holidays at the place of work). The Bundesland drives holiday detection.
// Bundesland codes: DE-<ISO3166-2:DE> (see holidays.ts for the full list).

const CITY_TO_BUNDESLAND: Record<string, string> = {
  // Berlin
  'berlin': 'DE-BE',
  // Hamburg
  'hamburg': 'DE-HH',
  // Bavaria
  'münchen': 'DE-BY',
  'munich': 'DE-BY',
  'nürnberg': 'DE-BY',
  'nuremberg': 'DE-BY',
  'augsburg': 'DE-BY',
  'regensburg': 'DE-BY',
  'ingolstadt': 'DE-BY',
  'würzburg': 'DE-BY',
  'erlangen': 'DE-BY',
  'fürth': 'DE-BY',
  'bayreuth': 'DE-BY',
  'passau': 'DE-BY',
  'landshut': 'DE-BY',
  'rosenheim': 'DE-BY',
  // Baden-Württemberg
  'stuttgart': 'DE-BW',
  'karlsruhe': 'DE-BW',
  'mannheim': 'DE-BW',
  'freiburg': 'DE-BW',
  'freiburg im breisgau': 'DE-BW',
  'heidelberg': 'DE-BW',
  'ulm': 'DE-BW',
  'heilbronn': 'DE-BW',
  'pforzheim': 'DE-BW',
  'reutlingen': 'DE-BW',
  'konstanz': 'DE-BW',
  'ludwigsburg': 'DE-BW',
  // North Rhine-Westphalia
  'köln': 'DE-NW',
  'cologne': 'DE-NW',
  'düsseldorf': 'DE-NW',
  'dortmund': 'DE-NW',
  'essen': 'DE-NW',
  'duisburg': 'DE-NW',
  'bochum': 'DE-NW',
  'wuppertal': 'DE-NW',
  'bielefeld': 'DE-NW',
  'bonn': 'DE-NW',
  'münster': 'DE-NW',
  'aachen': 'DE-NW',
  'krefeld': 'DE-NW',
  'mönchengladbach': 'DE-NW',
  'oberhausen': 'DE-NW',
  'hagen': 'DE-NW',
  'hamm': 'DE-NW',
  'solingen': 'DE-NW',
  'leverkusen': 'DE-NW',
  'herne': 'DE-NW',
  // Lower Saxony
  'hannover': 'DE-NI',
  'hanover': 'DE-NI',
  'braunschweig': 'DE-NI',
  'brunswick': 'DE-NI',
  'osnabrück': 'DE-NI',
  'wolfsburg': 'DE-NI',
  'oldenburg': 'DE-NI',
  'göttingen': 'DE-NI',
  'hildesheim': 'DE-NI',
  'salzgitter': 'DE-NI',
  'delmenhorst': 'DE-NI',
  // Hesse
  'frankfurt': 'DE-HE',
  'frankfurt am main': 'DE-HE',
  'wiesbaden': 'DE-HE',
  'kassel': 'DE-HE',
  'darmstadt': 'DE-HE',
  'offenbach': 'DE-HE',
  'marburg': 'DE-HE',
  'gießen': 'DE-HE',
  // Rhineland-Palatinate
  'mainz': 'DE-RP',
  'ludwigshafen': 'DE-RP',
  'koblenz': 'DE-RP',
  'trier': 'DE-RP',
  'kaiserslautern': 'DE-RP',
  'worms': 'DE-RP',
  // Bremen
  'bremen': 'DE-HB',
  'bremerhaven': 'DE-HB',
  // Saxony
  'dresden': 'DE-SN',
  'leipzig': 'DE-SN',
  'chemnitz': 'DE-SN',
  'zwickau': 'DE-SN',
  'plauen': 'DE-SN',
  'görlitz': 'DE-SN',
  // Saxony-Anhalt
  'magdeburg': 'DE-ST',
  'halle': 'DE-ST',
  'halle (saale)': 'DE-ST',
  'dessau': 'DE-ST',
  'dessau-roßlau': 'DE-ST',
  // Thuringia
  'erfurt': 'DE-TH',
  'jena': 'DE-TH',
  'gera': 'DE-TH',
  'weimar': 'DE-TH',
  'gotha': 'DE-TH',
  'eisenach': 'DE-TH',
  // Schleswig-Holstein
  'kiel': 'DE-SH',
  'lübeck': 'DE-SH',
  'lubeck': 'DE-SH',
  'flensburg': 'DE-SH',
  'neumünster': 'DE-SH',
  // Mecklenburg-Vorpommern
  'schwerin': 'DE-MV',
  'rostock': 'DE-MV',
  'greifswald': 'DE-MV',
  'stralsund': 'DE-MV',
  'neubrandenburg': 'DE-MV',
  'wismar': 'DE-MV',
  // Saarland
  'saarbrücken': 'DE-SL',
  'saarbruecken': 'DE-SL',
  // Brandenburg
  'potsdam': 'DE-BB',
  'cottbus': 'DE-BB',
  'frankfurt (oder)': 'DE-BB',
  'frankfurt oder': 'DE-BB',
};

/**
 * Derive the Bundesland code from a city/place-of-work string.
 * Returns null if the city is unknown or the input is empty.
 * TV FFS § 5.6.1: holidays are determined by the Bundesland of the place of work.
 */
export function deriveBundesland(placeOfWork: string): string | null {
  if (!placeOfWork.trim()) return null;
  return CITY_TO_BUNDESLAND[placeOfWork.toLowerCase().trim()] ?? null;
}
