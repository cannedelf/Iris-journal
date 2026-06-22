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

// Sims 2 occult / life-state types — used for the "Colour: Type" view and the badges.
export const SIM_TYPES = [
  { name: 'Human', emoji: '', colour: '#8aa97e', label: 'Living (Human)' },
  { name: 'Ghost', emoji: '👻', colour: '#9aa7c7', label: 'Deceased (Ghost)' },
  { name: 'Alien', emoji: '👽', colour: '#4fae3f', label: 'Alien' },
  { name: 'Vampire', emoji: '🧛', colour: '#a23a4d', label: 'Vampire' },
  { name: 'Werewolf', emoji: '🐺', colour: '#7a5c3a', label: 'Werewolf' },
  { name: 'PlantSim', emoji: '🌱', colour: '#7faa2e', label: 'PlantSim' },
  { name: 'Zombie', emoji: '🧟', colour: '#6f8a4a', label: 'Zombie' },
  { name: 'Witch (Good)', emoji: '🧙', colour: '#28b1ad', label: 'Witch — Good' },
  { name: 'Witch (Neutral)', emoji: '🧙', colour: '#8a8f9c', label: 'Witch — Neutral' },
  { name: 'Witch (Evil)', emoji: '🧙', colour: '#6a3f9a', label: 'Witch — Evil' },
  { name: 'Servo', emoji: '🤖', colour: '#7f93a8', label: 'Servo (robot)' },
  { name: 'Bigfoot', emoji: '👣', colour: '#9c7a55', label: 'Bigfoot' }
];
export const typeMeta = (name) => SIM_TYPES.find(t => t.name === name) || SIM_TYPES[0];

