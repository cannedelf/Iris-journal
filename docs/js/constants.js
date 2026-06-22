// Sims 2 specific constants — used to build dropdowns so fields are never fat-fingered.
// Everything here is Sims 2, not Sims 4.

export const ASPIRATIONS = [
  'Family', 'Knowledge', 'Fortune', 'Popularity', 'Pleasure', 'Grilled Cheese', 'Romance', 'Growing Up'
];

export const STAR_SIGNS = [
  { name: 'Aries', glyph: '♈' }, { name: 'Taurus', glyph: '♉' }, { name: 'Gemini', glyph: '♊' },
  { name: 'Cancer', glyph: '♋' }, { name: 'Leo', glyph: '♌' }, { name: 'Virgo', glyph: '♍' },
  { name: 'Libra', glyph: '♎' }, { name: 'Scorpio', glyph: '♏' }, { name: 'Sagittarius', glyph: '♐' },
  { name: 'Capricorn', glyph: '♑' }, { name: 'Aquarius', glyph: '♒' }, { name: 'Pisces', glyph: '♓' }
];

export const SKILLS = ['cooking', 'mechanical', 'charisma', 'body', 'logic', 'creativity', 'cleaning'];

export const LIFE_STAGES = ['Baby', 'Toddler', 'Child', 'Teen', 'Adult', 'Elder', 'Ghost'];

// Personality axes — each 0-10, the five scores must total 25.
export const PERSONALITY = [
  { key: 'neat', low: 'Sloppy', high: 'Neat' },
  { key: 'outgoing', low: 'Shy', high: 'Outgoing' },
  { key: 'active', low: 'Lazy', high: 'Active' },
  { key: 'playful', low: 'Serious', high: 'Playful' },
  { key: 'nice', low: 'Grouchy', high: 'Nice' }
];

export const CAREER_TRACKS = [
  'Artist', 'Business', 'Education', 'Law', 'Science', 'Medicine', 'Architecture', 'Entertainment',
  'Slacker', 'Paranormal', 'Adventurer', 'Natural Science', 'Journalism', 'Culinary', 'Military',
  'Criminal', 'Athletic', 'Political', 'Show Business', 'Gamer', 'Intelligence'
];

export const OTH = [
  'Arts & Crafts', 'Film & Literature', 'Cuisine', 'Games', 'Music & Dance',
  'Nature', 'Science', 'Sports', 'Tinkering', 'Fitness'
];

export const BODY_FRAMES = ['Female', 'Male'];

export const PET_PERSONALITY = [
  { low: 'Doofus', high: 'Genius' }, { low: 'Lazy', high: 'Hyper' }, { low: 'Friendly', high: 'Independent' },
  { low: 'Cowardly', high: 'Aggressive' }, { low: 'Finicky', high: 'Pigpen' }, { low: 'Quiet', high: 'Vocal' }
];

export const PET_SPECIES = ['Cat', 'Dog', 'Parrot', 'Fish', 'Other'];

// Relationship types used across profiles.
export const REL_TYPES = [
  'Spouse', 'Fiancé', 'Fiancée', 'Partner', 'Crush', 'Romantic', 'In love', 'Ex',
  'Parent', 'Father', 'Mother', 'Child', 'Son', 'Daughter', 'Sibling', 'Uncle', 'Aunt',
  'Nephew', 'Niece', 'Cousin', 'Co-parent', 'Step-parent', 'Step-child',
  'Best Friend', 'Friend', 'Acquaintance', 'Enemy', 'Pet', 'Pet Best Friend', 'Housemate', 'Other'
];

export const glyphFor = (signName) => (STAR_SIGNS.find(s => s.name === signName) || {}).glyph || '';
