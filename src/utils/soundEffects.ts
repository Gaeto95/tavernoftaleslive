// Sound effects utility for Tavern of Tales
// This provides a simple way to play sound effects throughout the game

// Define sound effect categories and their sources
const SOUND_EFFECTS = {
  // UI and interaction sounds
  ui: {
    click: '/sounds/ui_click.mp3',
    hover: '/sounds/ui_hover.mp3',
    open: '/sounds/ui_open.mp3',
    close: '/sounds/ui_close.mp3',
  },
  // Dice and gameplay sounds
  dice: {
    roll: '/sounds/dice_roll.mp3',
    success: '/sounds/dice_success.mp3',
    failure: '/sounds/dice_failure.mp3',
    critical: '/sounds/dice_critical.mp3',
  },
  // Combat sounds
  combat: {
    hit: '/sounds/combat_hit.mp3',
    miss: '/sounds/combat_miss.mp3',
    spell: '/sounds/combat_spell.mp3',
    victory: '/sounds/combat_victory.mp3',
    defeat: '/sounds/combat_defeat.mp3',
  },
  // Character progression sounds
  character: {
    levelUp: '/sounds/character_level_up.mp3',
    heal: '/sounds/character_heal.mp3',
    damage: '/sounds/character_damage.mp3',
    death: '/sounds/character_death.mp3',
    revive: '/sounds/character_revive.mp3',
  },
  // Quest and story sounds
  quest: {
    accept: '/sounds/quest_accept.mp3',
    complete: '/sounds/quest_complete.mp3',
    update: '/sounds/quest_update.mp3',
    discover: '/sounds/quest_discover.mp3',
    milestone: '/sounds/quest_milestone.mp3',
  },
  // Item and treasure sounds
  item: {
    pickup: '/sounds/item_pickup.mp3',
    equip: '/sounds/item_equip.mp3',
    use: '/sounds/item_use.mp3',
    discover: '/sounds/item_discover.mp3',
  },
  // Environment sounds
  environment: {
    door: '/sounds/environment_door.mp3',
    chest: '/sounds/environment_chest.mp3',
    trap: '/sounds/environment_trap.mp3',
    secret: '/sounds/environment_secret.mp3',
  }
};

// Sound effect volume settings
const DEFAULT_VOLUME = 0.5;
const VOLUME_SETTINGS: {[key: string]: number} = {
  ui: 0.5, // Increased from 0.3 to make UI sounds more audible
  dice: 0.7, // Increased from 0.6 for better dice feedback
  combat: 0.7,
  character: 0.6,
  quest: 0.5,
  item: 0.4,
  environment: 0.5,
};

// Cache for audio elements to prevent creating too many
const audioCache: {[key: string]: HTMLAudioElement} = {};

// Get the full URL for a sound file
const getFullSoundUrl = (soundUrl: string): string => {
  // If it's already a full URL, return it
  if (soundUrl.startsWith('http') || soundUrl.startsWith('blob:')) {
    return soundUrl;
  }
  
  // Otherwise, make it a full URL relative to the current origin
  return new URL(soundUrl, window.location.origin).href;
};

// Preload common sound effects for better responsiveness
const preloadSounds = () => {
  // Preload UI sounds
  const commonSounds = [
    'ui.click',
    'dice.roll',
    'dice.success',
    'dice.critical',
    'item.discover',
    'quest.discover'
  ];
  
  commonSounds.forEach(soundPath => {
    const [category, sound] = soundPath.split('.');
    const soundUrl = SOUND_EFFECTS[category as keyof typeof SOUND_EFFECTS]?.[sound];
    
    if (soundUrl) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = getFullSoundUrl(soundUrl);
      audioCache[`${category}_${sound}`] = audio;
      
      // Force load
      audio.load();
    }
  });
};

// Call preload on module import
preloadSounds();

// Main sound effect player function
export const playSoundEffect = (
  category: keyof typeof SOUND_EFFECTS,
  sound: string,
  volume?: number,
  onEnd?: () => void
): void => {
  // Check if sound effects are enabled in settings
  const soundEffectsEnabled = localStorage.getItem('sound-effects-enabled') !== 'false';
  if (!soundEffectsEnabled) return;

  // Get the sound effect URL
  const soundEffects = SOUND_EFFECTS[category];
  if (!soundEffects) {
    console.warn(`Sound category "${category}" not found`);
    return;
  }

  const soundUrl = soundEffects[sound as keyof typeof soundEffects];
  if (!soundUrl) {
    console.warn(`Sound "${sound}" not found in category "${category}"`);
    return;
  }

  try {
    // Use cached audio element or create a new one
    const cacheKey = `${category}_${sound}`;
    let audio = audioCache[cacheKey];
    
    if (!audio) {
      audio = new Audio();
      audio.preload = 'auto';
      audio.src = getFullSoundUrl(soundUrl);
      audioCache[cacheKey] = audio;
      
      // Force load
      audio.load();
    }

    // Reset the audio element
    audio.pause();
    audio.currentTime = 0;
    
    // Set volume based on category or custom value
    const effectiveVolume = volume !== undefined 
      ? volume 
      : VOLUME_SETTINGS[category] || DEFAULT_VOLUME;
    
    audio.volume = effectiveVolume;

    // Add error handling
    const handleError = (e: ErrorEvent) => {
      console.warn(`Failed to play sound effect: ${e.message}`);
      // Try to reload the audio with full URL
      if (audio.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        console.log('Attempting to reload sound with full URL');
        const fullUrl = getFullSoundUrl(soundUrl);
        audio.src = fullUrl;
        audio.load();
        audio.play().catch(err => {
          console.warn(`Retry failed: ${err.message}`);
        });
      }
    };
    
    audio.addEventListener('error', handleError);
    
    // Set up event handlers
    if (onEnd) {
      const handleEnded = () => {
        onEnd();
        audio.removeEventListener('ended', handleEnded);
      };
      audio.addEventListener('ended', handleEnded);
    }

    // Play the sound
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn(`Failed to play sound effect: ${error.message}`);
        // Remove the error listener to prevent memory leaks
        audio.removeEventListener('error', handleError);
        
        // Try with a full URL as a fallback
        const fullUrl = getFullSoundUrl(soundUrl);
        if (fullUrl !== audio.src) {
          console.log('Trying with full URL:', fullUrl);
          audio.src = fullUrl;
          audio.load();
          audio.play().catch(secondError => {
            console.error('Second attempt failed:', secondError);
          });
        }
      });
    }
  } catch (error) {
    console.warn('Error playing sound effect:', error);
  }
};

// Helper function to play UI click sound
export const playUIClick = () => {
  playSoundEffect('ui', 'click', 0.6); // Increased volume for better feedback
};

// Helper function to play dice roll sound
export const playDiceRoll = () => {
  playSoundEffect('dice', 'roll', 0.7); // Increased volume for better feedback
};

// Helper function to play dice result sounds
export const playDiceResult = (result: number, isCritical: boolean = false) => {
  if (isCritical) {
    playSoundEffect('dice', 'critical', 0.8); // Increased volume for critical rolls
  } else if (result >= 15) {
    playSoundEffect('dice', 'success', 0.7);
  } else if (result <= 5) {
    playSoundEffect('dice', 'failure', 0.7);
  }
};

// Helper function to play quest sounds
export const playQuestSound = (type: 'accept' | 'complete' | 'update' | 'discover' | 'milestone') => {
  playSoundEffect('quest', type, 0.6); // Increased volume for better feedback
};

// Helper function to play combat sounds
export const playCombatSound = (type: 'hit' | 'miss' | 'spell' | 'victory' | 'defeat') => {
  playSoundEffect('combat', type, 0.7);
};

// Helper function to play character sounds
export const playCharacterSound = (type: 'levelUp' | 'heal' | 'damage' | 'death' | 'revive') => {
  playSoundEffect('character', type, 0.7);
};

// Helper function to play item sounds
export const playItemSound = (type: 'pickup' | 'equip' | 'use' | 'discover') => {
  playSoundEffect('item', type, 0.6);
};

// Helper function to play environment sounds
export const playEnvironmentSound = (type: 'door' | 'chest' | 'trap' | 'secret') => {
  playSoundEffect('environment', type, 0.6);
};

// Toggle sound effects on/off
export const toggleSoundEffects = (): boolean => {
  const currentSetting = localStorage.getItem('sound-effects-enabled') !== 'false';
  const newSetting = !currentSetting;
  localStorage.setItem('sound-effects-enabled', newSetting.toString());
  return newSetting;
};

// Get current sound effects enabled state
export const areSoundEffectsEnabled = (): boolean => {
  return localStorage.getItem('sound-effects-enabled') !== 'false';
};

// Set volume for a category
export const setSoundCategoryVolume = (category: string, volume: number): void => {
  if (volume >= 0 && volume <= 1) {
    VOLUME_SETTINGS[category] = volume;
  }
};