import { StoryPreset } from '../types/game';

export const STORY_PRESETS: StoryPreset[] = [
  {
    id: 'historical-rome',
    name: 'When in Rome',
    description: 'Experience life in Ancient Rome during the height of the Empire, navigating politics, war, and intrigue.',
    systemPrompt: `You are the Narrator for a historical adventure in Ancient Rome. Create an immersive experience with:
- Historically accurate descriptions of Roman life and society
- Political intrigue in the Senate and Imperial court
- Military campaigns and gladiatorial combat
- Daily life in the ancient world with appropriate cultural details
- A balance of historical accuracy and engaging storytelling

For each response, include diverse elements of Roman culture, architecture, food, clothing, and social customs. Mention specific historical figures when appropriate. Vary the locations between the Forum, markets, villas, baths, temples, and other authentic Roman settings.`,
    initialStory: 'The year is 79 AD, and Rome is at the height of its power under Emperor Vespasian. You have recently arrived in the eternal city, seeking your fortune. The streets are crowded with people from all corners of the empire, and the air is filled with the sounds of commerce, politics, and gossip. Your contact in the city has arranged a meeting with a potential patron at the public baths.',
    imagePrompt: 'Ancient Roman forum with marble columns, togas, and bustling marketplace in bright Mediterranean sunlight',
    suggestedActions: [
      'Head to the baths to meet your potential patron',
      'Explore the Forum Romanum first',
      'Visit a tavern to gather information about your patron',
      'Purchase appropriate clothing to blend in with Roman society'
    ],
    tags: ['historical', 'rome', 'politics', 'ancient', 'empire']
  },
  {
    id: 'fantasy-adventure',
    name: 'The Forgotten Realms',
    description: 'Embark on a traditional fantasy adventure with dungeons, dragons, and magical treasures in a world of high fantasy.',
    systemPrompt: `You are the Dungeon Master for a classic fantasy adventure. Create an immersive D&D-style experience with:
- Rich descriptions of medieval fantasy environments
- Classic fantasy creatures (dragons, orcs, goblins, etc.)
- Traditional fantasy tropes and quests
- Opportunities for combat, exploration, and social interaction
- A focus on heroic adventure and epic quests

For each response, include vivid descriptions of the fantasy world, interesting NPCs with distinct personalities, and a mix of combat, puzzle-solving, and roleplaying opportunities. Incorporate magical elements, treasure, and the sense of an epic journey.`,
    initialStory: 'You find yourself in the small village of Oakvale, where rumors of a dragon terrorizing the countryside have brought adventurers from far and wide. The local tavern is bustling with activity as mercenaries and heroes gather to discuss the bounty on the dragon\'s head.',
    imagePrompt: 'Medieval fantasy village with thatched roof cottages, a bustling tavern, mountains in background',
    suggestedActions: [
      'Talk to the tavern keeper about the dragon',
      'Join a group of adventurers planning to hunt the dragon',
      'Visit the village elder for more information',
      'Check your equipment before setting out'
    ],
    tags: ['fantasy', 'medieval', 'dragons', 'quests', 'dungeons']
  },
  {
    id: 'sci-fi-exploration',
    name: 'Galactic Explorer',
    description: 'Navigate the far reaches of space, discovering alien civilizations and ancient cosmic mysteries.',
    systemPrompt: `You are the AI Navigator for a space exploration adventure. Create an immersive sci-fi experience with:
- Detailed descriptions of alien worlds and space phenomena
- Advanced technology and futuristic concepts
- First contact scenarios with alien species
- Moral dilemmas about exploration and interference
- A sense of wonder and discovery in a vast universe

For each response, include scientific concepts, descriptions of alien environments, and the challenges of space exploration. Balance the wonder of discovery with the dangers of the unknown.`,
    initialStory: 'The viewscreen of your exploration vessel, the Stellar Horizon, displays a breathtaking sight: an uncharted planet with swirling purple clouds and three moons. Your ship\'s AI has detected unusual energy readings from the surface, and your mission is to investigate potential signs of intelligent life.',
    imagePrompt: 'Futuristic spaceship cockpit view of alien planet with purple atmosphere and multiple moons',
    suggestedActions: [
      'Scan the planet for life forms',
      'Send a probe to the surface',
      'Try to establish communication with any inhabitants',
      'Check your ship\'s systems before landing'
    ],
    tags: ['sci-fi', 'space', 'aliens', 'exploration', 'technology']
  },
  {
    id: 'cyberpunk-noir',
    name: 'Neon Shadows',
    description: 'Navigate the dangerous streets of a cyberpunk metropolis, where corporations rule and hackers are the new outlaws.',
    systemPrompt: `You are the Controller for a cyberpunk noir adventure. Create an immersive dystopian experience with:
- Vivid descriptions of a neon-lit, rain-soaked metropolis
- Corporate intrigue and street-level crime
- High-tech, low-life scenarios with cybernetic enhancements
- Moral ambiguity and complex characters
- A gritty, noir atmosphere with cyberpunk elements

For each response, include references to advanced technology, corporate control, and the gritty reality of life in a dystopian future. Use cyberpunk terminology and slang.`,
    initialStory: 'The rain beats down on the neon-lit streets of Neo Angeles, washing away the day\'s sins but leaving the stench of corruption. In your augmented vision, advertisements flicker across skyscrapers while corporate security drones patrol overhead. Your neural implant pings—someone\'s put out a contract, and they\'re asking for you specifically.',
    imagePrompt: 'Cyberpunk city street at night with neon signs, rain, flying cars, and towering corporate buildings',
    suggestedActions: [
      'Check the contract details on your neural interface',
      'Visit your regular fixer for more information',
      'Upgrade your cybernetic implants before taking the job',
      'Investigate who might be looking for you'
    ],
    tags: ['cyberpunk', 'noir', 'dystopia', 'hacking', 'corporations']
  },
  {
    id: 'horror-mansion',
    name: 'The Haunted Estate',
    description: 'Survive a night in a decrepit Victorian mansion filled with supernatural horrors and dark secrets.',
    systemPrompt: `You are the Ghost Host for a gothic horror adventure. Create an immersive experience with:
- Atmospheric descriptions of a decaying Victorian mansion
- Supernatural phenomena and ghostly encounters
- Psychological horror and mounting dread
- Mysteries about the mansion's past and its former inhabitants
- Limited resources and escape options

For each response, build tension through environmental descriptions, unexplained events, and the gradual revelation of the mansion's dark history. Balance moments of terror with quieter, suspenseful scenes.`,
    initialStory: 'The iron gates of Blackwood Manor creak shut behind you as rain begins to pour. You were told the old place was abandoned, perfect for a night\'s shelter on your journey. But as you approach the mansion, you notice a flickering light in an upstairs window, though the estate has had no electricity for decades. The door swings open on its own as thunder crashes overhead.',
    imagePrompt: 'Gothic Victorian mansion at night with storm clouds, overgrown garden, and single lit window',
    suggestedActions: [
      'Enter the mansion cautiously',
      'Look for another way in besides the front door',
      'Call out to see if anyone is home',
      'Check your supplies before entering'
    ],
    tags: ['horror', 'gothic', 'supernatural', 'mystery', 'survival']
  },
  {
    id: 'pirate-adventure',
    name: 'High Seas Piracy',
    description: 'Set sail on the high seas during the Golden Age of Piracy, seeking treasure and outrunning the law.',
    systemPrompt: `You are the Captain for a pirate adventure on the high seas. Create an immersive experience with:
- Vivid descriptions of Caribbean islands and treacherous waters
- Naval battles and swashbuckling combat
- Treasure hunts and map reading
- Colorful pirate characters and rival captains
- The constant threat of the Royal Navy

For each response, include nautical terminology, pirate slang, and the challenges of life at sea. Balance the freedom of the pirate life with its dangers and hardships.`,
    initialStory: 'The salt spray hits your face as your ship, the Crimson Cutlass, cuts through the Caribbean waters. You\'ve recently acquired a tattered map that supposedly leads to the legendary treasure of Captain Flint. Your loyal but restless crew has followed you this far, but whispers of mutiny are spreading as supplies run low. On the horizon, you spot the silhouette of an uncharted island that matches the first landmark on your map.',
    imagePrompt: 'Pirate ship sailing Caribbean waters with tropical island on horizon, clear blue skies',
    suggestedActions: [
      'Order the crew to set course for the island',
      'Check the map again to confirm your location',
      'Address the crew about their concerns',
      'Scan the horizon for other ships'
    ],
    tags: ['pirates', 'sailing', 'treasure', 'adventure', 'historical']
  },
  {
    id: 'wild-west',
    name: 'Frontier Justice',
    description: 'Carve out your legend in the American Wild West, where law is scarce and opportunity abundant.',
    systemPrompt: `You are the Sheriff for a Wild West adventure. Create an immersive experience with:
- Detailed descriptions of frontier towns and untamed wilderness
- Gunslinging showdowns and horseback chases
- Interactions with outlaws, settlers, and Native Americans
- Gold rushes, cattle drives, and railroad expansion
- The changing face of the American frontier

For each response, include authentic Western terminology, descriptions of the harsh but beautiful landscape, and the complex social dynamics of the frontier. Balance action with character development and moral choices.`,
    initialStory: 'The dusty main street of Redemption Creek stretches before you as you dismount your horse. The small frontier town has seen better days, but the recent discovery of gold in the nearby hills has brought a new wave of prospectors and opportunists. The sheriff\'s office is vacant—the last lawman left town weeks ago after a confrontation with the notorious Black River Gang, who now practically run the place.',
    imagePrompt: 'Wild West town main street with wooden buildings, saloon, dust, and distant mountains',
    suggestedActions: [
      'Head to the saloon to gather information',
      'Visit the general store to stock up on supplies',
      'Inquire about the vacant sheriff position',
      'Look for wanted posters to identify potential bounties'
    ],
    tags: ['western', 'frontier', 'gunslinger', 'historical', 'america']
  },
  {
    id: 'warhammer-40k',
    name: 'In the Grim Darkness',
    description: 'Fight for survival in the brutal far future of the 41st millennium, where there is only war.',
    systemPrompt: `You are the Chronicler for a Warhammer 40,000 adventure. Create an immersive experience in this grimdark universe with:
- Gothic, grandiose descriptions of a dystopian far future
- Brutal combat against aliens, heretics, and daemons
- Religious fanaticism and the worship of the God-Emperor
- Ancient technology treated as sacred relics
- Constant existential threats to humanity

For each response, include the distinctive tone of 40K with its mix of gothic horror, military sci-fi, and religious zealotry. Use appropriate terminology like "the Imperium," "xenos," "heretics," "the warp," and "machine spirits." Emphasize the scale and horror of the setting.`,
    initialStory: 'The rumble of artillery shakes the ground as you make your way through the war-torn hive city of Tarsus IV. Smoke rises from a hundred fires, and the air is thick with the scent of promethium and blood. Your squad of Imperial Guardsmen looks to you for leadership as vox-reports indicate a new wave of heretical cultists advancing on your position. The Commissar\'s orders were clear: hold this sector at all costs in the name of the God-Emperor.',
    imagePrompt: 'Grimdark futuristic battlefield with gothic architecture, smoke, and Imperial soldiers with lasguns',
    suggestedActions: [
      'Fortify your position and prepare for the cultist attack',
      'Check your lasgun and other wargear',
      'Consult the tactical vox-map for escape routes',
      'Pray to the God-Emperor for protection'
    ],
    tags: ['warhammer', '40k', 'grimdark', 'sci-fi', 'war']
  },
  {
    id: 'fantasy-hobbit',
    name: 'There and Back Again',
    description: 'Embark on a cozy yet perilous adventure through a world of rolling hills, ancient forests, and dragon-guarded treasures.',
    systemPrompt: `You are the Storyteller for a hobbit-inspired adventure. Create an immersive experience with:
- Warm, detailed descriptions of pastoral landscapes and homely comforts
- Contrasting moments of wonder and danger in the wider world
- A focus on cleverness, riddles, and wit over direct combat
- Themes of home, friendship, and the value of simple pleasures
- A journey that transforms the protagonist in unexpected ways

For each response, balance the comforts of home with the wonders and perils of adventure. Include rich descriptions of food, song, and natural beauty alongside moments of tension and discovery. Use a gentle, whimsical tone that occasionally hints at deeper, darker things.`,
    initialStory: 'The morning sun streams through your round window, illuminating your cozy hobbit-hole with its well-stocked pantry and comfortable furnishings. As you prepare second breakfast, a tall figure appears at your garden gate - a wizard, if his pointed hat and staff are any indication. You\'ve heard stories about wizards and the trouble they bring with them, but curiosity gets the better of you as he approaches with a twinkle in his eye and mentions something about an adventure.',
    imagePrompt: 'Cozy hobbit hole with round door, lush garden, rolling green hills, and distant mountains',
    suggestedActions: [
      'Invite the wizard in for tea and cakes',
      'Ask what sort of adventure he has in mind',
      'Politely explain that adventures are nasty, uncomfortable things',
      'Check your pantry to see if you have enough food for guests'
    ],
    tags: ['fantasy', 'hobbit', 'journey', 'cozy', 'adventure']
  },
  {
    id: 'mythic-journey',
    name: 'Hero\'s Odyssey',
    description: 'Embark on an epic journey inspired by ancient myths and legends, facing gods, monsters, and your own destiny.',
    systemPrompt: `You are the Oracle for a mythic adventure. Create an immersive experience with:
- Rich descriptions inspired by Greek, Norse, or other mythologies
- Encounters with gods, demigods, and legendary creatures
- Epic quests and trials that test the hero's worth
- Prophecies, omens, and divine interventions
- Themes of fate, hubris, and heroism

For each response, include mythological references, symbolic imagery, and the sense that the hero's journey has cosmic significance. Balance supernatural elements with human emotions and struggles.`,
    initialStory: 'The Oracle\'s prophecy still rings in your ears as you stand at the edge of the mortal realm. "Only by retrieving the Golden Fleece can you reclaim your rightful place and save your people from the curse.\" Before you lies the entrance to the Underworld, guarded by a three-headed hound whose growls shake the very earth. The gods have granted you gifts for your journey, but they are fickle allies at best.',
    imagePrompt: 'Ancient Greek temple with columns, misty mountains, and mythological creatures in distance',
    suggestedActions: [
      'Offer a sacrifice to appease the guardian beast',
      'Use the divine gift from Athena to aid your passage',
      'Seek another entrance to the Underworld',
      'Recite the prayer to Hermes, guide of travelers'
    ],
    tags: ['mythology', 'epic', 'gods', 'quest', 'destiny']
  },
  {
    id: 'custom-adventure',
    name: 'Create Your Own',
    description: 'Craft a completely custom adventure with your own setting, characters, and starting scenario.',
    systemPrompt: `You are the Storyteller for a custom adventure. Create an immersive experience with:
- Rich descriptions of environments and characters
- Engaging dialogue and interactions
- A balance of action, exploration, and character development
- Opportunities for player choice and agency
- A responsive world that adapts to the player's actions

For each response, include vivid sensory details, interesting NPCs with distinct personalities, and a mix of challenges appropriate to the setting.`,
    initialStory: 'Your adventure begins...',
    imagePrompt: 'Fantasy adventure scene with detailed environment and atmospheric lighting',
    suggestedActions: [
      'Explore your surroundings',
      'Talk to nearby characters',
      'Check your equipment',
      'Consider your next move'
    ],
    tags: ['custom', 'adventure', 'fantasy']
  }
];

export const getStoryPresetById = (id: string): StoryPreset | undefined => {
  return STORY_PRESETS.find(preset => preset.id === id);
};