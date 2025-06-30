import { StoryCard } from '../types/game';

// Base deck of story cards that can be drawn during gameplay
export const STORY_CARD_DECK: StoryCard[] = [
  // Event Cards
  {
    id: 'event-betrayal',
    name: 'Sudden Betrayal',
    type: 'event',
    description: 'Someone you trusted reveals their true colors.',
    effect: 'An NPC ally turns against you, revealing hidden motives.',
    imagePrompt: 'Fantasy character with dagger behind back, shadowy figure with glowing eyes',
    isRevealed: false
  },
  {
    id: 'event-storm',
    name: 'Raging Tempest',
    type: 'event',
    description: 'A violent storm descends without warning.',
    effect: 'The environment becomes hazardous, limiting visibility and movement.',
    imagePrompt: 'Violent storm with lightning over dark landscape, travelers seeking shelter',
    isRevealed: false
  },
  {
    id: 'event-festival',
    name: 'Unexpected Celebration',
    type: 'event',
    description: 'You stumble upon a local festival or celebration.',
    effect: 'New opportunities for allies, information, and unique items appear.',
    imagePrompt: 'Fantasy village festival with colorful decorations, music, dancing townsfolk',
    isRevealed: false
  },
  {
    id: 'event-eclipse',
    name: 'Mystical Eclipse',
    type: 'event',
    description: 'The sun darkens as a celestial event affects the world.',
    effect: 'Magic is amplified, but strange creatures are drawn to the phenomenon.',
    imagePrompt: 'Fantasy landscape during eclipse, glowing runes, mysterious shadows',
    isRevealed: false
  },
  {
    id: 'event-plague',
    name: 'Spreading Affliction',
    type: 'event',
    description: 'A mysterious illness begins affecting the region.',
    effect: 'Towns are quarantined, supplies are scarce, and finding a cure becomes urgent.',
    imagePrompt: 'Medieval town with people wearing masks, healers tending to sick, worried faces',
    isRevealed: false
  },

  // Character Cards
  {
    id: 'character-mentor',
    name: 'The Wise Mentor',
    type: 'character',
    description: 'A sagely figure appears to offer guidance.',
    effect: 'Gain valuable knowledge and training that grants a new ability.',
    imagePrompt: 'Elderly robed wizard or sage with staff in library or mountain retreat',
    isRevealed: false
  },
  {
    id: 'character-rival',
    name: 'The Determined Rival',
    type: 'character',
    description: 'Someone with similar goals but different methods crosses your path.',
    effect: 'A competitive relationship forms, challenging you to improve.',
    imagePrompt: 'Confident adventurer with contrasting appearance to player character, challenging stance',
    isRevealed: false
  },
  {
    id: 'character-trickster',
    name: 'The Cunning Trickster',
    type: 'character',
    description: 'A mischievous being offers a deal too good to be true.',
    effect: 'Presents both opportunity and risk through a tempting bargain.',
    imagePrompt: 'Smiling merchant or fey creature with glinting eyes and suspicious wares',
    isRevealed: false
  },
  {
    id: 'character-companion',
    name: 'Loyal Companion',
    type: 'character',
    description: 'A steadfast ally joins your journey.',
    effect: 'Gain a companion with unique skills who will aid your quest.',
    imagePrompt: 'Friendly character offering help, could be archer, healer, or animal companion',
    isRevealed: false
  },
  {
    id: 'character-shadow',
    name: 'The Shadow Self',
    type: 'character',
    description: 'A dark reflection of yourself appears.',
    effect: 'Face your inner fears and flaws made manifest.',
    imagePrompt: 'Shadowy mirror image of protagonist with glowing eyes and darker attire',
    isRevealed: false
  },

  // Item Cards
  {
    id: 'item-artifact',
    name: 'Ancient Artifact',
    type: 'item',
    description: 'A powerful relic from a forgotten age.',
    effect: 'Grants a powerful ability but may attract unwanted attention.',
    imagePrompt: 'Glowing ancient artifact with mysterious symbols and ornate design',
    isRevealed: false
  },
  {
    id: 'item-cursed',
    name: 'Cursed Object',
    type: 'item',
    description: 'An item with a dark aura and troubling history.',
    effect: 'Provides great power at a significant cost.',
    imagePrompt: 'Sinister-looking object with dark energy, skull motifs, or blood runes',
    isRevealed: false
  },
  {
    id: 'item-map',
    name: 'Cryptic Map',
    type: 'item',
    description: 'A mysterious map revealing hidden locations.',
    effect: 'Reveals a secret area with valuable treasures.',
    imagePrompt: 'Aged parchment map with cryptic symbols, partially burned edges',
    isRevealed: false
  },
  {
    id: 'item-potion',
    name: 'Mysterious Elixir',
    type: 'item',
    description: 'A strange concoction with unknown effects.',
    effect: 'Drinking it causes unpredictable magical transformations.',
    imagePrompt: 'Glowing potion bottle with swirling colors and mysterious bubbles',
    isRevealed: false
  },
  {
    id: 'item-weapon',
    name: 'Legendary Weapon',
    type: 'item',
    description: 'A weapon of great renown and power.',
    effect: 'Grants combat prowess but may have a will of its own.',
    imagePrompt: 'Ornate fantasy weapon with glowing runes and distinctive design',
    isRevealed: false
  },

  // Location Cards
  {
    id: 'location-ruins',
    name: 'Forgotten Ruins',
    type: 'location',
    description: 'The crumbling remains of an ancient civilization.',
    effect: 'Contains lost knowledge and treasures, but also ancient guardians.',
    imagePrompt: 'Overgrown ancient ruins with crumbling columns and mysterious carvings',
    isRevealed: false
  },
  {
    id: 'location-sanctuary',
    name: 'Hidden Sanctuary',
    type: 'location',
    description: 'A peaceful haven safe from the dangers of the world.',
    effect: 'Provides rest and recovery, but may hide secrets of its own.',
    imagePrompt: 'Serene hidden valley with waterfalls, lush vegetation, and small dwellings',
    isRevealed: false
  },
  {
    id: 'location-dungeon',
    name: 'Treacherous Dungeon',
    type: 'location',
    description: 'A labyrinthine complex filled with traps and monsters.',
    effect: 'Promises great rewards for those who can survive its challenges.',
    imagePrompt: 'Dark stone dungeon with torchlight, ominous shadows, and ancient mechanisms',
    isRevealed: false
  },
  {
    id: 'location-portal',
    name: 'Mysterious Portal',
    type: 'location',
    description: 'A gateway to another realm or dimension.',
    effect: 'Offers passage to an unexpected and strange new area.',
    imagePrompt: 'Swirling magical portal with arcane symbols floating around its edges',
    isRevealed: false
  },
  {
    id: 'location-settlement',
    name: 'Unusual Settlement',
    type: 'location',
    description: 'A community unlike any you\'ve encountered before.',
    effect: 'Provides unique services, quests, and cultural experiences.',
    imagePrompt: 'Unique fantasy village with unusual architecture and diverse inhabitants',
    isRevealed: false
  },

  // Twist Cards
  {
    id: 'twist-identity',
    name: 'Hidden Identity',
    type: 'twist',
    description: 'Someone is not who they appear to be.',
    effect: 'A major NPC\'s true identity is revealed, changing everything.',
    imagePrompt: 'Character removing mask or disguise, revealing true face in dramatic lighting',
    isRevealed: false
  },
  {
    id: 'twist-reversal',
    name: 'Fortune\'s Reversal',
    type: 'twist',
    description: 'A sudden change in circumstances upends the status quo.',
    effect: 'Allies become enemies, or enemies become allies in a dramatic shift.',
    imagePrompt: 'Dramatic scene with characters changing sides, throne being overturned',
    isRevealed: false
  },
  {
    id: 'twist-prophecy',
    name: 'Ancient Prophecy',
    type: 'twist',
    description: 'An old prediction begins to unfold in unexpected ways.',
    effect: 'Your actions are revealed to be part of a foretold event.',
    imagePrompt: 'Ancient scroll with prophetic writing, constellation alignment, destiny symbols',
    isRevealed: false
  },
  {
    id: 'twist-time',
    name: 'Temporal Anomaly',
    type: 'twist',
    description: 'Time behaves strangely, causing disorientation.',
    effect: 'Past, present, and future blur, revealing new insights.',
    imagePrompt: 'Surreal scene with multiple timeframes visible simultaneously, clock faces warping',
    isRevealed: false
  },
  {
    id: 'twist-reality',
    name: 'Reality Shift',
    type: 'twist',
    description: 'The fabric of reality itself seems to warp and change.',
    effect: 'The rules of the world temporarily change in significant ways.',
    imagePrompt: 'Landscape bending impossibly, physics-defying phenomena, surreal environment',
    isRevealed: false
  }
];

// Function to get a random story card from the deck
export const getRandomStoryCard = (): StoryCard => {
  const index = Math.floor(Math.random() * STORY_CARD_DECK.length);
  return { ...STORY_CARD_DECK[index], id: `${STORY_CARD_DECK[index].id}-${Date.now()}` };
};

// Function to get a random story card of a specific type
export const getRandomStoryCardByType = (type: 'event' | 'character' | 'item' | 'location' | 'twist'): StoryCard => {
  const filteredCards = STORY_CARD_DECK.filter(card => card.type === type);
  const index = Math.floor(Math.random() * filteredCards.length);
  return { ...filteredCards[index], id: `${filteredCards[index].id}-${Date.now()}` };
};

// Function to get a specific story card by ID
export const getStoryCardById = (id: string): StoryCard | undefined => {
  return STORY_CARD_DECK.find(card => card.id === id.split('-')[0]);
};