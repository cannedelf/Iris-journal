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
// Each type has a strong `colour` (border + badge) and a `soft` background fill
// used in Colour: Type view, so the whole card recolours — not just the border.
export const SIM_TYPES = [
  { name: 'Human',           emoji: '👤', colour: '#c2a878', soft: '#f7efdc', label: 'Living (Human)' },
  { name: 'Ghost',           emoji: '⚰️', colour: '#9aa0ad', soft: '#e7e8ee', label: 'Deceased' },
  { name: 'Alien',           emoji: '👽', colour: '#3f9e3a', soft: '#d6f0cd', label: 'Alien' },
  { name: 'Werewolf',        emoji: '🐺', colour: '#b5762a', soft: '#f2e0c1', label: 'Werewolf' },
  { name: 'Vampire',         emoji: '🧛', colour: '#6e2f5e', soft: '#e8d4e6', label: 'Vampire' },
  { name: 'PlantSim',        emoji: '🌿', colour: '#88b22e', soft: '#e7f1c6', label: 'PlantSim' },
  { name: 'Zombie',          emoji: '🧟', colour: '#7d8a66', soft: '#e1e4d4', label: 'Zombie' },
  { name: 'Witch (Good)',    emoji: '✨', colour: '#d9a92a', soft: '#f8ecca', label: 'Witch — Good' },
  { name: 'Witch (Neutral)', emoji: '🧙', colour: '#8a8f9c', soft: '#e4e5ea', label: 'Witch — Neutral' },
  { name: 'Witch (Evil)',    emoji: '🖤', colour: '#3f3f46', soft: '#d4d4da', label: 'Witch — Evil' },
  { name: 'Servo',           emoji: '🤖', colour: '#6f8aa8', soft: '#dce6ef', label: 'Servo (robot)' },
  { name: 'Bigfoot',         emoji: '👣', colour: '#9c7a55', soft: '#ecdcc7', label: 'Bigfoot' }
];
export const typeMeta = (name) => SIM_TYPES.find(t => t.name === name) || SIM_TYPES[0];

// Open for Business talent badges.
export const BADGE_TYPES = ['Flower Arranging', 'Robotics', 'Toy Making', 'Cosmetology', 'Cashier', 'Restocking', 'Sales'];
export const BADGE_LEVELS = ['None', 'Bronze', 'Silver', 'Gold'];
export const BADGE_EMOJI = { None: '⬜', Bronze: '🥉', Silver: '🥈', Gold: '🥇' };

